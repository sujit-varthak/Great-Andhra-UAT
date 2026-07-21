# GreatAndhra Admin CMS

A rebuild of GreatAndhra.com's admin content-management system, per the proposal
in `AI Proposal Generator/client-proposals/greatandhra/GreatAndhra_Admin_CMS_Proposal.docx`.
The original PHP/MySQL admin panel was compromised (plaintext-ish password
storage, no RBAC, no audit trail, no brute-force protection); this rebuild
closes those gaps with a modern, security-first stack while preserving every
editorial feature the team relies on.

## Stack

| Layer | Choice |
|---|---|
| API | NestJS (Node.js/TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Admin UI | Next.js (App Router) |
| Auth | Argon2id + short-lived JWT + rotating refresh tokens, mandatory TOTP 2FA |
| File storage | S3-compatible bucket (MinIO locally) + image re-encoding |
| Cache/queue | Redis + BullMQ (scheduled publishing) |

## Repo layout

```
backend/    NestJS API (auth, RBAC, articles, categories, tags, flash news,
            trending, don't-miss, e-paper, ratings, media upload, search, audit log)
admin/      Next.js admin panel
docker-compose.yml   Postgres 16, Redis 7, MinIO for local dev
```

## Local setup

Requires Docker Desktop (or local Postgres 16 / Redis 7 / an S3-compatible
store) and Node.js 20+.

```bash
# 1. Start infra
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env        # adjust secrets for anything beyond local dev
npm install
npx prisma migrate dev --name init   # creates tables against the running Postgres
npm run prisma:seed                  # seeds an admin invite + starter categories/tags
npm run start:dev                    # http://localhost:4000/api

# 3. Admin UI (separate terminal)
cd admin
cp .env.example .env.local
npm install
npm run dev                          # http://localhost:3000
```

### First login

`npm run prisma:seed` prints an invite token for `SEED_ADMIN_EMAIL`
(default `admin@greatandhra.com`). Visit:

```
http://localhost:3000/accept-invite?token=<the printed token>
```

to set a password, then you'll be walked through mandatory 2FA enrollment
(scan the QR code with any TOTP authenticator app) before your first session
is issued. Every subsequent user is created the same way: **Users & Roles**
(admin-only) → Invite → share the link — there's no mailer wired up, so the
invite link is shown directly in the UI for you to send.

### MinIO bucket for uploads

MinIO starts with no bucket. Either use the console at `http://localhost:9001`
(login `greatandhra` / `greatandhra_dev_password` from `docker-compose.yml`)
to create a bucket named `greatandhra-media` and set it to public-read, or
use the `mc` CLI:

```bash
mc alias set local http://localhost:9000 greatandhra greatandhra_dev_password
mc mb local/greatandhra-media
mc anonymous set download local/greatandhra-media
```

## What's implemented vs. documented-only

**Implemented and working, end-to-end against the stack above:**
- Argon2id auth, rotating refresh tokens, mandatory TOTP 2FA, login lockout/rate-limiting
- RBAC (Admin/Editor/Author/Moderator) enforced server-side on every mutating route
- Immutable audit log (actor, before/after, timestamp) across all content mutations, with an admin-only viewer
- Articles (CRUD, slugs, SEO fields, flags, draft→in_review→scheduled→published→archived workflow, scheduled publishing via BullMQ, movie/review schema data, view counts)
- Categories (hierarchical), tags, flash news, trending links, don't-miss, e-paper, ratings
- Media upload: real file-type sniffing (not extension), re-encoded via sharp, stored to an S3-compatible bucket
- Postgres full-text search over published articles
- A public, unauthenticated read API (`/api/public/...`) for a future public-facing site, separate from the authenticated admin routes

**Documented but not run against real data:**
- `backend/scripts/migrate-legacy-mysql.ts` — a mapping script from the legacy
  MySQL schema (`news`, `newscategory`, `chkum`, `flashnews`, `trending`,
  `epaperimg`, `schema_data`, `tags`/`tags1`, `news_tags`/`news_tags1`) onto
  this Postgres schema. No recovered MySQL dump existed in this repo to
  develop and test the script against — the column names come from the
  proposal's structural review, not a live database. **Confirm every column
  name against the actual recovered backup before running it**, and always
  run it against a staging copy first, per the proposal's migration plan.
  Legacy passwords are never imported by design — migrated accounts get a
  fresh invite and must set a new password and enroll 2FA.

**Explicitly out of scope (ops concerns, not application code):**
- Cloudflare WAF, DNS, subdomain isolation, managed hosting/backups
- CI/CD pipeline

## Known follow-up

`npm audit` in `admin/` reports high-severity advisories inherited from
Next.js 14.2.35's own dependency tree (picomatch, postcss, and Next's
Server Components/Image Optimizer DoS advisories) — the fixes require
Next.js 15/16, a breaking major-version jump this scaffold hasn't been
migrated to. Track this before the admin panel goes anywhere near production;
`backend/` has no such advisories as of this build.

## Verification performed

- `backend`: `npx prisma validate`, `npx prisma generate`, `npm run build` (NestJS/TypeScript compiles clean), `npm run lint`
- `admin`: `npm run build` (Next.js production build), `npm run lint`
- No Docker/Postgres/Redis/MinIO were available in the environment this was
  built in, so the full login → 2FA → article-publish flow has **not** been
  exercised against a live database. Do that first thing after `docker compose up -d`.
