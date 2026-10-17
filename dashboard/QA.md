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
