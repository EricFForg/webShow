import re
import subprocess
from pathlib import Path

html = Path(r"c:\Users\admin\Desktop\box\webShow\scripts\yl.html").read_text(encoding="utf-8", errors="ignore")
imgs = re.findall(r"https://imgservice\.suning\.cn/uimg1/b2c/image/[^\s\"'<>]+", html)
print("count", len(imgs))
if imgs:
    url = imgs[0]
    print(url)
    data = subprocess.run(["curl.exe", "-sL", "-A", "Mozilla/5.0", url], capture_output=True).stdout
    out = Path(r"c:\Users\admin\Desktop\box\webShow\images\sku-competition\17-sn-12337483538.jpg")
    out.write_bytes(data)
    print("saved", len(data))
