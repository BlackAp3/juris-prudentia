# Juris Prudentia

Juris Prudentia is a law-student learning platform consisting of an Expo mobile app for Android and iOS, a Next.js administrative portal, an Express API, and shared TypeScript packages.

## Applications

- `apps/mobile` — student-facing Expo application
- `apps/admin` — administrative portal
- `apps/api` — REST API
- `packages/database` — Prisma schema and database client
- `packages/types` — shared domain types
- `packages/validation` — shared Zod validation

## Start locally

1. Copy `.env.example` to `.env` and update `DATABASE_URL`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate`.
4. Run the API with `npm run dev:api`.
5. In separate terminals, run `npm run dev:admin` and `npm run dev:mobile`.

The project currently includes a complete navigable UI prototype: 17 student-mobile screens and 10 responsive administrative routes. See `docs/UI_MAP.md` for the screen inventory. Authentication, CRUD endpoints, file storage, notifications, moderation actions and analytics data will be connected in later implementation stages.
