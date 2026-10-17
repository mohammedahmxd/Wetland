"""Call the local Deck MCP over streamable HTTP and build the marketplace deck."""

import json
import threading
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

from brand import fetch_brand
from server import make_handler

REPO = Path(__file__).resolve().parents[2]
BRIEF = REPO / "decks" / "marketplace-brief.json"
OUTPUT = "decks/wetland-mcp-marketplace.pptx"


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(REPO, fetch_brand))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/mcp"

    def rpc(method, params=None, request_id=1):
        payload = {"jsonrpc": "2.0", "method": method}
        if request_id is not None:
            payload["id"] = request_id
        if params is not None:
            payload["params"] = params
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode()
        return json.loads(raw) if raw else None

    try:
        rpc(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "wetland-marketplace-deck", "version": "1.0.0"},
            },
        )
        rpc("notifications/initialized", request_id=None)
        listed = rpc("tools/list", {})
        names = [tool["name"] for tool in listed["result"]["tools"]]
        if names != ["build_deck"]:
            raise SystemExit(f"Unexpected tools: {names}")
        result = rpc(
            "tools/call",
            {
                "name": "build_deck",
                "arguments": {"brief": json.loads(BRIEF.read_text()), "outputPath": OUTPUT},
            },
            request_id=4,
        )
        if result["result"].get("isError"):
            raise SystemExit(result["result"]["content"][0]["text"])
        print(result["result"]["content"][0]["text"])
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
