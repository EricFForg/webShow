"""Fetch JD SKU images via curl + parse mobile HTML."""
import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "sku-competition"
OUT.mkdir(parents=True, exist_ok=True)

TARGET = [
    "10151577970695",
    "4029975",
    "100007776017",
    "100014526009",
    "100010105857",
    "100033005295",
    "100037332993",
    "100201332420",
    "10143580110714",
    "100022892619",
    "100053076802",
    "10069260053795",
    "100071840898",
    "100242624997",
    "10213811099309",
    "10118408805923",
    "100200382738",
    "10182941370400",
    "10208546559562",
]

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"


def curl_text(url: str) -> str:
    r = subprocess.run(
        ["curl.exe", "-sL", "-A", UA, url],
        capture_output=True,
        timeout=35,
    )
    return r.stdout.decode("utf-8", "ignore")


def curl_bytes(url: str) -> bytes:
    r = subprocess.run(
        ["curl.exe", "-sL", "-A", UA, url],
        capture_output=True,
        timeout=35,
    )
    return r.stdout


def parse_jd(sku_id: str):
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
    img = f"https://img10.360buyimg.com/n1/{jfs}" if jfs else None
    return name, img, f"https://item.jd.com/{sku_id}.html"


results = {}
for i, sku_id in enumerate(TARGET, 1):
    slug = f"{i:02d}-{sku_id}"
    try:
        name, img, page = parse_jd(sku_id)
        print(f"{slug} | {name[:70]}")
        if not img:
            print("  no image")
            continue
        data = curl_bytes(img)
        if len(data) < 3000:
            print("  tiny", len(data))
            continue
        dest = OUT / f"{slug}.jpg"
        dest.write_bytes(data)
        results[sku_id] = {
            "slug": slug,
            "name": name,
            "image": f"images/sku-competition/{slug}.jpg",
            "imageUrl": img,
            "url": page,
        }
        time.sleep(0.2)
    except Exception as e:
        print("FAIL", sku_id, e)

(OUT / "manifest.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print("saved", len(results), "of", len(TARGET))
