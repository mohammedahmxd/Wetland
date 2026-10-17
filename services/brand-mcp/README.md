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

Five tools: `get_brand_system`, `list_assets`, `get_asset`, `get_ui_guidance`, and `get_document_guidance`. Four resources expose brand tokens, asset catalogue, brand brief and document profile. The stateless endpoint accepts POST requests; an ordinary browser GET returns 405. With no auth environment variables the server stays public and serves reference content only. Origin checking is not authorization.

## Firebase sign-in

MCP access can require a verified Google account through Firebase Authentication. The website and health check stay public. Only `/mcp` requires a bearer token, and only after an audience is selected.

Switch the admitted mailboxes with one variable:

| `AUTH_PROFILE` | Who can sign in |
| --- | --- |
| `demo` | verified `@wateraidflow.org` Google accounts, plus the local email test user |
| `production` | verified `@wateraid.org` Google accounts |

Leave `AUTH_PROFILE` unset to keep the public reference endpoint. Setting it fails closed unless Firebase and the signing secret are configured. `AUTH_EMAIL_DOMAINS` can name an explicit list on its own; when it is set together with `AUTH_PROFILE`, the list must match that profile. A token from the other audience is rejected immediately after the switch, including tokens that were already issued.

Required when auth is on:

```sh
AUTH_PROFILE=demo
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_API_KEY=your-web-api-key
FIREBASE_AUTH_DOMAIN=your-firebase-project.firebaseapp.com
AUTH_SIGNING_SECRET=a-random-string-of-at-least-32-characters
PUBLIC_BASE_URL=https://your-host
```

`AUTH_PROFILE=production` is the same set of variables with the production audience. The Google sign-in page asks for the active domain, and the server checks `email` and `email_verified` on the Firebase ID token. The hosted-domain hint is not the security check.

Clients that understand remote MCP OAuth can use the same `/mcp` URL. The server publishes protected-resource and authorization-server metadata, then runs an authorization-code flow with PKCE. The browser step is `Continue with Google` on `/oauth/authorize`. Loopback redirect URLs (`http://127.0.0.1` and `http://localhost`) are accepted so desktop agents can finish the flow. `AUTH_TEST_MODE=true` signs local Firebase-shaped tokens for automated tests and refuses to start under `NODE_ENV=production`, Cloud Run, or AWS.

The demo audience also accepts email/password. Production stays on Google sign-in. A local test user is created in the Auth emulator, which does not create a mailbox or a user in a cloud Firebase project:

```sh
npm run demo:auth
```

| Field | Local test user |
| --- | --- |
| Email | `flow-demo@wateraidflow.org` |
| Password | `local-development-only` |

The command prints a sign-in URL. Use that email and password on the page. The password is for local development. The same verified user exists in the Firebase project `wateraid-flow`.

To run this server against that project, copy `.env.example` to `.env.local`, fill in the web API key and a signing secret of at least 32 characters, then run:

```sh
npm run start:cloud
```

Open the sign-in page at `http://localhost:8080`, not `127.0.0.1`. Firebase only treats `localhost` as an authorized domain. Google sign-in is enabled on `wateraid-flow`. The demo page keeps email and password as the fallback.

`services/brand-mcp/firebase.json` enables Google sign-in for the Firebase project. Authorized domains are hosting names, not the email allowlist. After choosing the Firebase project, deploy that configuration from this directory:

```sh
npx -y firebase-tools@latest deploy --only auth
```

The Google OAuth client has to be able to sign in the Workspace you are admitting. An internal client owned by `wateraidflow.org` will not accept `wateraid.org` users until that client is moved or replaced. Authorization codes are remembered in process memory for one minute; use a single instance until codes are stored in a shared database. Refresh tokens are stateless and last 12 hours.

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
