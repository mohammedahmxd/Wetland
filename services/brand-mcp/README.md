# WaterAid brand reference MCP

The existing, public, read-only brand reference service. This is an independent research reference, not an official WaterAid service or endorsement. It is separate from the Wetland dashboard and authenticated backend.

- Website: https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/
- Streamable HTTP MCP endpoint: https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp
- Health check: `/api/health` (`/healthz` is also implemented locally).

## Run and test

Use Node 22. From this directory:

```sh
npm ci --ignore-scripts
npm run check
npm test
PUBLIC_BASE_URL=http://localhost:8080 npm start
```

`PORT` defaults to 8080. Set `PUBLIC_BASE_URL` to the externally reachable base URL so tools return correct asset and resource links. The test suite starts its own server on port 8796 and exercises real MCP client connections.

## MCP contract

Five tools: `get_brand_system`, `list_assets`, `get_asset`, `get_ui_guidance`, and `get_document_guidance`. Four resources expose brand tokens, asset catalogue, brand brief and document profile. The stateless endpoint accepts POST requests; an ordinary browser GET returns 405. The server has no authentication and serves public reference content only. Origin checking is not authorization.

## Edit the shared knowledge

- `dist/v1/tokens.json` and `dist/v1/tokens.css`: visual tokens.
- `dist/v1/assets.json`: asset catalogue, original sources and provenance hashes.
- `dist/brand-brief.md` and `dist/v1/sources.json`: guidance and evidence.
- `dist/v1/document-profile.json` and `dist/documents/`: document instructions, reference PDF and starter archive.
- `dist/app.js`, `dist/style.css`, `dist/index.html`: reference website.
- `mcp.mjs`: tool schemas and resource handlers.

Keep downloadable archives consistent with their source assets when editing. Run checks and tests before opening a pull request. These are file-based, version-controlled resources; they are not connected to the dashboard's browser-local document editor.

## Deployment

The Dockerfile installs locked dependencies and runs as the non-root `node` user. Existing service: `wateraid-brand-hub`, project `wateraid-flow`, region `northamerica-northeast2`.

An authorized deployer can run from this directory:

```sh
PROJECT_ID=wateraid-flow REGION=northamerica-northeast2 sh deploy.sh
```

The script uses a Cloud Run source build and requires appropriate build and deployment permissions. It does not alter service IAM/public access. Public access is already configured on the existing service. GitHub CI tests this service, but the current automatic deployment pipeline only deploys the dashboard. Adding brand deployment needs separately scoped build permissions and configuration.

## Assets and rights

Public reference content includes original-source SVG artwork, derived PNGs, document examples and Noto Sans fonts. Source URLs and provenance are recorded in the asset catalogue. WaterAid retains its artwork rights; inclusion does not grant a licence or endorsement. Noto Sans is distributed under the SIL OFL in `dist/fonts/OFL.txt`. No proprietary RB Nylo fonts are included.
