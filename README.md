# Book Knowledge

A digital library for organizing sant vachans — manage books, topics and page-wise image uploads, with search, gallery, and role-based access for **Admins** and **Sants**.

## Features

### Admin
- Dashboard with stats (sants, books, topics, images) and recent uploads
- Manage sants (add, edit, enable/disable, reset password, delete)
- Manage books (add with cover, edit, delete, search)
- Manage topics (add, edit, delete)
- Browse, search and edit notes for all uploaded images

### Sant
- Dashboard with personal entries gallery
- New entry upload — select book + topic, page number, image, short note
- Add book / add topic directly from the entry form
- Topic-wise search and gallery view with lightbox
- Edit notes and delete own entries

### Common
- Emerald + Slate UI with Ant Design components (modals, drawer sidebar, icons)
- Responsive layout — persistent sidebar on desktop, hamburger + drawer on tablet/mobile
- JWT session auth via NextAuth (credentials), role-based routing (`/admin`, `/sant`)
- MongoDB storage, image uploads served from `/uploads`

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
  admin/          # Admin pages (dashboard, sants, books, topics, images)
  sant/           # Sant pages (dashboard, entry, books, search, gallery)
  api/            # REST API routes
    books/        # GET, POST, PUT, DELETE
    topics/       # GET, POST, PUT, DELETE
    entries/      # GET (search), POST (upload), PUT, DELETE
    admin/        # stats, users management
    auth/         # NextAuth handler
  login/          # Login page (hero + credentials form)
components/       # UI components (modals, nav/sidebar, gallery, forms)
lib/              # mongodb, models, auth, session, upload helpers
uploads/          # Uploaded images (served at /uploads/*)
proxy.js          # Route protection middleware
```

## API Overview

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/books` | List / create books |
| PUT/DELETE | `/api/books/[id]` | Update / delete book |
| GET/POST | `/api/topics` | List / create topics |
| PUT/DELETE | `/api/topics/[id]` | Update / delete topic |
| GET/POST | `/api/entries` | Search entries (`q`, `topicId`, `mine=1`) / upload image |
| PUT/DELETE | `/api/entries/[id]` | Edit note / delete entry |
| GET | `/api/admin/stats` | Dashboard statistics (admin) |
| GET/POST | `/api/admin/users` | List / create sants (admin) |
| PUT/DELETE | `/api/admin/users/[id]` | Update / delete sant (admin) |

## License

Private project.
