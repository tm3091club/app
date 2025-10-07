// Firebase Functions for processing email queue
// This file should be deployed to Firebase Functions to handle email sending

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Email service configuration
// You can use SendGrid, Nodemailer with Gmail, or any other email service
const SENDGRID_API_KEY = functions.config().sendgrid?.api_key;
const sgMail = require('@sendgrid/mail');

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Process email queue - triggered when new emails are added
 */
exports.processEmailQueue = functions.firestore
  .document('emailQueue/{emailId}')
  .onCreate(async (snap, context) => {
    const emailData = snap.data();
    const emailId = context.params.emailId;

    try {
      console.log(`Processing email: ${emailId}`, emailData);

      // Prepare email message
      const msg = {
        to: emailData.to,
        from: emailData.from || 'noreply@toastmasters-scheduler.app',
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      };

      if (SENDGRID_API_KEY) {
        // Send via SendGrid
        await sgMail.send(msg);
        console.log(`Email sent successfully: ${emailId}`);
        
        // Update email status
        await snap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.log('SendGrid not configured - email would be sent:', msg);
        
        // For development/testing - just mark as sent
        await snap.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          note: 'SendGrid not configured - email simulation',
        });
      }

    } catch (error) {
      console.error(`Error sending email ${emailId}:`, error);
      
      // Update email with error status
      await snap.ref.update({
        status: 'failed',
        error: error.message,
        attempts: (emailData.attempts || 0) + 1,
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Retry logic could be added here
    }
  });

/**
 * Retry failed emails (optional - can be triggered manually or on schedule)
 */
exports.retryFailedEmails = functions.https.onRequest(async (req, res) => {
  try {
    const failedEmails = await db.collection('emailQueue')
      .where('status', '==', 'failed')
      .where('attempts', '<', 3)
      .get();

    console.log(`Found ${failedEmails.size} failed emails to retry`);

    const promises = failedEmails.docs.map(async (doc) => {
      const emailData = doc.data();
      
      try {
        const msg = {
          to: emailData.to,
          from: emailData.from || 'noreply@toastmasters-scheduler.app',
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
        };

        if (SENDGRID_API_KEY) {
          await sgMail.send(msg);
          
          await doc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log(`Retry successful for email: ${doc.id}`);
        }
      } catch (error) {
        console.error(`Retry failed for email ${doc.id}:`, error);
        
        await doc.ref.update({
          attempts: (emailData.attempts || 0) + 1,
          lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          error: error.message,
        });
      }
    });

    await Promise.all(promises);
    
    res.json({ 
      success: true, 
      message: `Processed ${failedEmails.size} failed emails` 
    });
  } catch (error) {
    console.error('Error retrying failed emails:', error);
    res.status(500).json({ 
      error: 'Failed to retry emails', 
      details: error.message 
    });
  }
});

/**
 * Health check endpoint
 */
exports.emailHealthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    sendgridConfigured: !!SENDGRID_API_KEY,
  });
});

/**
 * Clean up old data from the database (notifications older than 30 days)
 * This function can be triggered manually or scheduled to run daily
 */
exports.cleanupOldData = functions.https.onRequest(async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let totalDeleted = 0;
    
    // 1. Clean up old notifications (older than 30 days) - ALL statuses
    console.log('🧹 Starting notifications cleanup...');
    const oldNotificationsQuery = await db.collection('notifications')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    if (!oldNotificationsQuery.empty) {
      const statusCounts = {};
      oldNotificationsQuery.docs.forEach(doc => {
        const data = doc.data();
        const status = data.isRead ? 'read' : 'unread';
        const dismissed = data.isDismissed ? 'dismissed' : 'active';
        const key = `${status}_${dismissed}`;
        statusCounts[key] = (statusCounts[key] || 0) + 1;
      });
      
      const batch = db.batch();
      oldNotificationsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      totalDeleted += oldNotificationsQuery.size;
      console.log(`✅ Deleted ${oldNotificationsQuery.size} old notifications:`, statusCounts);
    }
    
    // 2. Clean up old email queue items (older than 30 days) - ALL statuses
    console.log('🧹 Starting email queue cleanup...');
    const oldEmailsQuery = await db.collection('mail')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    if (!oldEmailsQuery.empty) {
      const statusCounts = {};
      oldEmailsQuery.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const batch = db.batch();
      oldEmailsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      totalDeleted += oldEmailsQuery.size;
      console.log(`✅ Deleted ${oldEmailsQuery.size} old email records:`, statusCounts);
    }
    
    // 3. Clean up old public schedules (older than 90 days) - more conservative
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    console.log('🧹 Starting old public schedules cleanup...');
    const oldSchedulesQuery = await db.collection('publicSchedules')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
      .get();
    
    if (!oldSchedulesQuery.empty) {
      const batch = db.batch();
      oldSchedulesQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      totalDeleted += oldSchedulesQuery.size;
      console.log(`✅ Deleted ${oldSchedulesQuery.size} old public schedules`);
    }
    
    // 4. Clean up expired invitations (older than 7 days) - ALL statuses
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log('🧹 Starting expired invitations cleanup...');
    const expiredInvitationsQuery = await db.collection('invitations')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();
    
    if (!expiredInvitationsQuery.empty) {
      const statusCounts = {};
      expiredInvitationsQuery.docs.forEach(doc => {
        const data = doc.data();
        const status = data.isUsed ? 'used' : 'pending';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const batch = db.batch();
      expiredInvitationsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      totalDeleted += expiredInvitationsQuery.size;
      console.log(`✅ Deleted ${expiredInvitationsQuery.size} expired invitations:`, statusCounts);
    }
    
    console.log(`🎉 Cleanup completed! Total items deleted: ${totalDeleted}`);
    
    res.json({
      success: true,
      message: `Database cleanup completed successfully`,
      details: {
        totalDeleted,
        cleanupDate: new Date().toISOString(),
        thresholds: {
          notifications: '30 days',
          emailQueue: '30 days',
          publicSchedules: '90 days',
          invitations: '7 days'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      error: 'Database cleanup failed',
      details: error.message
    });
  }
});

/**
 * Custom password reset function - sends branded emails via Firebase email extension
 */
exports.sendCustomPasswordReset = functions.https.onCall(async (data, context) => {
  const { email } = data;
  
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }
  
  try {
    // Generate password reset link using Firebase Admin
    const actionCodeSettings = {
      url: 'https://tmapp.club/#/reset-password',
      handleCodeInApp: false,
    };
    
    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    
    // Send via Firebase email extension (writes to 'mail' collection)
    await db.collection('mail').add({
      to: [email],
      from: 'tmprofessionallyspeaking@gmail.com',
      replyTo: 'tmprofessionallyspeaking@gmail.com',
      message: {
        subject: 'Reset Your Toastmasters App Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://www.toastmasters.org/content/images/globals/toastmasters-logo@2x.png" 
                   alt="Toastmasters International" style="height: 60px;">
            </div>
            <h2 style="color: #004165; text-align: center;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You requested to reset your password for the <strong>Toastmasters Monthly Scheduler</strong> app.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #004165; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666; text-align: center;">
              Toastmasters Monthly Scheduler<br>
              <a href="https://tmapp.club" style="color: #004165;">tmapp.club</a>
            </p>
          </div>
        `
      }
    });
    
    console.log(`Custom password reset email queued for: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending custom password reset:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send password reset email');
  }
});

/**
 * Scheduled cleanup function (runs daily at 2 AM UTC)
 * To enable this, deploy the function and create a Cloud Scheduler job
 */
exports.scheduledCleanup = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🕐 Running scheduled database cleanup...');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let totalDeleted = 0;
      
      // Clean up old notifications
      const oldNotificationsQuery = await db.collection('notifications')
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();
      
      if (!oldNotificationsQuery.empty) {
        const batch = db.batch();
        oldNotificationsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += oldNotificationsQuery.size;
      }
      
      // Clean up old email records
      const oldEmailsQuery = await db.collection('mail')
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();
      
      if (!oldEmailsQuery.empty) {
        const batch = db.batch();
        oldEmailsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += oldEmailsQuery.size;
      }
      
      console.log(`✅ Scheduled cleanup completed. Deleted ${totalDeleted} old records.`);
      return null;
      
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
      throw error;
    }
  });
