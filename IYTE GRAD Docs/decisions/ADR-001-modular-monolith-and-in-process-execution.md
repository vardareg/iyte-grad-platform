# ADR-001: Modular Monolith and Bounded In-Process Execution

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-11 |
| Scope | BUILD |
| Related documents | `PROJECT_DEFINITION.md`, `IMPLEMENTATION_SCOPE.md`, `CURRENT_ARCHITECTURE.md` |

## 1. Context

The platform must demonstrate:

- explicit architectural boundaries;
- asynchronous workflow execution;
- observable job and stage progress;
- deterministic linear, fan-out, and fan-in behavior;
- processing-engine replacement;
- repeatable testing and demonstration.

The project is implemented by one developer within a graduation-project timeline. BUILD explicitly excludes microservices, distributed queues, multi-node execution, production-scale availability, and automatic retry.

Executing complete workflows synchronously inside HTTP request threads would make long-running operations, monitoring, and failure handling difficult. Conversely, introducing a message broker and independent workers would create deployment, consistency, recovery, and distributed-failure concerns that do not contribute to the accepted architectural claims.

## 2. Decision

### 2.1 Deployment structure

The BUILD backend shall be one Java 21/Spring Boot deployable application structured as a modular monolith.

The application shall contain explicit internal boundaries for:

- API adapters;
- application services;
- plugin kernel;
- workflow model and validation;
- execution engine;
- catalogue and artifact services;
- persistence adapters.

Internal modules shall interact through defined contracts and dependency directions. Being deployed together does not permit arbitrary cross-module access or plugin-specific behavior in generic platform code.

The React/TypeScript frontend, PostgreSQL/PostGIS database, and local artifact store remain separate runtime dependencies, but the backend is one application process.

### 2.2 Job submission

Workflow submission shall:

1. perform authoritative backend validation;
2. resolve the required plugin implementations;
3. create an immutable execution snapshot;
4. persist the snapshot and initial job state;
5. schedule the job for background execution;
6. return control to the client with the job identifier.

Workflow processing shall not occupy the HTTP request thread after submission.

### 2.3 Executor model

Background jobs shall run through a bounded in-process executor owned by the backend application.

The executor shall have:

- a configurable maximum worker count;
- bounded admission or queue capacity;
- explicit handling of executor saturation;
- no external message broker;
- no separate worker deployment.

A single job runner shall coordinate the stages of one job. Within each job:

- stages follow deterministic topological ordering;
- at most one stage runs at a time;
- fan-out branches remain separate dependencies but need not run concurrently;
- fan-in waits until every required input reference exists.

The global executor may run different jobs concurrently, subject to its configured bound. This does not change the one-running-stage-per-job rule.

### 2.4 Persistent state versus in-memory scheduling

PostgreSQL/PostGIS shall persist execution snapshots, jobs, stage states, timestamps, results, and failures.

The executor's queue and active tasks are not durable. The database records execution history, but it is not a durable work queue.

If scheduling is rejected or fails, the system must not leave the job indefinitely in a queued state. The failure must be recorded or the submission rejected explicitly.

### 2.5 Process interruption

Automatic job recovery and retry after application restart are not part of BUILD.

On startup, non-terminal jobs abandoned by a previous process instance shall be moved to a terminal failed state with an explicit process-interruption reason. Successful artifacts created before interruption shall remain available for diagnosis.

A user may deliberately submit a new execution, but the platform shall not silently resume or retry the interrupted job.

## 3. Rationale

This decision:

- satisfies asynchronous execution and monitoring requirements;
- keeps module boundaries visible inside one understandable application;
- supports deterministic tests without broker or worker infrastructure;
- avoids network calls and distributed transactions between backend modules;
- limits resource use through bounded execution;
- supports the complete demonstration with the fewest operational components;
- remains consistent with the project's controlled academic contribution.

The project proves DAG and plugin semantics, not horizontal scaling or distributed processing performance.

## 4. Alternatives considered

| Alternative | Reason not selected |
|---|---|
| Synchronous execution in HTTP request threads | Poor fit for background jobs, progress monitoring, long-running stages, and explicit runtime state |
| External broker with separate worker processes | Adds delivery semantics, worker coordination, deployment, recovery, and distributed failure modes unnecessary for BUILD |
| Microservice architecture | Explicitly out of scope and would weaken graduation feasibility without proving an additional accepted claim |
| Unstructured single application | Reduces operational complexity but fails to make architectural boundaries and dependency rules sufficiently visible |

## 5. Consequences

### Positive

- One backend build and deployment unit.
- Straightforward local development and debugging.
- Database transactions can be used without distributed coordination.
- Deterministic execution behavior is easier to test and explain.
- Plugin contracts and module dependencies remain visible.
- The runtime has fewer operational failure modes.

### Negative and limitations

- A backend process failure interrupts every active job.
- Queued work is not durable across restarts.
- Plugins share process memory, CPU, and failure isolation.
- Backend and executor cannot be scaled independently.
- The architecture provides no automatic failover or job resumption.
- Long-running or badly behaved plugins could affect the whole application.

These limitations are accepted because production availability, untrusted-plugin isolation, and distributed execution are outside BUILD.

## 6. Verification implications

Tests must demonstrate:

- submission returns without waiting for complete workflow execution;
- the immutable snapshot and job exist before execution starts;
- executor capacity is bounded;
- saturation cannot silently lose or strand jobs;
- no more than one stage per job runs at a time;
- stage order is deterministic;
- different jobs may execute within the global bound;
- fan-in waits for all required inputs;
- runtime failure causes fail-fast state transitions;
- abandoned non-terminal jobs are marked failed after restart reconciliation;
- successful earlier artifact references remain available after failure.

No implementation claim may be made until these behaviors are supported by repository and test evidence.

## 7. Scope and documentation impact

This decision does not change `IMPLEMENTATION_SCOPE.md`. It formalizes the already accepted BUILD architecture.

`CURRENT_ARCHITECTURE.md` reflects the process-interruption reconciliation rule established by this decision. Repository implementation status remains unverified.
