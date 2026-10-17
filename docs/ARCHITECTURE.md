# Architecture and scale boundaries

## Two explicit environments
The deployed **sandbox** uses browser-local state so it can be public without exposing internal data or write credentials. Its role picker is a demonstration control, never an authentication mechanism.

The **control plane** is a separately deployable stateless API with PostgreSQL and verified OIDC identity. It is implemented and tested locally, but the dashboard is not yet wired to it. Completing the authenticated API adapter and login flow is a required production step.

## Control-plane implementation
- Organization identity is validated through database membership on each API request.
- Resource lookups include organization ID. Compound foreign keys prevent cross-organization hub dependencies.
- Resource revisions enforce optimistic concurrency for edits. Activations lock the resource and compare the expected active version.
- Candidate payloads, evaluations and approvals are immutable database records.
- Documents and tools use explicit version IDs. Publishing guidance does not change dependent tool releases.
- Evaluations run on the server; submitted scores are not trusted.
- Independent approver role is distinct from the owner who creates/evaluates the candidate.
- Successful writes include audit events in the same transaction.
- Resource lists use a capped, cursor-paginated endpoint.
- Public demo can scale independently of the database/API. Initial API pool is 5 connections per instance: size the instance cap against the database connection budget.

## Execution boundary
Current code runs only bundled deterministic implementations. No contributor code is executed. Future external tools should run in isolated workers with no control-plane credentials, bounded runtime/memory, restricted network access and versioned artifacts. Queue long evaluations with deduplication, bounded retries and dead-letter handling.

## MCP delivery boundary
The intended authenticated Streamable HTTP adapter must call the same domain authorization and version-resolution services as the UI API. Do not create a separate permission system. Implement OAuth client discovery/authorization compatible with the selected agents; do not publish a shared privileged token. Tool discovery must expose only caller-permitted published versions. MCP transport has not been implemented in this change.

## Production gates
1. Select Entra or Google identity configuration and supported agents; provision verified subject memberships.
2. Deploy private managed PostgreSQL with separate migration/runtime roles, TLS, backups and tested restore.
3. Add row-level security as defence in depth; review contributor-specific grants (current hub API denies contributors access).
4. Wire the dashboard API adapter, login flow and CSRF/session treatment; remove demo roles from production build.
5. Add MCP transport and permission-aware source connectors; validate prompt-injection and data leakage boundaries.
6. Add rate limits, request timeouts, operational metrics, alerting, retention and incident ownership.
7. Queue expensive work and make retryable commands idempotent.
8. Bind implementation releases to immutable artifact digests; inspect dependencies and signed build evidence.
9. Conduct accessibility, security and load tests with defined service-level objectives.

No throughput, cost or production-readiness claim is established by the present tests. A 15-person initial team can start small; tenancy, immutable resources and deployment boundaries avoid coupling growth to a single browser or server instance.
