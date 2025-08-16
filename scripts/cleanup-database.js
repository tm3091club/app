#!/usr/bin/env node

/**
 * Manual Database Cleanup Script
 * 
 * This script manually triggers the database cleanup function.
 * It can be run locally or used to test the cleanup before setting up automation.
 */

import { db } from '../services/firebase.js';
import { collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

const CLEANUP_THRESHOLDS = {
  notifications: 30,    // days
  emailQueue: 30,       // days  
  publicSchedules: 90,  // days (more conservative)
  invitations: 7        // days
};

async function cleanupCollection(collectionName, daysThreshold, dateField = 'createdAt') {
  console.log(`🧹 Cleaning up ${collectionName} older than ${daysThreshold} days...`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  
  const q = query(
    collection(db, collectionName),
    where(dateField, '<', Timestamp.fromDate(cutoffDate))
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    console.log(`✅ No old ${collectionName} found to clean up`);
    return 0;
  }
  
  // Analyze statuses before deletion
  const statusCounts = {};
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    let status = 'unknown';
    
    if (collectionName === 'notifications') {
      const isRead = data.isRead ? 'read' : 'unread';
      const isDismissed = data.isDismissed ? 'dismissed' : 'active';
      status = `${isRead}_${isDismissed}`;
    } else if (collectionName === 'mail') {
      status = data.status || 'unknown';
    } else if (collectionName === 'invitations') {
      status = data.isUsed ? 'used' : 'pending';
    } else {
      status = data.status || 'active';
    }
    
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  console.log(`📊 Status breakdown:`, statusCounts);
  
  // Delete in batches (Firestore limit is 500 operations per batch)
  const batchSize = 500;
  let totalDeleted = 0;
  
  for (let i = 0; i < querySnapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchDocs = querySnapshot.docs.slice(i, i + batchSize);
    
    batchDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    totalDeleted += batchDocs.length;
    
    console.log(`📦 Deleted batch of ${batchDocs.length} ${collectionName} (${totalDeleted}/${querySnapshot.docs.length})`);
  }
  
  console.log(`✅ Cleaned up ${totalDeleted} old ${collectionName} records`);
  return totalDeleted;
}

async function runCleanup() {
  console.log('🚀 Starting manual database cleanup...');
  console.log('⏰ Cleanup date:', new Date().toISOString());
  console.log('🎯 Thresholds:', CLEANUP_THRESHOLDS);
  console.log('');
  
  let totalDeleted = 0;
  
  try {
    // 1. Clean up old notifications
    const deletedNotifications = await cleanupCollection('notifications', CLEANUP_THRESHOLDS.notifications);
    totalDeleted += deletedNotifications;
    
    // 2. Clean up old email queue items
    const deletedEmails = await cleanupCollection('mail', CLEANUP_THRESHOLDS.emailQueue);
    totalDeleted += deletedEmails;
    
    // 3. Clean up old public schedules (more conservative)
    const deletedSchedules = await cleanupCollection('publicSchedules', CLEANUP_THRESHOLDS.publicSchedules);
    totalDeleted += deletedSchedules;
    
    // 4. Clean up expired invitations
    const deletedInvitations = await cleanupCollection('invitations', CLEANUP_THRESHOLDS.invitations);
    totalDeleted += deletedInvitations;
    
    console.log('');
    console.log('🎉 Database cleanup completed successfully!');
    console.log(`📊 Total records deleted: ${totalDeleted}`);
    console.log('💾 Storage space freed up!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCleanup()
    .then(() => {
      console.log('✅ Cleanup script finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

export { runCleanup, cleanupCollection };
