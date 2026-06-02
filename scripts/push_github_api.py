"""Push local git tree to GitHub via REST API (bypasses broken git HTTPS proxy)."""
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OWNER = "EricFForg"
REPO = "webShow"
BRANCH = "main"


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def load_token() -> str:
    out = subprocess.check_output(
        ["git", "-c", "http.proxy=", "-c", "https.proxy=", "credential", "fill"],
        input="protocol=https\nhost=github.com\n",
        cwd=ROOT,
        text=True,
    )
    cred = {}
    for line in out.splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            cred[k.strip()] = v.strip()
    token = cred.get("password")
    if not token:
        raise SystemExit("GitHub token not found in credential manager")
    return token


def api(method: str, path: str, token: str, data: dict | None = None) -> dict:
    url = f"https://api.github.com{path}" if path.startswith("/") else path
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            **({"Content-Type": "application/json"} if data is not None else {}),
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()
        return json.loads(raw.decode()) if raw else {}


def get_head_sha(token: str) -> str | None:
    try:
        ref = api("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}", token)
        return ref["object"]["sha"]
    except urllib.error.HTTPError as e:
        if e.code in (404, 409):
            return None
        raise


def ensure_initial_commit(token: str) -> str | None:
    head = get_head_sha(token)
    if head:
        return head
    readme = (ROOT / "index.html").read_bytes()
    api(
        "PUT",
        f"/repos/{OWNER}/{REPO}/contents/index.html",
        token,
        {
            "message": "Initial commit: smart mattress pad project showcase site",
            "content": base64.b64encode(readme).decode(),
        },
    )
    return get_head_sha(token)


def list_files() -> list[tuple[str, bytes]]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    files: list[tuple[str, bytes]] = []
    for path in out.split(b"\0"):
        if not path:
            continue
        rel = path.decode("utf-8")
        files.append((rel, (ROOT / rel).read_bytes()))
    return files


def main() -> None:
    token = load_token()
    parent_sha = ensure_initial_commit(token)
    files = list_files()
    print(f"Uploading {len(files)} files to {OWNER}/{REPO}...")

    tree_items = []
    for i, (path, content) in enumerate(files, 1):
        blob = api(
            "POST",
            f"/repos/{OWNER}/{REPO}/git/blobs",
            token,
            {"content": base64.b64encode(content).decode(), "encoding": "base64"},
        )
        tree_items.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        if i % 10 == 0 or i == len(files):
            print(f"  blobs {i}/{len(files)}")

    tree = api("POST", f"/repos/{OWNER}/{REPO}/git/trees", token, {"tree": tree_items})
    commit_data: dict = {
        "message": git("log", "-1", "--format=%s"),
        "tree": tree["sha"],
        "author": {
            "name": git("log", "-1", "--format=%an"),
            "email": git("log", "-1", "--format=%ae"),
            "date": git("log", "-1", "--format=%aI"),
        },
    }
    if parent_sha:
        commit_data["parents"] = [parent_sha]
    commit = api("POST", f"/repos/{OWNER}/{REPO}/git/commits", token, commit_data)

    ref_path = f"/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}"
    try:
        api("PATCH", ref_path, token, {"sha": commit["sha"], "force": True})
    except urllib.error.HTTPError as e:
        if e.code == 404:
            api("POST", f"/repos/{OWNER}/{REPO}/git/refs", token, {"ref": f"refs/heads/{BRANCH}", "sha": commit["sha"]})
        else:
            raise

    print(f"https://github.com/{OWNER}/{REPO}")


if __name__ == "__main__":
    main()
