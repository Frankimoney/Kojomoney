package com.kojomoney.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private long backPressedTime = 0;
    private Toast backToast;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }

    @Override
    public void onBackPressed() {
        // Use JavaScript to check current path and handle back
        getBridge().getWebView().evaluateJavascript(
                "(function() { " +
                        "  var path = window.location.pathname; " +
                        "  var isRoot = path === '/' || path === '' || path === '/index.html'; " +
                        "  if (!isRoot) { " +
                        "    window.history.back(); " +
                        "    return 'back'; " +
                        "  } else { " +
                        "    return 'exit'; " +
                        "  } " +
                        "})()",
                result -> {
                    if (result != null && result.contains("exit")) {
                        // At root, show double-tap to exit
                        runOnUiThread(() -> {
                            if (backPressedTime + 2000 > System.currentTimeMillis()) {
                                if (backToast != null)
                                    backToast.cancel();
                                finish();
                            } else {
                                backToast = Toast.makeText(this, "Tap back again to exit", Toast.LENGTH_SHORT);
                                backToast.show();
                            }
                            backPressedTime = System.currentTimeMillis();
                        });
                    }
                    // If "back" was returned, history.back() already executed
                });
    }

    private void createNotificationChannel() {
        // Create the NotificationChannel (required for Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Default";
            String description = "Default notification channel for KojoMoney";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel("default", name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setShowBadge(true);

            // Register the channel with the system
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
