# Source Authority

| Field | Value |
|---|---|
| Status | Active |
| Version | 1.0 |
| Effective | 2026-08-23 |
| Canonical repository | [`vardareg/iyte-grad-platform`](https://github.com/vardareg/iyte-grad-platform) |
| Canonical branch | `main` |

## Authority by question

| Question | Authoritative source |
|---|---|
| Problem, objective, contribution, stakeholders, and success concept | [`PROJECT_DEFINITION.md`](PROJECT_DEFINITION.md) |
| BUILD, STRETCH, FUTURE, and OUT-OF-SCOPE classification | [`IMPLEMENTATION_SCOPE.md`](IMPLEMENTATION_SCOPE.md) |
| Currently approved intended architecture | [`CURRENT_ARCHITECTURE.md`](CURRENT_ARCHITECTURE.md) |
| Accepted architectural decisions and rationale | Accepted [`decisions/ADR-*.md`](decisions/) files |
| Implemented behavior and verification | Repository source code, executable tests, and repeatable repository evidence |
| Planning, milestone status, and next action | [`PROJECT_STATUS.md`](PROJECT_STATUS.md), derived from and required to agree with repository evidence |

Committed content on `main` is the canonical project state unless a later accepted governance decision changes the branch. Other branches and working-tree changes are proposals until merged into `main`.

## Operational rules

1. Use the source that owns the question. Repository source code and executed tests override planning documents for implementation-status and verification claims.
2. Accepted ADRs must be reflected in `CURRENT_ARCHITECTURE.md`. Any disagreement is documentation drift and must be reported, not silently reconciled.
3. Within the authority boundaries above, the latest explicitly accepted project decision overrides older documentation. A decision cannot silently change a classification owned by `IMPLEMENTATION_SCOPE.md`.
4. ChatGPT Project Source uploads are non-authoritative mirrors or snapshots. When one differs from GitHub, use the version on the canonical `main` branch and report the stale mirror rather than reconciling it silently.
5. Chat conversations are not architectural authority. A decision becomes authoritative only after it is written into the appropriate canonical document, explicitly accepted where required, and committed to `main`.
