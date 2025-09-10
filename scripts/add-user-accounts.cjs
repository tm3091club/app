const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'toastmasters-monthly-schedule'
    });
}

const db = admin.firestore();

// Sample user accounts to add for linking
const sampleUsers = [
    { uid: 'user001', name: 'John Smith', email: 'john.smith@example.com' },
    { uid: 'user002', name: 'Sarah Johnson', email: 'sarah.johnson@example.com' },
    { uid: 'user003', name: 'Mike Wilson', email: 'mike.wilson@example.com' },
    { uid: 'user004', name: 'Emily Davis', email: 'emily.davis@example.com' },
    { uid: 'user005', name: 'David Brown', email: 'david.brown@example.com' },
    { uid: 'user006', name: 'Lisa Garcia', email: 'lisa.garcia@example.com' },
    { uid: 'user007', name: 'James Miller', email: 'james.miller@example.com' },
    { uid: 'user008', name: 'Jennifer Taylor', email: 'jennifer.taylor@example.com' },
    { uid: 'user009', name: 'Robert Anderson', email: 'robert.anderson@example.com' },
    { uid: 'user010', name: 'Amanda Thomas', email: 'amanda.thomas@example.com' }
];

async function addUserAccounts() {
    console.log('🔧 Adding sample user accounts for linking...');
    
    try {
        // Add user documents to Firestore
        for (const user of sampleUsers) {
            const userDoc = {
                email: user.email,
                name: user.name,
                uid: user.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                // This is a pointer document - points to the club owner's data
                ownerId: 'o4QyZGSS88gc3p9qaLdqelFrg4B2' // Club owner's UID
            };
            
            await db.collection('users').doc(user.uid).set(userDoc);
            console.log(`✅ Added user: ${user.name} (${user.email})`);
        }
        
        console.log(`\n🎉 Successfully added ${sampleUsers.length} user accounts!`);
        console.log('📝 These users can now be linked to member profiles in the app.');
        
    } catch (error) {
        console.error('❌ Error adding user accounts:', error);
    }
}

addUserAccounts().then(() => {
    console.log('✨ Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
