"""Download product images from Suning pages and direct URLs."""
import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "sku-competition"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# Suning product page -> output slug
SUNING = [
    ("09-10143580110714", "https://product.suning.com/0070207987/11940170360.html"),
    ("10-100022892619", "https://product.suning.com/0010360980/12444553608.html"),
    ("12-10069260053795", "https://product.suning.com/0010360980/12444848863.html"),
    ("14-100242624997", "https://product.suning.com/0000000000/12236178454.html"),
    ("15-10213811099309", "https://product.suning.com/0010360980/12444848863.html"),
    ("16-10118408805923", "https://product.suning.com/0010360980/12444553608.html"),
    ("17-100200382738", "https://product.suning.com/0000000000/12236178454.html"),
    ("18-10182941370400", "https://product.suning.com/0000000000/12236178454.html"),
    ("19-10208546559562", "https://product.suning.com/0070207987/11940170360.html"),
]

# Direct JD image URLs (fetched when mobile page available)
DIRECT = [
    ("09-10143580110714", "https://img10.360buyimg.com/n1/jfs/t1/454442/34/1691/195008/6a25618aFe198fa5c/00833203203d033a.jpg"),
    ("10-100022892619", "https://img10.360buyimg.com/n1/jfs/t1/447722/27/8538/156352/6a25618dF3eb0a9d6/00833203202605dd.jpg"),
    ("12-10069260053795", "https://img10.360buyimg.com/n1/jfs/t1/440816/40/18253/140436/6a1e2e1dF23605043/008332032044aa96.jpg"),
    ("14-100242624997", "https://img10.360buyimg.com/n1/jfs/t1/446621/25/9029/122017/6a2634a1Ff787a31d/008332032021fa51.jpg"),
    ("15-10213811099309", "https://imgservice.suning.cn/uimg1/b2c/image/tGWQ8GnCzN_cm8ScSatPPA.jpg"),
    ("16-10118408805923", "https://img10.360buyimg.com/n1/jfs/t1/453838/16/2416/199448/6a256127Fa62d886f/0083320320c4b92d.jpg"),
    ("17-100200382738", "https://img10.360buyimg.com/n1/jfs/t1/451403/38/3391/122855/6a2435f4Ffec24c44/008332032013a3fb.jpg"),
    ("18-10182941370400", "https://imgservice.suning.cn/uimg1/b2c/image/JQBXjmtKmU819l81POuFiQ.jpg"),
    ("19-10208546559562", "https://imgservice.suning.cn/uimg1/b2c/image/dVn-uXxUN9hnVBfITqYscQ.jpg"),
]


def curl_bytes(url):
    return subprocess.run(["curl.exe", "-sL", "-A", UA, url], capture_output=True, timeout=40).stdout


def curl_text(url):
    return subprocess.run(["curl.exe", "-sL", "-A", UA, url], capture_output=True, timeout=40).stdout.decode("utf-8", "ignore")


for slug, url in DIRECT:
    dest = OUT / f"{slug}.jpg"
    if dest.is_file() and dest.stat().st_size > 5000:
        print("exists", slug)
        continue
    data = curl_bytes(url)
    if len(data) < 3000:
        print("fail", slug, len(data))
        continue
    dest.write_bytes(data)
    print("ok direct", slug, len(data))
    time.sleep(0.3)

for slug, page in SUNING:
    dest = OUT / f"{slug}.jpg"
    if dest.is_file() and dest.stat().st_size > 5000:
        continue
    html = curl_text(page)
    m = re.search(r"https://imgservice\.suning\.cn/uimg1/b2c/image/[^\"']+\.(?:jpg|png|webp)", html)
    if not m:
        m = re.search(r"//imgservice\.suning\.cn/uimg1/b2c/image/[^\"']+\.(?:jpg|png|webp)", html)
        url = "https:" + m.group(0).lstrip("/") if m and m.group(0).startswith("//") else (m.group(0) if m else None)
    else:
        url = m.group(0)
    if not url:
        print("no suning img", slug)
        continue
    data = curl_bytes(url)
    if len(data) < 3000:
        print("tiny suning", slug)
        continue
    dest.write_bytes(data)
    print("ok suning", slug)
    time.sleep(0.5)

print("done")
