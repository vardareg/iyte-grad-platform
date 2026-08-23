# İYTE Remote-Sensing Workflow Platform

This repository is the M0 walking skeleton for the İYTE graduation project described in [`IYTE GRAD Docs`](IYTE%20GRAD%20Docs/PROJECT_DEFINITION.md). It establishes the approved runtime stack without claiming that plugin, workflow, artifact, or execution behavior is implemented.

## What exists in M0

- a Java 21 Spring Boot modular-monolith entry point;
- a minimal system-status API and Spring Boot health endpoint;
- PostgreSQL/PostGIS through Docker Compose;
- a Flyway migration that enables PostGIS;
- a React and TypeScript application built with Vite;
- backend integration and unit smoke tests;
- a frontend render smoke test;
- reproducible local startup and verification commands.

The plugin kernel and all workflow-domain capabilities begin in M1 or later. The current scaffold deliberately contains no placeholder `MLService`, distributed queue, Redis, MinIO, microservice, runtime plugin loader, or other out-of-scope infrastructure.

## Repository layout

```text
.
├── backend/          Spring Boot application and Flyway migrations
├── frontend/         React/TypeScript web application
├── IYTE GRAD Docs/   Accepted project definition, scope, architecture, ADRs, and status
└── compose.yaml      Required PostgreSQL/PostGIS dependency
```

## Prerequisites

- JDK 21 or newer (the build targets Java 21)
- Docker with Docker Compose
- Node.js 22.12 or newer
- npm 10 or newer

Maven is provided by the checked-in backend wrapper.

## Start from a clean checkout

The checked-in development defaults work without a local `.env`. To customize the Compose database, copy `.env.example` to `.env`. If you change its database name, user, password, or port, also provide matching `IYTE_DB_URL`, `IYTE_DB_USER`, and `IYTE_DB_PASSWORD` environment variables when starting the backend.

Start PostGIS and wait for it to become healthy:

```bash
docker compose up -d --wait database
```

In one terminal, start the backend:

```bash
cd backend
./mvnw spring-boot:run
```

In another terminal, install the locked frontend dependencies and start Vite:

```bash
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. The page calls the backend through the Vite development proxy. Backend status is also available at:

```bash
curl --fail http://localhost:8080/api/system/status
curl --fail http://localhost:8080/actuator/health
```

## Verify M0

Keep the Compose database running, then execute:

```bash
cd backend
./mvnw test
```

The backend integration test starts the Spring context, applies Flyway migrations, and queries `PostGIS_Version()` against the Compose database.

Then verify the frontend:

```bash
cd frontend
npm ci
npm run lint
npm run test
npm run build
```

Stop local infrastructure without deleting the database volume:

```bash
docker compose down
```

## Source of truth

- [Project definition](IYTE%20GRAD%20Docs/PROJECT_DEFINITION.md)
- [Implementation scope](IYTE%20GRAD%20Docs/IMPLEMENTATION_SCOPE.md)
- [Current architecture](IYTE%20GRAD%20Docs/CURRENT_ARCHITECTURE.md)
- [Project status and milestones](IYTE%20GRAD%20Docs/PROJECT_STATUS.md)
- [Latest M0 verification record](IYTE%20GRAD%20Docs/evidence/M0-VERIFICATION.md)

Repository behavior and passing tests are implementation evidence; the planning documents describe accepted intent.
