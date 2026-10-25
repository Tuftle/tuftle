#!/usr/bin/env python3
"""Draws the tuftle logo and the pictures for each place the name lives.   python tools/make_brand.py

Needs fontTools (the lettering is turned into outlines, so the files do not depend on any font) and Google Chrome
(to turn the SVGs into PNGs). Everything lands in brand/.
"""
import os
import subprocess
import tempfile

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "brand")
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
FONT = TTFont(os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "georgia.ttf"))

BROWN, DEEP, CREAM, AMBER, DARK, INK = "#8a4b2a", "#6f3b20", "#f4efe6", "#e0a870", "#211c17", "#3b2f25"


def text_path(text, size, tracking=0.0):
    """The letters as one SVG path, baseline at y=0 and left edge at x=0. Returns (d, width)."""
    glyphs = FONT.getGlyphSet()
    cmap = FONT.getBestCmap()
    scale = size / FONT["head"].unitsPerEm
    x = 0.0
    parts = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        parts.append(pen.getCommands())
        x += glyphs[name].width * scale + tracking
    return " ".join(parts), x - tracking


# --- the mark: five soft feathers fanned from one point, round at the tip (so it is a plume, not a plant) -------
FEATHER = "M32 56C26.500 48 25.500 36 27 25A5 5 0 0 1 37 25C38.500 36 37.500 48 32 56Z"


def tuft(fill_outer, fill_inner, gap=None):
    gap = gap or BROWN
    def feather(angle, s, fill):
        return (f'<path d="{FEATHER}" fill="{fill}" stroke="{gap}" stroke-width="2.600" paint-order="stroke" stroke-linejoin="round" '
                f'transform="translate(32 56) rotate({angle}) scale({s * .95} {s}) translate(-32 -56)"/>')
    # back to front: the outer pair first, the tallest one in front
    return (feather(-46, .62, fill_outer) + feather(46, .62, fill_outer)
            + feather(-24, .84, fill_outer) + feather(24, .84, fill_outer)
            + feather(0, 1.06, fill_inner))


def mark_tile():
    return (f'<rect width="64" height="64" rx="16" fill="{BROWN}"/>'
            f'<g transform="translate(32 32) scale(1.08) translate(-32 -36.900)">{tuft(AMBER, CREAM, BROWN)}</g>')


def mark_plain(outer, inner, gap=CREAM):
    return tuft(outer, inner, gap)


def svg(w, h, body, bg=None):
    back = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{back}{body}</svg>'


# where the five feathers actually sit inside the 64-unit box (measured from the drawing)
BX0, BX1, BY0, BY1 = 15.1, 48.9, 17.8, 56.0


def lockup(ink, outer, inner, height=64, gap=CREAM):
    """mark + 'tuftle' side by side, trimmed to the drawing; the feathers and the letters share one baseline
    and one top. Returns (body, width, height) with the given height."""
    d, width = text_path("tuftle", 50, tracking=1.5)
    mark_h = BY1 - BY0                       # 38.2: the feathers' height, about the letters' ascender height
    k = height / mark_h
    mark_w = BX1 - BX0
    body = (f'<g transform="scale({k}) translate({-BX0} {-BY0})">{mark_plain(outer, inner, gap)}</g>'
            f'<path d="{d}" fill="{ink}" transform="translate({(mark_w + 11) * k} {height}) scale({k})"/>')
    return body, (mark_w + 11 + width) * k, height


def stacked(ink, outer, inner, mark_size, text_size, gap, mark_gap=CREAM):
    d, width = text_path("tuftle", text_size, tracking=text_size * .03)
    k = mark_size / (BY1 - BY0)
    mark_w = (BX1 - BX0) * k
    w = max(mark_w, width)
    body = (f'<g transform="translate({(w - mark_w) / 2} 0) scale({k}) translate({-BX0} {-BY0})">{mark_plain(outer, inner, mark_gap)}</g>'
            f'<path d="{d}" fill="{ink}" transform="translate({(w - width) / 2} {mark_size + gap + text_size * .74})"/>')
    return body, w, mark_size + gap + text_size * .74


def render(svg_text, name, width, height):
    path = os.path.join(OUT, name)
    if os.path.exists(path):
        os.remove(path)  # a stale picture must never pass for a new one
    with tempfile.TemporaryDirectory() as tmp:
        s = os.path.join(tmp, "a.svg")
        html = os.path.join(tmp, "a.html")
        with open(s, "w", encoding="utf-8") as f:
            f.write(svg_text)
        with open(html, "w", encoding="utf-8") as f:
            f.write(f'<!doctype html><body style="margin:0;background:transparent"><img src="file:///{s.replace(os.sep, "/")}" '
                    f'width="{width}" height="{height}" style="display:block"></body>')
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
                        f"--window-size={width},{height}", f"--screenshot={path}", "file:///" + html.replace(os.sep, "/")],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not os.path.exists(path):
        raise RuntimeError("Chrome did not write " + name)


def save(name, text):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(text)


def banner(w, h, dark, tagline=True, safe=None):
    """A calm wide picture: the lockup in the middle on cream (or dark brown) with a soft glow."""
    bg = DARK if dark else CREAM
    ink = CREAM if dark else BROWN
    outer = AMBER
    inner = CREAM if dark else BROWN
    gap = DARK if dark else CREAM
    glow = "rgba(217,160,115,.16)" if dark else "rgba(224,168,112,.30)"
    mark_h = (safe or h) * (.36 if safe else .26)
    body, bw, bh = lockup(ink, outer, inner, mark_h, gap)
    sub = ""
    if tagline:
        d, tw = text_path("small things, made patiently.", mark_h * .30)
        sub = f'<path d="{d}" fill="{"#9a8b7a" if dark else "#8a7b6b"}" transform="translate({(w - tw) / 2} {h / 2 + bh / 2 + mark_h * .55})"/>'
    glow_el = (f'<defs><radialGradient id="g"><stop offset="0" stop-color="{glow}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>'
               f'<ellipse cx="{w / 2}" cy="{h / 2}" rx="{w * .38}" ry="{h * .62}" fill="url(#g)"/>')
    return svg(w, h, glow_el + f'<g transform="translate({(w - bw) / 2} {h / 2 - bh / 2 - (mark_h * .12 if tagline else 0)})">{body}</g>' + sub, bg)


def main():
    os.makedirs(OUT, exist_ok=True)
    # the mark
    save("tuftle-mark.svg", svg(64, 64, mark_tile()))
    save("tuftle-mark-brown.svg", svg(64, 64, mark_plain(AMBER, BROWN, CREAM)))
    save("tuftle-mark-cream.svg", svg(64, 64, mark_plain(AMBER, CREAM, DARK)))
    # the logo, for light and dark backgrounds
    for name, ink, outer, inner, gap in (("tuftle-logo.svg", BROWN, AMBER, BROWN, CREAM), ("tuftle-logo-cream.svg", CREAM, AMBER, CREAM, DARK)):
        body, w, h = lockup(ink, outer, inner, gap=gap)
        save(name, svg(round(w), h, body))
    body, w, h = stacked(BROWN, AMBER, BROWN, 140, 84, 22)
    save("tuftle-logo-stacked.svg", svg(round(w), round(h + 10), body))
    body, w, h = lockup(BROWN, AMBER, BROWN, 64)
    render(svg(round(w) + 80, 144, f'<g transform="translate(40 40)">{body}</g>', CREAM), "tuftle-logo.png", round(w) + 80, 144)
    # the picture for YouTube, GitHub and X (they crop it to a circle, so the mark has room)
    avatar = svg(1024, 1024, f'<g transform="scale(16)">{mark_tile()}</g>')
    full = svg(1024, 1024, f'<rect width="1024" height="1024" fill="{BROWN}"/><g transform="translate(512 512) scale(15) translate(-32 -36.900)">{tuft(AMBER, CREAM, BROWN)}</g>')
    save("avatar.svg", full)
    # drawn very large and scaled down, so the edges are smooth at every size
    render(full, "avatar-4096.png", 4096, 4096)
    from PIL import Image
    big = Image.open(os.path.join(OUT, "avatar-4096.png")).convert("RGB")
    for size in (2048, 1024, 400):
        big.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"avatar-{size}.png"), optimize=True)
    os.remove(os.path.join(OUT, "avatar-4096.png"))
    render(avatar, "app-tile-1024.png", 1024, 1024)
    # the site's own icon
    save("favicon.svg", svg(64, 64, mark_tile()))
    for size in (32, 180, 512):
        render(svg(64, 64, mark_tile()), f"icon-{size}.png", size, size)
    # banners
    save("youtube-banner.svg", banner(2560, 1440, False, safe=423))
    render(banner(2560, 1440, False, safe=423), "youtube-banner-2560x1440.png", 2560, 1440)
    render(banner(1500, 500, False), "x-header-1500x500.png", 1500, 500)
    render(banner(1280, 640, True), "github-social-1280x640.png", 1280, 640)
    render(banner(1500, 500, True), "x-header-dark-1500x500.png", 1500, 500)
    print("done")


if __name__ == "__main__":
    main()
