"""Fetch remaining JD SKU images."""
import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "sku-competition"
MANIFEST = OUT / "manifest.json"
manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.is_file() else {}

REMAINING = [
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


def curl_text(url):
    return subprocess.run(["curl.exe", "-sL", "-A", UA, url], capture_output=True, timeout=40).stdout.decode("utf-8", "ignore")


def curl_bytes(url):
    return subprocess.run(["curl.exe", "-sL", "-A", UA, url], capture_output=True, timeout=40).stdout


for rank, sku_id in REMAINING:
    if sku_id in manifest:
        continue
    slug = f"{rank}-{sku_id}"
    html = curl_text(f"https://item.m.jd.com/product/{sku_id}.html")
    jfs = None
    m = re.search(r'"imageurl"\s*:\s*"jfs/([^"]+)"', html)
    if m:
        jfs = "jfs/" + m.group(1)
    if not jfs:
        m = re.search(r"s750x750_(jfs/t1/[^\"!]+)", html)
        if m:
            jfs = m.group(1)
    name_m = re.search(r'"skuName"\s*:\s*"([^"]{4,220})"', html)
    name = name_m.group(1) if name_m else sku_id
    if not jfs:
        print("skip", slug, "no jfs")
        time.sleep(1)
        continue
    img = f"https://img10.360buyimg.com/n1/{jfs}"
    data = curl_bytes(img)
    if len(data) < 3000:
        print("skip", slug, "tiny", len(data))
        time.sleep(1)
        continue
    (OUT / f"{slug}.jpg").write_bytes(data)
    manifest[sku_id] = {"slug": slug, "name": name, "image": f"images/sku-competition/{slug}.jpg", "imageUrl": img, "url": f"https://item.jd.com/{sku_id}.html"}
    print("ok", slug, name[:50])
    time.sleep(1)

MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print("total", len(manifest))
