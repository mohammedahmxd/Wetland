# Excel Growth demonstration

The Wetland task pane is a custom **Copilot-style demonstration**, not Microsoft Copilot. It reads the active worksheet through an Office Add-in, invokes the hosted MCP workflow, and writes its returned results into the workbook. Installing the add-in does not configure an organisation's Microsoft Copilot connection.

## Prepare the workbook

Use the supplied `Wetland-Growth-Excel-Demo.xlsx`. Its only worksheet, **Gift export**, contains the original synthetic `services/growth-kpi/data/gifts.csv`: 1,083 gift rows and 11 unchanged column headers, starting at A1. Amounts are numbers, dates are sortable Excel dates, and identifiers remain text. There is no precomputed report worksheet. Keep **Gift export** active when starting the task pane.

Alternatively, open the supplied `Wetland-Growth-gifts.csv` in Excel and save it as **Excel Workbook (.xlsx)** before running the demo. CSV cannot retain additional worksheets. Preserve the original headers and all rows; do not insert a title row or replace identifiers. This is an intentionally fixed synthetic fixture, not an arbitrary donor-file import feature. The gift export alone is not sufficient to establish first-ever received donations; the MCP uses its matching synthetic payment history, constituent merges and definitions.

## Load the custom task pane

Download the XML manifest from the deployed Growth service:

- Manifest: [excel-manifest.xml](https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app/excel-manifest.xml)
- Task pane: [excel.html](https://wetland-growth-kpi-demo-462504004653.northamerica-northeast2.run.app/excel.html)

The browser task-pane URL alone cannot read an Excel workbook. It must run inside Excel as an Office Add-in. These links require the Excel demo release to be deployed; a 404 means that release is not available yet.

**Excel on the web:** upload/open the `.xlsx` in your approved OneDrive or SharePoint environment. In Excel, choose **Home → Add-ins → More Settings → Upload My Add-in**, select the downloaded XML manifest, and upload it. The pane should appear, or the add-in becomes available in the add-ins menu. Menu labels can differ by release. Your tenant must allow custom add-ins; if upload is unavailable, ask the administrator to approve/deploy it. See [Microsoft's web sideload guide](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-office-add-ins-for-testing).

**Excel on Mac:** in Finder, press **Command–Shift–G** and open `~/Library/Containers/com.microsoft.Excel/Data/Documents/wef`. Create the `wef` folder if absent. Copy the downloaded XML manifest into it. Restart Excel, open the workbook, then choose **Home → Add-ins** and select the Wetland add-in. See [Microsoft's Mac sideload guide](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/sideload-an-office-add-in-on-mac). This is a development/demo installation, not tenant-wide deployment.

## Present the workflow

1. Start on **Gift export**. Show the original synthetic records and state that this demonstration does not contain real donor data.
2. Open the Wetland task pane. Use the reporting period **1 July–30 September 2026** and target **150** when prompted.
3. Select **Read active Excel worksheet**. The pane reads the source sheet only when you request it. Use the supported prompt: “Generate a Growth report for Q3 2026 against a target of 150 first-time donors. Use first-ever received qualifying donations and include evidence.”
4. Select **Verify data and run the MCP workflow**. The pane validates the supported fixture and calls the MCP. After a successful result, select **Add summary to a new Excel worksheet** for write-back. Do not describe a static worksheet as a live MCP result.
5. Inspect the returned definition, period, data evidence and actual/target comparison. For the unchanged fixture and period, the expected result is **120 new donors, 80% attainment and a gap of 30**. These are acceptance expectations, not values prefilled in this workbook.
6. If generating a finished PDF/HTML report, require the Brand-aware report tool and inspect its returned provenance and validation. An Excel summary is not automatically a Brand-approved document.

Outside Excel, the task pane offers **Read selected CSV locally** as a browser-only demonstration. It accepts the CSV and can exercise the MCP workflow, but cannot write a result worksheet to Excel. The `.xlsx` route requires Excel itself.

For another run, reactivate **Gift export** rather than the generated results sheet. Keep the original source sheet unchanged. Save the `.xlsx` after the live workflow has written its results.

## Verification boundary

The supplied workbook has been authored, inspected and rendered as an `.xlsx`, with its source rows compared separately against the fixture. Native Excel add-in loading, Office.js worksheet access and the live write-back must still be acceptance-tested in the intended Excel client and tenant. A browser preview or successful MCP call alone does not prove native Excel integration. Do not bypass administrator restrictions or substitute a screenshot for that test.

Installation guidance was checked against Microsoft's official documentation on 17 October 2026.
