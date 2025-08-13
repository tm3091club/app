#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the version file
const versionFilePath = path.join(__dirname, '../utils/version.ts');

// Read current version from file
function getCurrentVersion() {
  const content = fs.readFileSync(versionFilePath, 'utf8');
  const match = content.match(/const CURRENT_VERSION = "(.+)";/);
  return match ? match[1] : null;
}

// Parse version string (format: M.DD.YY-X)
function parseVersion(versionString) {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)-(\d+)$/);
  if (!match) return null;
  
  const [, month, day, year, count] = match;
  return {
    month: parseInt(month),
    day: parseInt(day),
    year: parseInt(year),
    count: parseInt(count),
    dateString: `${month}.${day}.${year}`
  };
}

// Generate new version based on current date
function generateNewVersion() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const dateString = `${month}.${day.toString().padStart(2, '0')}.${year.toString().slice(-2)}`;
  
  const currentVersion = getCurrentVersion();
  let newCount = 1;
  
  if (currentVersion) {
    const parsed = parseVersion(currentVersion);
    if (parsed && parsed.dateString === dateString) {
      // Same day, increment count
      newCount = parsed.count + 1;
    }
    // Different day, count resets to 1 (already set above)
  }
  
  return `${month}.${day.toString().padStart(2, '0')}.${year.toString().slice(-2)}-${newCount}`;
}

// Update version file
function updateVersionFile(newVersion) {
  const content = fs.readFileSync(versionFilePath, 'utf8');
  const updatedContent = content.replace(
    /const CURRENT_VERSION = ".+";/,
    `const CURRENT_VERSION = "${newVersion}";`
  );
  
  fs.writeFileSync(versionFilePath, updatedContent, 'utf8');
  console.log(`✅ Version updated to: ${newVersion}`);
}

// Main function
function main() {
  try {
    const currentVersion = getCurrentVersion();
    const newVersion = generateNewVersion();
    
    console.log(`📦 Current version: ${currentVersion}`);
    console.log(`🚀 New version: ${newVersion}`);
    
    if (currentVersion !== newVersion) {
      updateVersionFile(newVersion);
      
      // Stage and commit the version update
      execSync('git add utils/version.ts', { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
      
      console.log(`🎉 Version updated and committed: ${newVersion}`);
    } else {
      console.log('📝 Version is already up to date');
    }
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

// Run the main function (ES modules don't have require.main equivalent)
main();

export { generateNewVersion, updateVersionFile };
