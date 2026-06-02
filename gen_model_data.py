import base64
from pathlib import Path

root = Path(__file__).resolve().parent
data = base64.b64encode((root / "models" / "model2.glb").read_bytes()).decode()
(root / "js" / "model-data.js").write_text(
    f'window.MODEL_BASE64 = "{data}";\n',
    encoding="utf-8",
)
print(f"Generated model-data.js ({len(data)} chars)")
