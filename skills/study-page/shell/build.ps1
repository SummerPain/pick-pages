# Builds one study page from the shell: head.html, then the page's own sources (STUDY and its painters), then shell.js, as one
# self-contained HTML file (CRLF, UTF-8 without BOM).
#   powershell -NoProfile -ExecutionPolicy Bypass -File "<skill>\shell\build.ps1" -Title "Spinner look" -Out page.html -Src "src\study.js,src\painters.js"
param(
  [Parameter(Mandatory = $true)] [string] $Title,
  [Parameter(Mandatory = $true)] [string] $Out,
  [Parameter(Mandatory = $true)] [string] $Src
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$full = { param($p) $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($p) }
$read = { param($p) [IO.File]::ReadAllText((& $full $p)).TrimEnd() }
$head = (& $read (Join-Path $here 'head.html')).Replace('{{TITLE}}', [System.Net.WebUtility]::HtmlEncode($Title))
$parts = @($head, '<script>', '(() => {', "'use strict';")
foreach ($s in ($Src -split '[,;]' | Where-Object { $_.Trim() })) { $parts += "// ---- $([IO.Path]::GetFileName($s.Trim()))"; $parts += (& $read $s.Trim()) }
$parts += (& $read (Join-Path $here 'shell.js'))
$parts += @('})();', '</script>')
$text = ($parts -join "`n") -replace "`r`n", "`n" -replace "`n", "`r`n"
$outFull = & $full $Out
[IO.File]::WriteAllText($outFull, $text + "`r`n", (New-Object System.Text.UTF8Encoding($false)))
"{0}  {1:N0} bytes" -f $outFull, (Get-Item $outFull).Length
