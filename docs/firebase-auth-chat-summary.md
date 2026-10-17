# Firebase auth chat summary

Summary of the work on Firebase Authentication for the brand MCP server. Login codes, access tokens, and refresh tokens are omitted.

## What was built

The brand MCP server can require Firebase sign-in. The website and health check stay public. Only `/mcp` requires a bearer token, and only after an audience is selected.

| `AUTH_PROFILE` | Who can sign in |
| --- | --- |
| unset | Public MCP. No Firebase check. |
| `demo` | Verified `@wateraidflow.org` Google accounts, plus the local email test user. |
| `production` | Verified `@wateraid.org` Google accounts. Google sign-in only. |

MCP clients use an authorization-code flow with PKCE. The server checks the Firebase ID token for a verified email on the active domain, then issues its own bearer token. Switching `AUTH_PROFILE` rejects tokens from the other audience.

The auth configuration lives in `services/brand-mcp/firebase.json`. It enables Google sign-in and email/password, and it defines the local Auth emulator. That file has not been deployed to a cloud Firebase project.

Pull request: https://github.com/mohammedahmxd/Wetland/pull/7  
Merged to `main` as `8d22feb`.

## Local test user

A cloud Firebase user could not be created because this environment was not signed in to Firebase. The demo audience instead uses a local Auth emulator account.

| Field | Value |
| --- | --- |
| Email | `flow-demo@wateraidflow.org` |
| Password | `local-development-only` |
| Project id | `demo-wateraid-flow` |
| API key | `local-emulator` |
| Emulator | `127.0.0.1:9099` |

Start it from `services/brand-mcp`:

```sh
npm run demo:auth
```

The command creates the verified user and prints a sign-in URL on port 8080. The password is for the local emulator only.

Pull request: https://github.com/mohammedahmxd/Wetland/pull/8

The local server was started with `npm run demo:auth`. Its health check reported the demo audience and `wateraidflow.org`. The emulator user completed authorization-code exchange and an MCP initialize call.

## Connection to `wateraid-flow`

`m1lakdawala@torontomu.ca` has Firebase Admin on `wateraid-flow`. The web app `WaterAid Flow MCP` (`1:462504004653:web:cf3ab8155d6ec90c32fca4`) exists. Email and password sign-in is enabled, and `localhost` is an authorized domain.

The verified user `flow-demo@wateraidflow.org` can sign in to `wateraid-flow`. A local server started with `npm run start:cloud` accepted that Firebase ID token and completed an MCP initialize call. The web API key and signing secret stay in the gitignored `.env.local`.

Google sign-in is enabled on `wateraid-flow`, with email and password kept as the demo fallback. The sign-in page offers Continue with Google first, then the email form.
