#!/usr/bin/env node

/**
 * Database Usage Analysis Script
 * 
 * This script analyzes how much space different collections are taking up
 * and shows the distribution of statuses, ages, etc.
 */

import { db } from '../services/firebase.js';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDocumentSize(docData) {
    // Rough estimation of Firestore document size
    // Each field has overhead, strings are UTF-8 encoded
    let size = 32; // Base document overhead
    
    function calculateFieldSize(value, fieldName) {
        size += fieldName.length + 8; // Field name + overhead
        
        if (typeof value === 'string') {
            size += value.length * 3; // UTF-8 worst case
        } else if (typeof value === 'number') {
            size += 8;
        } else if (typeof value === 'boolean') {
            size += 1;
        } else if (value && value.toDate) {
            size += 8; // Timestamp
        } else if (typeof value === 'object' && value !== null) {
            size += JSON.stringify(value).length * 3;
        }
    }
    
    for (const [fieldName, fieldValue] of Object.entries(docData)) {
        calculateFieldSize(fieldValue, fieldName);
    }
    
    return size;
}

async function analyzeCollection(collectionName) {
    console.log(`\n📊 Analyzing ${collectionName} collection...`);
    
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        
        if (snapshot.empty) {
            console.log(`✅ Collection ${collectionName} is empty`);
            return {
                name: collectionName,
                count: 0,
                totalSize: 0,
                avgSize: 0,
                statuses: {},
                ageDistribution: {}
            };
        }
        
        let totalSize = 0;
        const statuses = {};
        const ageDistribution = {
            'Last 7 days': 0,
            '7-30 days': 0,
            '30-90 days': 0,
            'Over 90 days': 0
        };
        
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const docSize = getDocumentSize(data);
            totalSize += docSize;
            
            // Track statuses
            const status = data.status || data.isDismissed || data.isRead || 'unknown';
            statuses[status] = (statuses[status] || 0) + 1;
            
            // Track age distribution
            const createdAt = data.createdAt?.toDate() || data.sentAt?.toDate() || data.dismissedAt?.toDate();
            if (createdAt) {
                if (createdAt > sevenDaysAgo) {
                    ageDistribution['Last 7 days']++;
                } else if (createdAt > thirtyDaysAgo) {
                    ageDistribution['7-30 days']++;
                } else if (createdAt > ninetyDaysAgo) {
                    ageDistribution['30-90 days']++;
                } else {
                    ageDistribution['Over 90 days']++;
                }
            }
        });
        
        const avgSize = totalSize / snapshot.size;
        
        console.log(`📁 Collection: ${collectionName}`);
        console.log(`📊 Documents: ${snapshot.size.toLocaleString()}`);
        console.log(`💾 Total Size: ${formatBytes(totalSize)}`);
        console.log(`📏 Avg Doc Size: ${formatBytes(avgSize)}`);
        
        console.log(`\n📈 Status Distribution:`);
        Object.entries(statuses).forEach(([status, count]) => {
            const percentage = ((count / snapshot.size) * 100).toFixed(1);
            console.log(`   ${status}: ${count} (${percentage}%)`);
        });
        
        console.log(`\n⏰ Age Distribution:`);
        Object.entries(ageDistribution).forEach(([range, count]) => {
            const percentage = ((count / snapshot.size) * 100).toFixed(1);
            console.log(`   ${range}: ${count} (${percentage}%)`);
        });
        
        // Show cleanup potential
        const cleanupCandidates = ageDistribution['30-90 days'] + ageDistribution['Over 90 days'];
        if (cleanupCandidates > 0) {
            const cleanupSize = (cleanupCandidates * avgSize);
            console.log(`\n🧹 Cleanup Potential (>30 days): ${cleanupCandidates} docs (${formatBytes(cleanupSize)})`);
        }
        
        return {
            name: collectionName,
            count: snapshot.size,
            totalSize,
            avgSize,
            statuses,
            ageDistribution,
            cleanupCandidates
        };
        
    } catch (error) {
        console.error(`❌ Error analyzing ${collectionName}:`, error);
        return {
            name: collectionName,
            count: 0,
            totalSize: 0,
            error: error.message
        };
    }
}

async function analyzeDatabase() {
    console.log('🔍 Starting Database Usage Analysis...');
    console.log('📅 Analysis Date:', new Date().toISOString());
    console.log('');
    
    const collections = ['notifications', 'mail', 'invitations', 'publicSchedules'];
    const results = [];
    
    for (const collectionName of collections) {
        const result = await analyzeCollection(collectionName);
        results.push(result);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    
    const totalDocs = results.reduce((sum, r) => sum + r.count, 0);
    const totalSize = results.reduce((sum, r) => sum + r.totalSize, 0);
    const totalCleanupCandidates = results.reduce((sum, r) => sum + (r.cleanupCandidates || 0), 0);
    const cleanupSize = results.reduce((sum, r) => sum + ((r.cleanupCandidates || 0) * r.avgSize), 0);
    
    console.log(`📊 Total Documents: ${totalDocs.toLocaleString()}`);
    console.log(`💾 Total Estimated Size: ${formatBytes(totalSize)}`);
    console.log(`🧹 Cleanup Candidates (>30 days): ${totalCleanupCandidates.toLocaleString()}`);
    console.log(`💸 Potential Storage Savings: ${formatBytes(cleanupSize)}`);
    
    // Recommendations
    console.log('\n📝 RECOMMENDATIONS:');
    
    if (totalCleanupCandidates > 100) {
        console.log(`⚠️  You have ${totalCleanupCandidates} old documents that could be cleaned up`);
        console.log(`💡 Run: node scripts/cleanup-database.js`);
    } else {
        console.log(`✅ Database is relatively clean (only ${totalCleanupCandidates} old documents)`);
    }
    
    if (totalSize > 10 * 1024 * 1024) { // 10MB
        console.log(`📈 Database is growing large (${formatBytes(totalSize)})`);
        console.log(`💡 Consider setting up automated daily cleanup`);
    } else {
        console.log(`✅ Database size is manageable (${formatBytes(totalSize)})`);
    }
    
    // Collection-specific recommendations
    results.forEach(result => {
        if (result.count > 1000) {
            console.log(`⚠️  ${result.name}: High document count (${result.count.toLocaleString()})`);
        }
    });
    
    console.log('\n🚀 To set up automated cleanup, deploy Firebase Functions:');
    console.log('   cd functions && firebase deploy --only functions');
}

// Run the analysis if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    analyzeDatabase()
        .then(() => {
            console.log('\n✅ Database analysis completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Analysis failed:', error);
            process.exit(1);
        });
}

export { analyzeDatabase, analyzeCollection };
