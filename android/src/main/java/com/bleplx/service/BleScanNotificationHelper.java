package com.bleplx.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Helper class for creating foreground service notifications.
 *
 * Android 13+ (API 33): POST_NOTIFICATIONS permission is required for notifications to be visible,
 * but foreground services will still work even without permission - users will see the service
 * in the Task Manager but not in the notification drawer.
 *
 * Android 14+ (API 34): Foreground service types are required in manifest.
 */
public class BleScanNotificationHelper {

    private static final String TAG = "BlePlx";
    private static final String CHANNEL_ID = "ble_foreground_service_channel";
    private static final int NOTIFICATION_ID = 1001;

    private final Context context;
    private final NotificationManager notificationManager;

    public BleScanNotificationHelper(Context context) {
        this.context = context;
        this.notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    /**
     * Creates the notification channel for Android O+.
     * Uses IMPORTANCE_LOW to minimize user interruption for background BLE operations.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Check if channel already exists to avoid unnecessary recreation
            NotificationChannel existingChannel = notificationManager.getNotificationChannel(CHANNEL_ID);
            if (existingChannel != null) {
                return;
            }

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "BLE Background Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Notifications for BLE scanning and connection services");
            channel.setShowBadge(false);
            // Disable vibration and sound for this low-priority channel
            channel.enableVibration(false);
            channel.setSound(null, null);

            try {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created: " + CHANNEL_ID);
            } catch (Exception e) {
                Log.e(TAG, "Failed to create notification channel", e);
            }
        }
    }

    /**
     * Builds a notification for foreground services.
     *
     * @param title   The notification title (defaults to "Scanning for devices")
     * @param content The notification content (defaults to "Bluetooth scanning is active")
     * @return A configured Notification object
     */
    public Notification buildNotification(String title, String content) {
        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title != null ? title : "Scanning for devices")
            .setContentText(content != null ? content : "Bluetooth scanning is active")
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            // Category helps Android handle the notification properly during DND mode
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            // Ongoing notifications can't be dismissed by user
            .setOngoing(true)
            // Foreground service notifications should be silent
            .setSilent(true)
            // Show timestamp of when the service started
            .setShowWhen(true)
            .setWhen(System.currentTimeMillis())
            // Prevent the notification from being auto-cancelled
            .setAutoCancel(false)
            .build();
    }

    /**
     * Updates the existing notification with new title and content.
     * Useful for showing connection status changes.
     *
     * @param title   The new notification title
     * @param content The new notification content
     */
    public void updateNotification(String title, String content) {
        Notification notification = buildNotification(title, content);
        notificationManager.notify(NOTIFICATION_ID, notification);
    }

    /**
     * Checks if notifications are enabled for this app.
     * On Android 13+, this checks if POST_NOTIFICATIONS permission was granted.
     *
     * @return true if notifications are enabled
     */
    public boolean areNotificationsEnabled() {
        return notificationManager.areNotificationsEnabled();
    }

    public int getNotificationId() {
        return NOTIFICATION_ID;
    }
}
