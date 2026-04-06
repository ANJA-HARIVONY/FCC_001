# Script Git - Commit et Push FCC_001
# Usage: .\git-commit-push.ps1

$ErrorActionPreference = "Stop"
$repoPath = "\\10.16.15.4\ftp\FCC_001"

# S'assurer que Git trust ce repertoire (dubious ownership)
git config --global --add safe.directory "//10.16.15.4/ftp/FCC_001" 2>$null

Set-Location $repoPath

Write-Host "=== Git Status ===" -ForegroundColor Cyan
git status

Write-Host "`n=== Ajout des fichiers ===" -ForegroundColor Cyan
git add -A
git status

Write-Host "`n=== Commit ===" -ForegroundColor Cyan
$msg = "Ameliorations dockerisation: doc deploiement, init MariaDB, INIT_SAMPLE_DATA, nginx conf.d"
git commit -m $msg

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Push vers origin main ===" -ForegroundColor Cyan
    git push -u origin main
    Write-Host "`n=== Termine ===" -ForegroundColor Green
} else {
    Write-Host "`nRien a commiter ou erreur." -ForegroundColor Yellow
}
