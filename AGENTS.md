# Repository Guidelines

## Project Structure & Module Organization

This remote-sensing workflow platform currently implements the M0 walking skeleton.

- `backend/src/main/java/tr/edu/iyte/gradplatform/`: Java 21/Spring Boot application and system-status API.
- `backend/src/main/resources/`: configuration and Flyway migrations in `db/migration/`.
- `backend/src/test/java/`: backend unit and integration tests.
- `frontend/src/`: React/TypeScript components, CSS, and colocated tests; keep UI assets alongside their consumers.
- `compose.yaml`: PostgreSQL/PostGIS development dependency.
- `IYTE GRAD Docs/`: project definition, scope, architecture, ADRs, status, and verification evidence.

## Build, Test, and Development Commands

Use JDK 21+, Node.js 22.12+, npm 10+, and Docker Compose. Run Compose commands from the repository root:

- `docker compose up -d --wait database`: start PostGIS and await readiness.
- `docker compose down`: stop infrastructure while retaining database data.

From `backend/`:

- `./mvnw spring-boot:run`: start the API on port 8080.
- `./mvnw test`: run backend tests with PostGIS running.
- `./mvnw package`: test and package the application.

From `frontend/`:

- `npm ci`: install locked dependencies.
- `npm run dev`: serve the UI on port 5173 with the backend proxy.
- `npm run lint`: run Oxlint.
- `npm run test` / `npm run test:watch`: run Vitest once or interactively.
- `npm run build`: check TypeScript and build production assets.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF, final newlines, two-space indentation, and four spaces for Java. Match existing TypeScript single quotes and omitted semicolons. Use PascalCase for Java classes and React components, camelCase for methods and variables, and lowercase Java packages. Name migrations `V<number>__<description>.sql`. Oxlint provides frontend linting; no dedicated formatter is configured.

## Testing Guidelines

Use JUnit 5/Spring Boot tests named `*Test.java` or `*Tests.java`. Integration tests use the configured PostGIS database and apply Flyway migrations. Frontend tests use Vitest's Node environment and `*.test.tsx`; the existing smoke test renders static markup. Test meaningful changed behavior. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

History uses concise, imperative subjects, such as “Establish source governance and verify M0”; no enforced prefix convention exists. Keep commits focused. PRs should explain behavior changes, reference relevant issues or ADRs, report checks performed, and include screenshots for UI changes.

## Scope & Configuration

Follow `IYTE GRAD Docs/SOURCE_AUTHORITY.md` and accepted scope/ADRs; distinguish planned capabilities from implemented behavior. Keep milestone claims backed by evidence. Copy `.env.example` for local customization; align backend `IYTE_DB_URL`, `IYTE_DB_USER`, and `IYTE_DB_PASSWORD` with Compose settings. Keep credentials out of commits.
