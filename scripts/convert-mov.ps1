# ---------------------------------------------
# Inonestar Album - .mov to .mp4 auto converter
# Converts .mov files in R2 to mp4 and updates KV references.
# Runs weekly via Windows Task Scheduler.
# ---------------------------------------------

$ErrorActionPreference = 'Continue'

$SITE     = "https://inonestar.obliviscor29.workers.dev"
$R2_BASE  = "https://pub-1b703dcc28274ffc8bea84f2cdabeaf5.r2.dev"
$BUCKET   = "onestar-album"
$KV_NS    = "ff7a36162916421abda24e3dccb61427"
$KV_KEY   = "album-photos"
$PASSWORD = "4547"
$TMP      = "$PSScriptRoot\_tmp_convert"
$LOG      = "$PSScriptRoot\convert-log.txt"

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Write-Host $line
    Add-Content -Path $LOG -Value $line
}

# Reload PATH so ffmpeg / npx are found under Task Scheduler
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Log "===== Conversion started ====="

if (-not (Test-Path $TMP)) { New-Item -ItemType Directory -Force $TMP | Out-Null }

# 1. List .mov files in R2
$listRaw = curl.exe -s "$SITE/functions/api/list-photos"
$movFiles = ($listRaw | ConvertFrom-Json) | Where-Object { $_.key -like '*.mov' }

if ($movFiles.Count -eq 0) {
    Log "No .mov files to convert. Done."
    Log "===== Finished ====="
    exit 0
}
Log "Found $($movFiles.Count) .mov file(s) in R2"

# 2. Get KV album data
$kvData = npx wrangler kv key get $KV_KEY --namespace-id $KV_NS --remote --text 2>$null

# 3. Convert each .mov -> mp4 and upload
$i = 0
foreach ($f in $movFiles) {
    $i++
    $movKey = $f.key
    $mp4Key = $movKey.Replace('.mov', '.mp4')
    $movPath = Join-Path $TMP $movKey
    $mp4Path = Join-Path $TMP $mp4Key

    Log "[$i/$($movFiles.Count)] Downloading $movKey"
    curl.exe -s -o $movPath "$R2_BASE/$movKey"

    Log "[$i/$($movFiles.Count)] Converting"
    ffmpeg -i $movPath -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart -y $mp4Path 2>$null

    if (Test-Path $mp4Path) {
        $mp4Sz = [math]::Round((Get-Item $mp4Path).Length/1MB, 1)
        curl.exe -s -X POST "$SITE/functions/api/upload-raw" -H "Content-Type: video/mp4" -H "X-Key: $mp4Key" -H "X-Password: $PASSWORD" --data-binary "@$mp4Path" | Out-Null
        Log "[$i/$($movFiles.Count)] Uploaded $mp4Sz MB"
        Remove-Item -Path $movPath -Force -Confirm:$false -ErrorAction SilentlyContinue
        Remove-Item -Path $mp4Path -Force -Confirm:$false -ErrorAction SilentlyContinue
    } else {
        Log "[$i/$($movFiles.Count)] CONVERT FAILED: $movKey"
    }
}

# 4. Replace .mov -> .mp4 in KV, save without BOM
$updated = $kvData -replace '\.mov"', '.mp4"'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($updated.TrimStart([char]0xFEFF))
$kvFile = Join-Path $TMP "album_clean.json"
[System.IO.File]::WriteAllBytes($kvFile, $bytes)
npx wrangler kv key put $KV_KEY --path $kvFile --namespace-id $KV_NS --remote 2>$null
Remove-Item -Path $kvFile -Force -Confirm:$false -ErrorAction SilentlyContinue
Log "KV references updated (.mov -> .mp4)"

# 5. Delete original .mov files from R2
$listRaw2 = curl.exe -s "$SITE/functions/api/list-photos"
$movLeft = ($listRaw2 | ConvertFrom-Json) | Where-Object { $_.key -like '*.mov' }
foreach ($f in $movLeft) {
    npx wrangler r2 object delete "$BUCKET/$($f.key)" --remote 2>$null | Out-Null
}
Log "Deleted $($movLeft.Count) original .mov file(s) from R2"

Log "===== Finished ====="
