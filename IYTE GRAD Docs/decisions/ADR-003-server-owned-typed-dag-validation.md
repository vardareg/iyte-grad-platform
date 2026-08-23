# ADR-003: Server-Owned Typed DAG Validation

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-11 |
| Scope | BUILD |
| Related documents | `PROJECT_DEFINITION.md`, `IMPLEMENTATION_SCOPE.md`, `CURRENT_ARCHITECTURE.md`, `ADR-001`, `ADR-002` |

## 1. Context

The project must demonstrate that:

- workflow connections are governed by explicit logical data types;
- incompatible connections and invalid graphs are rejected before execution;
- linear, fan-out, and fan-in workflows behave deterministically;
- processing-engine replacement does not change the logical workflow;
- the web editor and executor do not develop inconsistent validation rules.

Workflow definitions originate from a user-controlled web client. Client-side checks alone cannot be authoritative because they may be stale, incomplete, bypassed, or inconsistent with the currently registered plugins.

Validation performed only when a stage begins executing would also be insufficient: jobs and execution snapshots could already have been created for structurally invalid workflows.

The platform therefore requires one server-owned validation model shared by explicit validation, pipeline persistence, and execution submission.

## 2. Decision

### 2.1 Validation authority

The backend shall own workflow-validation semantics through:

- `WorkflowValidator`;
- `TypeCompatibilityService`;
- the immutable descriptors and capability contracts exposed through `PluginRegistry`.

The frontend may:

- obtain plugin descriptors and logical type information from the backend;
- prevent obviously incompatible connections;
- highlight invalid nodes, edges, ports, or parameters;
- invoke the backend validation operation while editing.

Frontend feedback is advisory. It shall not authorize execution or replace backend validation.

Transport validation in API adapters may reject malformed requests, but architectural graph validation belongs to `WorkflowValidator`.

### 2.2 Authoritative type information

BUILD uses the accepted centrally owned logical types:

- `UPLOADED_GEOTIFF`;
- `SOURCE_RASTER`;
- `PREPARED_RASTER`;
- `DERIVED_RASTER`;
- `SPECTRAL_PROFILE`;
- `RESULT_BUNDLE`.

Workflow definitions identify stages and named ports. They shall not be trusted to declare their own port types.

The backend derives port types from:

- the registered plugin descriptor when a stage references a plugin identifier;
- an authoritative capability contract when a stage references a capability.

A capability-based stage must therefore have a stable port contract independent of the implementation selected later. For example, `raster.prepare` accepts `SOURCE_RASTER` and produces `PREPARED_RASTER` whether it is provided by `MockEngine` or `LightweightEngine`.

ADR-005 will govern capability-provider conformance and selection precedence. This ADR requires only that workflow validation not depend on arbitrarily selecting one provider.

Type compatibility shall be exact by default:

```text
source type == target type
```

BUILD contains no:

- implicit conversions;
- subtype hierarchy;
- automatic raster coercion;
- edge-level transformations;
- metadata-dependent compatibility rules.

A future conversion must be represented by an explicit workflow stage or an explicitly accepted compatibility rule.

### 2.3 Graph, port, and binding model

Every pipeline stage shall have a unique stable identifier within its definition.

Every edge shall connect:

```text
existing stage output port → existing stage input port
```

BUILD input ports are single-valued:

- a required input receives exactly one binding;
- an optional input receives zero or one binding;
- a binding comes from either one upstream edge or one declared pipeline input, never both.

An output port may feed multiple downstream input ports. This is fan-out.

Fan-in is represented by a stage with multiple named input ports. It is not represented by allowing several edges into one input port.

For example, `ResultJoinTool` has three distinct required inputs:

- NDVI `DERIVED_RASTER`;
- NDWI `DERIVED_RASTER`;
- `SPECTRAL_PROFILE`.

The platform performs no implicit merging or aggregation.

A saved definition shall explicitly declare:

- named external pipeline inputs and the stage inputs they supply;
- named pipeline results bound to stage output ports.

For the accepted demonstration:

- the uploaded GeoTIFF is bound to the ingestor's `UPLOADED_GEOTIFF` input;
- the `RESULT_BUNDLE` produced by `ResultJoinTool` is the terminal pipeline result.

BUILD does not support conditional edges, fallback edges, loops, edge expressions, or variadic input ports.

### 2.4 Validation operations and persistence

The backend shall expose an explicit validation operation that:

- accepts a transient pipeline definition;
- returns a structured validation report;
- creates no pipeline revision, snapshot, job, or artifact.

Saving a pipeline shall invoke the same semantic validation rules. Only a definition-valid pipeline may be persisted as a reusable definition or revision.

Definition validity does not require:

- a concrete uploaded artifact;
- a selected processing-engine implementation;
- runtime plugin availability beyond registered contract availability.

It requires explicit typed pipeline-input declarations and a resolvable capability contract.

Persistent incomplete drafts are not part of BUILD. An unfinished graph may remain in frontend editor state until it becomes valid.

Submitting a saved pipeline shall revalidate the exact submitted revision. A previous successful validation or save result shall not bypass submission-time validation.

Submission-time validation additionally checks:

- all required external pipeline inputs are bound;
- no undeclared external inputs were supplied;
- supplied `DataReference` values have the required logical types;
- referenced plugins and capabilities remain available;
- the required implementations are healthy enough to bind;
- processing-engine resolution succeeds under ADR-005;
- effective parameter values and defaults remain valid.

A saved definition may therefore become non-executable after a plugin removal or incompatible upgrade. Submission must report this explicitly.

### 2.5 Required definition-validation rules

Before a pipeline can be saved, backend validation shall reject at least:

1. An empty workflow.
2. Duplicate or malformed stage, input, output, or edge identities.
3. Edges referencing missing stages.
4. References to nonexistent or incorrectly directed ports.
5. Duplicate edges.
6. More than one binding for a single-valued input.
7. A required input lacking an upstream edge or declared pipeline input.
8. A pipeline input or output bound to an incompatible port.
9. Edges whose source and target logical types are incompatible.
10. Missing registered plugin identifiers.
11. Missing or structurally invalid capability contracts.
12. Plugin categories inconsistent with the stage reference.
13. Missing required parameters.
14. Unknown parameters.
15. Parameter values violating their declared type, enumeration, or supported constraints.
16. Cycles, including self-cycles.
17. Stages that cannot be reached from a pipeline input or cannot contribute to a declared pipeline result.
18. Unsupported conditional, fallback, loop, or edge-transformation semantics.

Parameter-schema serialization remains an implementation-level choice. BUILD does not introduce a general expression language or parameter-substitution language.

Data-dependent conditions that cannot be established from the definition—such as whether a raster actually contains particular spectral bands—remain plugin runtime preconditions. They must fail explicitly but are not graph-validation errors.

### 2.6 Validation report

Validation shall return a structured report containing:

- whether the definition is valid;
- stable issue codes;
- human-readable explanations;
- locations identifying the relevant stage, edge, port, parameter, or pipeline binding.

Issues shall be returned in deterministic order so that:

- automated tests are repeatable;
- frontend highlighting is stable;
- demonstrations produce understandable results.

The validator should collect independent errors where practical while avoiding misleading cascaded errors after a prerequisite check fails.

BUILD does not require a complex warning or severity framework. Every reported validation error blocks persistence or submission.

### 2.7 Snapshot and runtime boundary

An invalid submission shall create no runnable execution snapshot or queued job.

After successful validation and binding, the immutable execution snapshot shall record:

- the exact validated graph;
- external input bindings;
- resolved plugin identifiers and versions;
- effective configuration;
- processing-engine binding;
- typed pipeline-result bindings.

The executor shall execute only such a snapshot. It shall not:

- repair invalid graphs;
- infer missing connections;
- select ports by position;
- perform implicit conversions;
- reinterpret client-provided type claims.

At runtime, the executor shall defensively verify that actual plugin inputs and outputs conform to their declared `DataReference` types.

If a plugin returns an undeclared, missing, or incorrectly typed output, this is a plugin-contract runtime failure. The job follows the accepted fail-fast semantics; the original workflow is not retroactively classified as structurally invalid.

## 3. Rationale

This decision:

- gives the system one authoritative definition of workflow validity;
- proves incompatible workflows are rejected before execution;
- prevents frontend and backend rules from drifting;
- keeps workflow definitions independent of concrete engine selection;
- makes fan-out and fan-in semantics explicit;
- avoids ambiguous multiple-producer inputs;
- produces structured evidence suitable for tests and demonstrations;
- prevents invalid definitions from entering persistence;
- avoids building a persistent draft-management subsystem;
- keeps the logical type system small and explainable.

The project demonstrates typed architectural composition, not a general-purpose static type system or scientific raster-compatibility engine.

## 4. Alternatives considered

| Alternative | Reason not selected |
|---|---|
| Frontend-only validation | Can be stale or bypassed and cannot provide authoritative pre-execution rejection |
| Validation only when execution begins | Allows invalid snapshots and jobs to be created and weakens the accepted architectural claim |
| Separate client and server validation implementations | Creates duplicated rules and predictable behavioral drift |
| Selecting a concrete engine before validating stage types | Couples graph validity to an implementation and weakens engine replaceability |
| Implicit type conversion or assignability hierarchy | Adds hidden behavior and unnecessary compatibility complexity |
| Multiple incoming edges to one input port | Creates implicit merge semantics and ambiguous input ordering |
| Persisting incomplete or invalid drafts | Requires additional states, APIs, UI behavior, and recovery rules unnecessary for the graduation demonstration |
| General-purpose workflow or schema engine | Adds abstraction beyond the accepted BUILD requirements |

## 5. Consequences

### Positive

- Invalid graphs fail before persistence or execution.
- Validation behavior is deterministic and directly testable.
- The frontend can show precise server-backed feedback.
- Fan-out and fan-in have unambiguous semantics.
- Engine replacement preserves the same typed graph.
- Saved definitions are known to have been valid against the registry available when saved.
- Execution receives an immutable, validated representation.

### Negative and limitations

- Incomplete workflows cannot be persistently saved in BUILD.
- Validation occurs again at submission even after a successful save.
- A saved workflow can become invalid after a plugin removal or incompatible upgrade.
- Exact type compatibility may require an explicit conversion stage for future use cases.
- The central logical type catalogue must be deliberately extended when a genuinely new data type is introduced.
- Logical raster types do not prove scientific suitability, band availability, CRS compatibility, or data quality.
- Client-side feedback may temporarily differ from the server if its cached descriptors are stale.

These limitations are acceptable for a small, controlled architectural demonstration.

## 6. Verification implications

Tests must demonstrate:

- valid linear, fan-out, and fan-in graphs are accepted;
- one output may feed multiple downstream inputs;
- multiple named inputs may feed one fan-in stage;
- two edges cannot bind the same single-valued input;
- cycles and self-cycles are rejected;
- unknown stages and ports are rejected;
- output-to-output and input-to-input connections are rejected;
- exact type mismatches are rejected;
- forged client type declarations cannot bypass descriptor-owned types;
- missing plugins and capabilities are rejected;
- missing, unknown, and invalid parameters are rejected;
- missing and duplicate external-input bindings are rejected;
- unreachable or result-disconnected stages are rejected;
- invalid definitions cannot be saved;
- the explicit validation operation has no persistence or execution side effects;
- submission revalidates the exact pipeline revision;
- invalid submissions create no runnable snapshot or queued job;
- capability-based graph validation does not depend on selecting `MockEngine` or `LightweightEngine`;
- validation reports contain stable issue codes, locations, and deterministic ordering;
- a runtime plugin output with the wrong `DataReference` type causes an explicit contract failure;
- the frontend uses backend validation results for authoritative error presentation.

The acceptance demonstration should visibly attempt at least:

- one incompatible edge;
- one cyclic graph;
- one missing required input;

and show that each is rejected before execution.

## 7. Scope and documentation impact

This decision does not change `IMPLEMENTATION_SCOPE.md`.

`CURRENT_ARCHITECTURE.md` reflects the explicit pipeline input and result bindings, single-valued port cardinality, named-input fan-in semantics, strict save-time validation, structured validation reports, and snapshot and runtime type guards established by this decision.

Capability-provider selection remains reserved for ADR-005, artifact existence and integrity rules remain reserved for ADR-004, and detailed runtime failure transitions remain reserved for ADR-006. Repository implementation status remains unverified.
