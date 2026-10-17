# Wetland MCP marketplace

Web dashboard requested by the user: showcase Water Care tool concepts plus the supplied brand MCP, with expandable cards. The user selected this scope on 17 October 2026.

The live reference is https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp. Its initialize, tools/list, get_brand_system, list_assets and get_ui_guidance were called during implementation. MCP server version 0.3.0; brand token release 0.2.0. Seven Water Care entries are illustrative proposals with no live endpoints. No case datasets or organiser files are included.

Features: full-text discovery, category filters, name/status sorting, grid/list display, native bookmark buttons, inline card expansion, overview/capability/connection tabs, client configuration copying, JSON export, browser-local submissions. Local storage is per browser and origin; no shared backend or installation is implied. New submissions are labelled unverified and accept HTTPS endpoints without embedded credentials.

Stack decision inferred for this build: dependency-free HTML, CSS and JavaScript; static Sites deployment. Accessibility includes keyboard tabs, visible focus, reduced motion, semantic landmarks and labelled controls. Brand guidance is researched reference material, not WaterAid endorsement.
