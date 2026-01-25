# Android Push Notification Fix

## Problem
Push notifications not showing when app is in background/closed on Android.

## Root Cause
The notification small icon (`ic_launcher`) is a colored icon. Android 8+ requires the small icon to be:
- **White/transparent PNG** (no colors)
- **Single color silhouette**

## Solution

### Option 1: Quick Fix (Use Bell Icon)
1. Download a simple bell icon from https://materialdesignicons.com/
   - Search for "bell" 
   - Download as Android XML or PNG (white/transparent)
   
2. Place it in `android/app/src/main/res/drawable/` as `ic_notification.xml`

3. Update line 136 in `KojoMoneyMessagingService.java`:
   ```java
   .setSmallIcon(R.drawable.ic_notification)  // Changed from R.mipmap.ic_launcher
   ```

4. Update `AndroidManifest.xml` line 56:
   ```xml
   android:resource="@drawable/ic_notification"
   ```

### Option 2: Test with System Icon (Fastest)
Update line 136 to use a built-in Android icon temporarily:
```java
.setSmallIcon(android.R.drawable.ic_dialog_info)
```

This will make notifications show immediately, then you can customize the icon later.

## Additional Checks

### 1. Battery Optimization
Tell users to disable battery optimization for KojoMoney:
- Settings → Apps → KojoMoney → Battery → Unrestricted

### 2. Notification Permission
Make sure the app requests POST_NOTIFICATIONS permission on Android 13+

### 3. Test Command
After deploy, test with:
```bash
curl -X POST https://kojomoney-app.onrender.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-internal-key: internal-notification-system" \
  -d '{
    "userIds": "all",
    "title": "Test",
    "body": "Background notification test"
  }'
```

## Quick Test (Do This Now)
Just change line 136 to:
```java
.setSmallIcon(android.R.drawable.ic_menu_info_details)
```

Rebuild and test - notifications should appear!
