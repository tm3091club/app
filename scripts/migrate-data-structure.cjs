// Migration script to properly separate AppUser[] (auth) from Member[] (scheduling)
// This fixes the data structure where club admin appears in scheduling

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

// Get Firebase config from environment or use the current one
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDVzvpEo8utvAoGjJcbyO2KRjFvfHVDqvY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "toastmasters-monthly-schedule.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "toastmasters-monthly-schedule",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "toastmasters-monthly-schedule.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "565975073483",
  appId: process.env.FIREBASE_APP_ID || "1:565975073483:web:c63a09f3e8119d50bad14e",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-TKR2N8DQDK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateDataStructure() {
  try {
    console.log('🚀 Starting data structure migration...');
    
    // Find the club owner document
    const clubOwnerId = process.argv[2];
    if (!clubOwnerId) {
      console.error('❌ Usage: node migrate-data-structure.js <club-owner-uid>');
      console.error('   Example: node migrate-data-structure.js o4QyZGSS88gc3p9qaLdqelFrg4B2');
      process.exit(1);
    }
    
    console.log(`🔍 Looking for club data with owner ID: ${clubOwnerId}`);
    
    const docRef = doc(db, 'users', clubOwnerId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error('❌ Club document not found!');
      process.exit(1);
    }
    
    const data = docSnap.data();
    console.log(`📋 Found club: ${data.organization?.name}`);
    
    if (!data.organization || !data.organization.members) {
      console.error('❌ No organization data found!');
      process.exit(1);
    }
    
    console.log(`👥 Current organization.members count: ${data.organization.members.length}`);
    
    // Analyze current data structure
    const currentMembers = data.organization.members;
    const authUsers = []; // AppUser[] for authentication
    const schedulingMembers = []; // Member[] for scheduling
    
    console.log('\n📊 Analyzing current data...');
    
    currentMembers.forEach((member, index) => {
      console.log(`${index + 1}. ${member.name} | UID: ${member.uid || 'NULL'} | Role: ${member.role || 'Member'}`);
      
      // Create AppUser entry for authentication
      const appUser = {
        uid: member.uid,
        email: member.email || '',
        name: member.name,
        role: member.role || 'Member'
      };
      
      // Only add to auth users if they have a UID (linked account)
      if (member.uid) {
        authUsers.push(appUser);
        console.log(`   ✅ Added to auth users: ${member.name}`);
      }
      
      // Create Member entry for scheduling (exclude club admin)
      if (member.uid !== clubOwnerId && 
          !member.name.includes(data.organization.name)) {
        
        const schedulingMember = {
          id: member.id || `member-${Date.now()}-${index}`,
          name: member.name,
          status: member.status || 'Active',
          isToastmaster: member.isToastmaster || false,
          isTableTopicsMaster: member.isTableTopicsMaster || false,
          isGeneralEvaluator: member.isGeneralEvaluator || false,
          isPastPresident: member.isPastPresident || false,
          uid: member.uid || null,
          joinedDate: member.joinedDate || new Date().toISOString()
        };
        
        schedulingMembers.push(schedulingMember);
        console.log(`   ✅ Added to scheduling members: ${member.name}`);
      } else {
        console.log(`   🚫 Excluded from scheduling (club admin): ${member.name}`);
      }
    });
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`   Auth Users (organization.members): ${authUsers.length}`);
    console.log(`   Scheduling Members (members): ${schedulingMembers.length}`);
    
    // Prepare the update
    const updates = {
      'organization.members': authUsers, // AppUser[] for auth/permissions
      'members': schedulingMembers       // Member[] for scheduling
    };
    
    console.log('\n🔄 Applying migration...');
    
    // Apply the migration
    await updateDoc(docRef, updates);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Final Structure:');
    console.log(`   organization.members (auth): ${authUsers.length} users`);
    console.log(`   members (scheduling): ${schedulingMembers.length} members`);
    
    console.log('\n🎯 Benefits:');
    console.log('   ✅ Club admin removed from scheduling');
    console.log('   ✅ Clean separation of auth vs scheduling data');
    console.log('   ✅ Proper data types for each use case');
    console.log('   ✅ No more filtering needed in UI code');
    
    console.log('\n⚠️  Next Steps:');
    console.log('   1. Refresh your app to see the changes');
    console.log('   2. Test that club admin no longer appears in scheduling');
    console.log('   3. Verify all member management still works');
    console.log('   4. Update code to use new structure (optional)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateDataStructure().then(() => {
  console.log('\n🎉 Migration script completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
