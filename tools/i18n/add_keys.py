"""Merge new translation keys into frontend/js/i18n.js.

    python3 -X utf8 tools/i18n/add_keys.py keys.json

keys.json maps "key" -> {"en": "...", "ka": "...", "ar": "..."}. Existing keys
are replaced; new keys are appended to the end of each language block. The
"ar" block is created on first use.
"""
import json
import re
import sys

PATH = "frontend/js/i18n.js"


def block_bounds(src, lang):
    """Language blocks are indented two spaces and close with a line that is
    exactly "  }" or "  },"."""
    start = re.search(r"\n  %s: \{\n" % lang, src)
    if not start:
        return None
    close = re.compile(r"\n  \},?\n").search(src, start.end() - 1)
    return start.end(), close.start() + 3


def merge(src, lang, pairs):
    bounds = block_bounds(src, lang)
    if bounds is None:
        end = src.rindex("\n}")
        body = ",\n".join("    %s: %s" % (json.dumps(k), json.dumps(v, ensure_ascii=False)) for k, v in pairs.items())
        return src[:end] + ",\n\n  %s: {\n%s\n  }" % (lang, body) + src[end:]
    a, b = bounds
    body = src[a:b]
    for key, value in pairs.items():
        line = "    %s: %s" % (json.dumps(key), json.dumps(value, ensure_ascii=False))
        pattern = re.compile(r"^    ['\"]%s['\"]:.*?,?$" % re.escape(key), re.M)
        if pattern.search(body):
            body = pattern.sub(lambda m: line + ("," if m.group(0).rstrip().endswith(",") else ""), body, count=1)
        else:
            body = body.rstrip().rstrip(",") + ",\n" + line + "\n  "
    return src[:a] + body + src[b:]


def main(path):
    keys = json.load(open(path, encoding="utf-8"))
    src = open(PATH, encoding="utf-8").read()
    for lang in ("en", "ka", "ar"):
        pairs = {k: v[lang] for k, v in keys.items() if v.get(lang)}
        if pairs:
            src = merge(src, lang, pairs)
    open(PATH, "w", encoding="utf-8").write(src)
    print("merged %d keys" % len(keys))


if __name__ == "__main__":
    main(sys.argv[1])
