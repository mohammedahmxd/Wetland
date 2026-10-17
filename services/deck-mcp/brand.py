"""Read colour, type and the wordmark from the live brand MCP."""

import json
import urllib.request

BRAND_MCP = "https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/mcp"
FONT_BASE = "https://wateraid-brand-hub-462504004653.northamerica-northeast2.run.app/fonts/"
MAX_BYTES = 5_000_000


class BrandError(RuntimeError):
    pass


def _post(url, payload, timeout):
    data = json.dumps(payload).encode()
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise BrandError("Brand MCP response was too large")
    parsed = json.loads(body.decode())
    if "error" in parsed:
        raise BrandError(parsed["error"].get("message", "Brand MCP error"))
    return parsed.get("result", {})


def _tool_json(url, name, arguments, timeout):
    result = _post(
        url,
        {
            "jsonrpc": "2.0",
            "id": name,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        },
        timeout,
    )
    if result.get("isError"):
        raise BrandError(f"{name} failed")
    content = result.get("content") or []
    if not content or "text" not in content[0]:
        raise BrandError(f"{name} returned no text")
    return json.loads(content[0]["text"])


def _download(url, timeout):
    if not url.startswith("https://"):
        raise BrandError("Brand asset URL must be https")
    request = urllib.request.Request(url, headers={"Accept": "image/png, font/ttf, */*"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise BrandError("Brand asset was too large")
    return body


def _colors(system):
    colors = (system.get("tokens") or system).get("colors") or system.get("colors")
    if not isinstance(colors, dict):
        raise BrandError("Brand system did not include colours")
    resolved = {}
    for name in ("blue", "ink", "lime", "cream", "white", "muted"):
        entry = colors.get(name) or {}
        value = entry.get("value") if isinstance(entry, dict) else entry
        if not isinstance(value, str) or len(value) != 7 or not value.startswith("#"):
            raise BrandError(f"Missing brand colour {name}")
        resolved[name] = value.upper()
    return resolved


def fetch_brand(mcp_url=BRAND_MCP, timeout=20):
    """Call the brand MCP, then download the white wordmark it names."""
    _post(
        mcp_url,
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "wetland-deck-mcp", "version": "1.0.0"},
            },
        },
        timeout,
    )
    system = _tool_json(mcp_url, "get_brand_system", {}, timeout)
    _tool_json(mcp_url, "get_document_guidance", {}, timeout)
    asset = _tool_json(mcp_url, "get_asset", {"id": "white-logo"}, timeout)
    if isinstance(asset.get("asset"), dict):
        asset = asset["asset"]
    pngs = asset.get("pngs") or []
    png_url = None
    for item in pngs:
        if item.get("width") == 1280 and item.get("url"):
            png_url = item["url"]
            break
    if not png_url and pngs:
        png_url = pngs[-1].get("url")
    if not png_url:
        raise BrandError("Brand MCP did not return a wordmark PNG")
    logo = _download(png_url, timeout)
    if logo[:8] != b"\x89PNG\r\n\x1a\n":
        raise BrandError("Wordmark download was not a PNG")
    fonts = {
        "Noto Sans": _download(FONT_BASE + "noto-sans-regular.ttf", timeout),
        "Noto Sans Bold": _download(FONT_BASE + "noto-sans-bold.ttf", timeout),
        "Noto Sans Black": _download(FONT_BASE + "noto-sans-black.ttf", timeout),
    }
    version = (system.get("tokens") or {}).get("version") or system.get("version") or "unknown"
    return {
        "mcp": mcp_url,
        "version": version,
        "colors": _colors(system),
        "logo": logo,
        "logoId": asset.get("id", "white-logo"),
        "fonts": fonts,
        "status": (system.get("tokens") or {}).get("status")
        or "Research prototype; not WaterAid-approved",
    }
