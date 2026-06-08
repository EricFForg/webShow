"""Download Suning product images for SKU map."""
import json
import re
import subprocess
import time
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "images" / "sku-competition"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

PAGES = [
    (11, "sn-12444553608", "https://product.suning.com/0010360980/12444553608.html"),
    (12, "sn-12444848863", "https://product.suning.com/0010360980/12444848863.html"),
    (13, "sn-11940170360", "https://product.suning.com/0070207987/11940170360.html"),
    (14, "sn-12236178454", "https://product.suning.com/0000000000/12236178454.html"),
    (15, "sn-12242542095", "https://product.suning.com/0071301316/12242542095.html"),
    (16, "sn-10638974479", "https://product.suning.com/0000000000/10638974479.html"),
    (17, "sn-11800991897", "https://www.suning.com/item/0070574635/11800991897.html"),
    (18, "sn-10638974479-wood", "https://www.suning.com/item/0070574635/11800991897.html"),  # dup fix below
    (19, "sn-extra", "https://product.suning.com/0070207987/11940170360.html"),
]

# dedupe urls
seen = set()
items = []
for rank, sid, url in PAGES:
    if url in seen:
        continue
    seen.add(url)
    items.append((len(items) + 11, sid, url))
items = items[:9]

manifest = {}


def curl_text(url):
    return subprocess.run(["curl.exe", "-sL", "-A", UA, url], capture_output=True, timeout=40).stdout.decode("utf-8", "ignore")


def curl_bytes(url):
    return subprocess.run(["curl.exe", "-sL", "-A", UA, url], capture_output=True, timeout=40).stdout


for rank, sid, page in items:
    slug = f"{rank:02d}-{sid}"
    html = curl_text(page)
    img = None
    for pat in [r"https://imgservice\.suning\.cn/uimg1/b2c/image/[^\"'\\]+", r"//imgservice\.suning\.cn/uimg1/b2c/image/[^\"'\\]+"]:
        m = re.search(pat, html)
        if m:
            img = m.group(0)
            if img.startswith("//"):
                img = "https:" + img
            break
    title_m = re.search(r"<title>([^<]{4,100})</title>", html)
    title = title_m.group(1).strip() if title_m else sid
    if not img:
        print("no img", slug)
        continue
    data = curl_bytes(img)
    if len(data) < 2000:
        print("tiny", slug, len(data))
        continue
    (OUT / f"{slug}.jpg").write_bytes(data)
    manifest[sid] = {"rank": rank, "slug": slug, "name": title, "image": f"images/sku-competition/{slug}.jpg", "url": page, "imageUrl": img}
    print("ok", slug, len(data))
    time.sleep(0.3)

(OUT / "suning-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
