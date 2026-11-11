$ErrorActionPreference = 'Stop'
$demo = Split-Path -Parent $PSScriptRoot
$workspace = (Resolve-Path -LiteralPath (Join-Path $demo '../..')).Path
$tooling = Join-Path $workspace '.tooling'
$engine = Join-Path $tooling 'gdevelop-5.6.287/GDevelop.exe'
$projectFile = Join-Path $tooling 'downhill-bike-export.json'
$staging = Join-Path $tooling 'downhill-bike-staging'
$stdout = Join-Path $tooling 'downhill-bike-export.log'
$stderr = Join-Path $tooling 'downhill-bike-export-error.log'
$project = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $demo 'downhill-bike.json') | ConvertFrom-Json
$project.properties.latestCompilationDirectory = $staging
foreach ($resource in $project.resources.resources) {
    $resource.file = (Resolve-Path -LiteralPath (Join-Path $demo $resource.file)).Path
}
[IO.File]::WriteAllText($projectFile, ($project | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
$arguments = @('--disable-update-check', '--run-command', 'EXPORT_HTML5_EXTERNAL', ('"' + $projectFile + '"'))
$process = Start-Process -FilePath $engine -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$null = $process.Handle
if (!$process.WaitForExit(150000)) {
    & taskkill /PID $process.Id /T /F | Out-Null
    throw 'Downhill Bike export timed out.'
}
Get-Content -LiteralPath $stdout -Tail 5
if ($process.ExitCode -ne 0 -or !(Select-String -LiteralPath $stdout -SimpleMatch 'Command "EXPORT_HTML5_EXTERNAL" finished successfully.' -Quiet)) {
    throw 'GDevelop export failed. See .tooling/downhill-bike-export-error.log.'
}
$entry = Join-Path $staging 'index.html'
if (!(Test-Path -LiteralPath $entry) -or !(Select-String -LiteralPath (Join-Path $staging 'code0.js') -SimpleMatch 'createBikeGame(runtimeScene)' -Quiet)) {
    throw 'GDevelop export is missing the demo entry point.'
}
& node --check (Join-Path $staging 'code0.js')
if ($LASTEXITCODE -ne 0) { throw 'GDevelop export contains invalid JavaScript.' }
$destination = Join-Path $demo 'build'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Get-ChildItem -LiteralPath $staging | Copy-Item -Destination $destination -Recurse -Force
Write-Output "Playable export: $destination"
