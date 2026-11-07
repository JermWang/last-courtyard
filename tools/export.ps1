$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$engine = Join-Path $workspace '.tooling\gdevelop-5.6.287\GDevelop.exe'
$project = Join-Path $workspace 'courtyard.json'
$projectData = Get-Content -Raw -Encoding UTF8 -LiteralPath $project | ConvertFrom-Json
foreach ($resource in $projectData.resources.resources) {
  if ($resource.file -and !(Test-Path -LiteralPath (Join-Path $workspace $resource.file))) {
    throw "Missing export resource: $($resource.file)"
  }
}
$staging = Join-Path $workspace '.tooling\html5-staging'
$projectData.properties.latestCompilationDirectory = $staging
foreach ($resource in $projectData.resources.resources) {
  if ($resource.file) { $resource.file = [IO.Path]::GetFullPath((Join-Path $workspace $resource.file)) }
}
# Export separately so a failed export cannot overwrite the playable build.
$project = Join-Path $workspace '.tooling\export-project.json'
[IO.File]::WriteAllText($project, ($projectData | ConvertTo-Json -Depth 100), (New-Object Text.UTF8Encoding($false)))
$arguments = @('--disable-update-check', '--run-command', 'EXPORT_HTML5_EXTERNAL', ('"' + $project + '"'))
$process = Start-Process -FilePath $engine -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardOutput (Join-Path $workspace '.tooling\export.log') -RedirectStandardError (Join-Path $workspace '.tooling\export-error.log') -PassThru
$null = $process.Handle # Retain the handle so Windows PowerShell can read the exit code.
$deadline = [DateTime]::UtcNow.AddMinutes(3)
while (!$process.WaitForExit(1000)) {
  $failed = Select-String -LiteralPath (Join-Path $workspace '.tooling\export-error.log') -Pattern 'Failed to open the project|corrupted/malformed file' -Quiet
  if ($failed -or [DateTime]::UtcNow -gt $deadline) {
    # This is the exact background process tree started above, never an editor
    # opened by the user. Failed CLI exports can otherwise remain open forever.
    & taskkill /PID $process.Id /T /F | Out-Null
    throw 'GDevelop export failed or timed out; inspect .tooling/export-error.log.'
  }
}
Get-Content (Join-Path $workspace '.tooling\export.log') -Tail 5
if ($null -ne $process.ExitCode -and $process.ExitCode -ne 0) { throw "GDevelop export failed: $($process.ExitCode)" }
if (!(Select-String -LiteralPath (Join-Path $workspace '.tooling\export.log') -SimpleMatch 'Command "EXPORT_HTML5_EXTERNAL" finished successfully.' -Quiet)) { throw 'GDevelop did not report a successful export.' }
if (Select-String -LiteralPath (Join-Path $workspace '.tooling\export.log') -SimpleMatch 'Unable to copy' -Quiet) { throw 'GDevelop export omitted a resource; inspect .tooling/export.log.' }
& node (Join-Path $workspace 'tools\verify-export.cjs') $staging
if ($LASTEXITCODE -ne 0) { throw 'HTML5 export integrity check failed.' }
& node (Join-Path $workspace 'tools\publish-export.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Could not copy verified HTML5 export into build.' }
