"""Turn a deck brief and brand payload into a 16:9 PowerPoint."""

import io
import zipfile
from xml.sax.saxutils import escape

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

SLIDE_W = 13.333
SLIDE_H = 7.5
LAYOUTS = {"title", "statement", "bullets", "catalogue", "steps", "close"}
BODY = "Noto Sans"
HEAD = "Noto Sans Black"


class BriefError(ValueError):
    pass


def _rgb(value):
    raw = value.lstrip("#")
    return RGBColor(int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16))


def _need(value, label, limit):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise BriefError(f"{label} must be 1–{limit} characters")
    return value.strip()


def validate_brief(brief):
    if not isinstance(brief, dict):
        raise BriefError("Brief must be an object")
    title = _need(brief.get("title"), "title", 80)
    footer = _need(brief.get("footer"), "footer", 140)
    slides = brief.get("slides")
    if not isinstance(slides, list) or not 1 <= len(slides) <= 12:
        raise BriefError("Provide 1–12 slides")
    cleaned = []
    for index, slide in enumerate(slides, start=1):
        if not isinstance(slide, dict):
            raise BriefError(f"Slide {index} must be an object")
        layout = slide.get("layout")
        if layout not in LAYOUTS:
            raise BriefError(f"Slide {index} has an unknown layout")
        item = {
            "layout": layout,
            "kicker": _need(slide.get("kicker"), f"Slide {index} kicker", 48),
            "headline": _need(slide.get("headline"), f"Slide {index} headline", 90),
        }
        if layout in {"title", "statement", "close"}:
            item["body"] = _need(slide.get("body"), f"Slide {index} body", 320)
        if layout == "close":
            item["link"] = _need(slide.get("link"), f"Slide {index} link", 180)
            if not item["link"].startswith("https://"):
                raise BriefError(f"Slide {index} link must be https")
        if layout == "bullets":
            bullets = slide.get("bullets")
            if not isinstance(bullets, list) or not 2 <= len(bullets) <= 5:
                raise BriefError(f"Slide {index} needs 2–5 bullets")
            item["bullets"] = [_need(b, f"Slide {index} bullet", 160) for b in bullets]
        if layout == "catalogue":
            cards = slide.get("items")
            if not isinstance(cards, list) or not 4 <= len(cards) <= 8:
                raise BriefError(f"Slide {index} needs 4–8 catalogue items")
            item["items"] = []
            for card in cards:
                if not isinstance(card, dict):
                    raise BriefError(f"Slide {index} item must be an object")
                status = card.get("status")
                if status not in {"Live", "Live example", "Concept"}:
                    raise BriefError(f"Slide {index} status must be Live, Live example or Concept")
                item["items"].append(
                    {
                        "name": _need(card.get("name"), "item name", 40),
                        "meta": _need(card.get("meta"), "item meta", 40),
                        "status": status,
                    }
                )
        if layout == "steps":
            steps = slide.get("steps")
            if not isinstance(steps, list) or not 3 <= len(steps) <= 3:
                raise BriefError(f"Slide {index} needs exactly 3 steps")
            item["steps"] = [
                {
                    "title": _need(step.get("title"), "step title", 32),
                    "body": _need(step.get("body"), "step body", 160),
                }
                for step in steps
                if isinstance(step, dict)
            ]
            if len(item["steps"]) != 3:
                raise BriefError(f"Slide {index} steps must be objects")
        cleaned.append(item)
    return {"title": title, "footer": footer, "slides": cleaned}


def _blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def _rect(slide, l, t, w, h, fill, line=None, radius=None):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    shape = slide.shapes.add_shape(shape_type, Inches(l), Inches(t), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(1)
    if radius:
        shape.adjustments[0] = radius
    style = shape._element.find(qn("p:style"))
    if style is not None:
        shape._element.remove(style)
    sp_pr = shape._element.spPr
    effect = sp_pr.find(qn("a:effectLst"))
    if effect is not None:
        sp_pr.remove(effect)
    return shape


def _run(paragraph, text, size, color, font, bold=False, align=None):
    if align is not None:
        paragraph.alignment = align
    run = paragraph.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.name = font
    r_pr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        element = r_pr.find(qn(tag))
        if element is None:
            element = r_pr.makeelement(qn(tag), {})
            r_pr.append(element)
        element.set("typeface", font)
    return run


def _text(slide, l, t, w, h, text, size, color, font, bold=False, align="left", anchor="top", spacing=1.0):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    frame = box.text_frame
    frame.word_wrap = True
    frame.auto_size = None
    frame.margin_left = 0
    frame.margin_right = 0
    frame.margin_top = 0
    frame.margin_bottom = 0
    alignment = PP_ALIGN.LEFT if align == "left" else PP_ALIGN.CENTER
    frame._txBody.bodyPr.set("anchor", "ctr" if anchor == "middle" else "t")
    for index, line in enumerate(text.split("\n")):
        paragraph = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        paragraph.line_spacing = spacing
        paragraph.alignment = alignment
        _run(paragraph, line, size, color, font, bold)
    return box


def _footer(slide, colors, footer, number, total, dark=False):
    color = _rgb(colors["cream"]) if dark else _rgb(colors["muted"])
    _text(slide, 0.62, 7.05, 9.6, 0.28, footer, 11, color, BODY)
    label = f"{number:02d}  /  {total:02d}"
    _text(slide, 10.4, 7.05, 2.3, 0.28, label, 11, color, BODY, align="right")


def _kicker(slide, text, color, top=0.42):
    _text(slide, 0.62, top, 10, 0.32, text, 13, color, BODY, bold=True)


def _logo(slide, brand, left, top, width):
    slide.shapes.add_picture(io.BytesIO(brand["logo"]), Inches(left), Inches(top), width=Inches(width))


def _paint_title(slide, spec, brand, colors, footer, number, total):
    blue, lime, cream, white = (_rgb(colors[n]) for n in ("blue", "lime", "cream", "white"))
    _rect(slide, 0, 0, SLIDE_W, SLIDE_H, blue)
    _rect(slide, 0, 7.38, SLIDE_W, 0.12, lime)
    _logo(slide, brand, 0.62, 0.42, 2.05)
    pill = _rect(slide, 9.55, 0.48, 3.16, 0.42, lime, radius=0.5)
    pill_frame = pill.text_frame
    pill_frame.word_wrap = False
    pill_frame.margin_left = Inches(0.08)
    pill_frame.margin_right = Inches(0.08)
    pill_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    pill_frame._txBody.bodyPr.set("anchor", "ctr")
    _run(pill_frame.paragraphs[0], "BUILT WITH AN MCP", 11, _rgb(colors["ink"]), BODY, bold=True)
    _kicker(slide, spec["kicker"], lime, 2.15)
    _text(slide, 0.62, 2.52, 12.0, 1.7, spec["headline"], 46, white, HEAD, spacing=0.96)
    _text(slide, 0.62, 4.45, 10.4, 1.35, spec["body"], 20, cream, BODY, spacing=1.15)
    _footer(slide, colors, footer, number, total, dark=True)


def _paint_statement(slide, spec, brand, colors, footer, number, total):
    cream, ink, blue, muted = (_rgb(colors[n]) for n in ("cream", "ink", "blue", "muted"))
    _rect(slide, 0, 0, SLIDE_W, SLIDE_H, cream)
    _rect(slide, 0, 0, SLIDE_W, 0.14, blue)
    _kicker(slide, spec["kicker"], blue, 0.48)
    _text(slide, 0.62, 1.15, 11.8, 2.3, spec["headline"], 40, ink, HEAD, spacing=0.98)
    _rect(slide, 0.62, 3.65, 1.15, 0.08, _rgb(colors["lime"]))
    _text(slide, 0.62, 4.0, 11.2, 2.5, spec["body"], 22, muted, BODY, spacing=1.18)
    _footer(slide, colors, footer, number, total)


def _paint_bullets(slide, spec, brand, colors, footer, number, total):
    white, ink, blue, muted, lime = (_rgb(colors[n]) for n in ("white", "ink", "blue", "muted", "lime"))
    _rect(slide, 0, 0, SLIDE_W, SLIDE_H, white)
    _rect(slide, 0, 0, 0.14, SLIDE_H, blue)
    _kicker(slide, spec["kicker"], blue, 0.42)
    _text(slide, 0.62, 0.82, 12.0, 1.35, spec["headline"], 34, ink, HEAD, spacing=0.98)
    top = 2.4
    for bullet in spec["bullets"]:
        _rect(slide, 0.66, top + 0.08, 0.16, 0.16, lime)
        _text(slide, 1.05, top - 0.06, 11.4, 0.72, bullet, 20, muted, BODY, spacing=1.05)
        top += 0.92
    _footer(slide, colors, footer, number, total)


def _paint_catalogue(slide, spec, brand, colors, footer, number, total):
    cream, white, ink, blue, muted, lime = (
        _rgb(colors[n]) for n in ("cream", "white", "ink", "blue", "muted", "lime")
    )
    _rect(slide, 0, 0, SLIDE_W, SLIDE_H, cream)
    _kicker(slide, spec["kicker"], blue, 0.32)
    _text(slide, 0.62, 0.66, 12.0, 0.9, spec["headline"], 32, ink, HEAD)
    items = spec["items"]
    columns = 4
    gap = 0.16
    left = 0.62
    width = (SLIDE_W - left * 2 - gap * (columns - 1)) / columns
    height = 2.12
    for index, item in enumerate(items):
        col, row = index % columns, index // columns
        x = left + col * (width + gap)
        y = 1.85 + row * (height + 0.16)
        _rect(slide, x, y, width, height, white, radius=0.08)
        if item["status"] in {"Live", "Live example"}:
            _rect(slide, x + 0.14, y + 0.28, 0.07, height - 0.56, blue)
        pill_fill = lime if item["status"] in {"Live", "Live example"} else _rgb("#E7EEF6")
        pill = _rect(slide, x + 0.22, y + 0.2, 1.32, 0.32, pill_fill, radius=0.4)
        frame = pill.text_frame
        frame.word_wrap = False
        frame.paragraphs[0].alignment = PP_ALIGN.CENTER
        frame._txBody.bodyPr.set("anchor", "ctr")
        _run(frame.paragraphs[0], item["status"].upper(), 10, ink if item["status"] in {"Live", "Live example"} else muted, BODY, True)
        _text(slide, x + 0.22, y + 0.68, width - 0.38, 0.85, item["name"], 15, ink, HEAD, spacing=0.95)
        _text(slide, x + 0.22, y + 1.58, width - 0.38, 0.36, item["meta"], 11, muted, BODY)
    _footer(slide, colors, footer, number, total)


def _paint_steps(slide, spec, brand, colors, footer, number, total):
    white, ink, blue, muted, lime, cream = (
        _rgb(colors[n]) for n in ("white", "ink", "blue", "muted", "lime", "cream")
    )
    _rect(slide, 0, 0, SLIDE_W, SLIDE_H, white)
    _rect(slide, 0, 0, SLIDE_W, 0.14, blue)
    _kicker(slide, spec["kicker"], blue, 0.42)
    _text(slide, 0.62, 0.84, 12.0, 1.2, spec["headline"], 36, ink, HEAD)
    gap = 0.22
    left = 0.62
    width = (SLIDE_W - left * 2 - gap * 2) / 3
    y = 2.55
    for index, step in enumerate(spec["steps"]):
        x = left + index * (width + gap)
        _rect(slide, x, y, width, 3.15, cream, radius=0.06)
        _rect(slide, x + 0.18, y + 0.16, width - 0.36, 0.08, lime)
        _text(slide, x + 0.28, y + 0.32, width - 0.5, 0.7, f"{index + 1:02d}", 28, blue, HEAD)
        _text(slide, x + 0.28, y + 1.15, width - 0.5, 0.7, step["title"], 20, ink, HEAD)
        _text(slide, x + 0.28, y + 1.95, width - 0.56, 1.3, step["body"], 15, muted, BODY, spacing=1.12)
    _footer(slide, colors, footer, number, total)


def _paint_close(slide, spec, brand, colors, footer, number, total):
    ink, lime, cream, white = (_rgb(colors[n]) for n in ("ink", "lime", "cream", "white"))
    _rect(slide, 0, 0, SLIDE_W, SLIDE_H, ink)
    _logo(slide, brand, 0.62, 0.42, 2.05)
    _kicker(slide, spec["kicker"], lime, 1.85)
    _text(slide, 0.62, 2.28, 12.0, 1.5, spec["headline"], 44, white, HEAD, spacing=0.96)
    _text(slide, 0.62, 3.95, 11.2, 0.9, spec["body"], 20, cream, BODY)
    _text(slide, 0.62, 5.15, 12.0, 0.45, spec["link"], 16, lime, BODY, bold=True)
    _footer(slide, colors, footer, number, total, dark=True)


PAINTERS = {
    "title": _paint_title,
    "statement": _paint_statement,
    "bullets": _paint_bullets,
    "catalogue": _paint_catalogue,
    "steps": _paint_steps,
    "close": _paint_close,
}


def _embed_fonts(path, fonts):
    """Store the brand font files inside the package and point the theme at them.

    PowerPoint de-obfuscates the first 32 bytes with the GUID from the part name.
    """
    import uuid

    def obfuscate(data):
        guid = uuid.uuid4()
        hexed = guid.hex
        raw = bytes.fromhex(hexed)
        key = raw[3::-1] + raw[5:3:-1] + raw[7:5:-1] + raw[8:]
        out = bytearray(data)
        for i in range(32):
            out[i] ^= key[i % 16]
        return bytes(out), guid

    mapping = {
        "Noto Sans": ("regular", fonts["Noto Sans"]),
        "Noto Sans Bold": ("bold", fonts["Noto Sans Bold"]),
        "Noto Sans Black": ("black", fonts["Noto Sans Black"]),
    }
    parts = []
    with zipfile.ZipFile(path, "r") as archive:
        existing = {info.filename: archive.read(info.filename) for info in archive.infolist()}
    rels = existing["ppt/_rels/presentation.xml.rels"].decode()
    content_types = existing["[Content_Types].xml"].decode()
    presentation = existing["ppt/presentation.xml"].decode()
    ids = []
    next_id = 1
    while f'Id="rId{next_id}"' in rels:
        next_id += 1
    font_rels = []
    font_overrides = []
    embedded = ['<p:embeddedFontLst>']
    groups = {
        "Noto Sans": {"regular": None, "bold": None},
        "Noto Sans Black": {"regular": None},
    }
    style_to_face = {"regular": "Noto Sans", "bold": "Noto Sans", "black": "Noto Sans Black"}
    for face, (style, data) in mapping.items():
        obfuscated, guid = obfuscate(data)
        filename = f"ppt/fonts/{guid}.fntdata"
        parts.append((filename, obfuscated))
        rid = f"rId{next_id}"
        next_id += 1
        ids.append(rid)
        font_rels.append(
            f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/{guid}.fntdata"/>'
        )
        target_face = style_to_face[style]
        slot = "regular" if style == "black" else style
        groups[target_face][slot] = rid
    for face, slots in groups.items():
        embedded.append("<p:embeddedFont>")
        embedded.append(f'<p:font typeface="{escape(face)}" pitchFamily="34" charset="0"/>')
        for slot, rid in slots.items():
            if rid:
                embedded.append(f'<p:{slot} r:id="{rid}"/>')
        embedded.append("</p:embeddedFont>")
    embedded.append("</p:embeddedFontLst>")
    if 'Extension="fntdata"' not in content_types:
        content_types = content_types.replace(
            "</Types>",
            '<Default Extension="fntdata" ContentType="application/x-fontdata"/></Types>',
        )
    rels = rels.replace("</Relationships>", "".join(font_rels) + "</Relationships>")
    if "embeddedFontLst" not in presentation:
        presentation = presentation.replace("</p:presentation>", "".join(embedded) + "</p:presentation>")
    if "embedTrueTypeFonts" not in presentation:
        presentation = presentation.replace("<p:presentation ", '<p:presentation embedTrueTypeFonts="1" ', 1)
    existing["ppt/_rels/presentation.xml.rels"] = rels.encode()
    existing["[Content_Types].xml"] = content_types.encode()
    existing["ppt/presentation.xml"] = presentation.encode()
    for name, data in parts:
        existing[name] = data
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in existing.items():
            archive.writestr(name, data)


def build_pptx(brief, brand, path):
    spec = validate_brief(brief)
    colors = brand["colors"]
    for name in ("blue", "ink", "lime", "cream", "white", "muted"):
        if name not in colors:
            raise BriefError(f"Brand is missing {name}")
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    prs.core_properties.title = spec["title"]
    prs.core_properties.author = "Wetland Deck MCP"
    prs.core_properties.subject = "Built by the build_deck MCP tool"
    prs.core_properties.category = "MCP marketplace"
    total = len(spec["slides"])
    for number, slide_spec in enumerate(spec["slides"], start=1):
        slide = _blank(prs)
        PAINTERS[slide_spec["layout"]](slide, slide_spec, brand, colors, spec["footer"], number, total)
    prs.save(path)
    if brand.get("fonts"):
        _embed_fonts(path, brand["fonts"])
    return {"title": spec["title"], "slides": total, "path": str(path)}
