# Architecture

The platform uses a TypeScript monorepo so the mobile application, admin portal and API can share domain contracts and validation rules while remaining independently deployable.

## Boundaries

- Mobile consumes the REST API and never connects directly to PostgreSQL.
- Admin consumes the same REST API using administrator permissions.
- API owns authorization, business rules and persistence.
- Shared packages contain contracts and validation, not application-specific UI.

## Initial roles

- `STUDENT`: reads learning material, tracks progress and participates in discussions.
- `CONTENT_EDITOR`: manages courses, topics, notes, cases, statutes and news.
- `MODERATOR`: reviews reports and moderates community activity.
- `ADMIN`: manages configuration and users.
- `SUPER_ADMIN`: full platform control.

## API namespace

All application endpoints use `/api/v1`. The unversioned `/health` endpoint is reserved for infrastructure health checks.
