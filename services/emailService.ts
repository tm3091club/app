import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface EmailRequest {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  headers?: Record<string, string>;
}

export interface AvailabilityEmailData {
  clubName: string;
  month: string;
  year: number;
  meetingDay: string;
  recipientName: string;
  appUrl: string;
  recipientEmail?: string; // For unsubscribe link
  clubId?: string; // For unsubscribe link
}

class EmailService {
  // Queue email for sending via Firebase Extension
  private async queueEmail(emailData: EmailRequest): Promise<void> {
    try {
      // Use the 'mail' collection that your Firebase Extension monitors
      await addDoc(collection(db, 'mail'), {
        to: emailData.to,
        message: {
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        },
        // Add headers for better deliverability, especially for iCloud Mail
        headers: {
          'List-Unsubscribe': `<mailto:unsubscribe@toastmasters-scheduler.app?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Precedence': 'bulk',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
          'X-Mailer': 'Toastmasters Monthly Scheduler',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@toastmasters-scheduler.app>`,
          'Date': new Date().toUTCString(),
          'MIME-Version': '1.0',
          'Content-Type': 'text/html; charset=UTF-8',
          ...emailData.headers
        },
        // The extension will use the default FROM address you configured
      });
      console.log('Email queued successfully via Firebase Extension');
    } catch (error) {
      console.error('Error queuing email:', error);
      throw error;
    }
  }

  // Generate unsubscribe link
  private generateUnsubscribeLink(email: string, clubId: string = 'default'): string {
    return `${window.location.origin}/unsubscribe?email=${encodeURIComponent(email)}&club=${clubId}`;
  }

  // Generate availability request email template
  private generateAvailabilityEmail(data: AvailabilityEmailData): { html: string; text: string } {
    const unsubscribeLink = data.recipientEmail && data.clubId 
      ? this.generateUnsubscribeLink(data.recipientEmail, data.clubId)
      : `${window.location.origin}/unsubscribe`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.clubName} - Meeting Schedule Update</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            text-align: center; 
            padding: 30px 20px;
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600;
          }
          .header p { 
            margin: 10px 0 0 0; 
            opacity: 0.9;
            font-size: 16px;
          }
          .content { 
            padding: 40px 30px; 
            background-color: #ffffff;
          }
          .greeting {
            font-size: 18px;
            color: #2d3748;
            margin-bottom: 20px;
          }
          .main-content {
            background-color: #f7fafc;
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #4299e1;
            margin: 20px 0;
          }
          .cta-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #ebf8ff;
            border-radius: 8px;
          }
          .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white !important; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(66, 153, 225, 0.3);
            transition: all 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(66, 153, 225, 0.4);
          }
          .benefits {
            background-color: #f0fff4;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .benefits h3 {
            color: #2f855a;
            margin-top: 0;
            font-size: 16px;
          }
          .benefits ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .benefits li {
            margin: 8px 0;
            color: #4a5568;
          }
          .footer { 
            text-align: center; 
            color: #718096; 
            font-size: 14px; 
            padding: 30px;
            background-color: #f7fafc;
            border-top: 1px solid #e2e8f0;
          }
          .unsubscribe { 
            text-align: center; 
            color: #a0aec0; 
            font-size: 12px; 
            padding: 20px 30px;
            background-color: #f7fafc;
            border-top: 1px solid #e2e8f0;
          }
          .unsubscribe a { 
            color: #718096; 
            text-decoration: underline; 
          }
          .club-info {
            background-color: #fff5f5;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 3px solid #f56565;
          }
          @media only screen and (max-width: 600px) {
            .content { padding: 20px; }
            .header { padding: 20px 15px; }
            .header h1 { font-size: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.clubName}</h1>
            <p>Meeting Schedule Update - ${data.month} ${data.year}</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hello ${data.recipientName},
            </div>
            
            <p>I hope this message finds you well. As we prepare for our ${data.month} ${data.year} meetings, we need your input to ensure everyone has the opportunity to participate in roles that work with their schedule.</p>
            
            <div class="main-content">
              <p><strong>Meeting Information:</strong></p>
              <ul>
                <li><strong>Meeting Day:</strong> ${data.meetingDay}s</li>
                <li><strong>Planning Period:</strong> ${data.month} ${data.year}</li>
                <li><strong>Purpose:</strong> Schedule coordination and role assignment</li>
              </ul>
            </div>
            
            <div class="cta-section">
              <p><strong>Please update your availability:</strong></p>
              <a href="${data.appUrl}" class="cta-button">
                Update My Schedule
              </a>
              <p style="margin-top: 15px; font-size: 14px; color: #718096;">
                This will help us plan meetings that work for everyone.
              </p>
            </div>
            
            <div class="benefits">
              <h3>Why Your Input Matters:</h3>
              <ul>
                <li>Ensures role assignments align with your availability</li>
                <li>Helps create balanced meeting schedules</li>
                <li>Reduces last-minute conflicts and changes</li>
                <li>Improves overall meeting experience for all members</li>
              </ul>
            </div>
            
            <div class="club-info">
              <p><strong>Need Help?</strong></p>
              <p>If you have any questions or need assistance, please contact your club officers or VPE directly. We're here to help make this process as smooth as possible.</p>
            </div>
            
            <p>Thank you for your participation in making our club meetings successful!</p>
            
            <p>Best regards,<br>
            <strong>${data.clubName} Leadership Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This is an official communication from ${data.clubName}.</p>
            <p>© ${data.year} ${data.clubName} - Toastmasters International</p>
          </div>
          
          <div class="unsubscribe">
            <p>If you no longer wish to receive these communications, you can 
              <a href="${unsubscribeLink}">unsubscribe here</a>.
            </p>
            ${data.recipientEmail ? `<p>This message was sent to ${data.recipientEmail}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${data.clubName} - Meeting Schedule Update for ${data.month} ${data.year}

Hello ${data.recipientName},

I hope this message finds you well. As we prepare for our ${data.month} ${data.year} meetings, we need your input to ensure everyone has the opportunity to participate in roles that work with their schedule.

MEETING INFORMATION:
- Meeting Day: ${data.meetingDay}s
- Planning Period: ${data.month} ${data.year}
- Purpose: Schedule coordination and role assignment

Please update your availability at: ${data.appUrl}

This will help us plan meetings that work for everyone.

WHY YOUR INPUT MATTERS:
- Ensures role assignments align with your availability
- Helps create balanced meeting schedules
- Reduces last-minute conflicts and changes
- Improves overall meeting experience for all members

Need Help?
If you have any questions or need assistance, please contact your club officers or VPE directly. We're here to help make this process as smooth as possible.

Thank you for your participation in making our club meetings successful!

Best regards,
${data.clubName} Leadership Team

---
This is an official communication from ${data.clubName}.
© ${data.year} ${data.clubName} - Toastmasters International

To unsubscribe from these communications, visit: ${unsubscribeLink}
${data.recipientEmail ? `This message was sent to ${data.recipientEmail}` : ''}
    `;

    return { html, text };
  }

  // Send availability request emails to team members
  async sendAvailabilityRequest(
    recipients: Array<{ email: string; name: string }>,
    clubName: string,
    month: string,
    year: number,
    meetingDay: string,
    clubId?: string
  ): Promise<void> {
    try {
      // Get current app URL
      const appUrl = window.location.origin;
      
      // Group recipients by email for batch sending
      const emailAddresses = recipients.map(r => r.email);
      
      // Use the first recipient's name for the template (we'll personalize this later)
      const emailData = this.generateAvailabilityEmail({
        clubName,
        month,
        year,
        meetingDay,
        recipientName: 'Team Member', // Generic greeting for batch emails
        appUrl,
        recipientEmail: emailAddresses[0], // Pass first email for unsubscribe link
        clubId: clubId || 'default'
      });

      const emailRequest: EmailRequest = {
        to: emailAddresses,
        subject: `${data.clubName} - Meeting Schedule Update for ${data.month} ${data.year}`,
        html: emailData.html,
        text: emailData.text,
        from: `${data.clubName} <noreply@toastmasters-scheduler.app>`,
        headers: {
          'X-Club-Name': data.clubName,
          'X-Email-Type': 'meeting-schedule',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        }
      };

      await this.queueEmail(emailRequest);
      console.log(`Availability request emails queued for ${recipients.length} recipients`);
    } catch (error) {
      console.error('Error sending availability request emails:', error);
      throw error;
    }
  }

  // Send individual personalized availability request
  async sendPersonalizedAvailabilityRequest(
    recipient: { email: string; name: string },
    clubName: string,
    month: string,
    year: number,
    meetingDay: string,
    clubId?: string
  ): Promise<void> {
    try {
      const appUrl = window.location.origin;
      
      const emailData = this.generateAvailabilityEmail({
        clubName,
        month,
        year,
        meetingDay,
        recipientName: recipient.name,
        appUrl,
        recipientEmail: recipient.email,
        clubId: clubId || 'default'
      });

      const emailRequest: EmailRequest = {
        to: [recipient.email],
        subject: `${data.clubName} - Meeting Schedule Update for ${data.month} ${data.year}`,
        html: emailData.html,
        text: emailData.text,
        from: `${data.clubName} <noreply@toastmasters-scheduler.app>`,
        headers: {
          'X-Club-Name': data.clubName,
          'X-Email-Type': 'meeting-schedule',
          'X-Recipient-Name': recipient.name,
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        }
      };

      await this.queueEmail(emailRequest);
      console.log(`Personalized availability request email queued for ${recipient.name}`);
    } catch (error) {
      console.error('Error sending personalized availability request email:', error);
      throw error;
    }
  }

  // Test method to verify email extension is working
  async testEmailExtension(testEmail: string): Promise<void> {
    try {
      const testEmailRequest: EmailRequest = {
        to: [testEmail],
        subject: 'Toastmasters Club - Email System Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2d3748;">Email System Test</h2>
            <p>This is a test email to verify that the Toastmasters club email system is working correctly.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Email Extension: Active</li>
              <li>Delivery System: Functional</li>
              <li>Timestamp: ${new Date().toLocaleString()}</li>
            </ul>
            <p>If you receive this email, the system is working properly!</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #718096;">
              This is a test message from the Toastmasters club scheduling system.
            </p>
          </div>
        `,
        text: `Email System Test\n\nThis is a test email to verify that the Toastmasters club email system is working correctly.\n\nTest Details:\n- Email Extension: Active\n- Delivery System: Functional\n- Timestamp: ${new Date().toLocaleString()}\n\nIf you receive this email, the system is working properly!\n\n---\nThis is a test message from the Toastmasters club scheduling system.`,
        from: 'Toastmasters Club <noreply@toastmasters-scheduler.app>',
        headers: {
          'X-Email-Type': 'system-test',
          'X-Test-Timestamp': new Date().toISOString(),
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal'
        }
      };

      await this.queueEmail(testEmailRequest);
      console.log('Test email queued successfully');
    } catch (error) {
      console.error('Error sending test email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
