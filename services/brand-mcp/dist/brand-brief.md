# Wetland / WaterAid reference kit

Version 0.2.0 · researched 17 October 2026 · research prototype, not official WaterAid brand guidance.

## Start here

Use the current WaterAid Canada website as the visual reference. Its observed styling is blue #006BD9, ink #151435, lime #D6FF00, cream #F8F0E4, white #FFFFFF and muted ink #44435D. These are computed CSS values observed on the live homepage, not an approved full brand palette. Avoid substituting old cyan values from generic brand directories. The current heading family is RB Nylo Black; body is Noto Sans. This kit self-hosts Noto Sans under the SIL Open Font License for body text and uses its Black weight as a proposed headline substitute. No RB Nylo redistribution/webfont licence was established.

## Evidence levels

1. Official guidance: explicit published statements from WaterAid, with region and date retained.
2. Observed: assets and styling visible on an official website; useful evidence but not a universal usage rule.
3. Proposed: Wetland-specific UI, slide and implementation decisions; editable team conventions.

## Logo and photography

The asset manifest links to the current white SVG logo found in the Canadian homepage footer and the three official water/sanitation/hygiene icons. The source SVGs and faithful transparent PNG conversions are packaged locally with source hashes and URLs. Use original artwork without recolouring, distortion or extraction of its pieces. The public Australia media page asks companies to contact WaterAid for logo use, and asks photo users to make contact and credit photographers. Those are regional published conditions, not evidence of permission for this project. Get Canada-specific approval and an approved asset pack for external production. No published current clear-space or minimum-size specification was located; do not invent an official rule.

Use documented, permission-cleared images of people actively operating, maintaining, learning or collaborating. Preserve photographer credits, captions and location context. Do not describe unrelated stock or generated imagery as evidence of WaterAid's work. This prototype uses no beneficiary photography.

## Halo pattern to reuse

Halo's live reference has 17 sections: foundations, typography, colour, visual language, voice, claims, patterns, icons, photography, applications, presentations, accessibility, web components, assets, agent connection, governance and changelog. Its agent page exposes versioned JSON, CSS, TypeScript, llms.txt and a read-only MCP service. Reuse this content architecture and evidence discipline. Do not carry over Halo's palette, visual thesis, product claims or dealer voice.

This first release implements foundations, colours, typography, assets, UI patterns, presentation layouts, references, agent files and governance. The same JSON powers machine-readable downloads and web views. A read-only MCP at /mcp queries these same brand files and returns asset URLs for agents.

## Wetland UI conventions (proposed)

Use a clear white workspace with ink text, blue links/actions and cream supporting areas. Reserve lime for one principal action or a deliberate emphasis. Status always has text and, when useful, an icon; never depend on colour alone. Preserve visible keyboard focus, descriptive links and reduced-motion preferences. Target WCAG 2.2 AA and test actual components. Use 16px body type, 44px minimum interactive targets and a 4px spacing scale as team defaults.

Prioritise six components: request brief; tool stewardship card; evidence table; source citation; evaluation comparison; release approval. Each tool card names its sponsor, maintainer, version and next review. Each claim includes source, date, scope and evidence status. Separate the output state (draft/reviewed/approved) from the tool's release state. A blue button never implies an output is trustworthy.

## Presentation conventions (proposed)

Use 16:9 slides, one message per slide, restrained large headings, ample whitespace and a persistent source footnote. Suggested sequence: need; staff workflow; one working demonstration; accountable stewardship; measured benefit; phased delivery; decision required. Pair a process graphic with one concrete example. Keep table bodies readable in a room. Display estimates as estimates, and put the denominator and period next to every percentage.

## Content boundary

Wetland is the hackathon project. WaterAid is the researched brand reference. Water Care Canada and Kijana are fictional challenge entities. Do not publish the organiser-only guide or turn fictional case metrics into WaterAid facts. No case-pack material is included in this hub.

## Open items before official use

Obtain the current Canada/federation brand guide, the authorised logo set and precise logo rules, font licences, approved photography and attribution conditions, plus the relevant French language conventions. Assign a brand owner, review date and release approval. This kit makes research usable; it does not create approval.

## Sources

- [WaterAid Canada — current website](https://www.wateraid.org/ca) — Official website; visual values observed 17 October 2026. Current identity, homepage navigation, hero, cards, captions and UI colours.
- [WaterAid photos and logos](https://www.wateraid.org/au/media/photos-and-logos) — Official regional guidance. Logo-use and photography permissions. Regional rules are not a Canada licence.
- [WaterAid Canada annual reports](https://www.wateraid.org/ca/our-annual-reports) — Official reference index. Report hierarchy and evidence presentation; older editions may use a previous identity.
- [WaterAid global](https://www.wateraid.org/) — Official website. Mission and editorial reference.
- [WASH Matters](https://washmatters.wateraid.org/) — Official policy and practice site; reference link. Technical content and resource-library reference.
- [Halo Brand System](https://brand.halocompass.com/) — User-supplied structural reference, inspected in browser. Human guide plus versioned machine-readable content, asset statuses, components and changelog.
- [Halo — Connect an agent](https://brand.halocompass.com/connect) — Inspected in browser. Pattern for llms.txt, JSON, CSS and an eventual read-only MCP service.

## Guide styling, release 0.2.0

The entire hub, print view and slide starter share WaterAid-blue, ink, cream and lime styling, original official-hosted logo references, and self-hosted Noto Sans. Typography and component choices remain proposed applications of the observed identity. Noto Sans licence: /fonts/OFL.txt.

## Dashboard asset usage

Use /assets/wateraid-dashboard-assets.zip for the complete pack. The white logo belongs on blue or dark ink. Blue icons belong on white or cream. Pick a PNG at least twice the displayed CSS width, retain its aspect ratio, and do not recolour or redraw it. The MCP asset catalogue supplies sizes, backgrounds, and exact file URLs.

## PDF and document standard — release 0.3.0

For every PDF or document request, call get_document_guidance before authoring. Fetch and embed the actual logo; colours and fonts alone are insufficient. Use /documents/wetland-one-pager-reference.pdf as the default visual baseline and /documents/pdf-starter.zip as the reusable generator. Follow /documents/agent-document-instructions.txt for layout and export checks. Adapt longer documents without shrinking content. Render every page and verify embedded artwork and fonts before delivery. These are Wetland team requirements, not official WaterAid rules.
