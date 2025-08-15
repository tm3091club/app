#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get current date-based version
const getCurrentDateVersion = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear().toString().slice(-2);
  
  return `${month}.${day.toString().padStart(2, '0')}.${year}`;
};

// Read current push count from a file
const getPushCount = () => {
  const countFile = path.join(__dirname, '..', '.push-count');
  const today = new Date().toDateString();
  
  try {
    const data = fs.readFileSync(countFile, 'utf8');
    const lines = data.split('\n');
    const lastDate = lines[0];
    const lastCount = parseInt(lines[1]) || 0;
    
    if (lastDate === today) {
      return lastCount + 1;
    } else {
      return 1;
    }
  } catch (error) {
    return 1;
  }
};

// Save push count to file
const savePushCount = (count) => {
  const countFile = path.join(__dirname, '..', '.push-count');
  const today = new Date().toDateString();
  fs.writeFileSync(countFile, `${today}\n${count}`);
};

// Update the version file
const updateVersionFile = () => {
  const versionFile = path.join(__dirname, '..', 'utils', 'version.ts');
  const dateVersion = getCurrentDateVersion();
  const pushCount = getPushCount();
  const newVersion = `${dateVersion}-${pushCount}`;
  
  // Save the new push count
  savePushCount(pushCount);
  
  // Read the current file
  let content = fs.readFileSync(versionFile, 'utf8');
  
  // Replace the CURRENT_VERSION line
  content = content.replace(
    /const CURRENT_VERSION = generateVersion\(\);|const CURRENT_VERSION = "[^"]*";/,
    `const CURRENT_VERSION = "${newVersion}";`
  );
  
  // Write back to file
  fs.writeFileSync(versionFile, content);
  
  console.log(`Version updated to: ${newVersion}`);
  return newVersion;
};

// Run the update
const newVersion = updateVersionFile();
console.log(`✅ Version updated to: ${newVersion}`);
