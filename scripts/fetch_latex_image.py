"""Download correct latex mattress product image."""

import json
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "images" / "mattress-types"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

PAGE = "https://product.suning.com/0071301316/12242542095.html"
IMG_URL = "https://imgservice.suning.cn/uimg1/b2c/image/Cd9k60nxBvgVcMop6MWwgw.jpg"

if __name__ == "__main__":
    data = urllib.request.urlopen(
        urllib.request.Request(IMG_URL, headers={**HEADERS, "Referer": PAGE}),
        timeout=30,
    ).read()
    (OUT / "latex.jpg").write_bytes(data)
    print("OK latex", len(data))

    meta_path = OUT / "sources.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["latex"] = {
        "label": "梦甜湾 天然乳胶床垫",
        "platform": "苏宁易购",
        "url": PAGE,
        "imagePath": "images/mattress-types/latex.jpg",
        "imageUrl": IMG_URL,
    }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
