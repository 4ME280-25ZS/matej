Param(
  [string]$RepoUrl
)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "Git není nainstalován nebo není v PATH. Stáhni ho z: https://git-scm.com/download/win"
  exit 1
}

if (-not $RepoUrl) {
  $RepoUrl = Read-Host "Zadej HTTPS URL repozitáře (např. https://github.com/USERNAME/REPO.git)"
}

if (-not $RepoUrl) {
  Write-Error "Nebyla zadána URL repozitáře. Skript končí."
  exit 1
}

Push-Location $PSScriptRoot
try {
  if (-not (Test-Path .git)) {
    git init
  }

  git add .
  # commit může selhat, pokud není žádná změna
  git commit -m "Initial scaffold: wishlist app" 2>$null

  # nastav/aktualizuj remote
  try {
    git remote add origin $RepoUrl
  } catch {
    git remote set-url origin $RepoUrl
  }

  git branch -M main
  git push -u origin main
} catch {
  Write-Error "Chyba při provádění git příkazů: $_"
} finally {
  Pop-Location
}
