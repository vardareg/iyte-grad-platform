# M0 Verification Record

| Field | Value |
|---|---|
| Date | 2026-08-11 |
| Milestone | M0 — Repository and walking skeleton |
| Result | Partial exit evidence recorded; clean-checkout replay pending |
| BUILD criteria affected | None |

## Verified repository state

- Git repository initialized on branch `main`.
- Backend, frontend, Compose infrastructure, migrations, tests, lockfiles, wrapper, and setup guide are present.
- No M1 plugin kernel, workflow domain, artifact subsystem, processing plugin, distributed runtime, or future placeholder was introduced.

## Toolchain used

| Tool | Verified version |
|---|---|
| Java runtime | OpenJDK 25.0.4, compiling with `--release 21` |
| Maven wrapper | 3.9.11 |
| Spring Boot | 4.1.0 |
| Node.js | 24.15.0 |
| npm | 11.16.0 |
| React | 19.2.8 |
| TypeScript | 6.0.2 |
| Vite | 8.1.5 |
| Vitest | 4.1.10 |
| PostgreSQL/PostGIS image | `postgis/postgis:17-3.5-alpine` |

## Executed checks

### Repository and configuration

- `git init -b main` initialized the repository.
- `docker compose config --quiet` accepted `compose.yaml`.
- A workspace source scan found no trailing-whitespace errors in the scaffold.

### Frontend

- `npm ci` installed the locked dependency graph and reported zero known vulnerabilities.
- `npm run lint` passed.
- `npm run test` passed 1 test in 1 test file.
- `npm run build` completed a production Vite build.
- `npm run dev -- --host 127.0.0.1` started Vite 8.1.5 on port 5173.
- `GET /` returned the application HTML.
- `GET /api/system/status` through the Vite development proxy returned the Spring response with status `UP`.

### Database, migration, and backend

- The unmodified Compose definition started a healthy `database` service through Docker Compose using a temporary Podman API bridge because the host Docker daemon was not running.
- The first Spring context start connected to PostgreSQL 17.10 and Flyway applied `V1__enable_postgis.sql` to an empty schema.
- `./mvnw test` passed 2 tests:
  - `GradPlatformApplicationTests.applicationStartsAgainstPostgis` started the Spring context and returned a non-empty value from `PostGIS_Version()`;
  - `SystemStatusControllerTest.reportsTheWalkingSkeletonStatus` verified the M0 system-status contract.
- The packaged application started on port 8080 against the Compose database.
- `GET /api/system/status` returned `{"service":"iyte-grad-platform","status":"UP","phase":"M0_WALKING_SKELETON"}`.
- `GET /actuator/health` returned overall `UP`; database connectivity was proven separately by the PostGIS integration test without exposing infrastructure details publicly.

### Cleanup

- The backend and Vite development processes were stopped.
- Compose removed the verification container and network without deleting the named database volume.
- The temporary Podman API bridge was stopped.

## Remaining M0 evidence

The scaffold was verified in the working repository, but no initial commit or independent clean checkout existed during this run. M0 therefore remains `IN PROGRESS`.

After the first intentional commit:

1. create a clean checkout;
2. follow the root `README.md` without undocumented steps;
3. record the commit identifier and the clean-checkout command results here;
4. mark M0 `VERIFIED` only if every exit condition in `PROJECT_STATUS.md` passes.
