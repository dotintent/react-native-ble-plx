package com.bleplx;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service for maintaining BLE connections in the background.
 *
 * This service keeps BLE operations alive when the app is in the background
 * by running as an Android foreground service with a persistent notification.
 *
 * Required for Android 8.0+ to perform background BLE operations reliably.
 */
public class BlePlxForegroundService extends Service {

  public static final String CHANNEL_ID = "BlePlxForegroundServiceChannel";
  public static final String CHANNEL_NAME = "BLE Background Service";
  public static final int NOTIFICATION_ID = 8675309;

  // Intent action constants
  public static final String ACTION_START = "com.bleplx.action.START_FOREGROUND_SERVICE";
  public static final String ACTION_STOP = "com.bleplx.action.STOP_FOREGROUND_SERVICE";
  public static final String ACTION_UPDATE_NOTIFICATION = "com.bleplx.action.UPDATE_NOTIFICATION";

  // Intent extra keys
  public static final String EXTRA_NOTIFICATION_TITLE = "notification_title";
  public static final String EXTRA_NOTIFICATION_TEXT = "notification_text";
  public static final String EXTRA_NOTIFICATION_ICON = "notification_icon";

  // Default notification content
  private static final String DEFAULT_TITLE = "BLE Active";
  private static final String DEFAULT_TEXT = "Bluetooth connection active in background";

  private final IBinder binder = new LocalBinder();
  private boolean isRunning = false;
  private String currentTitle = DEFAULT_TITLE;
  private String currentText = DEFAULT_TEXT;

  /**
   * Binder for local service binding
   */
  public class LocalBinder extends Binder {
    public BlePlxForegroundService getService() {
      return BlePlxForegroundService.this;
    }
  }

  @Override
  public void onCreate() {
    super.onCreate();
    createNotificationChannel();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) {
      return START_STICKY;
    }

    String action = intent.getAction();
    if (action == null) {
      action = ACTION_START;
    }

    switch (action) {
      case ACTION_START:
        handleStartAction(intent);
        break;
      case ACTION_STOP:
        handleStopAction();
        break;
      case ACTION_UPDATE_NOTIFICATION:
        handleUpdateNotification(intent);
        break;
      default:
        handleStartAction(intent);
        break;
    }

    return START_STICKY;
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return binder;
  }

  @Override
  public void onDestroy() {
    isRunning = false;
    super.onDestroy();
  }

  /**
   * Handle the start foreground service action
   */
  private void handleStartAction(Intent intent) {
    if (isRunning) {
      // Service already running, just update notification if needed
      handleUpdateNotification(intent);
      return;
    }

    // Extract notification content from intent
    currentTitle = intent.getStringExtra(EXTRA_NOTIFICATION_TITLE);
    if (currentTitle == null) {
      currentTitle = DEFAULT_TITLE;
    }

    currentText = intent.getStringExtra(EXTRA_NOTIFICATION_TEXT);
    if (currentText == null) {
      currentText = DEFAULT_TEXT;
    }

    Notification notification = createNotification(currentTitle, currentText);

    // Start as foreground service with appropriate service type for Android 14+
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      // Android 14+ requires specifying foreground service type
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      // Android 10+ supports foreground service types
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
    } else {
      startForeground(NOTIFICATION_ID, notification);
    }

    isRunning = true;
  }

  /**
   * Handle the stop foreground service action
   */
  private void handleStopAction() {
    isRunning = false;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE);
    } else {
      stopForeground(true);
    }
    stopSelf();
  }

  /**
   * Handle notification update action
   */
  private void handleUpdateNotification(Intent intent) {
    if (!isRunning) {
      return;
    }

    String newTitle = intent.getStringExtra(EXTRA_NOTIFICATION_TITLE);
    String newText = intent.getStringExtra(EXTRA_NOTIFICATION_TEXT);

    boolean needsUpdate = false;

    if (newTitle != null && !newTitle.equals(currentTitle)) {
      currentTitle = newTitle;
      needsUpdate = true;
    }

    if (newText != null && !newText.equals(currentText)) {
      currentText = newText;
      needsUpdate = true;
    }

    if (needsUpdate) {
      Notification notification = createNotification(currentTitle, currentText);
      NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      if (notificationManager != null) {
        notificationManager.notify(NOTIFICATION_ID, notification);
      }
    }
  }

  /**
   * Create the notification channel for Android 8.0+
   */
  private void createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        CHANNEL_NAME,
        NotificationManager.IMPORTANCE_LOW // Low importance to minimize user disruption
      );
      channel.setDescription("Keeps Bluetooth connections active when the app is in the background");
      channel.setShowBadge(false);
      channel.enableLights(false);
      channel.enableVibration(false);

      NotificationManager notificationManager = getSystemService(NotificationManager.class);
      if (notificationManager != null) {
        notificationManager.createNotificationChannel(channel);
      }
    }
  }

  /**
   * Create the foreground notification
   */
  @NonNull
  private Notification createNotification(String title, String text) {
    // Get the app's launcher intent to open the app when notification is tapped
    Intent notificationIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
    if (notificationIntent == null) {
      notificationIntent = new Intent();
    }
    notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
    }

    PendingIntent pendingIntent = PendingIntent.getActivity(
      this,
      0,
      notificationIntent,
      pendingIntentFlags
    );

    // Get the app's icon
    int iconResId = getApplicationInfo().icon;
    if (iconResId == 0) {
      // Fallback to Android's built-in Bluetooth icon
      iconResId = android.R.drawable.stat_sys_data_bluetooth;
    }

    return new NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(iconResId)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build();
  }

  /**
   * Check if the service is currently running
   */
  public boolean isServiceRunning() {
    return isRunning;
  }

  /**
   * Static helper to start the foreground service
   */
  public static void start(Context context, String title, String text) {
    Intent intent = new Intent(context, BlePlxForegroundService.class);
    intent.setAction(ACTION_START);
    if (title != null) {
      intent.putExtra(EXTRA_NOTIFICATION_TITLE, title);
    }
    if (text != null) {
      intent.putExtra(EXTRA_NOTIFICATION_TEXT, text);
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent);
    } else {
      context.startService(intent);
    }
  }

  /**
   * Static helper to stop the foreground service
   */
  public static void stop(Context context) {
    Intent intent = new Intent(context, BlePlxForegroundService.class);
    intent.setAction(ACTION_STOP);
    context.startService(intent);
  }

  /**
   * Static helper to update the notification
   */
  public static void updateNotification(Context context, String title, String text) {
    Intent intent = new Intent(context, BlePlxForegroundService.class);
    intent.setAction(ACTION_UPDATE_NOTIFICATION);
    if (title != null) {
      intent.putExtra(EXTRA_NOTIFICATION_TITLE, title);
    }
    if (text != null) {
      intent.putExtra(EXTRA_NOTIFICATION_TEXT, text);
    }
    context.startService(intent);
  }
}
