"""Deck MCP: a small streamable-HTTP server that builds a branded PowerPoint.

Tool: build_deck
Input: a slide brief. The server reads colour, type and the wordmark from the
live Brand MCP, then writes a 16:9 .pptx.
"""

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from brand import BrandError, fetch_brand
from render import BriefError, build_pptx

PROTOCOL = "2024-11-05"
ROOT = Path(__file__).resolve().parents[2]


def _tool_schema():
    return {
        "name": "build_deck",
        "description": (
            "Build a 16:9 PowerPoint from a slide brief. Reads the live Brand MCP "
            "for colour, Noto Sans and the white wordmark, then writes a .pptx. "
            "The caller still owns every factual claim in the brief."
        ),
        "inputSchema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["brief", "outputPath"],
            "properties": {
                "brief": {
                    "type": "object",
                    "description": "Title, footer and 1–12 slides. Layouts: title, statement, bullets, catalogue, steps, close.",
                },
                "outputPath": {
                    "type": "string",
                    "description": "Path of the .pptx to write, relative to the server root or absolute inside that root.",
                },
            },
        },
        "annotations": {
            "readOnlyHint": False,
            "destructiveHint": False,
            "idempotentHint": True,
            "openWorldHint": True,
        },
    }


def _safe_output(root, output_path):
    if not isinstance(output_path, str) or not output_path.endswith(".pptx"):
        raise BriefError("outputPath must be a .pptx path")
    root = root.resolve()
    candidate = (root / output_path).resolve() if not Path(output_path).is_absolute() else Path(output_path).resolve()
    if candidate != root and root not in candidate.parents:
        raise BriefError("outputPath must stay inside the server root")
    candidate.parent.mkdir(parents=True, exist_ok=True)
    return candidate


def build_deck(arguments, root, brand_loader=fetch_brand):
    if not isinstance(arguments, dict):
        raise BriefError("Arguments must be an object")
    destination = _safe_output(root, arguments.get("outputPath"))
    brand = brand_loader()
    meta = build_pptx(arguments.get("brief"), brand, destination)
    meta.update(
        {
            "bytes": destination.stat().st_size,
            "brandMcp": brand.get("mcp"),
            "brandVersion": brand.get("version"),
            "logo": brand.get("logoId"),
            "tool": "build_deck",
        }
    )
    return meta


def handle_rpc(body, root, brand_loader=fetch_brand):
    if not isinstance(body, dict) or body.get("jsonrpc") != "2.0" or "method" not in body:
        return {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid request"}}
    method = body["method"]
    request_id = body.get("id")
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": PROTOCOL,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "wetland-deck-mcp", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": request_id, "result": {"tools": [_tool_schema()]}}
    if method == "tools/call":
        params = body.get("params") or {}
        name = params.get("name")
        if name != "build_deck":
            return {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32602, "message": "Unknown tool"}}
        try:
            meta = build_deck(params.get("arguments") or {}, root, brand_loader)
        except (BriefError, BrandError) as error:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {"isError": True, "content": [{"type": "text", "text": str(error)}]},
            }
        text = json.dumps(meta, indent=2)
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"content": [{"type": "text", "text": text}], "structuredContent": meta},
        }
    if request_id is None:
        return None
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32601, "message": "Method not found"}}


def make_handler(root, brand_loader):
    class Handler(BaseHTTPRequestHandler):
        server_version = "wetland-deck-mcp/1.0"

        def log_message(self, fmt, *args):
            return

        def _send(self, status, payload):
            raw = b"" if payload is None else json.dumps(payload).encode()
            self.send_response(status if payload is not None else 202)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            if raw:
                self.wfile.write(raw)

        def do_POST(self):
            if urlparse(self.path).path != "/mcp":
                self.send_error(404)
                return
            # This local writer must not accept browser cross-origin or DNS-rebinding requests.
            port = self.server.server_address[1]
            allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
            host = self.headers.get("Host", "")
            origin = self.headers.get("Origin")
            if host not in allowed_hosts or (origin and origin != f"http://{host}"):
                self.send_error(403)
                return
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                self.send_error(415)
                return
            try:
                length = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                self.send_error(400)
                return
            if length <= 0:
                self.send_error(400)
                return
            if length > 1_000_000:
                self.send_error(413)
                return
            try:
                body = json.loads(self.rfile.read(length).decode())
            except json.JSONDecodeError:
                self._send(400, {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}})
                return
            self._send(200, handle_rpc(body, root, brand_loader))

        def do_GET(self):
            path = urlparse(self.path).path
            if path == "/api/health":
                self._send(200, {"status": "ok", "name": "wetland-deck-mcp", "mcp": "/mcp"})
                return
            self.send_error(405 if path == "/mcp" else 404)

    return Handler


def serve(host="127.0.0.1", port=8765, root=ROOT, brand_loader=fetch_brand):
    server = ThreadingHTTPServer((host, port), make_handler(root, brand_loader))
    print(f"Deck MCP listening on http://{host}:{port}/mcp", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    serve(root=Path(__file__).resolve().parents[2])
