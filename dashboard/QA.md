# Dashboard QA — 17 October 2026

Result: **104 browser assertions passed**, including 30 responsive page/role combinations. All three Node test suites passed. No browser console errors or warnings appeared during the final run.

## Environment

- Tested the local source in the in-app Chromium browser at `http://localhost:8081` with separate browser storage. The user's workspace at port 8080 was not changed by QA fixtures.
- Layout matrix: five pages × Admin and Contributor × 390×844, 768×1024, and 1440×900 viewports.
- Verified page headings, current navigation state, two available roles, mobile navigation and absence of horizontal page overflow. Inspected mobile manager, editor and review dialogs visually.

## Defects fixed

1. Requests stopped at Review because the remaining pages exposed no approval controls. Admins can now run evaluations, acknowledge four review checks, request changes, approve a pilot and approve live status from request details.
2. Submitted contributor tasks disappeared before Admin review. The Contributors page now keeps review, release-pending and completed tasks visible; Admins can also see triage tasks.
3. Live tools had no visible route into the existing issue/maintenance workflow. Admins can report an issue from live request details and review maintenance candidates on the roadmap, including their submitted evidence.
4. Requesting implementation changes retained old evaluations and approvals. Returning to Building now clears both. Empty evaluation lists also no longer authorize pilot/live approval or publication.
5. Generic dialogs could retain a missing accessible title reference after a library dialog. All dialogs now receive a current title reference and open at the top.
6. Evaluation details ran into their labels. Details now appear on separate lines, and review dialog headers stay visible while scrolling.
7. New request and onboarding buttons appeared for roles that could not use them. These controls now match the current role and onboarding state.

## Browser coverage

| Area | Verified behavior |
| --- | --- |
| Navigation/layout | All five pages, both roles, mobile/tablet/desktop, active navigation, two role options |
| Library discovery | No-results state, Clear filters, Available filter, department jump clearing conflicting filters |
| Cards/actions | Enter and Space opening, independent action menus, outside-click/Escape dismissal, Escape closing details |
| Copy tools | Endpoint, spaced prompt, parseable JSON configuration and starter prompt copied correctly |
| Permissions | Contributor can edit existing MCPs; cannot see Add MCP, Manage library or Delete MCP; Admin management available |
| MCP lifecycle | Create, edit, reload persistence, manager search, delete cancellation, soft deletion and full restore |
| Method tags | Enter commits without submission, unfinished input commits on save, invalid names rejected, comma/newline paste, Backspace and remove buttons |
| Validation | Available MCP requires an endpoint; unsafe endpoint scheme rejected; duplicate department names rejected |
| Editor dialogs | Save confirmation, Cancel confirmation, Keep editing preserves draft, close/Escape requests discard, Escape from confirmation returns to editor |
| Departments | Add at chosen position, rename, occupied deletion blocked, empty deletion succeeds |
| Requests | Create, scope, onboarding, claim, submit, blocked approval without checks, request changes, reset old approvals, re-review, pilot and live |
| Contributions | Claim, evidence submission, task remains visible, Admin acceptance, completed state and recognition |
| Maintenance | Report, triage, claim, submit, request changes, resubmit, candidate, blocked unreviewed publication, evaluate, approve, publish, close task and award recognition |
| Change log/export | Actions appear with actors; session JSON downloads and contains workspace data |

Node regression suites additionally cover department protection for deleted MCP entries, rejected-role mutation guards, malformed URLs, model validation, stale release candidates, rollback, retirement and empty-evaluation rejection.

## Repeating automated checks

From `dashboard`, run `npm test` with Node available. The suites are `test.mjs`, `hub-test.mjs` and `resource-test.mjs`.

QA evidence for this run is in the workspace's `output` directory: `qa-results.json`, `qa-library-desktop.png`, `qa-library-mobile.png` and `qa-review-mobile.png`.

## Scope limits

This verifies the browser-local prototype. Roles remain a demo switcher, and persistence uses localStorage. Shared database persistence, server-enforced authorization and external MCP service execution were not part of this run. Safari and Firefox were not tested.

## Admin full-access follow-up

Admin now inherits contributor workflow permissions. Admin can claim challenges and tasks without contributor onboarding, submit implementation and maintenance evidence, and complete review and approval without switching roles. Task assignment uses the acting Admin's name. Contributor restrictions and required validation/review checks remain enforced.

Verified in a separate workspace at port 8082: Admin claimed the scoped Evidence finder, submitted evidence, ran evaluations, acknowledged review, and approved pilot and live status. Admin also claimed, submitted and accepted a documentation task; assignment was Maya Chen and the final task status was Closed. No role switch was used and no console errors or warnings appeared. All three Node suites passed, including the new Admin workflow regression tests.

## Minimal Contributor view, Roles and Change log follow-up

Contributors now have three navigation items: Resource library, My work and Change log. My work shows their assigned work and available tasks, with a single onboarding action when needed. Removed the points/profile panel and extra card metadata. Admins retain all pages and gain the Roles tab.

Roles manages the browser-local members Maya Chen, Alex Morgan and Jo Ellis. Existing workspace data migrates without resetting resources or departments. The demo selector switches members rather than assigning permissions; the selected member's saved role determines the interface. The Roles route and its mutation handler require Admin. The final Admin cannot be demoted. Self-demotion immediately hides management controls and leaves the Roles page. Task/project assignment and onboarding now belong to the individual member.

Change log entries retain the acting person's name, ID and role at the time of the action. Role changes include old/new permissions. MCP edits include the resource name; department changes and role changes have distinct types. The table sorts newest first, supports search and empty results, survives reload and exports member roles and audit records. Cancelled, rejected and unchanged role updates do not create entries.

QA found and fixed a default-button issue that made Cancel submit the role form. All generated action buttons now use `type="button"`; form submission buttons remain explicit. Retested cancelled role changes and MCP edits: neither saves data nor adds Change log entries. Generic dialog errors now appear inside the dialog.

Final result: **63 passing browser assertions**, including **27 layout combinations** (six Admin pages and three Contributor pages at 390, 768 and 1440 pixels), plus narrow 320-pixel checks. No console errors or warnings. All **four** Node suites pass, including `members-test.mjs` for migration, last-admin protection, promotion/demotion, permission denial, no-op saves, actor snapshots, personal onboarding and assignment ownership.

Browser checks covered both Contributors being denied the Roles URL, promotion taking effect, self-demotion, last-admin errors, Cancel/no-op logging, role persistence, onboarding, task claim/submission, Admin acceptance, MCP edit permissions, correct named/typed events, newest-first sorting, log search, export and reload. Tests used a separate origin at port 8083, leaving the user's port-8080 data unchanged. The initial Cancel failure and successful retests are recorded in `output/roles-qa-results.json`. Screenshots: `contributor-minimal.png`, `admin-roles.png` and `roles-changelog.png`.

This remains a local demo with a demo member selector. It is not shared account authentication or server-enforced authorization.
