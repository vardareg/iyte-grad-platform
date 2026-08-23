# ADR-004: Reference-Based Artifact Handling

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-11 |
| Scope | BUILD |
| Related documents | `PROJECT_DEFINITION.md`, `IMPLEMENTATION_SCOPE.md`, `CURRENT_ARCHITECTURE.md`, `ADR-001`, `ADR-002`, `ADR-003` |

## 1. Context

The platform processes uploaded GeoTIFFs, intermediate rasters, derived rasters, spectral profiles, result bundles, and visualization previews.

Embedding these payloads directly in:

- workflow definitions;
- execution snapshots;
- job or stage records;
- API commands;
- in-memory orchestration state;

would couple workflows to storage representation, increase memory and database usage, complicate fan-out, and make completed outputs difficult to inspect after execution.

Raw filesystem paths would also expose an infrastructure detail to workflows, plugins, and clients. Such paths would be unsafe to accept from clients, difficult to relocate, and incompatible with the accepted artifact-storage boundary.

The platform therefore requires a small reference model that separates:

- logical workflow data;
- authoritative artifact metadata;
- physical payload storage;
- plugin access to payloads.

BUILD uses local filesystem storage. MinIO-compatible storage is STRETCH, while general object-storage deployment is FUTURE.

## 2. Decision

### 2.1 Ownership boundaries

Artifact handling shall be divided into three responsibilities:

| Component | Responsibility |
|---|---|
| `ArtifactService` | Artifact identity, creation coordination, reference resolution, integrity verification, metadata, and application-level access rules |
| `ArtifactStore` | Physical staging, finalization, reading, existence checks, and storage-specific operations |
| Artifact metadata persistence | Authoritative artifact records, types, checksums, metadata, timestamps, and relationships to results or producing stages |

The local filesystem implementation of `ArtifactStore` shall store payload bytes. PostgreSQL/PostGIS shall store authoritative metadata and references.

Application services, workflow code, and plugins shall not access the filesystem adapter or artifact repository directly.

### 2.2 Artifact identity and `DataReference`

Every published artifact shall receive a server-generated opaque `ArtifactId`.

An `artifact://` representation may be used for serialization, but it represents the same opaque identity and shall not reveal a filesystem path or storage layout.

A `DataReference` shall be an immutable value containing at least:

- artifact identifier;
- centrally owned logical data type;
- media type or representation information;
- byte size;
- checksum algorithm and digest;
- relevant immutable metadata, including geographic metadata where applicable.

The authoritative artifact record may additionally contain:

- creation timestamp;
- producing job and stage identifiers;
- output-port or result relationship;
- parent-artifact or preview relationship;
- internal storage information unavailable to workflows and public APIs.

Complete provenance graphs are not required. Existing job, stage, and result relationships provide sufficient BUILD traceability.

Client-supplied type, checksum, size, or metadata claims shall not be trusted. When a client submits an artifact identifier, the backend shall load the authoritative artifact record and validate it against the required pipeline input.

If a client sends a full `DataReference` whose fields disagree with the authoritative record, submission shall be rejected explicitly.

Opaque identifiers prevent storage-path leakage but do not constitute authorization. Authentication and access control remain FUTURE.

### 2.3 Artifact immutability

A published artifact shall be immutable.

Plugins and application services shall not:

- overwrite its bytes;
- change its logical type;
- replace its checksum or semantic metadata;
- reuse its identifier for a different payload.

Every successful transformation produces a new artifact identifier.

Consequently:

- an `UPLOADED_GEOTIFF` remains an uploaded artifact;
- `GenericGeoTIFFIngestor` publishes a distinct `SOURCE_RASTER`;
- either processing engine publishes a new `PREPARED_RASTER`;
- each band-math branch publishes its own `DERIVED_RASTER`;
- `SpectralProfileTool` publishes a `SPECTRAL_PROFILE`;
- `ResultJoinTool` publishes a `RESULT_BUNDLE`.

The ingestor may copy the uploaded GeoTIFF unchanged while adding catalogued metadata, but it shall not retype the existing upload reference.

The store may later implement internal byte reuse, but content-addressed storage and deduplication are not BUILD requirements. Equal checksums do not imply equal artifact identities.

### 2.4 Plugin-facing artifact access

Plugins receive input `DataReference` values and a restricted artifact-access service through their execution context or explicit dependency.

That service may provide:

- a scoped readable or seekable input handle;
- a managed temporary output target;
- an operation that publishes a completed output and returns a `DataReference`.

A local path may exist inside a scoped backend-only handle when required by a raster library. It must not be:

- returned as a plugin result;
- persisted in domain state;
- placed in logs as an artifact identity;
- exposed through an API;
- selected or constructed by the plugin.

Plugins shall not choose final filenames or storage locations. Original upload filenames may be retained as display metadata but shall never determine storage paths.

### 2.5 Staged and atomic publication

Artifact creation shall use staged publication:

1. The artifact service allocates an opaque identity and managed staging target.
2. The producer writes the complete payload to that target.
3. The target is closed successfully.
4. Size, checksum, media information, and applicable metadata are established.
5. The store finalizes the payload without exposing a partial file.
6. The authoritative metadata record is persisted.
7. Only then is a usable `DataReference` returned.

The concrete temporary-directory layout and atomic-move technique remain implementation choices. The required invariant is:

> No workflow, API response, job result, or downstream stage may observe a reference to a partially written artifact.

After a plugin returns all declared outputs, the executor shall validate their names and logical types. Recording the output-reference map and changing the stage to `SUCCEEDED` shall occur in one database transaction.

Downstream stages become eligible only after that transaction succeeds.

The database and filesystem do not share a distributed transaction. Therefore, failure after filesystem finalization but before metadata or stage-result persistence may leave unreferenced bytes or metadata.

BUILD accepts this limitation subject to these rules:

- the stage must not be recorded as successful;
- no downstream stage receives the incomplete output set;
- best-effort removal may be attempted;
- cleanup failure must not create a valid workflow result;
- an automated orphan-reconciliation subsystem is not required.

### 2.6 Resolution, existence, and integrity

`ArtifactService` shall be the only authority for resolving a `DataReference`.

Resolution shall verify:

- the artifact record exists;
- its authoritative logical type matches the required type;
- the backing payload exists;
- stored size and checksum information are present;
- content integrity matches the recorded size and checksum before consumption.

Repeated verification of the same immutable artifact within one execution may be memoized after a successful check. The exact checksum algorithm and optimization strategy remain implementation choices.

For an external pipeline input:

- missing metadata;
- missing bytes;
- logical-type mismatch;
- size mismatch;
- checksum mismatch;

shall reject submission before a runnable snapshot or job is created.

For an intermediate or result artifact discovered missing or corrupt during execution, resolution shall produce an explicit artifact-access or integrity failure. The current stage fails and the job follows the accepted fail-fast semantics.

A plugin that returns an unknown, unpublished, missing, or incorrectly typed reference causes a plugin-contract runtime failure.

Artifact failures shall not be reported as generic null values, missing ports, or successful empty results.

### 2.7 Fan-out and fan-in behavior

Fan-out shall pass the same immutable `DataReference` to every dependent branch. The artifact bytes shall not be copied merely because several stages consume them.

Because consumers cannot overwrite artifacts, the NDVI, NDWI, and spectral-profile branches may safely read the same `PREPARED_RASTER`.

`ResultJoinTool` shall publish a small manifest artifact representing `RESULT_BUNDLE`. The manifest shall contain named child references corresponding to:

- NDVI `DERIVED_RASTER`;
- NDWI `DERIVED_RASTER`;
- `SPECTRAL_PROFILE`.

The join tool shall verify that every required child reference is present and has the expected logical type. It does not:

- copy child raster bytes;
- merge raster pixels;
- claim scientific fusion;
- replace child artifact identities.

### 2.8 Small results and previews

Reference-based handling applies to all workflow payloads, including small JSON results.

Therefore:

- `SPECTRAL_PROFILE` is a stored result artifact;
- `RESULT_BUNDLE` is a stored manifest artifact;
- pipeline snapshots, stage records, and job records retain references rather than canonical payload copies.

An API may resolve and return parsed small JSON content for display. This convenience response does not change the persisted reference-based workflow model.

A web-renderable raster preview shall be stored as a separate auxiliary artifact associated with its canonical raster result. It is not an additional workflow logical type and is not substituted for the scientific raster.

The preview API shall return or stream content through the artifact boundary together with the geographic bounds needed by the map. It shall not expose a filesystem path.

### 2.9 Retention and deletion

BUILD artifacts may remain indefinitely.

BUILD does not require:

- automatic expiration;
- quotas;
- reference counting;
- deduplication;
- user-facing artifact deletion;
- cascading deletion;
- scheduled orphan cleanup;
- storage migration;
- backup or replication.

Tests may use isolated artifact roots that are removed after execution. Best-effort cleanup of failed staged writes is permitted and does not constitute a retention subsystem.

If application-level deletion is introduced later, its rules for catalogue entries, snapshots, jobs, result bundles, previews, and shared references require a separate design decision. Referenced artifacts must not be silently deleted.

## 3. Rationale

This decision:

- keeps large raster bytes outside workflow and database state;
- provides one authoritative source for artifact type and metadata;
- prevents clients from forging workflow input types;
- allows fan-out branches to reuse one immutable payload safely;
- preserves earlier successful results after downstream failure;
- makes result inspection possible after asynchronous execution;
- prevents storage paths from becoming public or domain contracts;
- supports a local filesystem implementation without coupling plugins to it;
- provides explicit evidence for missing and corrupt artifact handling;
- keeps object storage, deduplication, and retention outside BUILD.

The project demonstrates architectural separation and reliable reference flow, not production-grade data-lake management.

## 4. Alternatives considered

| Alternative | Reason not selected |
|---|---|
| Embed payloads in workflow definitions or execution snapshots | Makes definitions large, couples orchestration to representation, and duplicates data |
| Store raster bytes directly in PostgreSQL | Adds unnecessary database size and payload-management complexity |
| Pass in-memory byte arrays between stages | Poor fit for asynchronous execution, fan-out, persistence, and post-failure inspection |
| Use raw filesystem paths as references | Leaks infrastructure details and permits unsafe or non-portable path handling |
| Allow plugins to create final files directly | Bypasses identity, integrity, metadata, and partial-write controls |
| Mutate or retype an artifact between stages | Breaks immutability, provenance, and safe branch reuse |
| Use checksums as content-addressed identities | Introduces deduplication and lifecycle semantics unnecessary for BUILD |
| Use MinIO or another object store | A MinIO-compatible adapter is STRETCH; object-storage deployment is FUTURE |
| Build automatic retention and garbage collection | Adds deletion, reachability, and recovery rules that do not contribute to the accepted demonstration |

## 5. Consequences

### Positive

- Workflows and job records remain small.
- Artifacts can outlive an in-memory execution.
- Fan-out does not duplicate payloads.
- Plugins remain independent of physical storage.
- Missing or corrupt payloads fail explicitly.
- Storage paths cannot leak through normal contracts.
- Output publication has a clear visibility boundary.
- Result bundles retain child identities and provenance.
- Local filesystem storage remains replaceable behind a narrow port.

### Negative and limitations

- Filesystem and database updates cannot be fully atomic.
- Failed publication can leave unreferenced files or metadata.
- Checksum verification adds I/O cost.
- Local storage restricts the backend to one shared filesystem context.
- External manual file deletion can invalidate persisted references.
- BUILD provides no backup, replication, quota, retention, or automatic cleanup.
- Immutable transformations may duplicate unchanged bytes.
- Opaque identifiers provide no access control.
- Historical references do not guarantee reproducibility if files are manually removed.

These limitations are accepted because production storage management, distributed execution, and multi-user security are outside BUILD.

## 6. Verification implications

Tests must demonstrate:

- uploads receive opaque identifiers independent of original filenames;
- path traversal or client-provided paths cannot select storage locations;
- the backend resolves client identifiers using authoritative metadata;
- forged type, checksum, size, or metadata claims cannot bypass validation;
- raw filesystem paths do not appear in saved workflows, snapshots, job records, plugin outputs, or public API representations;
- a published artifact cannot be overwritten or retyped;
- each transformation produces a new artifact identity;
- incomplete staged writes produce no usable `DataReference`;
- a reference is returned only after bytes and authoritative metadata are available;
- stage outputs become visible to downstream stages only after successful stage-result persistence;
- missing external input bytes reject submission before job creation;
- missing intermediate bytes cause explicit runtime failure;
- checksum or size tampering is detected;
- an undeclared or unpublished plugin output reference causes contract failure;
- fan-out branches receive the same prepared-raster reference without copying it;
- `RESULT_BUNDLE` contains named child references and does not duplicate their payloads;
- spectral profiles and bundles remain referenced artifacts in persisted execution state;
- preview content is retrieved through the artifact service without path exposure;
- prior successful references remain readable after a later stage fails or execution is interrupted;
- concurrent jobs cannot collide in temporary or final artifact identities;
- the local filesystem adapter passes integration tests for staging, publication, resolution, and failure cleanup behavior.

No claim that artifact handling works may be made until repository and test evidence supports these behaviors.

## 7. Scope and documentation impact

This decision does not change `IMPLEMENTATION_SCOPE.md`.

`CURRENT_ARCHITECTURE.md` reflects the server-owned identity and metadata, immutable artifact semantics, plugin-facing scoped access, staged publication, authoritative resolution and integrity rules, reference-only fan-out and bundle behavior, auxiliary preview handling, and accepted filesystem/database atomicity limitation established by this decision.

Local directory layout and checksum algorithm remain implementation choices. Capability resolution remains reserved for ADR-005, final job and stage transition details remain reserved for ADR-006, and repository implementation status remains unverified.
