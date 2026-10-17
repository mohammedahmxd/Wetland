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

The running server is not connected to the Firebase project `wateraid-flow`.

- There is no `.firebaserc` in the repo.
- The local process uses the emulator project `demo-wateraid-flow`.
- `firebase login --no-localhost` succeeded as `m1lakdawala@torontomu.ca`.
- That account can see only the Firebase project `fir-demo-project`.
- Listing apps for `wateraid-flow` returned: Firebase project `462504004653` not found.
- The directory `services/brand-mcp` is recorded locally as active project `wateraid-flow`, but there is no web API key or app config from that project.

To finish the connection, add `m1lakdawala@torontomu.ca` to the `wateraid-flow` Firebase project, or sign in with a Google account that already has access.
