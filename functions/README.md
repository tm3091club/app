# Email Processing Functions

This directory contains Firebase Functions for processing the email queue in the Toastmasters Scheduler app.

## Setup

1. **Install Dependencies**
   ```bash
   cd functions
   npm install
   ```

2. **Configure SendGrid (Recommended)**
   ```bash
   firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
   ```

3. **Deploy Functions**
   ```bash
   firebase deploy --only functions
   ```

## Functions

### `processEmailQueue`
- **Trigger**: Firestore document creation in `emailQueue` collection
- **Purpose**: Automatically processes new email requests
- **Email Service**: SendGrid (configurable)

### `retryFailedEmails`
- **Trigger**: HTTP request
- **Purpose**: Retry emails that failed to send (max 3 attempts)
- **URL**: `https://YOUR_PROJECT.cloudfunctions.net/retryFailedEmails`

### `emailHealthCheck`
- **Trigger**: HTTP request  
- **Purpose**: Check if email service is healthy and configured
- **URL**: `https://YOUR_PROJECT.cloudfunctions.net/emailHealthCheck`

## Email Service Alternatives

If you prefer not to use SendGrid, you can modify `functions/index.js` to use:

- **Gmail with Nodemailer**: Add Gmail credentials and use nodemailer
- **AWS SES**: Use AWS SDK for Simple Email Service
- **Other SMTP**: Configure any SMTP provider with nodemailer

## Development

1. **Local Testing**
   ```bash
   firebase emulators:start --only functions,firestore
   ```

2. **View Logs**
   ```bash
   firebase functions:log
   ```

## Security Notes

- Email queue requires admin privileges to create entries
- Functions run with elevated privileges to process emails
- Failed emails are automatically retried up to 3 times
- All email processing is logged for debugging

## Email Template

The availability request emails include:
- Professional HTML layout with club branding
- Clear call-to-action button linking to the app
- Meeting day and month information
- Responsive design for mobile devices
- Plain text fallback for accessibility
