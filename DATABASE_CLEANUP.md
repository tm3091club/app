# Database Cleanup System

This system automatically cleans up old data from your Firestore database to prevent storage bloat and reduce costs.

## What Gets Cleaned Up

| Collection | Retention Period | What It Stores |
|------------|------------------|----------------|
| `notifications` | 30 days | User notifications (role assignments, schedule updates) |
| `mail` | 30 days | Email processing queue |
| `publicSchedules` | 90 days | Shared schedule data |
| `invitations` | 7 days | Join invitation tokens |

**Important:** Member data, schedules, and organization data are **NEVER** auto-deleted.

## Cleanup Methods

### 1. Manual Cleanup (Local Script)

Run the cleanup script manually:

```bash
node scripts/cleanup-database.js
```

This is useful for:
- Testing the cleanup before deploying
- One-time cleanup of old data
- Troubleshooting

### 2. Manual Trigger (Firebase Function)

If you've deployed the Firebase Functions, you can trigger cleanup via HTTP:

```bash
curl -X POST https://us-central1-your-project-id.cloudfunctions.net/cleanupOldData
```

### 3. Automatic Daily Cleanup (Recommended)

The system includes a scheduled function that runs daily at 2 AM UTC.

#### Deploy Firebase Functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

#### Enable Cloud Scheduler (Optional but Recommended):

The `scheduledCleanup` function will automatically create a Cloud Scheduler job when deployed. You can also manually create it:

1. Go to [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler) in Google Cloud Console
2. Create a new job:
   - **Name:** `daily-database-cleanup`
   - **Frequency:** `0 2 * * *` (daily at 2 AM UTC)
   - **Target Type:** Pub/Sub
   - **Topic:** Create topic: `firebase-schedule-scheduledCleanup-us-central1`

## Monitoring Cleanup

### View Logs

Check Firebase Functions logs:

```bash
firebase functions:log
```

Or in the [Firebase Console](https://console.firebase.google.com/) → Functions → Logs

### Manual Check

You can verify the cleanup worked by checking the oldest records in each collection:

```javascript
// In browser console on your app
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

// Check oldest notifications
firebase.firestore().collection('notifications')
  .orderBy('createdAt', 'asc')
  .limit(1)
  .get()
  .then(snapshot => {
    if (!snapshot.empty) {
      const oldestDate = snapshot.docs[0].data().createdAt.toDate();
      console.log('Oldest notification:', oldestDate);
      console.log('Should be newer than:', thirtyDaysAgo);
    }
  });
```

## Cost Impact

### Before Cleanup
- Notifications grow indefinitely (could reach thousands per user)
- Storage costs increase over time
- Query performance may degrade

### After Cleanup
- Consistent database size
- Predictable storage costs
- Better query performance
- Only recent, relevant data is kept

## Safety Features

1. **Conservative Deletion:** Only deletes records with `createdAt` timestamps
2. **Batch Processing:** Uses Firestore batch operations for efficiency
3. **Error Handling:** Comprehensive error logging and recovery
4. **Selective Cleanup:** Only targets temporary/notification data
5. **Longer Retention:** Public schedules kept for 90 days (vs 30 for notifications)

## Customization

You can adjust retention periods by modifying the thresholds in:

- **Firebase Functions:** `functions/index.js` (lines ~157-220)
- **Local Script:** `scripts/cleanup-database.js` (lines 11-16)

```javascript
const CLEANUP_THRESHOLDS = {
  notifications: 30,    // Change to 45 for 45-day retention
  emailQueue: 30,       
  publicSchedules: 90,  // Change to 180 for 6-month retention
  invitations: 7        
};
```

## Troubleshooting

### Permission Errors
Ensure your Firebase Functions have proper Firestore permissions:

```bash
firebase functions:config:set serviceaccount.client_email="your-service-account@project.iam.gserviceaccount.com"
```

### Missing Collections
If a collection doesn't exist, the cleanup will skip it gracefully.

### Large Deletions
For very large deletions (thousands of records), the function may timeout. Consider running the manual script multiple times or increasing function timeout:

```javascript
exports.cleanupOldData = functions
  .runWith({ timeoutSeconds: 540 }) // 9 minutes
  .https.onRequest(async (req, res) => {
    // ... cleanup code
  });
```

## Next Steps

1. **Deploy the Functions:** `firebase deploy --only functions`
2. **Test Manual Cleanup:** `node scripts/cleanup-database.js`
3. **Monitor Logs:** Check that automatic cleanup is working
4. **Adjust Thresholds:** Fine-tune retention periods based on your needs

Your database will now stay clean and cost-effective! 🎉
