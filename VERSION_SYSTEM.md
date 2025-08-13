# Automated Version Update System

This project includes an automated version update system that increments the version number before each git push.

## How It Works

### Automatic Version Updates
- **Pre-push Hook**: A Git hook automatically runs before each `git push`
- **Version Format**: `M.DD.YY-X` (Month.Day.Year-PushCount)
- **Example**: `8.13.25-26` means August 13, 2025, 26th push of the day

### Version Display
The current version is displayed at the bottom of the app in the footer.

## Available Commands

### Manual Version Update
```bash
npm run version:update
```
Updates the version manually without pushing.

### Push with Version Update
```bash
npm run push
```
Updates the version and pushes to the main branch.

### Regular Git Push (with auto-update)
```bash
git push
```
Automatically updates version before pushing.

## Version Logic

1. **Same Day**: If pushing multiple times on the same day, the counter increments
   - First push: `8.13.25-1`
   - Second push: `8.13.25-2`
   - Third push: `8.13.25-3`

2. **New Day**: Counter resets to 1
   - Next day first push: `8.14.25-1`

## Files Involved

- `utils/version.ts` - Contains the current version
- `scripts/update-version.js` - Version update logic
- `.git/hooks/pre-push` - Git hook for automatic updates
- `package.json` - NPM scripts for manual updates

## Troubleshooting

### If the hook doesn't work on Windows:
1. Make sure you're using Git Bash or PowerShell
2. The hook should work automatically with `git push`
3. You can also use `npm run push` as an alternative

### Manual override:
If you need to push without updating the version:
```bash
git push --no-verify
```

## Benefits

- ✅ **No manual version management** - Version updates automatically
- ✅ **Consistent versioning** - Follows a predictable format
- ✅ **Push tracking** - Know exactly how many pushes per day
- ✅ **Easy rollback** - Each version is tied to a specific push
