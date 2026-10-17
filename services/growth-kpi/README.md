# Growth KPI demo MCP

A working local MCP server and deterministic synthetic export for this question:

> Generate a Growth report for 1 July–30 September 2026, against a target of 150 first-time donors, and compare with 1 April–30 June 2026. Explain the counting rules and data quality.

Expected demo: **120 new donors / 150 target = 80%, shortfall 30; previous quarter 90, increase 33.33%.** These are intentionally constructed synthetic figures, not WaterAid results or a forecast. New CRM records are a separate measure (130).

## Definition

A new donor is a unique canonical direct donor whose **first-ever qualifying received donation** is in the inclusive selected period. Both individuals and organizations count. Existing prospects can become new donors; reactivated or repeat donors cannot. Gift history must cover the organization's entire lifetime, or an independently verified first-ever gift fact must be supplied. This demo rejects a manifest marked incomplete. A manifest flag is an assertion, not proof that a real CRM export contains all history.

Proposed demo policy: use payment receipt date, include positive cash-equivalent donations and pledge/recurring/matching payments, exclude noncash gifts, pledges and recurring commitments, failed/pending payments, voids, fully refunded gifts and soft-credit recognition. Partial refunds retain donor eligibility. Refunds are assessed at the report period end; later refunds are not retrospectively applied to earlier as-of results. Confirm these reporting-policy choices with the team before production use. General ledger post status does not establish payment receipt.

The target is an explicit donor-count planning input. It is not a campaign's monetary goal. Comparison dates are explicit and reported; a zero prior-period denominator returns no percentage rather than infinity.

## Export pack and realism

`data/` contains UTF-8 BOM CSVs with CRLF records and string IDs:

| File | Grain and purpose |
|---|---|
| constituents.csv | One record per CRM identity: system ID, constituent ID, type, date added and preference examples |
| gifts.csv | One gift/commitment per system ID, gift ID, direct constituent reference, accounting post status and parent commitment link |
| gift_splits.csv | Two allocations per gift, with campaign, fund and appeal IDs; do not sum whole-gift amounts after joining |
| payment_events.csv | **Demo reconciliation supplement**, one receipt/refund/outcome event per row |
| soft_credits.csv | Recognition only; not extra revenue or new direct donors |
| constituent_merges.csv | **Demo identity-resolution supplement**, mapping known aliases to canonical donors |
| campaigns.csv | Campaign metadata and revenue goal (different from donor Growth target) |
| manifest.json | Synthetic status, coverage assertion, demo parameters, row counts and SHA-256 hashes |

This is a configurable **Raiser’s Edge-style export pack**, not a claim that Blackbaud produces these exact filenames/headers by default. NXT list exports, database-view exports and Query outputs vary. Payment outcome history and merge mappings require separately verified sources; accounting post status cannot substitute for them. The small names and contacts are deliberately synthetic and omit unnecessary donor contact information. The fixture models 500 canonical identities plus one known duplicate; repeated, split and historic gifts, older prospects converting, returning donors, commitments, declines, full refunds, recognition-only records and a future conversion.

This is not statistically representative fundraising data: amounts vary deterministically from $10 to $500, while allocation proportions remain deliberately simple so the demo can be independently reconciled. The earlier `synthetic-data/synthetic_data_kpi_analysis.csv` stays unchanged.

### Blackbaud research references

- [NXT CSV export behaviour](https://webfiles-sc1.blackbaud.com/files/support/helpfiles/rex/content/en-ca/content/bb-export-lists.html): selected columns, compound columns and semicolon-grouped multivalues.
- [Gift and constituent identifiers](https://community.blackbaud.com/discussion/77327/whats-new-open-a-record-in-raisers-edge-nxt-from-an-exported-list): system identifiers are distinct from user-facing IDs.
- [Accounting post statuses](https://community.blackbaud.com/discussion/77281/new-post-status-filter-and-column-for-gift-lists): Posted, Not posted and Do not post.
- [API entity families](https://developer.blackbaud.com/skyapi/renxt): gifts, splits, soft credits, constituents, campaigns, funds and appeals.

## Run the demonstration

Node 22; from this directory:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run demo
```

`examples/growth-report.md` is the readable report; the JSON includes the canonical donor cohort and source hashes. Regenerate the fixture with `python3 generate.py` and then rerun tests/demo. The generator uses only the Python standard library and is deterministic.

## Connect an agent

Use an MCP client that supports local stdio servers. Replace the absolute path below with your checkout path (do not paste a website URL):

```json
{
  "mcpServers": {
    "wetland-growth": {
      "command": "node",
      "args": ["/absolute/path/to/Wetland/services/growth-kpi/server.mjs"]
    }
  }
}
```

Tools: `inspect_growth_dataset`, `get_metric_definition`, `generate_growth_report` and `explain_growth_result`. The server reads its bundled fixture independently of the client's working directory. Example report arguments:

```json
{"start":"2026-07-01","end":"2026-09-30","target":150,"comparisonStart":"2026-04-01","comparisonEnd":"2026-06-30"}
```

## Boundaries

Supports local stdio and HTTP (`npm run start:http`); it is not yet deployed to GCP or wired into authenticated dashboard execution. Tools read only the fixed bundled synthetic dataset. There is no arbitrary upload/import interface, live Blackbaud connection or automatic donor matching. Known aliases are explicit; names are never used for deduplication. A production adapter needs tenant authorization, verified real-export field mappings, validated completeness, receipts/refunds reconciliation and approved data retention. Cohort IDs would be sensitive in a real dataset and must not be exposed to unauthorized users.

Tests exercise known cohorts, target comparison, inclusive boundaries, accounting independence, duplicate handling, refund timing, pending receipts, incomplete-history refusal, identity failures and a real MCP stdio client call. GitHub CI runs these tests; the existing deployment workflow still deploys only the dashboard.

Use `npm run studio` to edit guidance, report title, default target and metadata through the local draft/test/apply workflow. Shared framework documentation: [MCP-FRAMEWORK](../../docs/MCP-FRAMEWORK.md).
