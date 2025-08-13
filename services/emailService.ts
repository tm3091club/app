import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface EmailRequest {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface AvailabilityEmailData {
  clubName: string;
  month: string;
  year: number;
  meetingDay: string;
  recipientName: string;
  appUrl: string;
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
        // The extension will use the default FROM address you configured
      });
      console.log('Email queued successfully via Firebase Extension');
    } catch (error) {
      console.error('Error queuing email:', error);
      throw error;
    }
  }

  // Generate availability request email template
  private generateAvailabilityEmail(data: AvailabilityEmailData): { html: string; text: string } {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1f2937; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { 
            display: inline-block; 
            background-color: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
          .highlight { background-color: #dbeafe; padding: 10px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗓️ ${data.clubName}</h1>
            <p>Availability Request for ${data.month} ${data.year}</p>
          </div>
          <div class="content">
            <h2>Hi ${data.recipientName}! 👋</h2>
            
            <p>It's time to update your availability for our upcoming ${data.month} ${data.year} meeting schedule!</p>
            
            <div class="highlight">
              <p><strong>📅 Club Meeting Day:</strong> ${data.meetingDay}s</p>
              <p><strong>📊 Schedule Planning:</strong> We're preparing the ${data.month} schedule and need to know when you're available.</p>
            </div>
            
            <p>Please take a moment to update your availability in our scheduling system:</p>
            
            <div style="text-align: center;">
              <a href="${data.appUrl}" class="cta-button">
                📝 Update My Availability
              </a>
            </div>
            
            <p><strong>Why is this important?</strong></p>
            <ul>
              <li>✅ Helps us assign roles that work with your schedule</li>
              <li>🎯 Ensures better meeting planning and participation</li>
              <li>⏰ Prevents last-minute scheduling conflicts</li>
            </ul>
            
            <p>If you have any questions about the schedule or need help accessing the system, please don't hesitate to reach out to your VPE or club officers.</p>
            
            <p>Thank you for helping us plan successful meetings! 🎉</p>
            
            <p>Best regards,<br>
            <strong>${data.clubName} Leadership Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message from your Toastmasters club's scheduling system.</p>
            <p>© ${data.year} ${data.clubName} - Powered by Toastmasters Monthly Scheduler</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${data.clubName} - Availability Request for ${data.month} ${data.year}

Hi ${data.recipientName}!

It's time to update your availability for our upcoming ${data.month} ${data.year} meeting schedule!

Club Meeting Day: ${data.meetingDay}s
We're preparing the ${data.month} schedule and need to know when you're available.

Please update your availability at: ${data.appUrl}

Why is this important?
- Helps us assign roles that work with your schedule
- Ensures better meeting planning and participation  
- Prevents last-minute scheduling conflicts

If you have any questions, please reach out to your VPE or club officers.

Thank you for helping us plan successful meetings!

Best regards,
${data.clubName} Leadership Team

---
This is an automated message from your Toastmasters club's scheduling system.
© ${data.year} ${data.clubName} - Powered by Toastmasters Monthly Scheduler
    `;

    return { html, text };
  }

  // Send availability request emails to team members
  async sendAvailabilityRequest(
    recipients: Array<{ email: string; name: string }>,
    clubName: string,
    month: string,
    year: number,
    meetingDay: string
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
        appUrl
      });

      const emailRequest: EmailRequest = {
        to: emailAddresses,
        subject: `📅 ${clubName} - Please Update Your Availability for ${month} ${year}`,
        html: emailData.html,
        text: emailData.text,
        from: `${clubName} <noreply@toastmasters-scheduler.app>`
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
    meetingDay: string
  ): Promise<void> {
    try {
      const appUrl = window.location.origin;
      
      const emailData = this.generateAvailabilityEmail({
        clubName,
        month,
        year,
        meetingDay,
        recipientName: recipient.name,
        appUrl
      });

      const emailRequest: EmailRequest = {
        to: [recipient.email],
        subject: `📅 ${clubName} - Please Update Your Availability for ${month} ${year}`,
        html: emailData.html,
        text: emailData.text,
        from: `${clubName} <noreply@toastmasters-scheduler.app>`
      };

      await this.queueEmail(emailRequest);
      console.log(`Personalized availability request email queued for ${recipient.name}`);
    } catch (error) {
      console.error('Error sending personalized availability request email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
