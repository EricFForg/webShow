import re
import subprocess
from pathlib import Path

page = "https://product.suning.com/0071645808/12451274032.html"
html = subprocess.run(["curl.exe", "-sL", "-A", "Mozilla/5.0", page], capture_output=True, timeout=40).stdout.decode("utf-8", "ignore")
m = re.search(r"https://imgservice\.suning\.cn/uimg1/b2c/image/[^\s\"'<>]+", html)
if not m:
    m = re.search(r"//imgservice\.suning\.cn/uimg1/b2c/image/[^\s\"'<>]+", html)
    url = "https:" + m.group(0) if m else None
else:
    url = m.group(0)
print(url)
if url:
    data = subprocess.run(["curl.exe", "-sL", "-A", "Mozilla/5.0", url], capture_output=True).stdout
    Path(r"c:\Users\admin\Desktop\box\webShow\images\sku-competition\17-sn-12451274032.jpg").write_bytes(data)
    print("bytes", len(data))
