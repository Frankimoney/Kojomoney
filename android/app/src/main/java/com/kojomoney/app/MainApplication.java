package com.kojomoney.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainApplication extends Application {
    private static final String TAG = "KojoMoneyApp";
    private static final String CHANNEL_ID = "default";
    private static final String CHANNEL_NAME = "KojoMoney Notifications";

    @Override
    public void onCreate() {
        super.onCreate();

        // Create notification channel FIRST (required for Android 8+)
        createNotificationChannel();

        // Initialize Firebase
        FirebaseApp.initializeApp(this);
        Log.d(TAG, "Firebase initialized");

        // Subscribe to a default topic for broadcast notifications
        FirebaseMessaging.getInstance().subscribeToTopic("all")
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        Log.d(TAG, "Subscribed to 'all' topic for broadcast notifications");
                    } else {
                        Log.e(TAG, "Failed to subscribe to 'all' topic");
                    }
                });

        // Get and log the FCM token for debugging
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        String token = task.getResult();
                        Log.d(TAG, "FCM Token: " + token.substring(0, Math.min(30, token.length())) + "...");
                    } else {
                        Log.e(TAG, "Failed to get FCM token");
                    }
                });
    }

    /**
     * Create notification channel for Android 8.0 (API 26) and above
     * This MUST be done before any notification is posted
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications about earnings, streaks, tournaments, and rewards");
            channel.enableLights(true);
            channel.setLightColor(Color.MAGENTA);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[] { 0, 250, 250, 250 });
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel '" + CHANNEL_ID + "' created successfully");
            }
        }
    }
}
