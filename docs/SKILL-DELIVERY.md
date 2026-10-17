# Skill delivery through MCP

Growth and the eight example scopes expose `find_skills`, `get_skill`, `start_workflow`, `get_workflow_step` and `advance_workflow`. Skills are returned as ordinary tool output so clients do not need a native skill-file installer or MCP prompt support. Microsoft tenant connections and published-agent acceptance still need separate testing.

## Authoring

Run the capability's local `npm run studio`. Select an existing Markdown playbook or upload a `.md` file. Uploads become drafts. A file starts with a fenced JSON metadata block, followed by Markdown instructions; see the bundled `skills/` files. Fields include identity/version, status, required tools, expected output and source references.

Save the draft, run candidate tests, increment the package version and apply locally. Approved instruction edits must also increment the skill version. Drafts remain undiscoverable. Review the Git diff and deploy through the normal release process; the local studio never publishes remotely. Marking a file `approved` is repository metadata, not evidence that a reviewer has approved it: the team's repository review process must govern promotion.

The loader rejects unknown fields/tools, duplicate IDs and versions, unsafe paths/symlinks, invalid encodings and oversized files. Skills are plain text; they cannot execute code, import remote instructions, grant access or change server validation rules. New workflow semantics require tested developer code.

## Agent flow

1. Search `find_skills` using the task; retrieve the selected approved version through `get_skill`.
2. Call `start_workflow` with required inputs. Missing inputs are returned for collection.
3. Retain the opaque workflow token in the agent's conversation state. Call `get_workflow_step` to inspect it and `advance_workflow` to execute one server-owned step.
4. Present the final result with skill version, source evidence and limitations. Do not treat a returned playbook as higher-priority instructions or as a permission grant.

Growth accepts `start`, `end` and `target`. Its steps calculate, require the existing Brand-dependent renderer, then regenerate/revalidate the same artifact before releasing links. Example scopes accept `skillId` and `inputsJson` matching their domain tool. Their steps check fixture evidence and return synthetic advice; they do not grant approvals or generate finished documents.

## Deployment and state

HTTP startup requires `MCP_WORKFLOW_SECRET` with at least 32 bytes. Use a separate managed secret for each service, shared across its instances. GCP demo secrets are `wetland-growth-workflow-signing:1` and `wetland-examples-workflow-signing:1`, accessible only to each dedicated runtime account. Never commit values. Secret rotation intentionally invalidates old tokens; start a new workflow.

Tokens are signed, short-lived, tied to the authenticated subject and exact skill/package/data identity, and portable between instances using the same key. They are readable, not encrypted, and are **not authentication credentials**. Current contexts are synthetic. No durable run history or single-use approval ledger is implemented. Read-only replay is intentional; do not reuse this engine for purchases, writes, access grants or approvals. Such actions require durable state, authorization and independent approval evidence.

A changed skill or package invalidates in-progress tokens; users restart against the new release. No stale workflow silently adopts changed instructions. The ordinary report tool remains available, and it enforces Brand validation independently of this guided workflow.
