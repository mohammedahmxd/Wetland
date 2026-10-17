---
name: Wetland MCP marketplace
description: A purposeful catalogue of connected tools, with details that open in place.
colors:
  blue: "#006BD9"
  ink: "#151435"
  lime: "#D6FF00"
  cream: "#F8F0E4"
  white: "#FFFFFF"
  muted: "#44435D"
  line: "#dedee6"
  canvas: "#fafafc"
  green: "#276449"
  blue-hover: "#0056af"
typography:
  display:
    fontFamily: "Noto, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "-1.2px"
  headline:
    fontFamily: "Noto, Arial, sans-serif"
    fontSize: "29px"
    fontWeight: 900
    lineHeight: 1.16
    letterSpacing: "-1px"
  title:
    fontFamily: "Noto, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: "-0.4px"
  body:
    fontFamily: "Noto, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  detail-body:
    fontFamily: "Noto, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Noto, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.55
  code:
    fontFamily: "Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.8
rounded:
  tag: "4px"
  filter: "5px"
  control: "6px"
  navigation: "7px"
  surface: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  control-gap: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  desktop-gutter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
  navigation-active:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.navigation}"
    padding: "12px 14px"
  category-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.filter}"
    padding: "7px 12px"
  tool-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  connection-config:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    padding: "18px"
---

# Design System: Wetland MCP marketplace

## Overview

**Creative North Star: "Connected to purpose"**

The implemented world combines a dark ink navigation rail, a clear white workspace, a blue introduction and warm cream supporting panels. Heavy, compact headlines give the catalogue a confident voice; small, measured labels keep the working area dense and scannable. Colour and typography follow the supplied WaterAid brand MCP, token release 0.2.0. The north-star phrase describes the implemented direction and existing page copy.

Wetland is the product identity. The original white WaterAid SVG appears as a labelled brand reference on the dark rail. Noto Sans is self-hosted from the reference hub under the SIL Open Font License; its Black face supplies the headline weight in place of the reference's unlicensed RB Nylo family.

**Key Characteristics:**

- Strong blue and ink anchors with restrained lime punctuation.
- Flat, bordered working surfaces and compact typography.
- Expandable inline cards that preserve catalogue context.
- Text-labelled status, visible focus and reduced-motion support.

## Colors

The six brand colours are reproduced exactly from the supplied MCP. Border, canvas, live-status and hover colours are additions made for this interface. Frontmatter is the normative token source; matching CSS variables live in `dist/styles.css`.

### Primary

- **WaterAid blue** (`blue`): primary actions, active navigation, introduction, links and focus indicators.
- **Deep ink** (`ink`): navigation background, primary text, selected categories and configuration blocks.
- **Deep action blue** (`blue-hover`): primary-button hover state.

### Secondary

- **Electric lime** (`lime`): Wetland mark, central connection node, text selection and emphasis on the dark rail.
- **Warm cream** (`cream`): supporting invitations, scope notes and avatar.

### Tertiary

- **Live green** (`green`): confirmed live-status text and dots, paired with a written status label.

### Neutral

- **White** (`white`): cards, fields, topbar and reversed text.
- **Muted ink** (`muted`): descriptions and metadata.
- **Fine line** (`line`): section dividers and detail boundaries.
- **Cool canvas** (`canvas`): workspace ground behind white cards.

**The Brand Anchor Rule.** Preserve the six source brand colours; keep additional neutral and semantic colours subordinate to them.

## Typography

The CSS family name `Noto` maps to bundled Noto Sans Regular, Bold and Black files. Arial and sans-serif are fallbacks. The same family carries prose and controls; Consolas supplies configuration code.

- **Display:** page headings use the display token; small-screen headings reduce to 28px.
- **Headline:** the compact desktop introduction uses the headline token. Its small-screen range is 30–32px.
- **Title:** catalogue titles use the title token, become 15px at intermediate widths, and 18px on small phones. Expanded titles reach 20px on desktop.
- **Body:** the body token sets the root; working prose is intentionally smaller. Card descriptions are 11px/1.75 on desktop, 12px on small phones and 13px on wide screens. Detail prose uses the detail-body token and long descriptions cap at 75ch.
- **Label:** action labels use the label token; metadata and tags range from 8–11px according to context.
- **Code:** configuration blocks use the code token and wrap long endpoints.

**The Weight Rule.** Use Black for high-level headings, Bold for actions and ownership values, and Regular for explanatory copy.

## Layout

The desktop rail is fixed at 248px and the content shell offsets by the same amount. At 1200px and below the rail narrows to 220px. The main container caps at 1500px, normally uses 40px horizontal gutters and increases to 56px on screens at least 1600px wide. Gutters reduce to 28px at 1200px and 20px at 760px.

The catalogue uses three equal columns, two at 1050px and below, and one at 460px and below. The final desktop grid gap is 16px; mobile gaps are 12px. List mode uses a single column. An expanded card always spans all available columns. Its interior uses a 1.25:1 two-column layout, collapsing to one column at 760px.

At 760px and below, the rail becomes a toggled drawer and the shell loses its left offset. Search takes a full toolbar row; categories wrap. The connection illustration hides on small phones. The submission form changes from two columns to one. Spacing follows a compact four-pixel rhythm with optical exceptions such as card padding (21px default, 17px intermediate, 20px phone and 24px wide).

## Elevation & Depth

Cards remain flat at rest and on hover. White surfaces, quiet borders and blue selected outlines establish hierarchy. The only shadows belong to transient overlays: the toast (`0 5px 20px #15143526`) and mobile navigation (`6px 0 24px #15143526`).

**The Flat Catalogue Rule.** Use border changes to signal card hover and expansion; reserve shadows for transient overlays.

## Shapes

The source surface radius is gently rounded (8px). Buttons and search controls use a slightly tighter control radius; categories and tags use smaller radii. Active navigation uses its own intermediate radius. Circular avatars and tiny status dots are the only repeated circular elements. The connection illustration uses larger rounded nodes; it does not change card geometry.

## Components

### Buttons

Primary buttons use blue with white Bold text; hover deepens the blue. Secondary buttons use white with a quiet border and turn blue at the border and text on hover. The standard action has a 44px minimum height. Icon buttons use a compact 38px square minimum and pale blue hover/selected fill. Global keyboard focus uses a blue 3px outline offset by 3px.

### Inputs / Fields

Search is a white, bordered, 46px-minimum-height control with an inline icon and keyboard hint. Focus belongs to the containing field: a blue 2px outline offset by 2px. Submission fields use white backgrounds, quiet borders, a 44px minimum height, visible labels and the global focus treatment. Error text appears beneath the form in red.

### Navigation

The dark rail uses muted light text, icon-and-label rows and a blue active row. Hover slightly lightens the ink surface. The mobile menu exposes its expanded state, moves focus into navigation when opened and restores focus to the menu button when closed. Hidden navigation is invisible to keyboard focus at the mobile breakpoint.

### Chips

Category filters are text-labelled buttons with counts; active filters reverse to white on ink. Card tags use small pale neutral rectangles; live tags add a green dot and written status. Saved bookmarks use blue with a pale filled bookmark shape and expose their pressed state.

### Expandable MCP card

The compact white card presents an icon, bookmark, title, description, category, readiness and owner. Hover changes its border; Explore MCP expands it inline to the full grid width with a blue border. The header becomes a compact horizontal arrangement and the footer action is replaced by a detail region.

Overview, Tools & capabilities and Connection tabs use a blue underline for selection. The tablist supports arrows, Home and End. Opening focuses the active tab; collapsing restores the trigger. Ownership values and scope notes remain explicit. Concept entries explain readiness; live and submitted entries can show endpoint configuration. A cream scope panel distinguishes explanatory context, and an ink code block distinguishes connection material.

### Supporting panels

The blue introduction combines heavy headlines with an inline vector connection map. The cream contribution panel groups a short invitation with its action. Toasts use ink, white text, a short vertical entrance and opacity transition. Reduced-motion preference removes transitions and smooth scrolling.

## Do's and Don'ts

### Do:

- **Do** preserve the exact source palette and bundled font files.
- **Do** use borders and tone to separate working surfaces.
- **Do** keep expanded details inline and full width within the catalogue.
- **Do** retain text labels, keyboard focus, tab semantics and reduced-motion behaviour.
- **Do** label the WaterAid mark as a brand reference and keep Wetland as the product identity.

### Don't:

- **Don't** replace the original reference logo with a reconstruction.
- **Don't** add card shadows or decorative gradients to the established catalogue surfaces.
- **Don't** express readiness or selection through colour alone.
- **Don't** hide keyboard-focusable navigation offscreen without also removing its visibility.
- **Don't** promote illustrative concept tools to live or verified status through visual treatment.
