package com.potkast.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridges the web audio player to the Android media notification.
 *
 * The service keeps playback alive when the app is backgrounded; this plugin
 * forwards track metadata from JS to that service and sends notification
 * button presses back to JS so the same <audio> element stays in control.
 */
@CapacitorPlugin(name = "MediaNotification")
public class MediaNotificationPlugin extends Plugin {

    private static final int NOTIFICATION_PERMISSION_REQUEST = 1001;
    private static final String EVENT_ACTION = "action";
    private static MediaNotificationPlugin active;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        active = this;
    }

    /** Called by the foreground service when the user taps a notification action. */
    static void emitAction(String action, double value) {
        MediaNotificationPlugin plugin = active;
        if (plugin == null) return;
        plugin.mainHandler.post(() -> {
            JSObject payload = new JSObject();
            payload.put("action", action);
            payload.put("value", value);
            plugin.notifyListeners(EVENT_ACTION, payload);
        });
    }

    private void ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (getActivity() == null) return;
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) return;
        ActivityCompat.requestPermissions(
                getActivity(),
                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                NOTIFICATION_PERMISSION_REQUEST
        );
    }

    private Intent command(String action) {
        Intent intent = new Intent(getContext(), AudioPlaybackService.class);
        intent.setAction(action);
        return intent;
    }

    private void copyTrack(PluginCall call, Intent intent) {
        String title = call.getString("title");
        String artist = call.getString("artist");
        String artwork = call.getString("artwork");
        Double duration = call.getDouble("duration");
        Double position = call.getDouble("position");
        Boolean playing = call.getBoolean("playing");

        if (title != null) intent.putExtra(AudioPlaybackService.EXTRA_TITLE, title);
        if (artist != null) intent.putExtra(AudioPlaybackService.EXTRA_ARTIST, artist);
        if (artwork != null) intent.putExtra(AudioPlaybackService.EXTRA_ARTWORK, artwork);
        if (duration != null) intent.putExtra(AudioPlaybackService.EXTRA_DURATION, duration.longValue());
        if (position != null) intent.putExtra(AudioPlaybackService.EXTRA_POSITION, position.longValue());
        if (playing != null) intent.putExtra(AudioPlaybackService.EXTRA_PLAYING, playing.booleanValue());
    }

    @PluginMethod
    public void start(PluginCall call) {
        ensureNotificationPermission();
        Intent intent = command(AudioPlaybackService.ACTION_START);
        copyTrack(call, intent);
        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not start media notification", ex);
        }
    }

    @PluginMethod
    public void update(PluginCall call) {
        Intent intent = command(AudioPlaybackService.ACTION_UPDATE);
        copyTrack(call, intent);
        try {
            getContext().startService(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not update media notification", ex);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Intent stop = command(AudioPlaybackService.ACTION_STOP);
            stop.putExtra(AudioPlaybackService.EXTRA_SILENT, true);
            getContext().startService(stop);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not stop media notification", ex);
        }
    }
}
