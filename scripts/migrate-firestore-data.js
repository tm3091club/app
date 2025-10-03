import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for both projects
const oldProjectConfig = {
  projectId: 'toastmasters-monthly-schedule',
  // You'll need to download service account key from old project
  // Go to: https://console.firebase.google.com/project/toastmasters-monthly-schedule/settings/serviceaccounts/adminsdk
  // Download the JSON file and place it in this directory
  keyFilename: path.join(__dirname, 'old-project-service-account.json')
};

const newProjectConfig = {
  projectId: 'toastmasters-monthly-scheduler',
  // You'll need to download service account key from new project
  // Go to: https://console.firebase.google.com/project/toastmasters-monthly-scheduler/settings/serviceaccounts/adminsdk
  // Download the JSON file and place it in this directory
  keyFilename: path.join(__dirname, 'new-project-service-account.json')
};

// Collections to migrate
const collectionsToMigrate = [
  'clubs',
  'users', 
  'meetings',
  'roles',
  'notifications',
  'speeches',
  'evaluations',
  'assignments',
  'settings'
];

async function exportData() {
  console.log('🔍 Connecting to old project...');
  
  if (!fs.existsSync(oldProjectConfig.keyFilename)) {
    throw new Error(`Service account file not found: ${oldProjectConfig.keyFilename}\nPlease download it from the old project's Firebase Console.`);
  }

  const oldApp = admin.initializeApp({
    credential: admin.credential.cert(oldProjectConfig.keyFilename),
    projectId: oldProjectConfig.projectId
  }, 'oldProject');

  const oldDb = admin.firestore(oldApp);
  
  console.log('📤 Exporting data from old project...');
  const exportData = {};

  for (const collectionName of collectionsToMigrate) {
    console.log(`  📁 Exporting collection: ${collectionName}`);
    try {
      const snapshot = await oldDb.collection(collectionName).get();
      exportData[collectionName] = {};
      
      snapshot.forEach(doc => {
        exportData[collectionName][doc.id] = doc.data();
      });
      
      console.log(`    ✅ Exported ${snapshot.size} documents from ${collectionName}`);
    } catch (error) {
      console.log(`    ⚠️  Collection ${collectionName} not found or error: ${error.message}`);
      exportData[collectionName] = {};
    }
  }

  // Save export to file
  const exportFile = path.join(__dirname, 'firestore-export.json');
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  console.log(`💾 Export saved to: ${exportFile}`);

  await oldApp.delete();
  return exportData;
}

async function importData(exportData) {
  console.log('🔍 Connecting to new project...');
  
  if (!fs.existsSync(newProjectConfig.keyFilename)) {
    throw new Error(`Service account file not found: ${newProjectConfig.keyFilename}\nPlease download it from the new project's Firebase Console.`);
  }

  const newApp = admin.initializeApp({
    credential: admin.credential.cert(newProjectConfig.keyFilename),
    projectId: newProjectConfig.projectId
  }, 'newProject');

  const newDb = admin.firestore(newApp);
  
  console.log('📥 Importing data to new project...');

  for (const [collectionName, documents] of Object.entries(exportData)) {
    if (Object.keys(documents).length === 0) {
      console.log(`  ⏭️  Skipping empty collection: ${collectionName}`);
      continue;
    }

    console.log(`  📁 Importing collection: ${collectionName}`);
    let batchCount = 0;
    let batch = newDb.batch();

    for (const [docId, docData] of Object.entries(documents)) {
      const docRef = newDb.collection(collectionName).doc(docId);
      batch.set(docRef, docData);
      batchCount++;

      // Firestore batch limit is 500 operations
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`    ✅ Committed batch of ${batchCount} documents`);
        batchCount = 0;
        batch = newDb.batch(); // Create new batch
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log(`    ✅ Committed final batch of ${batchCount} documents`);
    }
    
    console.log(`    ✅ Imported ${Object.keys(documents).length} documents to ${collectionName}`);
  }

  await newApp.delete();
  console.log('🎉 Data migration completed successfully!');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'export') {
      await exportData();
    } else if (command === 'import') {
      const exportFile = path.join(__dirname, 'firestore-export.json');
      if (!fs.existsSync(exportFile)) {
        throw new Error(`Export file not found: ${exportFile}\nRun 'node migrate-firestore-data.js export' first.`);
      }
      const exportedData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
      await importData(exportedData);
    } else if (command === 'migrate') {
      console.log('🚀 Starting full migration...');
      const exportedData = await exportData();
      await importData(exportedData);
    } else {
      console.log(`
Usage: node migrate-firestore-data.js <command>

Commands:
  export   - Export data from old project to firestore-export.json
  import   - Import data from firestore-export.json to new project  
  migrate  - Full migration (export + import)

Prerequisites:
  1. Download service account keys:
     - Old project: https://console.firebase.google.com/project/toastmasters-monthly-schedule/settings/serviceaccounts/adminsdk
     - New project: https://console.firebase.google.com/project/toastmasters-monthly-scheduler/settings/serviceaccounts/adminsdk
  2. Save them as:
     - scripts/old-project-service-account.json
     - scripts/new-project-service-account.json
      `);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
