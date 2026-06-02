import json
import re
import time
import urllib.request
from pathlib import Path

SKUS = {
    "wood": ("10103773471820", "全实木杉木床板"),
    "palm": ("100133553536", "全友 椰棕护脊床垫"),
    "spring": ("10151577970695", "喜临门 独袋弹簧床垫"),
    "mesh3d": ("100007980863", "慕思 3D 透气床垫"),
    "air": ("100206921705", "京东京造 充气床垫"),
    "memory": ("10109166130001", "南极人 记忆棉床垫"),
    "latex": ("100236228674", "零树 乳胶床垫"),
    "hybrid": ("10156637966925", "喜临门 弹簧+乳胶混合"),
    "ai": ("10213811099309", "喜临门 AI 气囊智能床垫"),
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
    "Referer": "https://www.jd.com/",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "images" / "mattress-types"


def fetch_main_image_url(sku: str) -> str:
    page_url = f"https://item.jd.com/{sku}.html"
    html = urllib.request.urlopen(
        urllib.request.Request(page_url, headers={**HEADERS, "Referer": page_url}),
        timeout=30,
    ).read().decode("utf-8", "ignore")

    origin = re.search(r'data-origin="(//img\d+\.360buyimg\.com/[^"]+)"', html)
    if origin:
        return "https:" + origin.group(1)

    m = re.search(r"imageList:\s*(\[[^\]]+\])", html)
    if m:
        paths = json.loads(m.group(1).replace("'", '"'))
        if paths:
            return f"https://img10.360buyimg.com/n1/s720x720_{paths[0]}"

    raise RuntimeError("imageList not found in page")


def download(name: str, sku: str, label: str) -> dict:
    img_url = fetch_main_image_url(sku)
    page_url = f"https://item.jd.com/{sku}.html"
    req = urllib.request.Request(
        img_url,
        headers={**HEADERS, "Referer": page_url},
    )
    data = urllib.request.urlopen(req, timeout=30).read()
    if len(data) < 8000:
        raise RuntimeError(f"image too small ({len(data)} bytes)")

    out = OUT / f"{name}.jpg"
    out.write_bytes(data)
    print(f"OK {name} {len(data)} {img_url[:90]}...")
    return {
        "sku": sku,
        "label": label,
        "platform": "京东商城",
        "url": page_url,
        "imagePath": f"images/mattress-types/{name}.jpg",
        "imageUrl": img_url,
    }


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, (sku, label) in SKUS.items():
        time.sleep(2.5)
        try:
            meta[name] = download(name, sku, label)
        except Exception as e:
            print(f"FAIL {name} sku={sku}: {e}")

    (OUT / "sources.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("done", len(meta), "images")
