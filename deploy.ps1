param([string]$GitHubToken = $env:GITHUB_TOKEN)

$ErrorActionPreference = "Stop"
Write-Host "Starting deployment..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository" -ForegroundColor Red
    exit 1
}

$repoUrl = $null
try {
    $pkg = Get-Content "package.json" | ConvertFrom-Json
    if ($pkg.repository.url) {
        $repoUrl = $pkg.repository.url -replace "git\+", "" -replace "\.git$", ""
    }
} catch { }

if (-not $repoUrl) {
    try {
        $out = git remote get-url origin 2>&1
        if ($LASTEXITCODE -eq 0) {
            $repoUrl = $out.ToString().Trim() -replace "git@github\.com:", "https://github.com/" -replace "\.git$", ""
        }
    } catch { }
}

if ($GitHubToken -and $repoUrl) {
    Write-Host "Using GitHub token for authentication" -ForegroundColor Green
    $authUrl = $repoUrl -replace "https://github.com/", "https://${GitHubToken}@github.com/" + ".git"
    git remote set-url origin $authUrl 2>&1 | Out-Null
} else {
    Write-Host "No GITHUB_TOKEN found. Using existing Git credentials." -ForegroundColor Yellow
}

Write-Host "Building project..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1 
}

Write-Host "Deploying to GitHub Pages..." -ForegroundColor Cyan
npx gh-pages -d dist

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
} else {
    Write-Host "Deployment failed. Set GITHUB_TOKEN or configure Git credentials." -ForegroundColor Red
    exit 1
}
