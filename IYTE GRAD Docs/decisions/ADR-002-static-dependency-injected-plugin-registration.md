# ADR-002: Static Dependency-Injected Plugin Registration

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-11 |
| Scope | BUILD |
| Related documents | `PROJECT_DEFINITION.md`, `IMPLEMENTATION_SCOPE.md`, `CURRENT_ARCHITECTURE.md`, `ADR-001` |

## 1. Context

The project must demonstrate that functional extensions can be added and discovered without introducing implementation-specific branches into:

- workflow validation;
- execution planning;
- plugin invocation;
- interactive analysis;
- API controllers;
- the plugin catalogue.

BUILD uses a modular monolith containing trusted, project-owned plugin implementations. Runtime JAR loading, hot reload, external plugin marketplaces, untrusted-code isolation, and independently deployed plugin services are outside the accepted scope.

The platform therefore needs a plugin-registration mechanism that makes contracts and discovery explicit while remaining small, deterministic, and easy to test.

## 2. Decision

### 2.1 Static packaging and dependency injection

All BUILD plugins shall be compiled, packaged, and deployed with the Spring Boot application.

Each plugin shall be registered as a Spring-managed bean implementing one category-specific contract:

- `DataIngestor`;
- `ProcessingEngine`;
- `AnalysisTool`.

Spring shall provide the complete collection of plugin beans to `PluginRegistry` through dependency injection.

The exact use of component annotations, configuration classes, or explicit `@Bean` methods is an implementation-level choice. The architectural requirement is that the registry receives implementations through dependency injection rather than constructing them or naming them manually.

Adding a plugin requires:

1. implementing an accepted category contract;
2. providing a valid descriptor;
3. registering the implementation as a dependency-injected bean;
4. supplying the applicable compliance tests;
5. rebuilding and restarting the application.

It must not require editing the registry, executor, validator, controllers, or another central implementation list.

### 2.2 Plugin identity and descriptor

Every plugin shall expose an immutable descriptor available before execution begins.

The descriptor shall include at least:

- stable plugin identifier;
- plugin version;
- category;
- human-readable name and description;
- named input and output ports;
- logical data types for those ports;
- declared capabilities;
- parameter schema.

Plugin identifiers shall be globally unique across all categories. They represent stable contract identities and shall not be derived from Java class names or Spring bean names.

BUILD supports one active implementation version for each plugin identifier. Simultaneous side-by-side versions of the same identifier are not supported.

The version recorded in an execution snapshot provides provenance. It does not imply that the platform can reload an old plugin binary or replay every historical execution after an upgrade.

A change that materially alters a plugin's public ports, parameter contract, capability declaration, or observable processing behavior must update its recorded version. The exact version syntax may be decided during implementation.

### 2.3 Registry construction and validation

During application startup, `PluginRegistry` shall collect all registered plugin beans, validate their descriptors, and construct immutable indexes for discovery by:

- plugin identifier;
- category;
- capability.

Discovery results shall have deterministic ordering independent of Spring bean-discovery order.

The registry shall reject at least:

- duplicate plugin identifiers;
- missing or malformed identifiers and versions;
- a descriptor category inconsistent with the implemented contract;
- missing, duplicate, or invalid port names;
- ports without recognized logical data types;
- invalid parameter-schema declarations;
- malformed capability declarations;
- capabilities inconsistent with the plugin category.

Multiple plugins may declare the same capability. This is required for `MockEngine` and `LightweightEngine` to provide the same preparation capability. The registry shall expose all matching candidates and shall not silently choose one according to bean order.

Capability-selection policy belongs to ADR-005.

A structurally invalid registered plugin shall cause application startup to fail. The registry shall not silently omit or partially register it, because that would make the available plugin set unpredictable.

After successful startup, the registry structure shall remain immutable until application restart. Runtime health changes do not add or remove registry entries.

### 2.4 Mandatory BUILD implementations

The generic plugin kernel shall not contain a hard-coded list of concrete BUILD plugin classes or identifiers.

Presence of the mandatory BUILD implementations shall instead be verified through an application-level integration or acceptance test covering:

- `GenericGeoTIFFIngestor`;
- `MockEngine`;
- `LightweightEngine`;
- `BandMathTool`;
- `SpectralProfileTool`;
- `ResultJoinTool`.

If a saved workflow refers to an unavailable plugin, submission-time validation shall reject the workflow with an explicit missing-plugin error.

This keeps implementation-specific completeness checks outside the generic registry while still providing graduation evidence that all mandatory plugins are present.

### 2.5 Lifecycle and health

The plugin kernel shall define a minimal common lifecycle:

1. descriptor discovery;
2. descriptor validation;
3. initialization;
4. ready execution;
5. shutdown.

Simple BUILD plugins may use no-op initialization and shutdown behavior.

Initialization failure shall abort application startup. Any plugin that initialized before a later startup failure shall be shut down cleanly where practical.

Each plugin shall expose lightweight health or readiness information with an explanatory reason when it is unavailable. Health is separate from the immutable descriptor:

- the descriptor states what the plugin is;
- health states whether it can currently accept execution.

A plugin that becomes unhealthy remains registered but shall not be selected for a new execution. If a plugin becomes unavailable after an execution snapshot has been created, invocation shall fail explicitly and follow the fail-fast job semantics.

BUILD does not require automatic repair, dynamic re-registration, or sophisticated health-monitoring infrastructure.

### 2.6 Invocation and concurrency

`PluginRegistry` shall hold one application-scoped registered instance for each plugin identifier.

Registered plugin implementations must therefore be stateless or thread-safe. They shall not retain mutable job, stage, input, result, or parameter state between invocations.

Per-execution state shall be passed through:

- input `DataReference` values;
- validated effective configuration;
- an execution context;
- local invocation state.

Plugins may use only platform services explicitly supplied through accepted contracts or dependency injection. They shall not:

- access persistence repositories directly;
- expose or persist raw filesystem paths;
- create hidden workflow schedulers;
- depend on controller or frontend types.

This is necessary because ADR-001 permits different jobs to execute concurrently even though only one stage runs at a time within each job.

### 2.7 Registry use by the platform

The following components shall discover plugins through `PluginRegistry` rather than depending on concrete implementations:

- plugin-catalogue application service;
- workflow validator;
- execution-snapshot binder;
- workflow executor;
- processing-engine resolver;
- interactive-analysis application service.

The registry may provide category-specific, type-safe lookup operations, but it must not contain branches for `GenericGeoTIFFIngestor`, `MockEngine`, `BandMathTool`, or any other concrete plugin.

The interactive spectral-profile path shall resolve the registered `SpectralProfileTool` through this same mechanism rather than directly instantiating or duplicating it.

## 3. Rationale

This decision:

- directly demonstrates independent plugin registration and discovery;
- uses the existing Spring container rather than introducing another extension mechanism;
- keeps the registered plugin set deterministic;
- allows startup-time contract validation;
- provides one authoritative source for the web catalogue, validation, binding, and execution;
- prevents injection order from becoming an accidental resolution rule;
- preserves plugin-specific behavior behind category contracts;
- remains small enough for the graduation timeline.

The project demonstrates architectural extensibility within a controlled deployment. It does not attempt to demonstrate arbitrary third-party runtime installation.

## 4. Alternatives considered

| Alternative | Reason not selected |
|---|---|
| Hard-coded plugin list, factory, or switch statement | Adding an implementation would require editing generic platform code and would undermine the central extensibility claim |
| Direct injection of concrete plugins into controllers or executors | Couples application use cases to implementations and creates multiple discovery paths |
| Java `ServiceLoader` or a second classpath-discovery mechanism | Duplicates Spring's composition role and complicates dependency injection, lifecycle, configuration, and testing |
| Runtime JAR directory and custom class loaders | Introduces class-loading, compatibility, security, unload, and failure-isolation problems explicitly excluded from BUILD |
| Separately deployed plugin services | Introduces network protocols and distributed failure semantics inconsistent with the modular-monolith decision |
| Silently ignoring invalid plugins | Makes the effective plugin set unpredictable and can defer configuration defects until workflow execution |

## 5. Consequences

### Positive

- Plugin discovery is automatic within the application composition root.
- Generic platform components have no concrete-plugin dependency.
- Invalid plugin declarations fail early.
- Catalogue and execution use the same authoritative registry.
- Test-only plugins can verify extensibility without altering platform code.
- Registry behavior is deterministic and explainable.
- Spring manages dependency construction and lifecycle integration.

### Negative and limitations

- Adding or upgrading a plugin requires rebuilding and restarting the application.
- Only trusted, application-packaged plugins are supported.
- Invalid registration can prevent the entire application from starting.
- Multiple active versions of the same plugin identifier are unsupported.
- Historical snapshots record provenance but do not preserve executable plugin binaries.
- Application-scoped plugins must be designed for concurrent use.
- Plugins share the process-level resource and fault-isolation limitations accepted in ADR-001.

These limitations are acceptable because dynamic third-party installation, untrusted plugins, and production upgrade compatibility are outside BUILD.

## 6. Verification implications

Tests must demonstrate:

- a test plugin bean is discovered without modifying registry or orchestration code;
- valid plugins are indexed by identifier, category, and capability;
- catalogue ordering is deterministic;
- duplicate identifiers cause registry construction or startup to fail;
- invalid descriptors and category-contract mismatches are rejected;
- two processing engines may expose the same capability without one being silently selected;
- lifecycle initialization occurs before execution and shutdown is invoked appropriately;
- an unhealthy plugin cannot be bound to a new execution;
- a missing referenced plugin produces a pre-execution validation failure;
- plugin descriptors remain stable during the process lifetime;
- execution snapshots record the resolved identifier and version;
- concurrent invocations do not leak per-execution state between jobs;
- every mandatory BUILD plugin passes its category compliance suite;
- application-level integration evidence confirms all mandatory BUILD implementations are registered;
- generic registry, validation, execution, and controller code contain no concrete-plugin selection branches.

The final claim of extensibility should be demonstrated by adding a test-only plugin implementation and exercising it through the generic discovery and invocation path without changing platform-core code.

## 7. Scope and documentation impact

This decision does not change `IMPLEMENTATION_SCOPE.md`. It formalizes its existing dependency-injection and plugin-contract requirements.

`CURRENT_ARCHITECTURE.md` reflects the immutable registry, startup-failure, identity, lifecycle, health, and concurrency rules established by this decision. Capability-selection precedence remains reserved for ADR-005, and repository implementation status remains unverified.
