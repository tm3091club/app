# PowerShell script to update version and push to git
# Usage: .\scripts\push-with-version.ps1

Write-Host "🔄 Updating version..." -ForegroundColor Yellow

# Run the version update script
node scripts/update-version.js

# Add all changes
git add .

# Create commit with version update
$version = node -e "import('./utils/version.ts').then(m => console.log(m.APP_VERSION))" 2>$null
if ($LASTEXITCODE -eq 0) {
    git commit -m "feat: update version to $version"
    Write-Host "✅ Committed version update" -ForegroundColor Green
} else {
    git commit -m "feat: update version and other changes"
    Write-Host "✅ Committed changes" -ForegroundColor Green
}

# Push to remote
Write-Host "🚀 Pushing to remote..." -ForegroundColor Yellow
git push

Write-Host "✅ Push completed successfully!" -ForegroundColor Green
