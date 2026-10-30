#!/usr/bin/env python3
"""Download a small logo for every university into frontend/img/unis/<id>.png.

    .venv/bin/python tools/fetch_logos.py

Order of preference: the Wikimedia logo named in the profile (full profiles),
then the university's own site icon via Google's favicon service. Images are
squared onto a transparent 96x96 canvas. Existing files are kept, so the
script can be re-run to fill gaps.
"""
import io
import json
import os
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "backend", "data")
OUT = os.path.join(ROOT, "frontend", "img", "unis")
SIZE = 96
UA = {"User-Agent": "MeridianLogoBot/1.0 (education platform; contact via meridiangoal.com)"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def domain(url):
    host = re.sub(r"^https?://", "", url or "").split("/")[0].lower()
    return host[4:] if host.startswith("www.") else host


def wikimedia_png(url):
    """Commons file URL -> a 192px PNG thumbnail (SVGs are rendered by Wikimedia)."""
    m = re.match(r"https://upload\.wikimedia\.org/wikipedia/(commons|en)/(?:thumb/)?([0-9a-f])/([0-9a-f]{2})/([^/]+)", url or "")
    if not m:
        return None
    site, a, ab, name = m.groups()
    thumb = "https://upload.wikimedia.org/wikipedia/%s/thumb/%s/%s/%s/192px-%s" % (site, a, ab, name, name)
    return thumb + (".png" if name.lower().endswith(".svg") else "")


def square(blob):
    img = Image.open(io.BytesIO(blob)).convert("RGBA")
    if img.width < 32 or img.height < 32:
        return None                       # the favicon service's generic globe, or a tiny icon
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(img, ((SIZE - img.width) // 2, (SIZE - img.height) // 2), img)
    out = io.BytesIO()
    canvas.save(out, "PNG", optimize=True)
    return out.getvalue()


def one(u):
    path = os.path.join(OUT, u["id"] + ".png")
    if os.path.exists(path):
        return "kept"
    sources = []
    if wikimedia_png(u.get("logo")):
        sources.append(wikimedia_png(u.get("logo")))
    host = domain(u.get("website"))
    if host:
        sources.append("https://www.google.com/s2/favicons?domain=%s&sz=128" % host)
        sources.append("https://%s/apple-touch-icon.png" % host)
        sources.append("https://www.%s/apple-touch-icon.png" % host)
        sources.append("https://icons.duckduckgo.com/ip3/%s.ico" % host)
    for url in sources:
        try:
            png = square(fetch(url))
        except Exception:
            png = None
        if png:
            with open(path, "wb") as fh:
                fh.write(png)
            return "saved"
    return "missing"


def main():
    unis = json.load(open(os.path.join(DATA, "universities.json"), encoding="utf-8"))
    unis += json.load(open(os.path.join(DATA, "universities-qs.json"), encoding="utf-8"))
    with ThreadPoolExecutor(12) as pool:
        results = list(pool.map(one, unis))
    print({k: results.count(k) for k in set(results)})


if __name__ == "__main__":
    main()
