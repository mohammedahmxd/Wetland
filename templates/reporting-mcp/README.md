# MCP starter

Assign an owner, describe the purpose, replace the sample content, and add tests before opening a PR.

Run `npm install --ignore-scripts`, commit the generated package-lock.json, then `npm test`, `npm start` (stdio), `npm run start:http`, or `npm run studio`.

The studio edits manifest metadata, configuration and guidance, evaluates a saved draft in an isolated copy and applies passing drafts to Git working files. Apply is not publication. Open a PR for independent review. Never deploy the local studio.

Tool implementation is in capability.mjs. Do not treat editable guidance as executable code. Private data requires a verified authorization adapter and tenant-scoped queries; the runtime refuses private HTTP services without an adapter. Add this service to CI before release. See docs/MCP-FRAMEWORK.md for deployment and release requirements.
