# Excel task pane implementation

This is a **Copilot-style demo, not Microsoft Copilot**. The request is a preset guided workflow with explicit period/target inputs; no model interprets free text. The same page has a clearly labelled browser CSV preview. Browser success does not prove native Excel sideloading or tenant approval.

## Behaviour and boundaries

- Office.js is loaded from Microsoft's supported CDN. The manifest requests ExcelApi 1.7 and `ReadWriteDocument` because writing the result requires workbook access.
- Nothing reads a workbook automatically. Clicking **Read active Excel worksheet** loads the active sheet's used-range dimensions first, limits the range to 10,000 rows/40 columns, then reads values. The first used row must contain the supplied headers. The server-backed verification accepts only the unchanged supplied 1,083-row synthetic gift export.
- CSV preview reads only the chosen local CSV. Neither mode silently substitutes sample data. Both normalize/hash all cells locally and compare with the public expected fingerprint before making a verification call. The metadata endpoint supplies only the expected fingerprint/count; it is not used as the input source.
- Only `{digest, rowCount}` goes to `verify_excel_demo_input`. Raw cells, names, filenames and worksheet contents are not sent to MCP. Date/target parameters then go to the existing guided workflow. The server uses its known synthetic receipt ledger, constituents and merge data; this is not an arbitrary workbook import.
- The add-in discovers the reviewed skill, starts the workflow and advances its three server-controlled stages. Only a completed Brand-validated result enables download links and workbook summary creation.
- **Add summary to a new Excel worksheet** creates a unique new sheet. It never clears or overwrites an existing sheet. The neutral summary contains returned figures, source fingerprint, skill version, Brand snapshot and links to the validated documents. Formula-looking strings are escaped. Starting from CSV requires saving as .xlsx to retain multiple worksheets.
- The public demo has no Microsoft account sign-in. Protected deployment, authenticated report delivery and native Copilot remain separate tenant work.

## Routes required

`/excel.html`, `/excel.js`, `/excel.css`, `/excel-normalize.js`, `/excel-manifest.xml`, `/excel-demo.csv`, `/excel-demo-data.json` and the existing `/mcp`. Serve only for the explicit synthetic presenter configuration. The metadata endpoint needs only `{digest,rowCount}`. The manifest SourceLocation points to the hosted Growth demo; change it deliberately for another deployment.

Allow the official Office.js CDN in this page's script policy and the intended Office/SharePoint hosts in its frame-ancestor policy. Keep ordinary report pages' restrictive policy separate.

## API references

- [Office JavaScript API and official CDN](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/understand-the-javascript-api-for-office)
- [Read worksheet ranges](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-get)
- [Read active worksheets and add new worksheets](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-worksheets)
- [ExcelApi 1.7 requirements](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/excel/excel-api-1-7-requirement-set)
- [Office add-in manifest](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests)

Native Excel sideloading and workbook write behaviour must be acceptance-tested in an actual supported Excel host. Unit tests cover input parsing, normalization and safe summary construction; they are not a substitute for that host test.
