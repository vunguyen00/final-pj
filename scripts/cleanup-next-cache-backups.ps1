[CmdletBinding()]
param()

$workspaceRoot = [System.IO.Path]::GetFullPath(
  (Split-Path -Parent $PSScriptRoot)
).TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
)
$workspacePrefix = "$workspaceRoot$([System.IO.Path]::DirectorySeparatorChar)"
$backupNamePattern = '^\.next-cache-backup-\d{8}-\d{6}$'

$backupFolders = Get-ChildItem -LiteralPath $workspaceRoot -Directory -Force |
  Where-Object { $_.Name -match $backupNamePattern }

foreach ($backupFolder in $backupFolders) {
  $targetPath = [System.IO.Path]::GetFullPath($backupFolder.FullName)
  $isInsideWorkspace = $targetPath.StartsWith(
    $workspacePrefix,
    [System.StringComparison]::OrdinalIgnoreCase
  )
  $isReparsePoint = (
    $backupFolder.Attributes -band [System.IO.FileAttributes]::ReparsePoint
  ) -ne 0

  if (-not $isInsideWorkspace) {
    throw "Refusing to remove a path outside the workspace: $targetPath"
  }
  if ($isReparsePoint) {
    throw "Refusing to remove a reparse point: $targetPath"
  }
  if ($backupFolder.Name -notmatch $backupNamePattern) {
    throw "Refusing to remove an unexpected directory: $targetPath"
  }

  Remove-Item -LiteralPath $targetPath -Recurse -Force
  Write-Output "Removed Next.js cache backup: $targetPath"
}

if ($backupFolders.Count -eq 0) {
  Write-Output "No Next.js cache backup directories found in $workspaceRoot"
}
