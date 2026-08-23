# Project Status — İYTE Graduation Project

| Field | Value |
|---|---|
| Status | Active implementation record |
| Version | 1.2 |
| Planning baseline accepted | 2026-08-11 |
| Last updated | 2026-08-23 |
| Current phase | Implementation — M1 ready to begin |
| Current milestone | M1 — Plugin kernel and core contracts (`NOT STARTED`; next) |
| Overall implementation status | `IN PROGRESS` |
| Verified BUILD acceptance criteria | 0 of 11 |
| Source governance | [`SOURCE_AUTHORITY.md`](SOURCE_AUTHORITY.md) |
| Governing definition | `PROJECT_DEFINITION.md` |
| Governing scope | `IMPLEMENTATION_SCOPE.md` |
| Governing architecture | `CURRENT_ARCHITECTURE.md` version 1.6 and accepted `decisions/ADR-*.md` files |

## 1. Purpose and authority

This document is the evidence-backed planning and progress record for the project. It identifies:

- the verified current baseline;
- the active milestone and immediate next action;
- the ordered implementation milestones and their exit evidence;
- the BUILD acceptance checklist;
- current implementation-level choices, risks, and blockers.

This document does not redefine the project, scope, or architecture:

- [`SOURCE_AUTHORITY.md`](SOURCE_AUTHORITY.md) governs canonical location, source ownership, and conflict handling.
- `PROJECT_DEFINITION.md` governs the problem, contribution, boundary, and success concept.
- `IMPLEMENTATION_SCOPE.md` governs BUILD, STRETCH, FUTURE, and OUT-OF-SCOPE classifications.
- `CURRENT_ARCHITECTURE.md` and accepted ADRs govern intended design and rationale.
- the repository, executable tests, and repeatable demonstrations govern implementation claims.

Acceptance of this document accepts the recorded baseline, ordering, evidence rules, and next milestone. It does not mean that any planned component is implemented or that any BUILD acceptance criterion has passed.

If this document conflicts with repository evidence, repository evidence governs implementation status. If it conflicts with scope or architecture, the conflict is documentation drift and must not be silently reconciled.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| `NOT STARTED` | No qualifying implementation evidence exists. |
| `IN PROGRESS` | Work exists, but the milestone exit evidence is incomplete or failing. |
| `BLOCKED` | Progress cannot continue until a named dependency or decision is resolved. |
| `VERIFIED` | The required behavior is supported by identified repository, test, or repeatable demonstration evidence. |

A document, interface, class name, stub, mock without behavioral verification, or unexecuted test does not make an item `VERIFIED`.

Milestone status and scope classification are separate. BUILD describes necessity; `VERIFIED` describes evidence.

## 3. Verified baseline

### 3.1 Accepted planning sources

| Source | Accepted state | Role |
|---|---|---|
| `PROJECT_DEFINITION.md` | Version 1.0, accepted 2026-08-11 | Problem, contribution, stakeholders, boundary, and success concept |
| `IMPLEMENTATION_SCOPE.md` | Version 1.0, accepted 2026-08-11 | BUILD, STRETCH, FUTURE, and OUT-OF-SCOPE classifications |
| `CURRENT_ARCHITECTURE.md` | Version 1.6, accepted intended architecture; implementation unverified | Consolidated intended design |
| `ADR-001` through `ADR-006` | Accepted 2026-08-11 | Material architecture decisions and rationale |

No currently planned architecture ADR remains pending.

### 3.2 Pre-implementation repository baseline

At the 2026-08-11 baseline inspection, the project workspace contained the three accepted planning sources and `ADR-001` through `ADR-006`. It did not contain:

- a Git repository;
- backend or frontend source code;
- build manifests or dependency locks;
- Docker Compose configuration;
- database migrations;
- automated tests or test reports;
- a GeoTIFF fixture;
- an acceptance script or traceability matrix;
- a runnable application.

At that baseline, therefore:

- implementation had not started;
- all implementation milestones were `NOT STARTED`;
- none of the 11 BUILD acceptance criteria was verified;
- every architectural implementation claim was unverified.

This historical baseline is intentionally conservative. Later status updates must cite the exact evidence that changed a status.

### 3.3 M0 scaffold evidence

The 2026-08-11 scaffold established:

- an initialized Git repository with root, backend, frontend, infrastructure, and retained planning-document layout;
- a Maven/Spring Boot 4.1.0 backend targeting Java 21 under package namespace `tr.edu.iyte.gradplatform`;
- a React 19.2.8 and TypeScript 6.0.2 frontend built with Vite 8.1.5 and tested with Vitest 4.1.10;
- a PostgreSQL 17/PostGIS 3.5 Compose service and a versioned Flyway migration;
- a checked-in Maven 3.9.11 wrapper and npm lockfile;
- a setup guide with exact start, test, health-check, and non-destructive shutdown commands.

Executed evidence is recorded in [`evidence/M0-VERIFICATION.md`](evidence/M0-VERIFICATION.md). On 2026-08-23, the full M0 sequence was reproduced from a fresh checkout of committed `main` at `07d32da9278947951be514d267b3c1c5325e68a6`. It proves Compose validation, clean-database migration application, PostGIS access, backend tests and startup, both HTTP status paths, frontend install/lint/test/build/start, the Vite-to-Spring proxy path, and isolated cleanup.

M0 is `VERIFIED`. No M1 domain contract or BUILD acceptance criterion is claimed by this foundation work; M1 remains `NOT STARTED` and is the next milestone.

## 4. Completed milestone: M0 — Repository and walking skeleton

### 4.1 Goal

Establish a reproducible, runnable, and testable foundation for the approved stack before implementing plugin, workflow, artifact, or execution behavior.

M0 must prove only that the application skeleton and required local infrastructure work together. It must not expand into domain implementation.

### 4.2 Work items

| Work item | Required outcome | Status |
|---|---|---|
| M0.1 Repository foundation | A Git repository with a coherent backend, frontend, infrastructure, and documentation layout | `VERIFIED` — committed layout reproduced from a fresh checkout on 2026-08-23 |
| M0.2 Backend skeleton | A Java 21/Spring Boot application starts and exposes a minimal health or smoke-test path | `VERIFIED` — clean-checkout application start and both HTTP paths passed 2026-08-23 |
| M0.3 Frontend skeleton | A React/TypeScript application installs, builds, tests, and starts | `VERIFIED` — clean-checkout install, lint, test, build, and Vite start passed 2026-08-23 |
| M0.4 Database dependency | PostgreSQL/PostGIS starts through Docker Compose and is reachable by the backend | `VERIFIED` — isolated Compose health and backend access passed 2026-08-23 |
| M0.5 Migration foundation | The selected migration mechanism applies an initial controlled migration to a clean database | `VERIFIED` — absent pre-run Flyway history followed by successful V1 recorded 2026-08-23 |
| M0.6 Test harness | Backend unit/integration and frontend test commands execute successfully | `VERIFIED` — 2 backend and 1 frontend tests passed from the clean checkout 2026-08-23 |
| M0.7 Reproducible startup | A short setup guide records prerequisites and exact commands for a clean checkout | `VERIFIED` — startup, proxy, and isolated cleanup replayed from committed `main` 2026-08-23 |

### 4.3 M0 exit gate

M0 becomes `VERIFIED` only when repository evidence demonstrates all of the following:

1. A clean checkout can start PostgreSQL/PostGIS and apply migrations.
2. The Spring Boot application starts against that database.
3. The React/TypeScript application installs and builds.
4. The narrow backend and frontend test commands pass.
5. The documented startup sequence is repeatable.
6. No BUILD domain feature is falsely reported as implemented.

All six exit conditions are satisfied by the 2026-08-23 clean-checkout record at `07d32da9278947951be514d267b3c1c5325e68a6`. M0 is closed, and no M1 implementation was performed during closeout.

## 5. Ordered implementation milestones

Milestones are ordered by dependency and demonstration risk. A milestone may begin experimentally before its predecessor is fully closed, but it cannot be marked `VERIFIED` while required predecessor evidence is missing.

| Milestone | Required outcome | Principal exit evidence | Status |
|---|---|---|---|
| M0 — Repository and walking skeleton | Approved runtime stack starts, builds, migrates, and runs its smoke tests reproducibly | Clean-checkout startup record; backend and frontend test results; database migration result | `VERIFIED` — clean-checkout replay passed 2026-08-23 at `07d32da9278947951be514d267b3c1c5325e68a6` |
| M1 — Plugin kernel and core contracts | Plugin categories, descriptors, lifecycle, health, configuration, typed ports, logical data types, capability catalogue, and dependency-injected registry exist without concrete-plugin branching | Contract and registry unit tests; startup rejection tests; lifecycle tests; test-only plugin discovery and invocation | `NOT STARTED` — next milestone |
| M2 — Artifact, catalogue, and ingestion foundation | Opaque immutable references, metadata persistence, local storage abstraction, staged publication, integrity checks, GeoTIFF ingestion, and preview foundation work | Artifact and persistence integration tests; path-safety and tamper tests; successful ingestion of a controlled GeoTIFF fixture | `NOT STARTED` |
| M3 — Pipeline definitions and validation | Persistent revisions, typed DAG construction, external input/result bindings, deterministic validation, and pre-execution rejection work | Persistence tests; linear/fan-out/fan-in graph tests; invalid-edge, cycle, parameter, missing-input, and missing-plugin tests | `NOT STARTED` |
| M4 — Resolution and execution subsystem | Immutable snapshot binding, engine resolution, bounded execution, persisted job/stage states, polling, fail-fast propagation, and restart reconciliation work | Resolution, transition, transaction, admission, polling, failure, concurrency-bound, and restart tests | `NOT STARTED` |
| M5 — Required plugins and backend vertical slice | Every mandatory BUILD plugin runs through generic contracts, and the complete workflow succeeds through backend APIs with both processing engines | Plugin-compliance suites; backend end-to-end fixture run; paired engine runs using one unchanged saved graph | `NOT STARTED` |
| M6 — Web demonstration | The user can ingest, compose, validate, execute, monitor, visualize, inspect, and select the processing engine through the approved web application | Repeatable manual web scenario; API/UI integration evidence; map preview and interactive spectral-profile inspection | `NOT STARTED` |
| M7 — Acceptance and academic evidence | All BUILD criteria pass reliably and every material claim is traceable to code, tests, or a repeatable demonstration step | Full test record; acceptance script; traceability matrix; limitation record; rehearsed final demonstration | `NOT STARTED` |

STRETCH work remains closed until M7 verifies every BUILD acceptance criterion.

## 6. BUILD acceptance checklist

The checklist below is derived from `IMPLEMENTATION_SCOPE.md`. All criteria currently lack implementation evidence.

| # | BUILD acceptance criterion | Primary proof point | Required evidence | Status |
|---|---|---|---|---|
| 1 | Plugins are independently registered and discovered. | M1, M5 | Registry tests, test-only extension proof, and application integration test | `NOT STARTED` |
| 2 | Workflow connections are governed by explicit data types. | M1, M3 | Type-contract and compatibility tests plus server-owned descriptors | `NOT STARTED` |
| 3 | Incompatible connections and invalid graphs are rejected before execution. | M3, M6 | Deterministic validator tests and visible rejection in the demo | `NOT STARTED` |
| 4 | Linear, fan-out, and fan-in workflows execute correctly. | M4, M5 | Deterministic execution tests and backend vertical-slice run | `NOT STARTED` |
| 5 | Job and stage progress is understandable to the user. | M4, M6 | Persisted polling API tests and visible delayed mock execution | `NOT STARTED` |
| 6 | Generated results can be visualized and inspected. | M2, M5, M6 | Preview and result tests, map display, bundle expansion, and pixel inspection | `NOT STARTED` |
| 7 | The same logical workflow runs with both BUILD processing engines. | M5, M7 | Two successful jobs from one unchanged saved definition with distinct provider provenance | `NOT STARTED` |
| 8 | Engine replacement requires no workflow, UI, or platform-core redesign. | M5, M7 | Unchanged graph evidence, generic selection UI, and source/test review | `NOT STARTED` |
| 9 | `SpectralProfileTool` reuses one implementation in pipeline and interactive contexts. | M5, M6 | Shared-contract integration tests and interactive demonstration | `NOT STARTED` |
| 10 | Adding or replacing an implementation requires no plugin-specific branch in generic orchestration. | M1, M4, M7 | Test-only provider/plugin proof and generic-core review | `NOT STARTED` |
| 11 | Every material architectural claim is traceable to evidence. | M7 | Completed claim-to-code/test/demo traceability matrix | `NOT STARTED` |

BUILD completion is binary: all 11 criteria must be `VERIFIED`. A percentage, feature count, or fixed code-coverage value cannot substitute for missing behavioral evidence.

## 7. Evidence recording rules

Each status update must record enough information to reproduce or inspect the claim. Depending on the item, evidence should identify:

- the source file or module that implements the behavior;
- the exact automated test class, test case, or suite;
- the executed command and result;
- the database migration or fixture involved;
- the API or UI scenario used;
- the relevant commit or version once a repository exists;
- any limitation or failure still observed.

Planned tests are not evidence until executed. A passing isolated unit test does not prove an integration or web acceptance criterion. Manual evidence must be repeatable and described precisely enough for an evaluator to follow.

When a milestone becomes `VERIFIED`, update this document with its completion date and evidence references. When later evidence invalidates a claim, return it to `IN PROGRESS` or `BLOCKED` and record the regression.

## 8. Implementation-level choices tracked during delivery

The architecture leaves the following choices to delivery. The M0 stack choices are resolved by the repository evidence in section 3.3; later choices remain open. These choices do not require a new ADR unless they change an accepted boundary or public contract.

| Choice | Resolve by | Constraint |
|---|---|---|
| Java build tool, package namespace, and concrete module layout | M0 | Preserve the Java 21/Spring Boot modular-monolith boundary |
| Frontend scaffold, package manager, and test runner | M0 | Preserve React/TypeScript and reproducible builds |
| Database migration tool and initial schema organization | M0–M2 | PostgreSQL/PostGIS remains authoritative for accepted metadata and state |
| Parameter-schema representation and validation issue DTOs | M1–M3 | Server-owned deterministic validation remains authoritative |
| Checksum algorithm, artifact directory layout, and staging technique | M2 | Preserve opaque identity, immutability, integrity checks, and no path exposure |
| Exact limited `LightweightEngine` transformation | M5 | Be honest, deterministic enough to test, and compatible with `raster.prepare` |
| Executor bounds, queue capacity, progress rounding, and polling interval | M4–M6 | Preserve bounded execution, fail-fast behavior, and persisted polling authority |
| Raster preview and frontend map libraries | M2–M6 | A generated overlay is sufficient; no tile-server expansion |

## 9. Current risks and controls

| Risk | Consequence | Control |
|---|---|---|
| Scope expands into ML, microservices, distributed queues, object storage, or advanced GIS behavior | The required end-to-end path is delayed | Enforce BUILD-first ordering and the M7 gate; create no speculative placeholders |
| GeoTIFF metadata, raster transformation, or preview tooling proves difficult late | Ingestion and visualization block the final demo | Use one small controlled fixture and validate the narrow raster path in M2 before UI work |
| The visual DAG editor grows into a general workflow designer | Frontend complexity dominates the project | Support only the accepted typed stages, single-valued ports, linear flow, fan-out, and named-input fan-in |
| Filesystem publication and database persistence fail between boundaries | Unreferenced storage may remain | Preserve ADR-004 semantics, test failure visibility, and avoid adding a BUILD cleanup subsystem |
| Integration is postponed until the final stage | Individually passing modules may not form a complete demonstration | Require a backend vertical slice in M5 before building the final web path |
| Documentation gets ahead of executable evidence | The report overstates implementation | Apply the status vocabulary and evidence rules in this document |

No implementation blocker is currently recorded. M0 is verified; M1 is the next milestone and remains `NOT STARTED`.

## 10. Scope gate

- BUILD has priority until all 11 acceptance criteria are `VERIFIED`.
- STRETCH work may begin only after that gate passes reliably.
- FUTURE items may be described as extension points but must not be implemented or presented as current capability.
- OUT-OF-SCOPE items receive no implementation or placeholder abstraction.
- A proposed new feature must first be classified through an explicit update to `IMPLEMENTATION_SCOPE.md`.
- A material boundary or contract change requires an ADR and synchronization with `CURRENT_ARCHITECTURE.md`.

## 11. Current next action

Proceed to M1 — Plugin kernel and core contracts — through a bounded implementation plan tied to the M1 exit evidence. No M1 domain implementation was started as part of this governance and M0-closeout task.

## 12. Change history

| Version | Date | Status | Change |
|---|---|---|---|
| 1.0 | 2026-08-11 | Accepted | Established the pre-implementation baseline, evidence model, M0–M7 milestone sequence, BUILD checklist, risks, scope gate, and M0 as the next action. |
| 1.1 | 2026-08-11 | Recorded | Added evidence-backed M0 scaffold progress, resolved implementation-level stack choices, retained all BUILD criteria as unverified, and made clean-checkout replay the next action. |
| 1.2 | 2026-08-23 | Recorded | Reconciled the intentional initial commit, recorded a complete clean-checkout replay at `07d32da9278947951be514d267b3c1c5325e68a6`, marked M0 verified, made M1 the next milestone, and retained all 11 BUILD criteria as unverified. |
