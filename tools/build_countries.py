"""
build_countries.py — country shapes for the programme globe, following UN practice.

Inputs
  tools/countries-50m.json      Natural Earth 1:50m admin-0 (via world-atlas, public domain)
  tools/un-country-codes.csv    UNTERM official names + ISO codes (datasets/country-codes, ODC-PDDL)
  tools/iso-codes.json, iso-ka.json   ISO numeric->alpha2 and Georgian names (i18n-iso-countries, MIT)

Output
  frontend/assets/countries.geojson
    one feature per UN member state / observer / territory, with
    { iso, un: "member|observer|territory", name: {en, ka}, official: "UN formal name" }

Natural Earth draws a few areas "de facto". Meridian follows the United Nations instead:
  * Crimea                -> Ukraine          (UN General Assembly resolution 68/262)
  * N. Cyprus             -> Cyprus           (UN Security Council resolution 541)
  * Somaliland            -> Somalia          (not recognised by the UN)
  * Kosovo                -> Serbia, labelled per UNSCR 1244 in the tooltip
  * Taiwan                -> China            (UN General Assembly resolution 2758)
  * Western Sahara        -> kept separate, a Non-Self-Governing Territory on the UN list
Abkhazia and the Tskhinvali region are part of Georgia in Natural Earth already.

Run:  python3 tools/build_countries.py
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "frontend", "assets", "countries.geojson")

MERGE_INTO = {"N. Cyprus": "Cyprus", "Somaliland": "Somalia", "Kosovo": "Serbia", "Taiwan": "China"}
NOTES = {
    "RS": "Includes Kosovo under UN Security Council resolution 1244 (1999)",
    "UA": "Includes the Autonomous Republic of Crimea (UN GA resolution 68/262)",
    "CY": "UN-recognised territory of the Republic of Cyprus",
    "CN": "Per UN General Assembly resolution 2758 (1971)",
    "GE": "Includes Abkhazia and the Tskhinvali region",
    "EH": "Non-Self-Governing Territory (UN list)",
}
CRIMEA_POINT = (34.10, 44.95)   # Simferopol
UN_OBSERVERS = {"PS", "VA"}
UNNAMED = {"Siachen Glacier": "Jammu and Kashmir (status not finally agreed)",
           "Indian Ocean Ter.": "Australian Indian Ocean Territories"}
FORMAL_FIX = {"TR": "Republic of Türkiye", "EH": "Western Sahara"}


def load_json(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as fh:
        return json.load(fh)


def first(v):
    return v[0] if isinstance(v, list) else v


def tidy(name):
    name = (name or "").replace("*", "").strip()
    if name.lower().startswith("the "):
        name = name[4:]
    if name.endswith(" (the)"):
        name = name[:-6]
    return name[:1].upper() + name[1:] if name else name


def decode(topo):
    sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        line = []
        for dx, dy in arc:
            x += dx
            y += dy
            line.append((round(x * sc[0] + tr[0], 4), round(y * sc[1] + tr[1], 4)))
        arcs.append(line)

    def ring(indices):
        out = []
        for i in indices:
            seg = arcs[~i][::-1] if i < 0 else arcs[i]
            out.extend(seg[1:] if out else seg)
        return out

    shapes = []
    for g in topo["objects"]["countries"]["geometries"]:
        if g["type"] == "Polygon":
            polys = [[ring(r) for r in g["arcs"]]]
        elif g["type"] == "MultiPolygon":
            polys = [[ring(r) for r in p] for p in g["arcs"]]
        else:
            continue
        shapes.append({"id": str(g.get("id") or ""), "name": g["properties"].get("name", ""), "polys": polys})
    return shapes


def inside(r, x, y):
    hit = False
    j = len(r) - 1
    for i in range(len(r)):
        xi, yi = r[i]
        xj, yj = r[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def dissolve(polys):
    """Union polygons that share borders: drop every edge used in both directions,
    then chain what is left back into rings. Holes are not needed at this scale."""
    edges = {}
    for poly in polys:
        r = poly[0]
        for a, b in zip(r, r[1:]):
            if a == b:
                continue
            if (b, a) in edges:
                edges[(b, a)] -= 1
                if edges[(b, a)] == 0:
                    del edges[(b, a)]
            else:
                edges[(a, b)] = edges.get((a, b), 0) + 1
    nxt = {}
    for (a, b) in edges:
        nxt.setdefault(a, []).append(b)
    rings = []
    while nxt:
        start = next(iter(nxt))
        ring = [start]
        cur = start
        for _ in range(500000):
            options = nxt.get(cur)
            if not options:
                break
            nb = options.pop()
            if not options:
                del nxt[cur]
            ring.append(nb)
            cur = nb
            if cur == start:
                break
        if len(ring) > 3 and ring[0] == ring[-1]:
            rings.append([ring])
    return rings


def area(r):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(r, r[1:]))) / 2


def main():
    shapes = decode(load_json("countries-50m.json"))
    by_name = {s["name"]: s for s in shapes}

    # Crimea: lift the polygon out of Russia and hand it to Ukraine
    russia, ukraine = by_name["Russia"], by_name["Ukraine"]
    for poly in list(russia["polys"]):
        if inside(poly[0], *CRIMEA_POINT):
            russia["polys"].remove(poly)
            ukraine["polys"].append(poly)
            ukraine["dissolve"] = True

    for src, dst in MERGE_INTO.items():
        if src in by_name and dst in by_name:
            by_name[dst]["polys"].extend(by_name[src]["polys"])
            by_name[dst]["dissolve"] = True
            shapes.remove(by_name[src])

    codes = load_json("iso-codes.json")
    ka = load_json("iso-ka.json")["countries"]
    num_to_a2 = {row[2]: row[0] for row in codes}
    un = {}
    with open(os.path.join(HERE, "un-country-codes.csv"), encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            a2 = row.get("ISO3166-1-Alpha-2")
            if a2:
                un[a2] = row

    features = []
    for s in shapes:
        a2 = num_to_a2.get(s["id"].zfill(3), "") if s["id"] else ""
        row = un.get(a2, {})
        short = tidy(row.get("official_name_en")) or UNNAMED.get(s["name"], s["name"])
        formal = FORMAL_FIX.get(a2) or tidy(row.get("UNTERM English Formal")) or short
        if a2 == "EH":
            status = "territory"
        elif a2 in UN_OBSERVERS:
            status = "observer"
        elif row.get("UNTERM English Short") or a2 in FORMAL_FIX:
            status = "member"
        else:
            status = "territory"
        polys = s["polys"]
        if s.get("dissolve"):
            merged = dissolve(polys)
            if merged:
                polys = merged
        # 2 decimals ≈ 1 km — plenty for a globe, keeps the file small
        polys = [[[[round(x, 2), round(y, 2)] for x, y in ring] for ring in p] for p in polys
                 if area(p[0]) > 0.0005]
        if not polys:
            continue
        features.append({
            "type": "Feature",
            "properties": {
                "iso": a2, "un": status,
                "name": {"en": short, "ka": first(ka.get(a2, "")) or short},
                "official": formal,
                "note": NOTES.get(a2, ""),
            },
            "geometry": {"type": "MultiPolygon", "coordinates": polys},
        })

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh, ensure_ascii=False, separators=(",", ":"))
    members = sum(1 for f in features if f["properties"]["un"] == "member")
    print("features %d (UN members drawn: %d) -> %s (%.0f KB)" % (len(features), members, OUT, os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()
