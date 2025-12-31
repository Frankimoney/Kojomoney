package com.kojomoney.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Firebase Messaging Service for handling push notifications
 * This service handles notifications when the app is in background or killed
 */
public class KojoMoneyMessagingService extends FirebaseMessagingService {
    private static final String TAG = "KojoMoneyFCM";
    private static final String CHANNEL_ID = "default";
    private static final String CHANNEL_NAME = "KojoMoney Notifications";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    /**
     * Create the notification channel for Android 8.0+
     * This MUST be called before any notification is shown
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications from KojoMoney about earnings, streaks, and rewards");
            channel.enableLights(true);
            channel.setLightColor(Color.MAGENTA);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[] { 0, 250, 250, 250 });
            channel.setShowBadge(true);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created: " + CHANNEL_ID);
            }
        }
    }

    /**
     * Called when a new FCM token is generated
     * This happens on first app launch or when the token is refreshed
     */
    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token.substring(0, Math.min(20, token.length())) + "...");
        // The Capacitor plugin will handle token registration with the server
        // when the app is opened next time
    }

    /**
     * Called when a message is received while app is in foreground or background
     * For data-only messages or when app is in foreground, this handles display
     */
    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        // Check if the message contains a notification payload
        RemoteMessage.Notification notification = remoteMessage.getNotification();

        if (notification != null) {
            String title = notification.getTitle();
            String body = notification.getBody();
            Log.d(TAG, "Notification - Title: " + title + ", Body: " + body);

            // Show the notification (important for background/killed state)
            showNotification(title, body, remoteMessage.getData());
        }

        // Check if the message contains data payload
        if (!remoteMessage.getData().isEmpty()) {
            Log.d(TAG, "Data payload: " + remoteMessage.getData());

            // If there's data but no notification, we might want to show one
            if (notification == null) {
                String title = remoteMessage.getData().get("title");
                String body = remoteMessage.getData().get("body");
                if (title != null && body != null) {
                    showNotification(title, body, remoteMessage.getData());
                }
            }
        }
    }

    /**
     * Display a notification to the user
     */
    private void showNotification(String title, String body, java.util.Map<String, String> data) {
        // Ensure channel exists
        createNotificationChannel();

        // Create intent to open the app when notification is tapped
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        // Pass data to the activity
        if (data != null) {
            for (java.util.Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }

        int pendingIntentFlags = PendingIntent.FLAG_ONE_SHOT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                pendingIntentFlags);

        // Build the notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher) // Use your app icon
                .setContentTitle(title != null ? title : "KojoMoney")
                .setContentText(body != null ? body : "You have a new notification")
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body));

        // Show the notification
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (notificationManager != null) {
            // Use a unique ID for each notification (based on current time)
            int notificationId = (int) System.currentTimeMillis();
            notificationManager.notify(notificationId, builder.build());
            Log.d(TAG, "Notification displayed with ID: " + notificationId);
        }
    }
}
