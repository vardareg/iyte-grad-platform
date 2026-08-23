# ADR-006: Polling and Fail-Fast Execution Semantics

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-11 |
| Scope | BUILD |
| Related documents | `PROJECT_DEFINITION.md`, `IMPLEMENTATION_SCOPE.md`, `CURRENT_ARCHITECTURE.md`, `ADR-001`–`ADR-005` |

## 1. Context

The platform must execute validated workflows asynchronously while allowing the user to understand:

- whether a submitted job is waiting, running, successful, or failed;
- which stage is running;
- which stages completed;
- where and why execution failed;
- which results remain available;
- whether fan-out and fan-in dependencies behaved correctly.

ADR-001 selected a bounded in-process executor and established that its queue is not durable. ADR-003 requires validated immutable snapshots. ADR-004 requires atomic stage-output visibility and explicit artifact failures. ADR-005 binds one processing-engine provider before execution and forbids runtime substitution.

The remaining decision must define:

- job and stage state machines;
- submission and scheduling-failure behavior;
- deterministic stage execution;
- progress and timestamp semantics;
- failure propagation and skipped stages;
- polling behavior;
- restart reconciliation;
- the boundary between BUILD execution and STRETCH cancellation or retry.

## 2. Decision

### 2.1 Persistent state is authoritative

PostgreSQL/PostGIS shall hold the authoritative observable execution state.

The in-process executor owns active work but is not an authoritative source for:

- job status;
- stage status;
- progress;
- timestamps;
- results;
- failure information.

Polling APIs shall read persisted execution records rather than inspecting executor threads, futures, or queue internals.

State changes shall be performed through the execution-state application boundary. Plugins shall not update job or stage records directly.

Terminal states are immutable.

### 2.2 Job state model

BUILD jobs shall use exactly these states:

| State | Meaning |
|---|---|
| `QUEUED` | The immutable snapshot and job exist, but the job runner has not started |
| `RUNNING` | A job runner has claimed the job and execution is in progress |
| `SUCCEEDED` | Every stage succeeded and all declared pipeline results were recorded |
| `FAILED` | Execution cannot continue or did not complete successfully |

Allowed transitions are:

```text
QUEUED → RUNNING
QUEUED → FAILED
RUNNING → SUCCEEDED
RUNNING → FAILED
```

`SUCCEEDED` and `FAILED` have no outgoing transitions.

BUILD has no:

- `CANCELLED`;
- `RETRYING`;
- `PAUSED`;
- `PARTIALLY_SUCCEEDED`;
- `RESUMING`;
- `REJECTED` job state.

Validation and binding failures create no job. A scheduling failure occurring after job persistence uses `FAILED` with an explicit scheduling-failure code.

A failed job remains `FAILED` even when earlier stages produced valid artifacts.

### 2.3 Stage state model

Every snapshot stage shall have one corresponding `StageExecution` record created with the job.

BUILD stages shall use:

| State | Meaning |
|---|---|
| `PENDING` | The stage has not started |
| `RUNNING` | Its inputs are being resolved or its plugin is being invoked |
| `SUCCEEDED` | Its complete validated output-reference map was persisted |
| `FAILED` | The stage encountered the runtime failure that terminated the job |
| `SKIPPED` | The stage was never started because the job could not continue |

Allowed transitions are:

```text
PENDING → RUNNING
PENDING → SKIPPED
RUNNING → SUCCEEDED
RUNNING → FAILED
```

Terminal stage states have no outgoing transitions.

A stage cannot:

- succeed without first running;
- be skipped after it has started;
- run more than once;
- return from a terminal state to a non-terminal state.

Because BUILD has no retry, it does not require attempt records or attempt numbers.

### 2.4 Submission and scheduling

After successful validation and binding, submission shall persist in one transaction:

- the immutable execution snapshot;
- a `QUEUED` job;
- one `PENDING` execution record for every stage;
- deterministic stage-plan positions;
- resolved plugin identities and configuration;
- external input and pipeline-result bindings.

The executor shall then be asked to admit the job.

If admission succeeds:

- the submission returns the job identifier without waiting for execution;
- the job may begin before the client performs its first poll;
- the first poll may therefore observe `QUEUED`, `RUNNING`, or even a terminal state.

If executor admission or scheduling fails after persistence:

- the job becomes `FAILED`;
- every `PENDING` stage becomes `SKIPPED`;
- the job records an explicit `EXECUTOR_ADMISSION_FAILED` or equivalent stable code;
- the submission returns a structured failure containing the job identifier;
- no job may remain indefinitely `QUEUED` because executor capacity was exhausted.

The exact REST path and HTTP status are implementation-level choices. The observable distinction is:

- validation or binding failure: no snapshot or job;
- post-persistence scheduling failure: terminal failed job with durable failure information.

A job runner must atomically claim `QUEUED → RUNNING`. A runner that cannot make that transition shall not invoke any plugin. This guards against accidental duplicate execution.

### 2.5 Deterministic execution

The execution plan shall be derived from the immutable snapshot using deterministic topological ordering and a stable tie-break rule.

One job runner coordinates the complete job:

- at most one stage per job is `RUNNING`;
- different jobs may run concurrently within the global executor bound;
- fan-out branches remain distinct stages;
- fan-out branches need not execute concurrently;
- a fan-in stage becomes runnable only after every required predecessor succeeded and every required input reference exists.

Before invoking a stage, the executor shall:

1. transition it from `PENDING` to `RUNNING`;
2. resolve the snapshot-bound plugin;
3. recheck applicable readiness without re-resolving or substituting providers;
4. resolve and verify every input through `ArtifactService`;
5. invoke the plugin outside a long-running database transaction.

If non-terminal stages remain but no stage is runnable, the executor shall fail explicitly with an execution-invariant error. It must not wait indefinitely.

### 2.6 Successful stage completion

A stage succeeds only when the plugin has produced a complete output map whose references are:

- published;
- known to `ArtifactService`;
- correctly named;
- declared by the plugin or capability contract;
- of the required logical types;
- available with authoritative metadata.

The following shall be persisted atomically at the database boundary:

- the complete stage-output map;
- final stage progress;
- the stage completion timestamp;
- the transition to `SUCCEEDED`.

Dependent stages become eligible only after this transaction commits.

For the final stage, recording the declared pipeline results and changing the job to `SUCCEEDED` shall occur with the final successful completion transaction.

A job may become `SUCCEEDED` only when:

- every stage is `SUCCEEDED`;
- every declared pipeline-result binding resolves to a successful stage output;
- the job's terminal result references have been persisted.

### 2.7 Fail-fast propagation

Any runtime stage failure shall stop the job immediately.

Runtime failures include:

- snapshot-bound plugin becoming unavailable;
- missing or corrupt input artifacts;
- plugin precondition failure;
- plugin exception;
- undeclared, missing, unpublished, or incorrectly typed output;
- output-publication failure;
- execution-plan invariant failure;
- unrecoverable execution-infrastructure failure.

When a stage fails, one state transaction shall, where the database remains available:

1. mark the running stage `FAILED`;
2. record its structured failure information;
3. mark the job `FAILED`;
4. record the same root cause on the job;
5. mark every remaining `PENDING` stage `SKIPPED`;
6. attach a skip reason referencing the failed stage;
7. set the applicable completion timestamps.

No further plugin is invoked.

A single skip reason such as `FAIL_FAST_AFTER_STAGE_FAILURE`, together with the causal stage identifier, is sufficient for BUILD. More elaborate dependency-specific skip taxonomies are unnecessary.

Earlier `SUCCEEDED` stages remain unchanged, and their artifacts remain inspectable. However:

- they are diagnostic intermediate results;
- they do not make the job partially successful;
- declared pipeline results are exposed only for a `SUCCEEDED` job.

A deliberate re-execution creates a new snapshot and job. It does not continue or mutate the failed job.

### 2.8 Failure information

Runtime failures shall use a small structured model containing at least:

- stable machine-readable failure code;
- human-readable message;
- occurrence or detection timestamp;
- failing stage identifier when applicable;
- resolved plugin identifier and version when applicable;
- optional diagnostic correlation identifier.

The failure catalogue shall distinguish at least:

- executor admission or scheduling failure;
- plugin unavailable at invocation;
- artifact access failure;
- artifact integrity failure;
- plugin execution failure;
- plugin output-contract failure;
- execution invariant failure;
- process interruption.

Public API responses shall not expose:

- raw stack traces;
- server filesystem paths;
- temporary artifact paths;
- database internals;
- unrestricted exception details.

Detailed stack traces may remain in server logs and be linked through a correlation identifier.

### 2.9 Progress and timestamps

All persisted timestamps shall be server-generated UTC instants.

A job shall record:

- submission or creation time;
- start time, if execution began;
- finish time for a terminal state;
- last-update time.

A stage shall record:

- start time, if it ran;
- finish time for `SUCCEEDED`, `FAILED`, or `SKIPPED`;
- last-update time.

Stage progress shall be an integer from 0 to 100:

- `PENDING` begins at 0;
- `RUNNING` begins at 0;
- a plugin may report monotonic progress from 1 to 99 through its restricted execution context;
- `SUCCEEDED` is committed with 100;
- `FAILED` retains the last reported value;
- `SKIPPED` remains 0.

Progress reporting is optional for a plugin. Fast stages may move directly from 0 to 100.

Job progress shall be derived from its stage records using equal stage weighting. It shall be monotonic during normal execution, and 100 is reserved for `SUCCEEDED`. A failed job retains the progress reached before failure.

Update throttling and the exact rounding rule remain implementation choices.

### 2.10 Polling contract

Simple REST polling is the authoritative BUILD monitoring mechanism.

A job-detail polling response shall provide a self-contained persisted view containing at least:

- job identifier and state;
- pipeline and snapshot identifiers;
- selected processing-engine identity;
- progress;
- job timestamps;
- stages in deterministic plan order;
- each stage's state, progress, timestamps, plugin identity, outputs, and failure or skip reason;
- declared pipeline results when the job succeeds;
- root failure information when the job fails;
- a last-update value or persistence version.

Polling shall be:

- read-only;
- idempotent;
- independent of executor memory;
- safe after application restart;
- usable for both active and historical jobs.

The frontend shall replace its displayed state from each self-contained response rather than relying on a guaranteed delivery of every intermediate transition. Fast stages may complete between polls, so the UI is not guaranteed to observe every state live.

The frontend shall poll active jobs at a modest interval and stop when a terminal state is observed. The exact interval, backoff behavior, endpoint shape, and optional caching headers are implementation choices.

BUILD does not require:

- WebSockets;
- Server-Sent Events;
- long polling;
- a durable event stream;
- progress-message replay.

### 2.11 Process interruption

The in-memory executor queue and active tasks are not durable.

During application startup, before the application reports readiness or accepts new submissions, restart reconciliation shall process every abandoned non-terminal job.

For each `QUEUED` or `RUNNING` job from the previous process:

- the job becomes `FAILED`;
- the failure code indicates `PROCESS_INTERRUPTED`;
- a `RUNNING` stage becomes `FAILED`;
- every `PENDING` stage becomes `SKIPPED`;
- earlier `SUCCEEDED` stages remain unchanged;
- previously committed artifact references remain available;
- terminal timestamps use the reconciliation time.

The platform shall not claim to know the exact crash time when it only knows when interruption was detected.

Terminal jobs and terminal stages are not modified.

Interrupted jobs are neither resumed nor retried. The user may deliberately create a new execution.

### 2.12 Cancellation and retry boundary

BUILD provides no execution cancellation.

Consequently:

- no cancel endpoint or button is required;
- leaving the monitoring page does not stop execution;
- no `CANCELLED` job or stage state is introduced;
- plugins need no cancellation-token contract in BUILD.

BUILD also provides no automatic or manual stage retry.

Cancellation and bounded stage retry remain STRETCH items. If implemented later, they require a separate decision covering cooperative interruption, artifact handling, attempt identity, idempotency, and new state transitions.

## 3. Rationale

This decision:

- gives jobs and stages small, explainable state machines;
- makes persisted state the single source used by polling and tests;
- prevents failed work from being presented as partial success;
- provides deterministic fan-out and fan-in behavior without branch concurrency;
- ensures runtime failures terminate visibly rather than stranding jobs;
- preserves successful artifacts for diagnosis;
- supports monitoring without adding an event transport;
- handles process restart honestly without pretending the queue is durable;
- avoids premature cancellation, retry, attempt, or recovery infrastructure.

The project demonstrates observable workflow orchestration, not production-grade job recovery.

## 4. Alternatives considered

| Alternative | Reason not selected |
|---|---|
| Derive status from executor threads or futures | State would disappear on restart and could not support historical inspection |
| WebSocket or SSE progress | Polling already satisfies BUILD; streaming is STRETCH |
| Continue independent branches after one stage fails | Introduces partial-success policy and complicates terminal-result semantics |
| Mark only direct downstream stages skipped | Fail-fast stops the entire job, including unstarted sibling branches |
| Introduce `PARTIALLY_SUCCEEDED` | Earlier artifacts are diagnostic, not a successful pipeline result |
| Automatically retry a failed stage | Retry is STRETCH and requires attempt, idempotency, and artifact rules |
| Resume jobs after restart | The in-memory queue is not durable and historical plugin/runtime conditions may have changed |
| Add cancellation states without cancellation behavior | Creates speculative states and contracts forbidden by scope control |
| Execute fan-out branches concurrently | Adds coordination complexity without proving another BUILD claim |
| Persist every progress event as an event stream | Unnecessary for a polling-based graduation demonstration |

## 5. Consequences

### Positive

- Job and stage status is deterministic and directly testable.
- Polling works from persisted data and survives completed-process history.
- Terminal states cannot be reopened.
- One failed stage produces one understandable root cause.
- Every unstarted stage receives an explicit skipped state.
- Earlier successful artifacts remain available without weakening job semantics.
- Scheduling saturation cannot silently strand work.
- The user can monitor the delayed mock execution clearly.
- The state model remains small enough to explain in the report and demonstration.

### Negative and limitations

- A backend restart fails every queued or active job.
- Failed jobs cannot resume from successful stages.
- Independent branches stop even when they could theoretically continue.
- Polling may miss short-lived intermediate states.
- Equal stage weighting is only an approximate progress measure.
- Plugins that do not report progress jump from 0 to 100.
- There is no cancellation, retry, durable event history, or partial-success state.
- A successful artifact publication followed by persistence failure may leave unreferenced storage under ADR-004.
- A client losing the submission response may not know the identifier of a job already created; submission idempotency is not a BUILD requirement.

These limitations are acceptable for the controlled demonstration.

## 6. Verification implications

Tests must demonstrate:

- the accepted job and stage transition matrices;
- terminal states cannot transition again;
- invalid submission creates no snapshot, job, or stage executions;
- valid submission atomically creates the snapshot, `QUEUED` job, and all `PENDING` stages;
- submission returns without waiting for workflow completion;
- only one runner can claim a job;
- executor saturation produces an explicit failed job rather than an indefinitely queued job;
- stage execution follows deterministic plan order;
- at most one stage per job runs at a time;
- different jobs may run within the global worker bound;
- fan-out stages receive the correct shared reference;
- fan-in does not start until every named input is available;
- a plan with no runnable stage fails explicitly instead of hanging;
- successful stage outputs and `SUCCEEDED` state become visible atomically;
- a job succeeds only when all stages and declared results succeed;
- plugin, artifact, integrity, readiness, and output-contract failures use fail-fast transitions;
- the failing stage becomes `FAILED`;
- every unstarted stage becomes `SKIPPED`;
- no later plugin is invoked after failure;
- earlier successful artifacts remain readable;
- a failed job exposes no successful terminal pipeline result;
- re-execution creates a distinct snapshot and job;
- stage progress is monotonic and 100 is reserved for success;
- polling responses are self-contained, persisted, and deterministically ordered;
- polling does not depend on executor internals;
- public errors contain stable codes without stack traces or storage paths;
- restart reconciliation fails abandoned jobs and preserves successful earlier outputs;
- interrupted running stages fail and pending stages are skipped;
- no automatic retry, resume, cancellation, or provider substitution occurs.

The acceptance demonstration should use the bounded delay in `MockEngine` to visibly show polling-based job and stage progress. Runtime failure propagation may be demonstrated through deterministic automated tests rather than adding another production plugin or lengthening the primary success demo.

## 7. Scope and documentation impact

This decision does not change `IMPLEMENTATION_SCOPE.md`.

`CURRENT_ARCHITECTURE.md` version 1.6 reflects:

- the exact job and stage state models;
- persistent polling authority;
- deterministic execution and atomic job claiming;
- scheduling-failure handling;
- fail-fast and skipped-stage transitions;
- progress and timestamp semantics;
- structured runtime failures;
- restart reconciliation;
- the explicit absence of cancellation and retry.

ADR-001 through ADR-006 are accepted. Repository implementation status remains unverified.
