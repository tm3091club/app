# Admin Transition System for Toastmasters

## Overview

The Admin Transition System provides dynamic admin rights management for Toastmasters based on their weekly assignments. This system ensures that:

1. **Current Week Toastmasters** have admin rights to manage schedules and make changes on the fly
2. **Next Week Toastmasters** gain admin rights in advance to prepare for their week
3. **Past Week Toastmasters** lose admin rights after their meeting date passes
4. **Buffer Protection** prevents Toastmasters from soft-locking themselves by unassigning too close to meeting time

## Key Features

### 1. Dynamic Admin Rights
- **Permanent Admins**: Always have admin rights
- **Current Week Toastmaster**: Has admin rights for their assigned week
- **Next Week Toastmaster**: Gains admin rights when their week becomes active
- **Regular Members**: No admin rights unless they are Toastmaster for current/next week

### 2. Week Detection Logic
- System automatically detects the current week based on meeting dates
- Uses club's meeting day and timezone for accurate week determination
- Handles edge cases like month boundaries and timezone differences

### 3. Buffer Protection
- Prevents Toastmasters from unassigning themselves within 24 hours of their meeting
- Provides clear error messages with remaining time
- Protects against accidental soft-locking scenarios

### 4. Visual Status Indicators
- Admin status badge in header shows current permissions
- Color-coded indicators for different admin types
- Meeting date information for context

## Implementation Details

### Core Files

#### `utils/adminTransitionUtils.ts`
Contains all the core logic for:
- Week detection and transition
- Admin status determination
- Buffer protection checks
- Toastmaster assignment validation

#### `Context/ToastmastersContext.tsx`
- Integrates admin status into the main app context
- Automatically updates admin status when data changes
- Provides admin status to all components

#### `components/AdminStatusIndicator.tsx`
- Visual component showing current admin status
- Color-coded badges for different permission levels
- Displays meeting dates and week information

### Key Functions

#### `getUserAdminStatus(userId, userRole, schedule, organization, meetingDay, timezone)`
Determines if a user has admin rights and why.

**Returns:**
```typescript
{
  hasAdminRights: boolean;
  reason: 'permanent_admin' | 'current_week_toastmaster' | 'next_week_toastmaster' | 'no_rights';
  weekInfo?: {
    weekIndex: number;
    meetingDate: string;
    isCurrentWeek: boolean;
    isNextWeek: boolean;
  };
}
```

#### `canUnassignSelfFromToastmaster(userId, userRole, schedule, organization, meetingDay, timezone, targetWeekIndex)`
Checks if a user can unassign themselves from Toastmaster role with buffer protection.

**Returns:**
```typescript
{
  canUnassign: boolean;
  reason: string;
  bufferTimeRemaining?: number; // hours remaining if buffer is active
}
```

#### `getCurrentWeekIndex(schedule, meetingDay, timezone)`
Determines which week is currently active based on meeting dates.

#### `isWeekActive(schedule, weekIndex)`
Checks if a specific week is still active (meeting hasn't passed yet).

## Usage Examples

### Checking Admin Status
```typescript
const { adminStatus } = useToastmasters();

if (adminStatus?.hasAdminRights) {
  // User has admin rights
  console.log('Admin reason:', adminStatus.reason);
  if (adminStatus.weekInfo) {
    console.log('Week:', adminStatus.weekInfo.weekIndex);
    console.log('Meeting date:', adminStatus.weekInfo.meetingDate);
  }
}
```

### Buffer Protection in Components
```typescript
const handleRoleChange = (newMemberId: string | null) => {
  if (role === 'Toastmaster' && assignedMemberId && !newMemberId) {
    const bufferCheck = canUnassignSelfFromToastmaster(
      currentUser.uid,
      currentUser.role,
      activeSchedule,
      organization,
      organization.meetingDay,
      organization.timezone,
      meetingIndex
    );
    
    if (!bufferCheck.canUnassign) {
      alert(`Cannot unassign: ${bufferCheck.reason}`);
      return;
    }
  }
  
  // Proceed with role change
  onAssignmentChange(meetingIndex, role, newMemberId);
};
```

## Configuration

### Club Settings
The system uses these organization settings:
- `meetingDay`: Day of week (0=Sunday, 1=Monday, etc.)
- `timezone`: IANA timezone string (e.g., 'America/New_York')

### Buffer Protection
- Default buffer time: 24 hours before meeting
- Configurable in `canUnassignSelfFromToastmaster` function
- Can be adjusted based on club preferences

## Edge Cases Handled

### 1. Timezone Differences
- All date calculations use the club's configured timezone
- Meeting dates are compared in the correct timezone context
- Handles daylight saving time transitions

### 2. Month Boundaries
- Week detection works across month boundaries
- Handles cases where meetings span multiple months
- Maintains correct week indexing

### 3. Missing Data
- Gracefully handles missing meeting dates
- Provides fallbacks for invalid data
- Returns appropriate default values

### 4. Role Changes
- Real-time updates when Toastmaster assignments change
- Immediate permission updates without page refresh
- Maintains consistency across all components

## Testing

The system includes comprehensive tests in `utils/__tests__/adminTransitionUtils.test.ts`:

- Week detection accuracy
- Admin status determination
- Buffer protection logic
- Edge case handling
- Timezone considerations

## Migration Notes

### Existing Data
- No database migration required
- System works with existing schedule and member data
- Backward compatible with current permission system

### Component Updates
- All components now use `adminStatus.hasAdminRights` instead of `currentUser.role === 'Admin'`
- Header component shows admin status indicator
- Role assignment cells include buffer protection

### User Experience
- Users see their current admin status in the header
- Clear error messages for buffer protection violations
- Seamless transition between admin and member permissions

## Future Enhancements

### Potential Improvements
1. **Configurable Buffer Time**: Allow clubs to set custom buffer periods
2. **Admin History**: Track when users had admin rights and why
3. **Notification System**: Alert users when they gain/lose admin rights
4. **Advanced Permissions**: Granular permissions for different admin types
5. **Audit Logging**: Track admin actions for accountability

### Performance Optimizations
1. **Caching**: Cache admin status calculations
2. **Background Updates**: Update admin status in background
3. **Optimistic Updates**: Immediate UI updates with server sync

## Troubleshooting

### Common Issues

#### Admin Status Not Updating
- Check if `updateAdminStatus` is being called when data changes
- Verify timezone settings are correct
- Ensure meeting dates are valid

#### Buffer Protection Not Working
- Verify meeting date format (YYYY-MM-DD)
- Check timezone configuration
- Ensure current time is being calculated correctly

#### Permission Denied Errors
- Check if user is properly linked to member profile
- Verify Toastmaster assignment in schedule
- Confirm week is still active

### Debug Information
The system provides detailed debug information through the admin status object:
- Current week index
- Meeting dates
- Admin reason
- Buffer time remaining

Use browser developer tools to inspect the `adminStatus` object for troubleshooting.
