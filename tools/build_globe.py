"""
build_globe.py — generates the land-dot matrix used by Meridian's interactive globe.

Input : tools/countries-110m.json  (Natural Earth 110m, TopoJSON, public domain)
Output: frontend/assets/globe-dots.json  -> {"step": <deg>, "points": [lon, lat, lon, lat, ...]}

Run:  python3 tools/build_globe.py
"""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "countries-110m.json")
OUT = os.path.join(ROOT, "frontend", "assets", "globe-dots.json")

STEP = 1.5          # degrees between sample rows
LAT_LIMIT = 83.0    # skip the poles, they add nothing but clutter


def decode(topology):
    """Turn a TopoJSON object into a list of polygons in [lon, lat] space."""
    scale = topology["transform"]["scale"]
    translate = topology["transform"]["translate"]
    raw_arcs = topology["arcs"]

    arcs = []
    for arc in raw_arcs:
        x = y = 0
        line = []
        for dx, dy in arc:
            x += dx
            y += dy
            line.append((x * scale[0] + translate[0], y * scale[1] + translate[1]))
        arcs.append(line)

    def ring_from(indices):
        ring = []
        for idx in indices:
            if idx < 0:
                seg = arcs[~idx][::-1]
            else:
                seg = arcs[idx]
            if ring and seg and ring[-1] == seg[0]:
                ring.extend(seg[1:])
            else:
                ring.extend(seg)
        return ring

    polygons = []
    for geom in topology["objects"]["countries"]["geometries"]:
        gtype = geom.get("type")
        if gtype == "Polygon":
            polygons.append([ring_from(r) for r in geom["arcs"]])
        elif gtype == "MultiPolygon":
            for poly in geom["arcs"]:
                polygons.append([ring_from(r) for r in poly])
    return polygons


def bbox(polygon):
    xs = [p[0] for ring in polygon for p in ring]
    ys = [p[1] for ring in polygon for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def inside(polygon, lon, lat):
    """Even-odd ray casting across every ring (handles holes for free)."""
    hit = False
    for ring in polygon:
        n = len(ring)
        j = n - 1
        for i in range(n):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if (yi > lat) != (yj > lat):
                x_at = (xj - xi) * (lat - yi) / (yj - yi) + xi
                if lon < x_at:
                    hit = not hit
            j = i
    return hit


def main():
    with open(SRC, "r", encoding="utf-8") as fh:
        topology = json.load(fh)

    polygons = decode(topology)
    boxes = [bbox(p) for p in polygons]
    print("polygons: %d" % len(polygons))

    points = []
    lat = -LAT_LIMIT
    while lat <= LAT_LIMIT:
        # keep dot spacing roughly even on the sphere instead of bunching at the poles
        span = max(math.cos(math.radians(lat)), 0.08)
        lon_step = STEP / span
        lon = -180.0
        while lon < 180.0:
            for poly, (x0, y0, x1, y1) in zip(polygons, boxes):
                if x0 <= lon <= x1 and y0 <= lat <= y1 and inside(poly, lon, lat):
                    points.append(round(lon, 1))
                    points.append(round(lat, 1))
                    break
            lon += lon_step
        lat += STEP

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"step": STEP, "points": points}, fh, separators=(",", ":"))

    print("dots: %d" % (len(points) // 2))
    print("wrote: %s (%.1f KB)" % (OUT, os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()
