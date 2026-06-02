"""Fetch palm (大自然) and memory (梦百合) product images."""

import json
import re
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "images" / "mattress-types"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

TARGETS = {
    "palm": {
        "jd_sku": "100012345678",  # fallback below via suning
        "suning_url": "https://imgservice.suning.cn/uimg1/b2c/image/",
        "fallback_urls": [
            "https://product.suning.com/0000000000/10638974479.html",
        ],
    },
    "memory": {
        "jd_sku": "100071840898",
        "suning_page": "https://product.suning.com/0000000000/12236178454.html",
    },
}


def fetch_jd_image(sku: str) -> bytes:
    page_url = f"https://item.jd.com/{sku}.html"
    html = urllib.request.urlopen(
        urllib.request.Request(page_url, headers={**HEADERS, "Referer": page_url}),
        timeout=30,
    ).read().decode("utf-8", "ignore")
    if len(html) < 20000:
        raise RuntimeError(f"JD blocked len={len(html)}")
    origin = re.search(r'data-origin="(//img\d+\.360buyimg\.com/[^"]+)"', html)
    if origin:
        img_url = "https:" + origin.group(1)
    else:
        m = re.search(r"imageList:\s*(\[[^\]]+\])", html)
        paths = json.loads(m.group(1).replace("'", '"'))
        img_url = f"https://img10.360buyimg.com/n1/s720x720_{paths[0]}"
    return urllib.request.urlopen(
        urllib.request.Request(img_url, headers={**HEADERS, "Referer": page_url}),
        timeout=30,
    ).read()


def fetch_suning_main_image(page_url: str) -> tuple[bytes, str]:
    html = urllib.request.urlopen(
        urllib.request.Request(page_url, headers={**HEADERS, "Referer": page_url}),
        timeout=30,
    ).read().decode("utf-8", "ignore")
    m = re.search(
        r'imgservice\.suning\.cn/uimg1/b2c/image/([A-Za-z0-9_-]+)\.jpg_800w_800h_4e',
        html,
    )
    if not m:
        m = re.search(
            r'uimgproxy\.suning\.cn/uimg1/sop/commodity/([A-Za-z0-9_-]+)\.jpg',
            html,
        )
        if m:
            img_url = f"https://uimgproxy.suning.cn/uimg1/sop/commodity/{m.group(1)}.jpg"
        else:
            raise RuntimeError("no suning image in page")
    else:
        img_url = f"https://imgservice.suning.cn/uimg1/b2c/image/{m.group(1)}.jpg"
    data = urllib.request.urlopen(
        urllib.request.Request(img_url, headers={**HEADERS, "Referer": page_url}),
        timeout=30,
    ).read()
    return data, img_url


if __name__ == "__main__":
    meta = json.loads((OUT / "sources.json").read_text(encoding="utf-8"))

    # 大自然 山棕床垫 - Suning
    palm_page = "https://product.suning.com/0000000000/10638974479.html"
    palm_data, palm_img = fetch_suning_main_image(palm_page)
    (OUT / "palm.jpg").write_bytes(palm_data)
    meta["palm"] = {
        "label": "大自然 梦享 山棕床垫",
        "platform": "苏宁易购",
        "url": palm_page,
        "imagePath": "images/mattress-types/palm.jpg",
        "imageUrl": palm_img,
    }
    print("palm OK", len(palm_data))

    # 梦百合 朗怡 - try JD first, then Suning
    mem_page = "https://product.suning.com/0000000000/12236178454.html"
    try:
        mem_data = fetch_jd_image("100071840898")
        mem_meta = {
            "label": "梦百合 朗怡 零压记忆棉床垫",
            "platform": "京东商城",
            "url": "https://item.jd.com/100071840898.html",
            "sku": "100071840898",
        }
        print("memory from JD", len(mem_data))
    except Exception as e:
        print("JD fail, suning:", e)
        mem_data, mem_img = fetch_suning_main_image(mem_page)
        mem_meta = {
            "label": "梦百合 朗怡 零压记忆棉床垫",
            "platform": "苏宁易购",
            "url": mem_page,
            "imageUrl": mem_img,
        }
        print("memory from Suning", len(mem_data))
    (OUT / "memory.jpg").write_bytes(mem_data)
    mem_meta["imagePath"] = "images/mattress-types/memory.jpg"
    if "imageUrl" not in mem_meta:
        mem_meta["imageUrl"] = "https://item.jd.com/100071840898.html"
    meta["memory"] = mem_meta

    (OUT / "sources.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
