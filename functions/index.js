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
 * Generate themes using Gemini AI
 */
exports.generateThemes = functions.https.onCall(async (data, context) => {
  try {
    // Get the Gemini API key from Firebase config
    const GEMINI_API_KEY = functions.config().gemini?.api_key;
    
    if (!GEMINI_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
    }

    const { GoogleGenAI, Type } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const { month, year, previousThemes, numThemes } = data;

    // Validate input
    if (!month || !year || !numThemes) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: month, year, numThemes');
    }

    // Helper functions
    function normalizeThemeList(list) {
      return [...new Set(list.flatMap(s => s.split(/[\,\t\n/]+/g)).map(s => s.trim()).filter(Boolean))];
    }

    function buildPrompt(opts) {
      const { numThemes, month, year, inspiration } = opts;
      return `
You are a master wordsmith and creative strategist for Toastmasters International.
Specialty: crafting Table Topics themes that ignite fascinating impromptu speeches.

Generate exactly ${numThemes} exceptional, unique meeting themes for ${month} ${year}.

— Mandatory Quality Bar —
1) Question-Rich: each theme should naturally spark at least 5 different question types
   (personal story, hypothetical, opinion, advice, creative interpretation).
2) Verb-Driven or Strong Metaphor: active, energetic, or layered.
3) Concise: 1–3 words. Title Case. No emojis. No filler words.
4) Universally Relatable.
5) Keep it fresh: do not reuse any title from the Inspiration Bank below verbatim.

Seasonal notes: You MAY use seasonal or cultural words if they serve the idea,
but keep the wording crisp and not on-the-nose. Avoid long phrases.

— Inspiration Bank (do NOT copy these titles verbatim; build on the *energy* instead) —
${inspiration.map(t => `- ${t}`).join("\n")}

Return ONLY valid JSON: { "themes": string[] }.
Each string must be 1–3 words in Title Case.
`;
    }

    const prior = normalizeThemeList(previousThemes || []);
    const prompt = buildPrompt({ numThemes, month, year, inspiration: prior });

    console.log(`Generating ${numThemes} themes for ${month} ${year}...`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: {
              type: Type.ARRAY,
              description: `An array of ${numThemes} short, evocative, question-rich themes (1–3 words each).`,
              items: {
                type: Type.STRING,
                description: "A single, 1–3 word, Title Case, verb-driven theme or strong metaphor."
              }
            }
          },
          required: ["themes"]
        }
      },
      generationConfig: {
        temperature: 0.85,
        topK: 32,
        topP: 0.95
      }
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    if (result.themes && Array.isArray(result.themes)) {
      console.log(`Successfully generated ${result.themes.length} themes:`, result.themes);
      return { themes: result.themes };
    } else {
      throw new functions.https.HttpsError('internal', 'Invalid response format from Gemini API');
    }

  } catch (error) {
    console.error('Error generating themes:', error);
    
    if (error.message && error.message.toLowerCase().includes('api key')) {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid or missing Gemini API key');
    }
    
    throw new functions.https.HttpsError('internal', `Theme generation failed: ${error.message}`);
  }
});