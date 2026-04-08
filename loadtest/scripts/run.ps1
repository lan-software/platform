param(
  [Parameter(Mandatory=$true)][string]$Scenario,
  [Parameter(ValueFromRemainingArguments=$true)][string[]]$Extra
)

$ErrorActionPreference = "Stop"
$ScriptDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ScriptDir

if (-not (Test-Path $Scenario)) {
  Write-Error "scenario not found: $Scenario"
}

$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$name = [System.IO.Path]::GetFileNameWithoutExtension($Scenario)
$summary = "results/${name}-${ts}.json"

docker compose up -d prometheus grafana

docker compose run --rm k6 run `
  --summary-export="/scripts/$summary" `
  "/scripts/$Scenario" `
  @Extra

Write-Host ""
Write-Host "Summary: $summary"
Write-Host "Grafana: http://localhost:$($env:GRAFANA_PORT ?? '3000')"
