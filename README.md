# Book Knowledge

A digital library for organizing sant vachans — manage books, topics and page-wise image uploads, with search, gallery, and role-based access for **Admins** and **Sants**.

All data is **user-wise**: every sant sees and manages only the books, topics and
images they created themselves.

## Features

### Admin
- Dashboard with aggregate stats (sants, books, topics, images)
- Manage sants (add, edit, enable/disable, reset password, delete)
- **Sant-wise activity report** — per-sant books/topics/images counts, last upload, status
- **Analytics** — 30-day upload bar chart, top books, top topics, most active sants
- **Activity log** — audit trail of logins, uploads, edits, deletes, password changes (filterable + searchable)
- **Site settings** — site name & tagline, applied to sidebar brand and page title
- Change own password
- Admin does **not** create books/topics and cannot browse images

### Sant
- Dashboard with personal entries gallery
- New entry upload — select book + topic(s), page number, image, short note
- Add book / add topic directly from the entry form
- Manage own books (add with cover, edit, delete, search)
- Manage own topics (add, inline edit, delete) at **Topics** page
- Topic-wise search and gallery view with lightbox
- Edit notes and delete own entries
- Change own password

### Common
- Emerald + Slate UI with Ant Design components (modals, drawer sidebar, icons)
- Responsive layout — persistent sidebar on desktop, hamburger + drawer on tablet/mobile
- Loading spinners on every data page
- JWT session auth via NextAuth (credentials), role-based routing (`/admin`, `/sant`)
- Images auto-converted to WebP, MongoDB storage, served from `/uploads`
- Custom multi-size favicon (ICO + SVG + Apple icon)

## Tech Stack

| Layer | Tools |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4, Ant Design 6 + @ant-design/icons |
| Auth | NextAuth v5 (credentials + JWT) |
| Database | MongoDB (Mongoose) |
| Language | JavaScript (no TypeScript) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```bash
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=your-random-secret
AUTH_URL=http://localhost:3000

# Seed admin account
ADMIN_EMAIL=admin@book.com
ADMIN_PASSWORD=your-admin-password
ADMIN_NAME=Admin
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/
  admin/          # Admin pages (dashboard, sants, report, analytics, activity, settings)
  sant/           # Sant pages (dashboard, entry, books, topics, search, gallery)
  api/            # REST API routes
    books/        # GET, POST, PUT, DELETE (own only)
    topics/       # GET, POST, PUT, DELETE (own only)
    entries/      # GET (search own), POST (upload), PUT, DELETE (own only)
    admin/        # stats, users, report, analytics, activity, settings
    account/      # change own password
    auth/         # NextAuth handler
  login/          # Login page (hero + credentials form)
components/       # UI components (modals, nav/sidebar, gallery, forms, spinner)
lib/              # mongodb, models, auth, session, upload, settings, activity log
public/           # favicon.ico, icon.svg, apple-icon.png
uploads/          # Uploaded images (served at /uploads/*)
proxy.js          # Route protection middleware
```

## API Overview

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/books` | List / create books (own only) |
| PUT/DELETE | `/api/books/[id]` | Update / delete own book |
| GET/POST | `/api/topics` | List / create topics (own only) |
| PUT/DELETE | `/api/topics/[id]` | Update / delete own topic |
| GET/POST | `/api/entries` | Search own entries (`q`, `topicId`) / upload image |
| PUT/DELETE | `/api/entries/[id]` | Edit note / delete own entry |
| GET | `/api/admin/stats` | Dashboard statistics (admin) |
| GET | `/api/admin/report` | Sant-wise activity report (admin) |
| GET | `/api/admin/analytics` | Upload trends, top books/topics (admin) |
| GET | `/api/admin/activity` | Activity/audit log with filters (admin) |
| GET/PUT | `/api/admin/settings` | Site name & tagline (GET all, PUT admin) |
| GET/POST | `/api/admin/users` | List / create sants (admin) |
| PUT/DELETE | `/api/admin/users/[id]` | Update / delete sant (admin) |
| POST | `/api/account/password` | Change own password |

All books, topics and entries are scoped to their creator — each sant sees and
manages only their own data. The admin manages users only (no books, topics or
images).

## License

Private project.
