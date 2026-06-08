"""Retry JD image fetch with long delay."""
import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "sku-competition"
MANIFEST = OUT / "manifest.json"
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

RETRY = [
    ("09", "10143580110714"),
    ("10", "100022892619"),
    ("12", "10069260053795"),
    ("14", "100242624997"),
    ("15", "10213811099309"),
    ("16", "10118408805923"),
    ("17", "100200382738"),
    ("18", "10182941370400"),
    ("19", "10208546559562"),
]

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"


def run(args):
    return subprocess.run(args, capture_output=True, timeout=45)


for rank, sku_id in RETRY:
    slug = f"{rank}-{sku_id}"
    dest = OUT / f"{slug}.jpg"
    if dest.is_file() and dest.stat().st_size > 8000:
        print("have", slug)
        continue
    time.sleep(3)
    html = run(["curl.exe", "-sL", "-A", UA, f"https://item.m.jd.com/product/{sku_id}.html"]).stdout.decode("utf-8", "ignore")
    if len(html) < 10000:
        print("blocked", slug, len(html))
        continue
    jfs = None
    m = re.search(r'"imageurl"\s*:\s*"jfs/([^"]+)"', html)
    if m:
        jfs = "jfs/" + m.group(1)
    if not jfs:
        m = re.search(r"s750x750_(jfs/t1/[^\"!]+)", html)
        if m:
            jfs = m.group(1)
    if not jfs:
        print("no jfs", slug)
        continue
    img = f"https://img10.360buyimg.com/n1/{jfs}"
    data = run(["curl.exe", "-sL", "-A", UA, img]).stdout
    if len(data) < 3000:
        print("tiny img", slug)
        continue
    dest.write_bytes(data)
    name_m = re.search(r'"skuName"\s*:\s*"([^"]{4,220})"', html)
    name = name_m.group(1) if name_m else sku_id
    manifest[sku_id] = {
        "slug": slug,
        "name": name,
        "image": f"images/sku-competition/{slug}.jpg",
        "imageUrl": img,
        "url": f"https://item.jd.com/{sku_id}.html",
    }
    print("OK", slug, name[:60])

MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print("total", len(manifest))
