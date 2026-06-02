import json
import re
import time
import urllib.request
from pathlib import Path

RETRY = {
    "wood": ("43606433230", "松神 实木床板"),
    "palm": ("100133553536", "全友 椰棕护脊床垫"),
    "mesh3d": ("100007980863", "慕思 3D 透气床垫"),
    "latex": ("100236228674", "零树 乳胶床垫"),
    "hybrid": ("10156637966925", "喜临门 弹簧+乳胶混合"),
    "ai": ("10213811099309", "喜临门 AI 智能床垫"),
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Referer": "https://www.jd.com/",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

OUT = Path(__file__).resolve().parents[1] / "images" / "mattress-types"


def fetch_main_image_url(sku: str) -> str:
    page_url = f"https://item.jd.com/{sku}.html"
    html = urllib.request.urlopen(
        urllib.request.Request(page_url, headers={**HEADERS, "Referer": page_url}),
        timeout=30,
    ).read().decode("utf-8", "ignore")

    if len(html) < 20000:
        raise RuntimeError(f"blocked page len={len(html)}")

    origin = re.search(r'data-origin="(//img\d+\.360buyimg\.com/[^"]+)"', html)
    if origin:
        return "https:" + origin.group(1)

    m = re.search(r"imageList:\s*(\[[^\]]+\])", html)
    if m:
        paths = json.loads(m.group(1).replace("'", '"'))
        if paths:
            return f"https://img10.360buyimg.com/n1/s720x720_{paths[0]}"
    raise RuntimeError("no imageList")


def download(name, sku, label):
    img_url = fetch_main_image_url(sku)
    page_url = f"https://item.jd.com/{sku}.html"
    data = urllib.request.urlopen(
        urllib.request.Request(img_url, headers={**HEADERS, "Referer": page_url}),
        timeout=30,
    ).read()
    OUT.joinpath(f"{name}.jpg").write_bytes(data)
    print("OK", name, len(data))
    return {
        "sku": sku,
        "label": label,
        "platform": "京东商城",
        "url": page_url,
        "imagePath": f"images/mattress-types/{name}.jpg",
    }


if __name__ == "__main__":
    meta_path = OUT / "sources.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    for name, (sku, label) in RETRY.items():
        for attempt in range(4):
            time.sleep(4 + attempt * 2)
            try:
                meta[name] = download(name, sku, label)
                break
            except Exception as e:
                print(f"try {attempt+1} FAIL {name}: {e}")
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
