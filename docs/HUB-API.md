# Hub resource API
All routes are under /api/orgs/{orgId}/hub and require a verified bearer access token. Role names come from database memberships, never client headers. Demo tokens work only in explicitly enabled local development.

| Method | Route | Role |
|---|---|---|
| GET | /resources?after={uuid} | staff, maintainer, approver |
| POST | /resources | maintainer |
| GET | /resources/{id} | staff, maintainer, approver |
| POST | /resources/{id}/versions | assigned maintainer |
| POST | /versions/{id}/evaluate | assigned maintainer |
| POST | /versions/{id}/approve | independent approver |
| POST | /resources/{id}/activate | assigned maintainer |

Create resource: {kind:"document" or "tool",name:"..."}.
Create immutable version: {expectedRevision:1,payload:{...}}.
Document payload: {heading:"...",body:"..."}.
Tool payload: {name:"draft_report",description:"...",implementation:"extractive-report-v1",includeGaps:true,documentVersionId:"uuid"}.
Approve: {evaluationId:"uuid",rationale:"..."}.
Activate or roll back: {versionId:"uuid",expectedActiveVersionId:null or "uuid",reason:"..."}.

Tool definitions pin a published document version in the same organization. Evaluation currently validates the approved definition contract and missing-information setting; it is not a full semantic or security evaluation. Document body text does not grant permissions or execute code.

200/201 success; 400 schema error; 401 invalid token; 403 denied role/membership; 404 scoped record absent; 409 stale revision, wrong evidence or unmet lifecycle gate.

The existing reporting lifecycle routes in backend/README.md remain supported. Hub runtime execution and MCP transport are separate next increments.
