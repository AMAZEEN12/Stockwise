<#
 Runs the three Stockwise delivery checks against the DEPLOYED service and saves everything:
   1. wake-up / cold-start time          (README "Cold start")
   2. load/concurrency/last-unit.mjs     (R4 on the live service, N devices x ROUNDS)
   3. load/k6/sales.js and dashboard.js  (DM12: POST /sales p95 <= 500 ms; read paths p95 <= 800 ms; saturation point)

 Run from anywhere inside the repo, in PowerShell:
   .\load\run-load-tests.ps1 -ApiUrl https://stockwise-yc54.onrender.com/api/v1
   .\load\run-load-tests.ps1 -ApiUrl <url> -SkipK6          # only wake-up + last-unit (no k6 needed)
   .\load\run-load-tests.ps1 -ApiUrl <url> -PeakVus 20      # gentler ramp

 Needs: Node 22+ (last-unit.mjs uses Promise.withResolvers), k6 (winget install k6) unless -SkipK6.
 WARNING: this WRITES to the database behind -ApiUrl (test products, thousands of sales). Use the demo database
 or a Neon staging branch, then reset it (scripts/reset-demo.sql). Never run it against a real shop.
 Output: %USERPROFILE%\stockwise-load-logs\<timestamp>\  (raw logs + summary.md to paste into docs/load-test-report.md)
#>
param(
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [string]$OwnerEmail = 'owner@stockwise.test',
  [string]$OwnerPassword = 'Stockwise-Demo-2026',
  [int]$Devices = 10,
  [int]$Rounds = 3,
  [int]$PeakVus = 50,
  [switch]$SkipK6
)
$ErrorActionPreference = 'Continue'
$root = (git rev-parse --show-toplevel).Trim()
Set-Location $root
$ApiUrl = $ApiUrl.TrimEnd('/')
if ($ApiUrl -notmatch '/api/v1$') { throw "ApiUrl must end with /api/v1 (got $ApiUrl)" }

$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) { throw "Node $nodeMajor found. last-unit.mjs needs Node 22+ (Promise.withResolvers). Install Node 22 LTS." }
if (-not $SkipK6 -and -not (Get-Command k6 -ErrorAction SilentlyContinue)) { throw "k6 not found. Install it (winget install k6) or pass -SkipK6." }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path $env:USERPROFILE "stockwise-load-logs\$stamp"
New-Item -ItemType Directory -Force $out | Out-Null
$summary = Join-Path $out 'summary.md'
$k6v = if ($SkipK6) { 'not run' } else { (k6 version) -join ' ' }
@"
# Load run $stamp
- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm') (local)
- Service: $ApiUrl
- Node: $(node -v)   k6: $k6v
- Settings: DEVICES=$Devices ROUNDS=$Rounds PEAK_VUS=$PeakVus
"@ | Set-Content $summary -Encoding UTF8

# 1. Wake-up. If the service was asleep this is the cold-start figure; if it answers in a few seconds it was already warm.
Write-Host "`n[1/4] Waking the service (Render free sleeps after 15 min idle)..." -ForegroundColor Cyan
$sw = [Diagnostics.Stopwatch]::StartNew(); $status = 'no answer'
try { $r = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 180; $status = $r.StatusCode } catch { $status = $_.Exception.Message }
$sw.Stop()
$secs = [math]::Round($sw.Elapsed.TotalSeconds, 1)
$kind = if ($secs -gt 10) { 'cold start (service was asleep)' } else { 'warm (was already awake; NOT a cold-start figure)' }
Write-Host "health: $status in $secs s -> $kind"
"`n## 1. First request after idle`n- GET /health: $status in **$secs s**: $kind" | Add-Content $summary -Encoding UTF8

# 2. Last unit
Write-Host "`n[2/4] Last-unit test ($Devices devices x $Rounds rounds)..." -ForegroundColor Cyan
$env:API_URL = $ApiUrl; $env:OWNER_EMAIL = $OwnerEmail; $env:OWNER_PASSWORD = $OwnerPassword
$env:DEVICES = "$Devices"; $env:ROUNDS = "$Rounds"
$luLog = Join-Path $out 'last-unit.log'
node load/concurrency/last-unit.mjs 2>&1 | Tee-Object -FilePath $luLog | Out-Host
$luExit = $LASTEXITCODE
"`n## 2. Last-unit test (exit code $luExit; 0 = passed)`n``````n$((Get-Content $luLog) -join "`n")`n``````" | Add-Content $summary -Encoding UTF8

# 3 + 4. k6
if (-not $SkipK6) {
  foreach ($t in @(@{n='sales'; step='3/4'; label='POST /sales (target p95 <= 500 ms, DM12)'}, @{n='dashboard'; step='4/4'; label='Read paths: GET /products + GET /sales (target p95 <= 800 ms, DM12)'})) {
    Write-Host "`n[$($t.step)] k6 $($t.n): $($t.label)" -ForegroundColor Cyan
    $log = Join-Path $out "k6-$($t.n).log"
    k6 run -e API_URL=$ApiUrl -e OWNER_EMAIL=$OwnerEmail -e OWNER_PASSWORD=$OwnerPassword -e PEAK_VUS=$PeakVus "load/k6/$($t.n).js" 2>&1 | Tee-Object -FilePath $log | Out-Host
    $code = $LASTEXITCODE
    $meaning = switch ($code) { 0 { 'all thresholds held: NO saturation up to the peak VUs (say so, and raise -PeakVus)' } 99 { 'a threshold was crossed: the ramp aborted, which is the saturation point (read the VU count at the abort)' } default { "k6 error (exit $code): not a result" } }
    $keys = Select-String -Path $log -Pattern 'http_req_duration|http_req_failed|checks|vus_max|vus\s|iterations|http_reqs|THRESHOLDS|thresholds|crossed|aborted|✓|✗|level=' | ForEach-Object { $_.Line.Trim() }
    "`n## $($t.step) k6 $($t.n): $($t.label)`n- Exit code: $code. $meaning`n``````n$($keys -join "`n")`n``````" | Add-Content $summary -Encoding UTF8
  }
}
Write-Host "`nDone. Logs and summary: $out" -ForegroundColor Green
Write-Host "Next: copy summary.md into docs/load-test-report.md, update the README Performance table, then reset the demo data."
explorer $out
