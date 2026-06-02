@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在同步 3D 模型...
python gen_model_data.py
echo 正在启动本地展示服务...
start "" "http://127.0.0.1:8765/index.html"
python -m http.server 8765
pause
