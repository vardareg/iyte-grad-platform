# ADR-005: Capability-Based Processing-Engine Resolution

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-11 |
| Scope | BUILD |
| Related documents | `PROJECT_DEFINITION.md`, `IMPLEMENTATION_SCOPE.md`, `CURRENT_ARCHITECTURE.md`, `ADR-001`, `ADR-002`, `ADR-003`, `ADR-004` |

## 1. Context

The accepted demonstration must execute the same saved logical workflow with both:

- `MockEngine`;
- `LightweightEngine`.

Changing engines must not require:

- editing the workflow graph;
- changing typed connections;
- redesigning the user interface;
- introducing engine-specific branches into controllers, validation, snapshot binding, or orchestration.

The workflow therefore references the required processing capability rather than a concrete provider. However, multiple registered processing engines may declare the same capability, so dependency-injection discovery alone cannot determine which implementation should execute.

A deterministic resolution policy is required to define:

- the authoritative capability contract;
- provider conformance;
- selection precedence;
- default configuration;
- health behavior;
- snapshot binding;
- failure behavior when selection is impossible.

## 2. Decision

### 2.1 Authoritative capability contract

The plugin kernel shall own an immutable capability contract for:

```text
raster.prepare
```

The contract shall define:

| Property | Required value |
|---|---|
| Capability identifier | `raster.prepare` |
| Required plugin category | `ProcessingEngine` |
| Required input | `sourceRaster: SOURCE_RASTER` |
| Required output | `preparedRaster: PREPARED_RASTER` |
| Input cardinality | Exactly one |
| Output cardinality | Exactly one |

The capability contract, rather than a selected engine descriptor, supplies the workflow-facing port information used during definition validation.

The capability identifier, port names, cardinalities, logical types, and workflow-visible parameter schema are stable public architectural contracts. Their exact Java representation remains an implementation choice.

BUILD supports one active contract for each capability identifier. Side-by-side capability-contract versions and workflow migration infrastructure are not required.

### 2.2 Provider declaration and conformance

A registered plugin may provide `raster.prepare` only if:

- it implements `ProcessingEngine`;
- it explicitly declares the capability;
- its capability-facing ports conform to the authoritative contract;
- its workflow-visible parameters conform to the capability parameter schema;
- its descriptor and lifecycle satisfy ADR-002.

Both BUILD engines shall conform:

- `MockEngine`;
- `LightweightEngine`.

Provider conformance shall be checked during registry construction. A registered provider with an incompatible category, port name, cardinality, logical type, or workflow-visible parameter contract shall cause startup to fail.

A provider may contain private implementation details and server-controlled operational settings, but these must not alter the capability-facing contract.

Adding another conforming provider shall require registering another `ProcessingEngine` bean and its compliance tests. It shall not require modifying:

- the resolver;
- workflow validator;
- executor;
- controller;
- capability stage;
- saved workflows.

Adding a genuinely new capability is a contract change and may require extending the authoritative capability catalogue. This is different from adding another provider for an existing capability.

### 2.3 Workflow and provider configuration separation

A saved preparation stage shall reference:

```text
capability: raster.prepare
```

It shall not persist:

- `MockEngine` or `LightweightEngine` as the stage implementation;
- a Java class or Spring bean name;
- provider priority;
- provider-specific parameters;
- provider-specific graph connections.

Workflow-visible stage parameters, if introduced, belong to the capability contract and must be understood consistently by every conforming provider.

Provider-specific operational settings belong to trusted server-side plugin configuration. Examples include:

- the bounded simulated delay used by `MockEngine`;
- fixed implementation settings for `LightweightEngine`.

The selected provider's validated effective configuration shall be captured in the execution snapshot. BUILD engine configuration must not require a general expression, secret-management, or dynamic remote-configuration system.

### 2.4 Selection input and precedence

The execution request may contain an optional processing-engine plugin identifier.

The identifier shall be the provider's stable plugin identifier, not its class name, bean name, display name, or position in a catalogue.

Resolution precedence shall be:

1. If the execution request explicitly names a provider, use that provider.
2. Otherwise, use the server-configured default provider for `raster.prepare`.
3. If neither produces a valid provider, reject submission.

An explicit request always overrides the default.

The resolver shall not select a provider using:

- Spring bean-discovery order;
- catalogue ordering;
- lexicographic identifier order;
- arbitrary “first match” behavior;
- an implicit priority field;
- most-recent registration;
- health-based automatic substitution.

For the BUILD application, exactly one default provider shall be configured for `raster.prepare`.

### 2.5 Default-provider validation

After plugin-registry construction, startup validation shall verify that the configured default:

- identifies an existing registered plugin;
- implements `ProcessingEngine`;
- declares `raster.prepare`;
- conforms to the authoritative capability contract.

A missing, unknown, incorrectly categorized, or non-conforming configured default is a structural configuration error and shall cause startup to fail.

Changing the configured default requires application restart. Runtime mutation of default-provider policy is not part of BUILD.

Temporary runtime health is separate from structural default validity. A structurally valid default may later become unhealthy without changing the immutable registry or default configuration.

### 2.6 Submission-time resolution

During submission, `ProcessingEngineResolver` shall receive:

- the required capability identifier;
- the optional explicitly requested provider identifier;
- the configured default;
- the registered candidate providers;
- their current readiness;
- applicable validated configuration.

It shall then:

1. apply the accepted selection precedence;
2. verify that the selected plugin exists;
3. verify that it is a `ProcessingEngine`;
4. verify that it declares the required capability;
5. verify that it is currently ready;
6. resolve and validate its effective configuration;
7. return one immutable engine binding.

Resolution failure shall be a structured pre-execution validation error.

At least these conditions shall reject submission:

- unknown requested provider;
- requested plugin has the wrong category;
- requested provider does not expose `raster.prepare`;
- selected provider is unhealthy;
- selected provider configuration is invalid;
- no valid default is available when no provider was requested;
- no registered provider can satisfy the capability.

A failed resolution creates no runnable execution snapshot or queued job.

### 2.7 No automatic fallback

The resolver shall not silently substitute another provider when the explicitly requested or default provider is unavailable.

For example, if `MockEngine` is the default but is unhealthy, the resolver shall not silently select `LightweightEngine`.

The submission shall fail explicitly. The user may then deliberately submit a new execution selecting the alternative engine.

This rule preserves:

- user intent;
- deterministic behavior;
- explainable provenance;
- visible engine-replacement evidence;
- clear failure semantics.

Automatic fallback, provider ranking, failover, and retry policy are not part of BUILD.

### 2.8 Candidate discovery and frontend behavior

`PluginRegistry` shall expose all processing-engine providers for `raster.prepare` in deterministic order.

The backend may expose catalogue information including:

- stable provider identifier;
- name and version;
- capability;
- health or readiness;
- explanatory unavailability reason;
- whether the provider is the configured default.

The frontend shall generate engine-selection choices from this server-owned information. It shall not hard-code `MockEngine`, `LightweightEngine`, their identifiers, or selection precedence.

Frontend filtering and disabled controls are advisory. Submission-time backend resolution remains authoritative.

### 2.9 Immutable snapshot binding

Successful resolution shall occur before snapshot and job creation.

The immutable execution snapshot shall record at least:

- capability identifier;
- resolved provider identifier;
- resolved provider version;
- whether selection came from the explicit request or configured default;
- validated effective provider configuration;
- capability-stage parameters;
- resolved input and output port bindings.

The saved pipeline definition remains unchanged.

Once the snapshot is created:

- later execution requests cannot change its provider;
- later default-configuration changes cannot affect it;
- the executor cannot re-run provider selection;
- the executor cannot substitute another provider.

The executor shall invoke the exact registered provider recorded in the snapshot.

Snapshot provenance does not preserve an executable historical plugin binary or guarantee replay after an upgrade. That limitation remains accepted under ADR-002.

### 2.10 Health changes after binding

The selected provider shall be checked for readiness during submission and again before invocation.

If the recorded provider becomes unhealthy after snapshot creation:

- the executor shall not re-resolve the capability;
- no alternative provider shall be selected;
- the preparation stage shall fail explicitly;
- the job shall follow the accepted fail-fast semantics;
- earlier successful artifacts shall remain available.

If the application process restarts before completion, ADR-001's interruption rule applies; the job is not resumed against a newly selected provider.

### 2.11 Provider behavior and substitutability

Both BUILD providers must satisfy the same structural contract, but they are not required to produce byte-identical or scientifically equivalent payloads.

`MockEngine` shall:

- produce deterministic `PREPARED_RASTER` output;
- optionally simulate a bounded delay;
- make clear that its processing behavior is demonstrative.

`LightweightEngine` shall:

- perform one documented, honest, limited raster transformation;
- publish a valid `PREPARED_RASTER`;
- avoid claims of scientific completeness.

Processing-engine replaceability means that downstream workflow structure and generic platform behavior remain valid when the provider changes. It does not claim that all processing engines are scientifically interchangeable.

## 3. Rationale

This decision:

- preserves one stable workflow-facing preparation contract;
- separates logical workflow design from implementation selection;
- makes provider selection deterministic and explainable;
- prevents dependency-injection ordering from becoming hidden policy;
- records exactly which implementation executed;
- rejects invalid selections before job creation;
- prevents health changes from silently altering execution behavior;
- allows the web application to discover providers generically;
- provides direct test and demonstration evidence for engine replaceability;
- avoids building a general policy, ranking, or failover framework.

The accepted demonstration needs controlled implementation replacement, not dynamic optimization among processing backends.

## 4. Alternatives considered

| Alternative | Reason not selected |
|---|---|
| Persist a concrete engine identifier in the workflow stage | Couples the logical graph to one implementation and weakens the replacement claim |
| Inject `MockEngine` or `LightweightEngine` directly into orchestration | Introduces concrete dependencies and plugin-specific branches |
| Select the first registered provider | Makes dependency-injection or collection order an accidental policy |
| Select by alphabetical order | Deterministic but semantically arbitrary and invisible to the user |
| Add general provider priorities or scoring | Adds policy complexity without a BUILD requirement |
| Automatically fall back to another healthy engine | Hides failure and user intent, changes provenance, and introduces failover semantics |
| Resolve again immediately before every invocation | Allows a snapshot's effective implementation to change after submission |
| Permit provider-specific workflow ports or parameters | Makes saved workflows dependent on the selected provider |
| Require scientifically identical outputs | Neither necessary nor defensible for the architectural replacement claim |
| Deploy processing engines as separate services | Conflicts with the accepted modular-monolith and BUILD runtime decisions |

## 5. Consequences

### Positive

- The same saved graph can run with either BUILD engine.
- Explicit selection predictably overrides the default.
- Unqualified submissions have one validated default.
- Snapshots contain clear provider provenance.
- Workflow validation does not depend on an arbitrarily selected engine.
- Provider additions do not require generic-core changes.
- The frontend remains catalogue-driven.
- Health and configuration failures are visible before execution where possible.
- Runtime behavior cannot silently change providers.

### Negative and limitations

- The application requires valid default-provider configuration.
- An unhealthy default causes unqualified submissions to fail even when another provider is healthy.
- Users must deliberately resubmit to choose an alternative.
- BUILD provides no automatic failover, ranking, load balancing, or retry.
- Provider-specific workflow features cannot be exposed through the common capability without changing its contract.
- Structurally compatible providers may produce scientifically different results.
- Capability-contract changes may invalidate saved workflows.
- Historical snapshots record provenance but do not retain historical binaries.
- Runtime default changes require application restart.

These limitations are acceptable because BUILD proves explicit replacement, not production-grade backend routing.

## 6. Verification implications

Tests must demonstrate:

- the authoritative `raster.prepare` contract has the accepted category and typed ports;
- both BUILD engines conform to that contract;
- a provider with the wrong category, ports, cardinality, type, or parameter contract causes startup failure;
- definition validation uses the capability contract without selecting an engine;
- both providers appear as candidates independently of registration order;
- an explicit provider selection overrides the configured default;
- omission of an explicit selection uses the configured default;
- an invalid configured default causes startup failure;
- an unknown or wrong-category requested provider rejects submission;
- a provider lacking `raster.prepare` rejects submission;
- an unhealthy requested provider rejects submission;
- an unhealthy default is not silently replaced by another candidate;
- failed resolution creates no runnable snapshot or queued job;
- effective configuration is validated and recorded;
- snapshots record capability, provider identifier, provider version, selection source, and effective configuration;
- changing a later request or default cannot alter an existing snapshot;
- the executor invokes the exact snapshot-bound provider;
- a provider becoming unhealthy after binding causes explicit stage and job failure without rebinding;
- provider selection contains no dependency on bean order or catalogue order;
- frontend engine choices come from server-owned catalogue information;
- the same saved pipeline completes once with `MockEngine` and once with `LightweightEngine`;
- downstream workflow stages require no graph or configuration-schema redesign between those executions;
- generic resolver, controller, validator, and executor code contain no branches naming either BUILD engine;
- adding a test-only conforming processing engine requires no modification to generic resolution or orchestration code.

The acceptance demonstration should visibly:

1. execute the saved workflow with the configured default;
2. submit the same workflow with the alternative provider explicitly selected;
3. show the different provider identity in each snapshot or job detail;
4. complete both runs without editing the saved graph.

No claim that processing-engine replacement works may be made until repository and test evidence supports these behaviors.

## 7. Scope and documentation impact

This decision does not change `IMPLEMENTATION_SCOPE.md`.

`CURRENT_ARCHITECTURE.md` reflects the authoritative `raster.prepare` contract, startup provider-conformance checks, explicit-request-over-default precedence, default-provider validation, no-fallback behavior, immutable snapshot binding, post-binding health-failure behavior, and distinction between architectural substitutability and scientific equivalence established by this decision.

Polling and final job and stage transition details remain reserved for ADR-006, and repository implementation status remains unverified.
