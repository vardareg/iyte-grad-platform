# Implementation Scope

| Field | Value |
|---|---|
| Status | Accepted |
| Version | 1.0 |
| Approved | 2026-08-11 |
| Governing definition | `PROJECT_DEFINITION.md` |

## 1. Purpose and authority

This document defines the implementation boundary for the İYTE graduation project. It classifies proposed work as BUILD, STRETCH, FUTURE, or OUT OF SCOPE.

This document governs whether a feature is required for project acceptance. `CURRENT_ARCHITECTURE.md` defines the approved intended design for delivering this scope, accepted ADRs record material decisions and rationale, and the repository and tests provide implementation evidence.

No item may be silently moved between classifications. A classification change requires an explicit scope decision and a new document version.

## 2. Scope classifications

| Classification | Meaning |
|---|---|
| **BUILD** | Required for graduation acceptance. It must be fully implemented and supported by automated tests or repeatable demonstration evidence. |
| **STRETCH** | Optional work that may begin only after all BUILD acceptance criteria pass reliably. Its absence does not make the project incomplete. |
| **FUTURE** | A plausible post-graduation extension. It may be documented but is not implemented as part of this project. |
| **OUT OF SCOPE** | Explicitly excluded. It receives no implementation or speculative placeholder code. |

There is no separate “interface only” tier. A future component does not receive an empty interface unless that interface is already necessary for BUILD behavior.

## 3. BUILD — required implementation

BUILD is the smallest complete implementation that proves the success concept in `PROJECT_DEFINITION.md`.

### 3.1 Plugin and data contracts

The system must provide:

- common plugin descriptor, lifecycle, health, configuration, and execution concepts;
- implemented plugin categories for:
  - `DataIngestor`;
  - `ProcessingEngine`;
  - `AnalysisTool`;
- plugin registration and discovery through dependency injection;
- typed input and output ports;
- `DataReference` objects for raster and result artifacts;
- capability-based processing-engine resolution.

Runtime JAR loading and hot reload are not required and must not be introduced into BUILD.

`MLService` is not a required BUILD category. Machine-learning integration is classified as STRETCH because it does not prove a distinct accepted architectural claim and would introduce an additional runtime and service boundary.

### 3.2 Workflow subsystem

The system must provide:

- persistent pipeline definitions;
- immutable execution snapshots;
- typed directed-acyclic-graph construction;
- pre-execution validation of:
  - cycles;
  - incompatible ports;
  - missing plugins;
  - missing or invalid required parameters;
- in-process execution supporting:
  - linear flow;
  - fan-out;
  - fan-in;
- job and stage states, timestamps, progress, results, and useful failure information;
- one deterministic result-join implementation.

Automatic retry, a distributed queue, conditional branches, and fallback edges are not part of BUILD.

### 3.3 Minimum plugin implementations

| Plugin | Required BUILD responsibility |
|---|---|
| `GenericGeoTIFFIngestor` | Ingest a local upload or bundled multi-band GeoTIFF fixture, extract basic metadata, store the artifact, and return a reference. |
| `MockEngine` | Produce deterministic prepared output and optionally simulate execution delay. |
| `LightweightEngine` | Perform one honest, limited raster transformation through the same processing contract. |
| `BandMathTool` | Support a small fixed operation set such as NDVI and NDWI; arbitrary user expressions are not required. |
| `SpectralProfileTool` | Use the same underlying implementation as both a pipeline stage and an interactive pixel-inspection operation. |
| `ResultJoinTool` | Combine compatible branch results into an inspectable result bundle without claiming to perform scientific raster fusion. |

These implementations collectively prove extension contracts, typed composition, linear and branching execution, interactive reuse, visualization, and processing-engine replacement. Additional plugin count is not a BUILD objective.

### 3.4 Web application

The web application must provide:

- a plugin catalogue;
- a visual DAG editor;
- typed connection feedback based on server-owned validation rules;
- pipeline save, load, validate, and execute operations;
- job and stage monitoring through simple polling;
- a result list and basic map visualization;
- web-renderable raster previews with geographic bounds;
- pixel selection that invokes `SpectralProfileTool`;
- processing-engine selection through configuration or capability resolution.

A full raster tile server is not required. A generated preview overlay is sufficient to prove result visualization.

### 3.5 Persistence and runtime

BUILD uses:

- a Java/Spring modular monolith;
- a React/TypeScript frontend;
- PostgreSQL/PostGIS for catalogue metadata, workflows, jobs, footprints, and result references;
- local filesystem artifact storage behind an abstraction;
- Docker Compose for the required database dependency;
- in-process job execution.

Redis and MinIO are not part of BUILD. Redis must not become an accidental distributed job system.

### 3.6 Verification

BUILD verification must include:

- unit tests for contracts, registry behavior, lifecycle, type compatibility, graph validation, engine resolution, and execution planning;
- deterministic tests for linear, fan-out, fan-in, invalid-edge, and cyclic workflows;
- plugin-compliance tests for every BUILD plugin;
- integration tests for persistence, artifact references, APIs, and plugin execution;
- a repeatable acceptance script for the complete web demonstration;
- traceability from each material architectural claim to source code, an automated test, or a repeatable demonstration step.

Code coverage may be reported, but no fixed percentage is an acceptance criterion. Acceptance depends on meaningful architectural behavior and evidence.

## 4. Required end-to-end demonstration

The accepted demonstration path is:

```text
Upload GeoTIFF
      ↓
GenericGeoTIFFIngestor
      ↓
Processing capability
(MockEngine or LightweightEngine)
      ├── BandMathTool: NDVI ──┐
      ├── BandMathTool: NDWI ──┼── ResultJoinTool
      └── SpectralProfileTool  ┘
                                 ↓
                       Visualize and inspect
```

The same saved logical workflow must then be executed with the alternative processing engine selected through configuration or capability resolution. This replacement must not require modification of the workflow definition, user interface, or generic platform-core orchestration.

The demonstration must expose the complete success path:

`INGEST → BUILD DAG → VALIDATE → EXECUTE → MONITOR → VISUALIZE → INSPECT → SWAP PROCESSING ENGINE`

## 5. BUILD acceptance criteria

BUILD is complete only when repeatable evidence demonstrates that:

- plugins are independently registered and discovered;
- workflow connections are governed by explicit data types;
- incompatible connections and invalid graphs are rejected before execution;
- linear, fan-out, and fan-in workflows execute correctly;
- job and stage progress is understandable to the user;
- generated results can be visualized and inspected;
- the same logical workflow can use both BUILD processing engines through configuration or capability resolution;
- engine replacement does not require redesign of the workflow, user interface, or platform core;
- `SpectralProfileTool` reuses the same underlying implementation interactively and within a workflow;
- adding or replacing an implementation does not require plugin-specific branching in generic orchestration code;
- every material architectural claim is traceable to source code, an automated test, or a repeatable demonstration step.

Feature count, scientific completeness, speculative extensibility, and fixed coverage percentages are not acceptance measures.

## 6. STRETCH — optional after BUILD completion

The following items are optional and may begin only after all BUILD acceptance criteria pass reliably:

- remote Landsat 8 search and download;
- region-of-interest drawing and `ROIClipTool`;
- either reprojection or resampling as one additional operation;
- one Python cloud-mask service through an `MLService` proxy;
- Server-Sent Events or WebSocket progress updates;
- cancellation and bounded stage retry;
- a MinIO-compatible artifact-store adapter;
- one Playwright browser acceptance test;
- GitHub Actions continuous integration;
- OpenAPI documentation;
- pipeline templates.

Stretch work must not destabilize or delay the mandatory demonstration.

## 7. FUTURE — documented post-graduation extensions

The following items are possible future work and are not implemented as part of this project:

- Sentinel-1 and Sentinel-2 ingestion;
- a separate C/C++/OpenCL processing engine;
- land-cover classification and advanced machine-learning services;
- additional raster and GIS analysis plugins;
- object-storage deployment;
- authentication and role-based access for a multi-user version;
- advanced pipeline semantics and scheduling.

The possible C/C++ processing engine associated with a separate Boğaziçi thesis remains independent future work behind the processing-engine boundary. The İYTE project must be fully demonstrable and independently deliverable without it.

## 8. OUT OF SCOPE — explicitly excluded

The following work is excluded:

- scientifically complete Level-0-to-Level-2 processing;
- conversion to microservices;
- Kubernetes, Kafka, and multi-node execution;
- real-time satellite streaming;
- production security, availability, and scale guarantees;
- full GIS editing functionality;
- collaborative workflow editing;
- GPU or HPC performance research;
- novel remote-sensing or machine-learning algorithms;
- formal coupling benchmarks;
- fault-injection studies;
- mutation testing;
- load testing.

## 9. Scope control

- BUILD work has priority over every other classification.
- STRETCH work may not be used to compensate for incomplete BUILD behavior.
- FUTURE items may be explained as extension points but must not be presented as implemented.
- OUT-OF-SCOPE items must not receive implementation or placeholder abstractions.
- Any proposed new feature must first be classified through an explicit update to this document.
- Repository and test evidence, not planning claims, determine whether a BUILD item is complete.

## 10. Documentation consequence

Any BUILD assumptions in `CURRENT_ARCHITECTURE.md` that conflict with this accepted scope are documentation drift. The architecture must be updated through a controlled review; the conflict must not be silently reconciled.
