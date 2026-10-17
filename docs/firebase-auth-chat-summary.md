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

`m1lakdawala@torontomu.ca` can now see `wateraid-flow`. The account has Firebase Authentication Admin and Browser access. It does not have Firebase Admin, so creating a web app and an API key is still denied.

Authentication is initialized on `wateraid-flow`:

- Email and password sign-in is enabled.
- Authorized domains include `localhost`, `wateraid-flow.firebaseapp.com`, `wateraid-flow.web.app`, and the brand hub Cloud Run host.
- The verified test user `flow-demo@wateraidflow.org` exists in that project. The local password is `local-development-only`.
- `services/brand-mcp/.firebaserc` selects `wateraid-flow`.

The local server is still the Auth emulator. The browser sign-in page needs a Firebase web API key, and this account cannot create the web app that issues that key. Grant `roles/firebase.admin` (Firebase Admin) to this account to finish that step.
