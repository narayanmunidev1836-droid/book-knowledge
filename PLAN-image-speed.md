# Image Loading Speed — Execution Plan (ready to run)

> **Goal:** "image load thata bov j time ley chhe" — image loading is too slow everywhere
> (gallery/dashboard grids, lightbox, search, book entries, covers).
> **Scope (user approved):** Full fix. **Deploy target: Vercel.** Storage stays in
> MongoDB (base64) — Vercel Blob was already removed on purpose, NO migration.

**How to start:** Open a fresh opencode session in `D:\book-knowledge`, say:
> "Execute PLAN-image-speed.md fully, then run lint + build."

**Estimate:** ~30–35 min.

---

## 0. Measured facts (do not re-research)

DB = 18 entries (2 empty), 7 books (5 empty covers). Users:
`6ab75d82d1820f398501eeb7` (admin, 0 entries),
`6ab76067d1820f398501eeba` (sant, 16 entries),
`6ab790a731b9c3f3b5a68c71` (sant, 2 entries).

| What | Size |
|---|---|
| `GET /api/entries` list JSON today | **2.22 MB** (gzip 1668 KB) |
| same list WITHOUT duplicate `thumb` field | **1.11 MB** (gzip 855 KB) |
| list with URL-based images (after fix) | **~2.2 KB** |
| Worst `GET /api/entries/[id]` detail | **~3.0 MB** (image+images[]+thumb+thumbs[] duplicated) |
| Thumbs | p50 42 KB, p90 185 KB, max 197 KB (900px, q68 WebP) |
| Full images | up to 4096×6556, 1678 KB; `MAX_ENTRY_BYTES`=6MB, `MAX_COVER_BYTES`=1.5MB |
| Data in DB | 62 data-URIs, **0** legacy `/uploads/` paths, 8 entries lack `images[]`, 2 lack `thumb` |
| Books | 2 covers are data-URIs (519KB + 572KB), 0 legacy |

### Root causes (confirmed in Next.js 16.3.6 source `node_modules/next/dist/`)
1. `shared/lib/get-img-props.js`: `src` starting with `data:` → `unoptimized = true`
   **and `isLazy = false`** → every grid thumb loads eagerly, no srcset, no lazy, no caching.
2. Images are base64 **inside JSON** → refetched on every navigation, cannot be HTTP-cached,
   and list projection ships the same base64 **twice** (`thumb: 1` + `image: thumb?thumb:image`).
3. Lightboxes wait for a **full ~3 MB detail JSON** fetch before showing anything (spinner),
   even though the thumb is already in hand. No neighbor prefetch.
4. `next/image` optimizer's `fetchInternalImage` uses `createRequestResponseMocks({url, method, socket})`
   → **cookies are NOT forwarded** → an auth-gated `/api/img/*` route would 401 through the optimizer.
   → Therefore signed-URL (no cookie) design, see Phase 2.
5. `app/uploads/[...filepath]/route.js` serves `cache-control: public, max-age=0`.
6. Dashboard + gallery fetch **all** entries at once (`/api/entries`, limit 500).
7. `next.config.mjs` is `{}` (empty).

---

## Phase 1 — Shrink the JSON (quick wins)

### 1.1 `app/api/entries/route.js` (GET list)
- Projection currently has BOTH `thumb: 1` AND `image: { $cond: [thumb exists, thumb, image] }`.
- **Change:** remove `thumb: 1` from `$project` (keep `image`). Saves 50% instantly.
- Keep `imageCount` + `hasFull` computed fields as-is.

### 1.2 `app/api/entries/[id]/route.js` (GET detail)
- `toPlain(entry)` returns `image` + `images[]` + `thumb` + `thumbs[]` (first image twice).
- **Change in full GET:** if `plain.images?.length`, delete `plain.image` and `plain.thumb`
  (consumers already prefer `d.images`). Keep them for legacy docs without `images[]`.
- `?lite=1` already deletes `images` — also delete `plain.thumb` if `plain.thumbs?.length`
  (it sets `plain.image = plain.thumb` first; EntryEditModal reads `d.thumbs ?? d.thumb`).

### 1.3 Consumers that duplicate PUT response fields — no change needed
(`image: json.thumb || ""` in BookEntries/TopicEntries/search/sant dashboard is harmless.)

---

## Phase 2 — CORE: serve images as signed, cacheable URLs

### 2.1 NEW `lib/imgUrl.js`
```js
import crypto from "crypto";

// version = entry.updatedAt epoch (cache-bust on edit). No expiry needed.
function sign(parts) {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET || "dev")
    .update(parts.join(":"))
    .digest("base64url")
    .slice(0, 22);
}

// /api/img/entry/<id>/<index>/<kind>?v=<ver>&s=<sig>   kind: "full" | "thumb"
export function entryImgUrl(entryId, index, kind, version) {
  const v = String(version || 0);
  const s = sign(["e", entryId, index, kind, v]);
  return `/api/img/entry/${entryId}/${index}/${kind}?v=${v}&s=${s}`;
}

// /api/img/cover/<bookId>?v=<ver>&s=<sig>
export function coverImgUrl(bookId, version) {
  const v = String(version || 0);
  const s = sign(["c", bookId, v]);
  return `/api/img/cover/${bookId}?v=${v}&s=${s}`;
}

export function verifySig(parts, provided) {
  const expect = sign(parts);
  if (!provided || provided.length !== expect.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expect));
}
```

### 2.2 NEW `app/api/img/[...path]/route.js`
Route handler (Next 16: `params` is a Promise → `const { path } = await params`).
- Parse: `["entry", id, index, kind]` or `["cover", id]`.
- Read `searchParams` `v` + `s`; verify with `verifySig([...parts, v], s)` else **403**.
- `export const dynamic = "force-dynamic";`
- Load ONLY needed fields via `Entry.findById(id).select("image thumb images thumbs updatedAt")`
  (or `Book.findById(id).select("cover updatedAt")`).
- **Ownership check:** `String(entry.uploadedBy) === session.user.id` (or role admin) →
  use `auth()` from `lib/auth.js` (cookie) for THIS check. Signature alone is not authorization.
  ⚠️ This route is fetched two ways: (a) browser `<img>` — cookie present,
  (b) next/image optimizer internal fetch — **no cookie**. So:
  - If session present → enforce ownership.
  - If NO session → only allow when signature valid AND `v === String(updatedAt.getTime())`
    (signature was minted server-side for an authorized user, so it is a capability token).
- Pick source string: kind `full` → `entry.images?.[index] || entry.image`;
  kind `thumb` → `entry.thumbs?.[index] || entry.thumb || (index===0 ? entry.image : "")`.
- Decode: strip `data:*;base64,` prefix → `Buffer.from(b64, "base64")`.
  (If value starts with `/uploads/` → read file from `UPLOAD_ROOT` as fallback.)
- Respond with:
  ```
  content-type: image/webp (or from data-uri prefix)
  cache-control: public, max-age=31536000, immutable
  etag: "<sha1-of-buffer-short>"
  content-length
  ```
  Handle `if-none-match` → **304**. Empty/missing → 404 JSON.

### 2.3 API responses return URLs (not base64)

**`app/api/entries/route.js` (GET list)** — after `JSON.parse(JSON.stringify(entries))`:
- Project additionally: `updatedAt: 1`, `images: 1`? NO — images[] is base64, never project it.
  Instead project a **count**: add `imageListSize` (already have `imageCount`) and
  `updatedAt`.
- Map each item →
  ```js
  item.image = entryImgUrl(id, 0, "thumb", updatedAt.getTime());  // grid thumb
  delete item.thumb;
  // full image URLs for lightbox (avoids the 3MB detail fetch entirely):
  item.images = Array.from({length: item.imageCount}, (_,i) =>
     entryImgUrl(id, i, "full", updatedAt.getTime()));
  item.thumbs = Array.from({length: item.imageCount}, (_,i) =>
     entryImgUrl(id, i, "thumb", updatedAt.getTime()));
  ```
  ⚠️ `imageCount` for legacy docs (8 entries without `images[]`, image in `image`) = 1 → OK.
  Result: list stays ~2–5 KB even with images[] urls.

**`app/api/entries/[id]/route.js`**
- GET (full + lite): map `images[]`/`thumbs[]` base64 → signed URLs (same helper, index-aware).
  `plain.image` → `entryImgUrl(id,0,"thumb",ver)`, `plain.thumb` → same as image.
  For lite: `plain.thumbs` → thumb URLs; `plain.image` = thumbs[0] URL.
- PUT response: `image`/`thumb` → `entryImgUrl(id,0,"thumb",updatedAt.getTime())`
  (refresh timestamp after `entry.save()`).
- POST response (in `app/api/entries/route.js`): map `toPlain(entry)` the same way.

**`app/api/books/route.js` GET + POST, `app/api/books/[id]/route.js` GET + PUT**
- `cover` base64 → `coverImgUrl(bookId, updatedAt.getTime())` (or `""` when empty).

**`app/api/entries/[id]/route.js` GET** should also return `updatedAt` so clients can re-mint
URLs? Not needed — clients always take URLs from server responses.

### 2.4 Consumer changes

**`components/GalleryGrid.js`** (biggest UX win)
- Delete the `useEffect` that fetches `/api/entries/${id}` on open (lines ~34–57) —
  `entry.images[]` (URLs) now arrives with the list.
- `fullImages[entry._id]` → just use `entry.images` / `entry.thumbs` directly.
- **Progressive lightbox:** render `entry.thumbs[i]` immediately (instant), then swap to
  `entry.images[i]` on top when loaded (`<img onLoad>` / layered opacity, or simply set src
  from thumb → full with a loading state). Keep a small spinner ONLY for full swap.
- **Prefetch neighbors:** when `active` changes, warm `entries[i+1]`/`[i-1]` thumb+full via
  `new Image().src = ...` (URLs are immutable → cheap).
- Grid `<Image src={entry.image}>`: now a real URL → `next/image` gets lazy + srcset +
  `/_next/image` optimizer (cookie-free signed URL → works). Keep `sizes` prop (already set).
- `countOf()` keeps working (`imageCount` projected).

**`components/BookEntries.js`**, **`components/TopicEntries.js`**, **`app/sant/search/page.js`**
- Same pattern: drop the `/api/entries/${id}` detail fetch on open; use `entry.images`
  (URLs) from the list; progressive thumb→full; prefetch neighbors.
- `handleEdit` already reads `json.thumb` — now a URL; row refreshes correctly.

**`components/EntryEditModal.js`**
- `?lite=1` now returns URL arrays — no code change (reads `d.thumbs ?? d.thumb`).

**`app/sant/page.js` (dashboard)** — `handleEdit` uses `json.thumb` (URL) — no change.

**Covers:** `components/BookEntries.js` line ~170 and `app/sant/books/page.js` line ~167
render `book.cover` — now a URL instead of data-URI → `next/image` optimizes it (72px/48px).
No change needed beyond API.

### 2.5 `next.config.mjs`
```js
const nextConfig = {
  images: {
    minimumCacheTTL: 31536000,          // match immutable upstream (v16 default is 14400)
    // localPatterns: default allows all local paths — no change needed
  },
};
```

---

## Phase 3 — Pagination + upload-side

### 3.1 Gallery + dashboard pagination
- `app/sant/gallery/page.js`: switch to `?page=&limit=30` + `react-infinite-scroll-component`
  (copy pattern from `app/sant/search/page.js` lines 49–112). Keep topic filter —
  filter server-side via existing `topicId` param instead of client filtering.
- `app/sant/page.js` dashboard: fetch `?limit=RECENT_LIMIT(12)`? It needs `entries` for
  `totalRecords` fallback only — keep full fetch BUT list is now ~3KB so it is fine.
  **Decision: skip dashboard pagination** (payload is tiny now). Only gallery paginates.

### 3.2 `lib/upload.js`
- Full image: add long-edge cap — in `compress()` call for entry full images use
  `resize: { width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }`
  (only when caller doesn't pass its own `resize`). Reduces 4096×6556/1.6MB → ~500KB.
- Thumb: `width: 900 → 640`, `quality: 68 → 62` (grid shows ≤420px CSS).
  ⚠️ Keep clarity high for FULL image (q88 ladder unchanged).

### 3.3 `app/uploads/[...filepath]/route.js`
- `cache-control: "public, max-age=0"` → `"public, max-age=31536000, immutable"` +
  `etag` from file mtime+size + 304 handling (cheap, legacy files only).

---

## Phase 4 — Verify (must run)

```powershell
npm run lint
npm run build
```
Manual checks (dev server already running on :3000, or `npm run dev`):
1. Login `admin@book.com` / `admin123` — dashboard loads (admin has 0 entries, so also test
   as sant if password known; otherwise create a test entry as admin via /sant/entry and
   delete it after).
2. `/sant/gallery` — grid renders, click → lightbox shows thumb instantly, full swaps in.
3. Arrow keys ←/→ navigate, neighbors already warm.
4. `/sant/search`, `/sant/books`, book detail table, edit modal (thumbs list), covers.
5. DevTools Network: `GET /api/entries` ≈ **2–5 KB** (was 2.22 MB).
   `/api/img/entry/...` responses carry `cache-control: public, max-age=31536000, immutable`.
   Reload page → images served from **(disk cache)**, no network.
6. Edit an entry's image → URL version changes (`?v=`) → new image appears (no stale cache).

Payload measurement scripts (temp, outside repo):
`C:\Users\DEVKANI\AppData\Local\Temp\opencode\{payload2,gzip,legacy}.js` — run with `node <script>`.

---

## Files touched (checklist)

- [ ] `lib/imgUrl.js` **(new)** — HMAC signed URL helpers
- [ ] `app/api/img/[...path]/route.js` **(new)** — binary cached image route
- [ ] `app/api/entries/route.js` — drop `thumb` projection; map URLs in GET list + POST resp
- [ ] `app/api/entries/[id]/route.js` — dedupe GET; map URLs in GET/PUT
- [ ] `app/api/books/route.js` — cover URL in GET + POST
- [ ] `app/api/books/[id]/route.js` — cover URL in GET + PUT
- [ ] `components/GalleryGrid.js` — progressive lightbox, drop detail fetch, prefetch
- [ ] `components/BookEntries.js` — drop detail fetch, use entry.images URLs
- [ ] `components/TopicEntries.js` — same
- [ ] `app/sant/search/page.js` — same
- [ ] `app/sant/gallery/page.js` — pagination (page/limit + InfiniteScroll)
- [ ] `lib/upload.js` — full-image 2560 long-edge cap, thumb 640/q62
- [ ] `app/uploads/[...filepath]/route.js` — immutable cache + ETag
- [ ] `next.config.mjs` — `images.minimumCacheTTL`

**Do NOT touch:** `lib/models.js` (schema), storage format (Mongo base64 stays),
`proxy.js`, auth. No migration scripts needed — URLs are minted at response time.

## Risks / gotchas
- next/image optimizer does not forward cookies → signed URL is mandatory (Phase 2.2).
- Signature = capability token; ownership still enforced when session cookie IS present.
- `AUTH_SECRET` already in `.env.local` (keys: MONGODB_URI, AUTH_SECRET, AUTH_URL,
  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME).
- AGENTS.md: Next.js 16 has breaking changes — read relevant guide in
  `node_modules/next/dist/docs/` before writing code (route params are async!).
- Run `npm run lint` + `npm run build` before finishing.
