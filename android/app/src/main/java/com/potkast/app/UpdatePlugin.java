package com.potkast.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Handles downloading and installing newer APK releases from inside the app.
 * Uses the system DownloadManager so the transfer survives backgrounding.
 */
@CapacitorPlugin(name = "ApkUpdate")
public class UpdatePlugin extends Plugin {

    private static final String EVENT_DOWNLOAD_COMPLETE = "downloadComplete";

    private long activeDownloadId = -1L;
    private boolean receiverRegistered = false;

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long finishedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (finishedId != activeDownloadId) return;
            JSObject payload = new JSObject();
            payload.put("downloadId", finishedId);
            notifyListeners(EVENT_DOWNLOAD_COMPLETE, payload);
        }
    };

    private DownloadManager manager() {
        return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    }

    private void ensureReceiver() {
        if (receiverRegistered) return;
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getContext().registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                getContext().registerReceiver(downloadReceiver, filter);
            }
            receiverRegistered = true;
        } catch (Exception ignored) {
            // Progress polling still works without the broadcast.
        }
    }

    private long resolveId(PluginCall call) {
        Double raw = call.getDouble("downloadId");
        return raw == null ? activeDownloadId : raw.longValue();
    }

    @PluginMethod
    public void startDownload(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing APK url");
            return;
        }
        String fileName = call.getString("fileName", "sada-update.apk");
        DownloadManager dm = manager();
        if (dm == null) {
            call.reject("Download manager unavailable");
            return;
        }

        ensureReceiver();
        if (activeDownloadId > 0) dm.remove(activeDownloadId);

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle("Sada — تحديث جديد");
        request.setDescription("جاري تنزيل أحدث نسخة من التطبيق");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(true);

        try {
            activeDownloadId = dm.enqueue(request);
            JSObject result = new JSObject();
            result.put("downloadId", activeDownloadId);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("Could not start download", ex);
        }
    }

    @PluginMethod
    public void getProgress(PluginCall call) {
        long id = resolveId(call);
        JSObject result = new JSObject();
        if (id <= 0 || manager() == null) {
            result.put("status", "IDLE");
            call.resolve(result);
            return;
        }

        Cursor cursor = manager().query(new DownloadManager.Query().setFilterById(id));
        if (cursor == null) {
            result.put("status", "MISSING");
            call.resolve(result);
            return;
        }
        try {
            if (!cursor.moveToFirst()) {
                result.put("status", "MISSING");
                call.resolve(result);
                return;
            }
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long bytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));

            result.put("downloadId", id);
            result.put("bytes", bytes);
            result.put("total", total);
            result.put("reason", reason);
            result.put("status", statusName(status));
            call.resolve(result);
        } finally {
            cursor.close();
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        long id = resolveId(call);
        if (id > 0 && manager() != null) manager().remove(id);
        activeDownloadId = -1L;
        call.resolve();
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        boolean allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
                || getContext().getPackageManager().canRequestPackageInstalls();
        result.put("canInstall", allowed);
        call.resolve(result);
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
            } catch (Exception ex) {
                call.reject("Could not open install settings", ex);
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        long id = resolveId(call);
        if (id <= 0 || manager() == null) {
            call.reject("No downloaded update found");
            return;
        }
        Uri uri = manager().getUriForDownloadedFile(id);
        if (uri == null) {
            call.reject("The downloaded update is no longer available");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not open the installer", ex);
        }
    }

    private static String statusName(int status) {
        if (status == DownloadManager.STATUS_SUCCESSFUL) return "SUCCESSFUL";
        if (status == DownloadManager.STATUS_FAILED) return "FAILED";
        if (status == DownloadManager.STATUS_RUNNING) return "RUNNING";
        if (status == DownloadManager.STATUS_PENDING) return "PENDING";
        if (status == DownloadManager.STATUS_PAUSED) return "PAUSED";
        return "UNKNOWN";
    }

    @Override
    protected void handleOnDestroy() {
        if (receiverRegistered) {
            try {
                getContext().unregisterReceiver(downloadReceiver);
            } catch (Exception ignored) {
                // Already unregistered.
            }
            receiverRegistered = false;
        }
        super.handleOnDestroy();
    }
}
