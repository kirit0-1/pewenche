# Arranca el sitio con Node (añade Node al PATH si hace falta)
$nodeDir = "C:\Program Files\nodejs"
if (Test-Path "$nodeDir\node.exe") {
  $env:Path = "$nodeDir;$env:Path"
}
Set-Location $PSScriptRoot
& node server/index.mjs
