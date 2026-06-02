"""Download mattress matrix product images from curated e-commerce CDN URLs."""

import hashlib
import json
import time
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "images" / "mattress-types"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

# Curated from Baidu/Google search → JD / Suning product pages
SOURCES = {
    "wood": {
        "url": "https://imgservice.suning.cn/uimg1/b2c/image/uQQtt1p9dDp48xOUuBSuQg.jpg",
        "label": "苏宁 榻榻米实木硬床板",
        "platform": "苏宁易购",
        "page": "https://www.suning.com/item/0070574635/11800991897.html",
    },
    "palm": {
        "url": "https://imgservice.suning.cn/uimg1/b2c/image/Vyh76IgC1LIPulxOf6dJYw.jpg",
        "label": "大自然 梦享 山棕床垫",
        "platform": "苏宁易购",
        "page": "https://product.suning.com/0000000000/10638974479.html",
    },
    "spring": {
        "url": "https://img10.360buyimg.com/n1/s720x720_jfs/t1/425683/40/11031/135020/69f02465F74a6c384/008332032056e050.jpg",
        "label": "喜临门 白骑士 独袋弹簧",
        "platform": "京东商城",
        "page": "https://item.jd.com/10151577970695.html",
        "sku": "10151577970695",
    },
    "mesh3d": {
        "url": "https://imgservice.suning.cn/uimg1/b2c/image/dVn-uXxUN9hnVBfITqYscQ.jpg",
        "label": "慕思 3D 透气床垫 尚品",
        "platform": "苏宁易购",
        "page": "https://product.suning.com/0070207987/11940170360.html",
    },
    "air": {
        "url": "https://img10.360buyimg.com/n1/s720x720_jfs/t1/406037/8/9873/117770/69bd3541Fafa1c6a7/008332032032bc06.jpg",
        "label": "京东京造 充气床垫",
        "platform": "京东商城",
        "page": "https://item.jd.com/100206921705.html",
        "sku": "100206921705",
    },
    "memory": {
        "url": "https://imgservice.suning.cn/uimg1/b2c/image/JQBXjmtKmU819l81POuFiQ.jpg",
        "label": "梦百合 朗怡 零压记忆棉床垫",
        "platform": "苏宁易购",
        "page": "https://product.suning.com/0000000000/12236178454.html",
    },
    "latex": {
        "url": "https://imgservice.suning.cn/uimg1/b2c/image/Cd9k60nxBvgVcMop6MWwgw.jpg",
        "label": "梦甜湾 天然乳胶床垫",
        "platform": "苏宁易购",
        "page": "https://product.suning.com/0071301316/12242542095.html",
    },
    "hybrid": {
        "url": "https://imgservice.suning.cn/uimg1/b2c/image/hgS4hZMp_WjuOT7O2Ov2Mw.jpg",
        "label": "喜临门 白骑士 弹簧+乳胶+黄麻",
        "platform": "苏宁易购",
        "page": "https://product.suning.com/0010360980/12444553608.html",
    },
    "ai": {
        "url": "https://imgservice2.suning.cn/uimg1/b2c/image/9myF_bQeB8becg3Aqamv9w.jpg",
        "label": "喜临门 白骑士 弹簧电动智能床垫",
        "platform": "苏宁易购",
        "page": "https://product.suning.com/0010360980/12444848863.html",
    },
}


def download(name: str, info: dict) -> dict:
    referer = info.get("page", info["url"])
    req = urllib.request.Request(
        info["url"],
        headers={**HEADERS, "Referer": referer},
    )
    data = urllib.request.urlopen(req, timeout=30).read()
    if len(data) < 8000:
        raise RuntimeError(f"image too small ({len(data)} bytes)")
    path = OUT / f"{name}.jpg"
    path.write_bytes(data)
    digest = hashlib.md5(data).hexdigest()[:8]
    print(f"OK {name}: {len(data)} bytes md5={digest}")
    meta = {
        "label": info["label"],
        "platform": info["platform"],
        "url": info["page"],
        "imagePath": f"images/mattress-types/{name}.jpg",
        "imageUrl": info["url"],
    }
    if "sku" in info:
        meta["sku"] = info["sku"]
    return meta


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, info in SOURCES.items():
        for attempt in range(3):
            try:
                time.sleep(1)
                meta[name] = download(name, info)
                break
            except Exception as exc:
                print(f"FAIL {name} attempt {attempt + 1}: {exc}")
        else:
            print(f"SKIP {name} — all attempts failed")

    (OUT / "sources.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Report duplicate hashes
    hashes = {}
    for p in OUT.glob("*.jpg"):
        h = hashlib.md5(p.read_bytes()).hexdigest()
        hashes.setdefault(h, []).append(p.name)
    dups = {h: names for h, names in hashes.items() if len(names) > 1}
    if dups:
        print("DUPLICATES:", dups)
    else:
        print("All images distinct.")
