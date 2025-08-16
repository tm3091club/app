#!/usr/bin/env node

/**
 * Quick Database Usage Check
 * 
 * Shows a summary of collection sizes and cleanup potential
 */

import { db } from '../services/firebase.js';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

async function quickCheck() {
    console.log('🔍 Quick Database Usage Check');
    console.log('📅', new Date().toISOString());
    console.log('');
    
    const collections = ['notifications', 'mail', 'invitations', 'publicSchedules'];
    const results = [];
    
    for (const collectionName of collections) {
        try {
            console.log(`📊 Checking ${collectionName}...`);
            
            const snapshot = await getDocs(collection(db, collectionName));
            
            if (snapshot.empty) {
                console.log(`   ✅ Empty collection\n`);
                continue;
            }
            
            // Count by age
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            let recentCount = 0;
            let oldCount = 0;
            let veryOldCount = 0;
            const statuses = {};
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate() || data.sentAt?.toDate();
                
                if (createdAt) {
                    if (createdAt > sevenDaysAgo) {
                        recentCount++;
                    } else if (createdAt > thirtyDaysAgo) {
                        oldCount++;
                    } else {
                        veryOldCount++;
                    }
                }
                
                // Track statuses
                let status = 'unknown';
                if (collectionName === 'notifications') {
                    status = data.isRead ? (data.isDismissed ? 'read_dismissed' : 'read_active') 
                                        : (data.isDismissed ? 'unread_dismissed' : 'unread_active');
                } else if (collectionName === 'mail') {
                    status = data.status || 'pending';
                } else if (collectionName === 'invitations') {
                    status = data.isUsed ? 'used' : 'pending';
                } else {
                    status = 'active';
                }
                statuses[status] = (statuses[status] || 0) + 1;
            });
            
            console.log(`   📊 Total: ${snapshot.size.toLocaleString()}`);
            console.log(`   🆕 Recent (< 7 days): ${recentCount}`);
            console.log(`   📅 Old (7-30 days): ${oldCount}`);
            console.log(`   ⚠️  Very Old (> 30 days): ${veryOldCount}`);
            console.log(`   📈 Status breakdown:`, statuses);
            
            // Show cleanup potential
            const cleanupThreshold = collectionName === 'invitations' ? 7 : 30;
            const cleanupCandidates = collectionName === 'invitations' ? (oldCount + veryOldCount) : veryOldCount;
            
            if (cleanupCandidates > 0) {
                console.log(`   🧹 Can clean up: ${cleanupCandidates} docs (older than ${cleanupThreshold} days)`);
            } else {
                console.log(`   ✅ No cleanup needed`);
            }
            
            console.log('');
            
            results.push({
                collection: collectionName,
                total: snapshot.size,
                cleanupCandidates,
                cleanupThreshold
            });
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
        }
    }
    
    // Summary
    const totalDocs = results.reduce((sum, r) => sum + r.total, 0);
    const totalCleanup = results.reduce((sum, r) => sum + r.cleanupCandidates, 0);
    
    console.log('🏁 SUMMARY');
    console.log(`📊 Total documents: ${totalDocs.toLocaleString()}`);
    console.log(`🧹 Can clean up: ${totalCleanup.toLocaleString()} documents`);
    
    if (totalCleanup > 0) {
        console.log('');
        console.log('💡 To clean up old data, run:');
        console.log('   node scripts/cleanup-database.js');
        console.log('');
        console.log('🤖 Or set up automatic cleanup:');
        console.log('   cd functions && firebase deploy --only functions');
    } else {
        console.log('✅ Database is clean!');
    }
}

// Run check
quickCheck().catch(console.error);
