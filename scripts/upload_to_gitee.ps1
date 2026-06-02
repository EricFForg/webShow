# Upload webShow to Gitee (ericwuyu)
# Usage:
#   $env:GITEE_TOKEN = "your_private_token"
#   powershell -ExecutionPolicy Bypass -File scripts/upload_to_gitee.ps1

param(
  [string]$Token = $env:GITEE_TOKEN,
  [string]$Owner = "ericwuyu",
  [string]$Repo = "webShow",
  [string]$Branch = "master"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $Token) {
  Write-Error "请设置 Gitee 私人令牌: `$env:GITEE_TOKEN = 'xxx' 或在参数 -Token 传入"
}

$proxyOff = @("-c", "http.proxy=", "-c", "https.proxy=")

Write-Host "Creating repository $Owner/$Repo on Gitee..."
$body = @{
  access_token = $Token
  name         = $Repo
  description  = "智能薄垫项目展示站点"
  has_issues   = $true
  has_wiki     = $true
  can_comment  = $true
  public       = 1
} | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post -Uri "https://gitee.com/api/v5/user/repos" -ContentType "application/json" -Body $body | Out-Null
  Write-Host "Repository created."
} catch {
  if ($_.Exception.Message -match "422|already exists|已存在") {
    Write-Host "Repository already exists, continuing push..."
  } else {
    throw
  }
}

$remote = "https://oauth2:$Token@gitee.com/$Owner/$Repo.git"
git @proxyOff remote remove origin 2>$null
git @proxyOff remote add origin $remote
git @proxyOff push -u origin $Branch

Write-Host ""
Write-Host "Done!"
Write-Host "Repo:  https://gitee.com/$Owner/$Repo"
Write-Host "Pages: https://$Owner.gitee.io/$Repo/  (需在 Gitee 仓库设置中开启 Pages 并选 master 分支)"
