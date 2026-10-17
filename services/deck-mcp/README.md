# Deck MCP

A local streamable-HTTP MCP with one tool, `build_deck`. It reads colour, Noto Sans and the white wordmark from the live Brand MCP, then writes a 16:9 PowerPoint.

The marketplace deck in `decks/wetland-mcp-marketplace.pptx` was produced by calling this tool. The Wetland workspace site is the catalogue the deck describes. It does not itself expose an MCP endpoint.

```sh
cd services/deck-mcp
python3 -m pip install --user -r requirements.txt
python3 -m unittest test_deck.py
python3 build_marketplace_deck.py
python3 server.py
# http://127.0.0.1:8765/mcp
```

`build_deck` takes a brief and an `outputPath` ending in `.pptx`. The path must stay inside the repository root. The caller owns the claims in the brief. This service is a research tool, not official WaterAid guidance.

The HTTP server is local-only and checks the Host and Origin on write requests. It has no user authentication or production deployment configuration. Do not expose it through a public tunnel or deploy it as a hosted service without adding the shared framework's authentication, artifact delivery and release controls.
