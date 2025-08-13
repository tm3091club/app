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
