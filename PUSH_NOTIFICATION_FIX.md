# Push Notification Fix - Background Notifications on Android

## Issues Fixed

### Issue 1: Missing Firebase Messaging Service (CRITICAL)
**Problem:** Push notifications only showed when app was open because there was no native service to receive FCM messages when the app was closed/killed.

**Solution:** Created `KojoMoneyMessagingService.java` - a Firebase Messaging Service that:
- Receives FCM messages when app is in background or killed
- Creates and shows notifications using Android's NotificationManager
- Handles notification taps to open the app
- Logs token refresh events

### Issue 2: Missing Notification Channel (CRITICAL for Android 8+)
**Problem:** Android 8.0 (API 26) and above REQUIRE a notification channel to be created before any notification can be shown. Without this, notifications are silently dropped.

**Solution:** 
- Added notification channel creation in `MainApplication.java` (called on app start)
- Also create channel in `KojoMoneyMessagingService.java` as backup
- Channel ID: "default" (matches FCM configuration)
- Channel settings: HIGH importance, vibration, lights, badge

### Issue 3: Missing Manifest Registration
**Problem:** The Firebase Messaging Service wasn't registered in AndroidManifest.xml

**Solution:** Added service declaration with correct intent filter:
```xml
<service android:name=".KojoMoneyMessagingService" android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

### Issue 4: Missing Permissions
**Problem:** Missing WAKE_LOCK and RECEIVE_BOOT_COMPLETED permissions for reliable background notification delivery.

**Solution:** Added to AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### Issue 5: API URL Issue in notificationService.ts
**Problem:** Token registration used raw `fetch()` with relative URL `/api/notifications/register`, which fails on Capacitor apps loading local files.

**Solution:** Changed to use `apiCall()` from `@/lib/api-client.ts` which properly routes to `https://kojomoney-app.onrender.com` on native platforms.

### Issue 6: Missing CORS on register endpoint
**Problem:** The `/api/notifications/register` endpoint was missing CORS headers, blocking requests from native apps.

**Solution:** Added `allowCors` wrapper to the handler.

## Files Modified

1. **NEW:** `android/app/src/main/java/com/kojomoney/app/KojoMoneyMessagingService.java`
   - Firebase Messaging Service for background notification handling

2. **MODIFIED:** `android/app/src/main/java/com/kojomoney/app/MainApplication.java`
   - Added notification channel creation on app startup
   - Added FCM token logging for debugging

3. **MODIFIED:** `android/app/src/main/AndroidManifest.xml`
   - Registered KojoMoneyMessagingService
   - Added WAKE_LOCK and RECEIVE_BOOT_COMPLETED permissions

4. **MODIFIED:** `src/services/notificationService.ts`
   - Changed from raw fetch to apiCall for proper URL routing

5. **MODIFIED:** `src/pages/api/notifications/register.ts`
   - Added CORS wrapper

## Testing Steps

1. **Rebuild the Android app:**
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleDebug
   ```

2. **Install on device:**
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

3. **Test push registration:**
   - Open the app and log in
   - Check Logcat for: "FCM Token: ..." and "Push token registered with backend successfully"

4. **Test background notification:**
   - Close the app completely (swipe away from recent apps)
   - Trigger a test notification:
     ```
     GET https://kojomoney-app.onrender.com/api/cron/test-notification?userId=YOUR_USER_ID
     ```
   - You should see a notification in the status bar

5. **Check Logcat for debugging:**
   ```bash
   adb logcat | grep -E "(KojoMoney|FCM)"
   ```

## Important Notes

- **Play Store NOT required**: These fixes work for sideloaded APKs, not just Play Store apps
- **Permission granted**: User must grant notification permission when prompted
- **Battery optimization**: Some devices (Xiaomi, Huawei, Samsung) have aggressive battery optimization that can block background notifications. Users may need to:
  - Disable battery optimization for the app
  - Lock the app in recent apps
  - Enable "Auto-start" for the app

## Environment Variables

Ensure your backend has:
- `FIREBASE_SERVICE_ACCOUNT` - The service account JSON for FCM
- `NEXT_PUBLIC_APP_URL` - Your backend URL (for internal API calls)
