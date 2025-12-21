package com.bleplx.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;

import androidx.core.app.NotificationCompat;

public class BleScanNotificationHelper {

    private static final String CHANNEL_ID = "ble_scan_channel";
    private static final int NOTIFICATION_ID = 1001;

    private final Context context;
    private final NotificationManager notificationManager;

    public BleScanNotificationHelper(Context context) {
        this.context = context;
        this.notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "BLE Scanning", NotificationManager.IMPORTANCE_LOW);
        channel.setShowBadge(false);
        notificationManager.createNotificationChannel(channel);
    }

    public Notification buildNotification(String title, String content) {
        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(title != null ? title : "Scanning for devices")
            .setContentText(content != null ? content : "Bluetooth scanning is active")
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    public int getNotificationId() {
        return NOTIFICATION_ID;
    }
}
