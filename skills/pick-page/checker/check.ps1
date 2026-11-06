# Runs check.mjs at below-normal priority (it starts headless, muted Edge; run one check at a time on a busy PC).
#   powershell -NoProfile -File <this folder>\check.ps1 <page.html> [--mobile] [--takes all|sec/key,...] [--out DIR] [...]
# Node: the folder in $env:PICK_NODE, else node on the Path, else %USERPROFILE%\tools\node. Setup once per PC: README.md.
foreach ($d in @($env:PICK_NODE, (Join-Path $env:USERPROFILE 'tools\node'))) {
  if (Get-Command node -ErrorAction SilentlyContinue) { break }
  if ($d -and (Test-Path (Join-Path $d 'node.exe'))) { $env:Path = "$d;$env:Path" }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Output 'check: no Node found (put it on the Path or set PICK_NODE to its folder; README.md)'; exit 2 }
if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules\playwright-core'))) { Write-Output "check: run 'npm install' once in $PSScriptRoot (README.md)"; exit 2 }
(Get-Process -Id $PID).PriorityClass = 'BelowNormal'
& node "$PSScriptRoot\check.mjs" @args
exit $LASTEXITCODE
