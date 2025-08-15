@echo off
echo 🔄 Updating version and pushing...
node scripts/update-version.js
git add .
git commit -m "feat: auto-update version"
git push
echo ✅ Push completed!
pause
