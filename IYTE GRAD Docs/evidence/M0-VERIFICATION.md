# M0 Verification Record

| Field | Value |
|---|---|
| Verification date | 2026-08-23 |
| Repository | `vardareg/iyte-grad-platform` |
| Branch | `main` |
| Tested commit | `07d32da9278947951be514d267b3c1c5325e68a6` |
| Commit subject | `Initial commit: M0 walking skeleton` |
| Canonical ref check | Live GitHub `refs/heads/main` resolved to the tested commit on 2026-08-23 |
| Result | `VERIFIED` — all M0 exit criteria reproduced from a fresh checkout |
| BUILD criteria affected | None; 0 of 11 remain verified |

## Verification boundary

Before the replay, the local `HEAD`, `origin/main`, and `origin/HEAD` matched the tested SHA. A live `git ls-remote` check then confirmed that the canonical GitHub `main` ref still resolved to that SHA. The replay used a fresh local clone of the committed repository, not the original working tree or its ignored build output. `--no-local --no-hardlinks` prevented working-tree or hard-linked Git-object reuse. The clone was clean and resolved to the tested SHA before and after the replay.

The database used a unique Compose project and newly created named volume. Before Spring ran, `flyway_schema_history` did not exist. The PostGIS image had initialized its packaged extension, and the first Spring context then applied and recorded Flyway V1 successfully against that otherwise fresh database.

Source inspection found only the M0 walking skeleton. No M1 plugin kernel, workflow domain, artifact subsystem, processing engine, distributed runtime, or speculative future placeholder was present or inferred.

## Reproduction environment

| Tool or runtime | Verified version or identity |
|---|---|
| Operating system | Linux `7.1.9-200.fc44.x86_64`, x86_64 |
| Git | 2.55.0 |
| Java runtime | OpenJDK 25.0.4, compiling with `--release 21` |
| Maven wrapper | 3.9.11 |
| Spring Boot | 4.1.0 |
| Node.js | 24.15.0 |
| npm | 11.16.0 |
| React | 19.2.8 |
| TypeScript | 6.0.2 |
| Vite | 8.1.5 |
| Vitest | 4.1.10 |
| Docker CLI / Compose | 29.7.2 / 5.1.4 |
| Container engine | Podman 5.8.4 through a temporary Docker-compatible API socket |
| PostgreSQL | 17.10 |
| PostGIS | Extension 3.5.7; `PostGIS_Version()` reported 3.5 |
| Image | `postgis/postgis:17-3.5-alpine` |
| Image ID | `sha256:c6f08fdb276027fd620d2ca74bdf928143d9322305b51fad02aac71f0a93e9ab` |
| Reported image digests | `sha256:61cb994f576480f5736974e5c9aff965d039d965301bcaec9c7ea72f94b61908`, `sha256:a7b31f03d1802e66d4d840ba31f20f9f3a8d3ffb2ba136596370a79356d6a327` |

## Exact successful command sequence

### Fresh checkout and versions

From the source workspace, the live canonical ref was verified:

```bash
git ls-remote origin refs/heads/main
```

It returned `07d32da9278947951be514d267b3c1c5325e68a6` for `refs/heads/main`.

From `/tmp`:

```bash
mktemp -d /tmp/iyte-m0-verify.XXXXXX
git clone --no-local --no-hardlinks --branch main --single-branch /home/egehan/Documents/Projects/IYTE/GradProject /tmp/iyte-m0-verify.AGK5Vp/repo
```

From `/tmp/iyte-m0-verify.AGK5Vp/repo`:

```bash
git status --short --branch
git rev-parse HEAD
git log -1 --format='%H%n%ad%n%s' --date=iso-strict
java -version
node --version
npm --version
docker compose version
curl --version | sed -n '1,2p'
git --version
podman version
docker compose -p iyte-m0-verify-agk5vp config
```

From `/tmp/iyte-m0-verify.AGK5Vp/repo/backend`:

```bash
MAVEN_USER_HOME=/tmp/iyte-m0-verify.AGK5Vp/maven-home \
  ./mvnw -Dmaven.repo.local=/tmp/iyte-m0-verify.AGK5Vp/m2 --version
```

### Isolated database

From `/tmp`, the temporary engine bridge was started and kept attached:

```bash
podman system service --time=0 unix:///tmp/iyte-grad-podman.sock
```

From `/tmp/iyte-m0-verify.AGK5Vp/repo`:

```bash
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock docker version
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock docker ps --all --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp up -d --wait database

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp ps

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp exec -T database \
  psql -U iyte -d iyte_grad -Atqc \
  "SELECT to_regclass('public.flyway_schema_history');"

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp exec -T database \
  psql -U iyte -d iyte_grad -Atqc \
  "SELECT extversion FROM pg_extension WHERE extname='postgis';"
```

### Backend, migration, and APIs

From `/tmp/iyte-m0-verify.AGK5Vp/repo/backend`:

```bash
MAVEN_USER_HOME=/tmp/iyte-m0-verify.AGK5Vp/maven-home \
  ./mvnw -Dmaven.repo.local=/tmp/iyte-m0-verify.AGK5Vp/m2 test
```

From `/tmp/iyte-m0-verify.AGK5Vp/repo`:

```bash
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp exec -T database \
  psql -U iyte -d iyte_grad -P pager=off \
  -c 'SELECT installed_rank, version, description, type, script, success FROM flyway_schema_history ORDER BY installed_rank;'

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp exec -T database \
  psql -U iyte -d iyte_grad -Atqc "SELECT PostGIS_Version();"
```

From `/tmp/iyte-m0-verify.AGK5Vp/repo/backend`, Spring Boot was started and kept attached:

```bash
MAVEN_USER_HOME=/tmp/iyte-m0-verify.AGK5Vp/maven-home \
  ./mvnw -Dmaven.repo.local=/tmp/iyte-m0-verify.AGK5Vp/m2 spring-boot:run
```

From `/tmp/iyte-m0-verify.AGK5Vp/repo`:

```bash
curl --fail --silent --show-error --dump-header - \
  http://localhost:8080/api/system/status
curl --fail --silent --show-error --dump-header - \
  http://localhost:8080/actuator/health
```

### Frontend and proxy

From `/tmp/iyte-m0-verify.AGK5Vp/repo/frontend`:

```bash
npm_config_cache=/tmp/iyte-m0-verify.AGK5Vp/npm-cache npm ci
npm run lint
npm run test
npm run build
npm run dev
```

Vite remained attached while these commands ran from the same directory:

```bash
curl --fail --silent --show-error --dump-header - \
  http://localhost:5173/
curl --fail --silent --show-error --dump-header - \
  http://localhost:5173/api/system/status
```

### Runtime identity and cleanup

From `/tmp/iyte-m0-verify.AGK5Vp/repo`:

```bash
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker image inspect postgis/postgis:17-3.5-alpine \
  --format '{{.Id}} {{json .RepoDigests}}'

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp exec -T database postgres --version

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp exec -T database \
  psql -U iyte -d iyte_grad -Atqc 'SELECT version();'

uname -srmo
```

Vite and Spring Boot each received `Ctrl-C`. Vite exited; Spring completed graceful shutdown and Maven reported `BUILD SUCCESS`. The documented non-volume cleanup then ran:

```bash
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp down

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker ps --all --filter label=com.docker.compose.project=iyte-m0-verify-agk5vp --format '{{.Names}}'
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker network ls --filter name=iyte-m0-verify-agk5vp_default --format '{{.Name}}'
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker volume ls --filter name=iyte-m0-verify-agk5vp_postgres-data --format '{{.Name}}'
```

The container and network queries were empty; the volume query returned the expected retained verification volume. It was then removed explicitly:

```bash
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker compose -p iyte-m0-verify-agk5vp down --volumes

DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker ps --all --filter label=com.docker.compose.project=iyte-m0-verify-agk5vp --format '{{.Names}}'
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker network ls --filter name=iyte-m0-verify-agk5vp_default --format '{{.Name}}'
DOCKER_HOST=unix:///tmp/iyte-grad-podman.sock \
  docker volume ls --filter name=iyte-m0-verify-agk5vp_postgres-data --format '{{.Name}}'

curl --fail --silent --show-error --connect-timeout 2 http://localhost:8080/actuator/health
curl --fail --silent --show-error --connect-timeout 2 http://localhost:5173/
```

The three final resource queries returned no results. The two curls intentionally exited 7 because both listeners were gone. The Podman bridge then received `Ctrl-C` and exited successfully.

Final clone checks from `/tmp/iyte-m0-verify.AGK5Vp/repo` were:

```bash
git status --short --branch
git rev-parse HEAD
```

After returning to `/tmp`, the disposable checkout and socket absence were checked:

```bash
rm -rf /tmp/iyte-m0-verify.AGK5Vp
test ! -e /tmp/iyte-m0-verify.AGK5Vp
test ! -e /tmp/iyte-grad-podman.sock
```

The clone remained clean at the tested SHA, and both absence checks passed.

## Required check results

| # | Required check | Result | Reproduced evidence |
|---|---|---|---|
| 1 | Compose configuration is valid | `PASS` | Rendered isolated configuration; exit 0 |
| 2 | PostgreSQL/PostGIS starts | `PASS` | Isolated database became healthy on port 5432; PostGIS extension 3.5.7 was queryable |
| 3 | Flyway applies V1 to a clean database | `PASS` | History table absent before Spring; afterward exactly rank 1/version 1/`V1__enable_postgis.sql`/success `t` was recorded |
| 4 | Backend tests pass | `PASS` | 2 tests; 0 failures, errors, or skips; Maven `BUILD SUCCESS` |
| 5 | Spring Boot starts against PostGIS | `PASS` | Application reached `ACCEPTING_TRAFFIC`; later shut down gracefully with `BUILD SUCCESS` |
| 6 | `/api/system/status` works | `PASS` | HTTP 200 and `{"service":"iyte-grad-platform","status":"UP","phase":"M0_WALKING_SKELETON"}` |
| 7 | `/actuator/health` works | `PASS` | HTTP 200 and `{"groups":["liveness","readiness"],"status":"UP"}` |
| 8 | `npm ci` succeeds | `PASS` | 56 packages added, 57 audited, 0 vulnerabilities |
| 9 | Frontend lint passes | `PASS` | `oxlint .`; exit 0 |
| 10 | Frontend tests pass | `PASS` | 1 file and 1 test passed |
| 11 | Frontend production build succeeds | `PASS` | TypeScript/Vite build completed; 16 modules transformed |
| 12 | Vite starts | `PASS` | Vite ready on port 5173 in 290 ms; root returned HTTP 200 |
| 13 | Frontend reaches backend through the proxy | `PASS` | Port 5173 `/api/system/status` returned the same HTTP 200 Spring response |
| 14 | Cleanup is self-contained | `PASS` | Documented `down` removed container/network and retained its volume; isolated `down --volumes` removed that volume; resources, listeners, socket, and checkout were absent afterward |

## M0 exit-gate assessment

Every exit condition in `PROJECT_STATUS.md` passed:

1. A fresh checkout started PostgreSQL/PostGIS and recorded Flyway V1 against a database with no prior Flyway history.
2. Spring Boot started against that database.
3. The React/TypeScript application installed and built.
4. Both backend tests and the frontend test passed.
5. Startup, proxy behavior, ordinary shutdown, isolated volume cleanup, and listener removal were repeatable from recorded commands.
6. Inspection confirmed that no BUILD domain feature is represented as implemented.

M0 is therefore `VERIFIED`. This infrastructure milestone does not verify any of the 11 BUILD acceptance criteria.

## Environment adaptations and limitations

- No Docker daemon was available at `/var/run/docker.sock`. Docker Compose 5.1.4 executed against a temporary Podman 5.8.4 API bridge. The Compose, PostGIS, migration, application, and cleanup behavior was executed rather than inferred; a native Docker engine was not separately tested.
- The sandbox blocked default home-directory writes, initial dependency-network access, direct engine-socket access, and one initial local Vite request. Isolated Maven/npm caches and approved runtime/network access were used, and every product check was rerun successfully. Failed preliminary environment attempts are not counted as evidence.
- The configured PostGIS tag is mutable. The image ID and both digests reported by the runtime are recorded above for this replay.
- Historical working-tree results were not used as substitutes for this clean-checkout replay.
