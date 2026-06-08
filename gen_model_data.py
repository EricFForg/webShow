import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent

# model2：内嵌供 file:// 离线；mattress 单独文件，按需加载
MODEL_PATHS = {
    "js/model-data.js": ["models/model2.glb"],
    "js/model-data-mattress.js": ["models/mattress.glb"],
}

for out_rel, paths in MODEL_PATHS.items():
    models_b64 = {}
    for rel in paths:
        path = root / rel
        if not path.is_file():
            print(f"skip missing: {rel}")
            continue
        models_b64[rel] = base64.b64encode(path.read_bytes()).decode()
        print(f"embedded {rel} -> {out_rel} ({len(models_b64[rel])} chars)")

    lines = [f"window.MODELS_BASE64 = Object.assign(window.MODELS_BASE64 || {{}}, {json.dumps(models_b64)});"]
    if paths[0] == "models/model2.glb" and paths[0] in models_b64:
        lines.append(
            f'window.MODEL_BASE64 = window.MODELS_BASE64[{json.dumps(paths[0])}];'
        )
    if paths[0] == "models/mattress.glb" and paths[0] in models_b64:
        lines.append(
            f'window.MATTRESS_BASE64 = window.MODELS_BASE64[{json.dumps(paths[0])}];'
        )

    (root / out_rel).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Generated {out_rel}")
