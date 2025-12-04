package com.kojomoney.app;

import android.app.Application;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        
        // Initialize Firebase
        FirebaseApp.initializeApp(this);
        
        // Optional: Subscribe to a default topic for push notifications
        FirebaseMessaging.getInstance().subscribeToTopic("all")
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    android.util.Log.d("MainApplication", "Subscribed to 'all' topic");
                }
            });
    }
}
