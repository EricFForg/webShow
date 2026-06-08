import re
import subprocess
import time
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "images" / "sku-competition"
UA = "Mozilla/5.0"
pages = [
    ("17-sn-12337483538", "https://product.suning.com/0070086330/12337483538.html"),
    ("18-sn-12235064886", "https://product.suning.com/0070087748/12235064886.html"),
    ("19-sn-1415466899", "https://product.suning.com/0070207987/000000011415466899.html"),
]
for slug, page in pages:
    html = subprocess.run(["curl.exe", "-sL", "-A", UA, page], capture_output=True, timeout=40).stdout.decode("utf-8", "ignore")
    img = None
    m = re.search(r"https://imgservice\.suning\.cn/uimg1/b2c/image/[^\s\"'\\]+", html)
    if not m:
        m = re.search(r"//imgservice\.suning\.cn/uimg1/b2c/image/[^\s\"'\\]+", html)
        if m:
            img = "https:" + m.group(0)
    else:
        img = m.group(0)
    if not img:
        print("no", slug)
        continue
    data = subprocess.run(["curl.exe", "-sL", "-A", UA, img], capture_output=True).stdout
    (OUT / f"{slug}.jpg").write_bytes(data)
    print(slug, len(data))
    time.sleep(0.3)
