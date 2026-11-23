package com.potkast.app;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Native episode downloader.
 *
 * Android's DownloadManager streams straight to disk in the background, so a
 * 100 MB episode no longer has to be buffered in the WebView and re-painted on
 * every network chunk. Files live in the app's own music directory and are
 * exposed to the WebView through Capacitor's local-file bridge.
 */
@CapacitorPlugin(name = "AudioDownload")
public class AudioDownloadPlugin extends Plugin {

    private DownloadManager manager() {
        return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    }

    private static String safeName(String episodeId) {
        String clean = episodeId == null ? "episode" : episodeId.replaceAll("[^A-Za-z0-9._-]", "_");
        return clean.endsWith(".mp3") ? clean : clean + ".mp3";
    }

    private File destination(String episodeId) {
        File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_MUSIC);
        return dir == null ? null : new File(dir, safeName(episodeId));
    }

    private JSObject success(long id, String episodeId, Uri uri, long total) {
        JSObject result = new JSObject();
        result.put("id", id);
        result.put("status", "SUCCESSFUL");
        result.put("bytes", total);
        result.put("total", total);
        result.put("uri", uri == null ? "" : uri.toString());
        result.put("episodeId", episodeId == null ? "" : episodeId);
        return result;
    }

    private JSObject statusObject(long id, String episodeId, int status, long bytes, long total, int reason, Uri uri) {
        JSObject result = new JSObject();
        result.put("id", id);
        result.put("episodeId", episodeId == null ? "" : episodeId);
        result.put("bytes", bytes);
        result.put("total", total);
        result.put("reason", reason);
        result.put("uri", uri == null ? "" : uri.toString());
        result.put("status", statusName(status));
        return result;
    }

    private static String statusName(int status) {
        if (status == DownloadManager.STATUS_SUCCESSFUL) return "SUCCESSFUL";
        if (status == DownloadManager.STATUS_FAILED) return "FAILED";
        if (status == DownloadManager.STATUS_RUNNING) return "RUNNING";
        if (status == DownloadManager.STATUS_PENDING) return "PENDING";
        if (status == DownloadManager.STATUS_PAUSED) return "PAUSED";
        return "UNKNOWN";
    }

    @PluginMethod
    public void start(PluginCall call) {
        String url = call.getString("url");
        String episodeId = call.getString("episodeId");
        String title = call.getString("title", "حلقة بودكاست");

        if (url == null || url.isEmpty()) {
            call.reject("Missing audio URL");
            return;
        }

        // If the file is already on disk, do not download it a second time.
        File existing = destination(episodeId);
        if (existing != null && existing.exists() && existing.length() > 0) {
            call.resolve(success(-1L, episodeId, Uri.fromFile(existing), existing.length()));
            return;
        }

        DownloadManager dm = manager();
        if (dm == null) {
            call.reject("Download manager unavailable");
            return;
        }

        if (existing != null && existing.exists() && !existing.delete()) {
            call.reject("Could not replace an old download");
            return;
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle(title);
        request.setDescription("جارٍ الحفظ للاستماع بدون إنترنت");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_MUSIC, safeName(episodeId));
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(true);
        request.setRequiresCharging(false);
        request.setRequiresDeviceIdle(false);

        try {
            long id = dm.enqueue(request);
            JSObject result = new JSObject();
            result.put("id", id);
            result.put("status", "PENDING");
            result.put("episodeId", episodeId == null ? "" : episodeId);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("Could not start episode download", ex);
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        Double rawId = call.getDouble("id");
        String episodeId = call.getString("episodeId");
        long id = rawId == null ? -1L : rawId.longValue();

        if (id <= 0) {
            File file = destination(episodeId);
            if (file != null && file.exists() && file.length() > 0) {
                call.resolve(success(-1L, episodeId, Uri.fromFile(file), file.length()));
            } else {
                JSObject result = new JSObject();
                result.put("id", -1L);
                result.put("status", "MISSING");
                result.put("episodeId", episodeId == null ? "" : episodeId);
                call.resolve(result);
            }
            return;
        }

        DownloadManager dm = manager();
        if (dm == null) {
            call.reject("Download manager unavailable");
            return;
        }

        Cursor cursor = dm.query(new DownloadManager.Query().setFilterById(id));
        if (cursor == null) {
            File file = destination(episodeId);
            call.resolve(statusObject(id, episodeId, DownloadManager.STATUS_FAILED, 0, 0, 0,
                    file != null && file.exists() ? Uri.fromFile(file) : null));
            return;
        }

        try {
            if (!cursor.moveToFirst()) {
                File file = destination(episodeId);
                if (file != null && file.exists() && file.length() > 0) {
                    call.resolve(success(id, episodeId, Uri.fromFile(file), file.length()));
                } else {
                    JSObject result = new JSObject();
                    result.put("id", id);
                    result.put("status", "MISSING");
                    result.put("episodeId", episodeId == null ? "" : episodeId);
                    call.resolve(result);
                }
                return;
            }

            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long bytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
            Uri uri = dm.getUriForDownloadedFile(id);
            if (uri == null) {
                File file = destination(episodeId);
                if (file != null && file.exists()) uri = Uri.fromFile(file);
            }
            if (status == DownloadManager.STATUS_SUCCESSFUL && total <= 0 && uri != null) {
                File file = new File(uri.getPath());
                total = file.exists() ? file.length() : 0;
            }
            call.resolve(statusObject(id, episodeId, status, bytes, total, reason, uri));
        } finally {
            cursor.close();
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Double rawId = call.getDouble("id");
        String episodeId = call.getString("episodeId");
        long id = rawId == null ? -1L : rawId.longValue();

        if (id > 0 && manager() != null) {
            try {
                manager().remove(id);
            } catch (Exception ignored) {
                // The download may already have finished.
            }
        }

        File file = destination(episodeId);
        if (file != null && file.exists() && !file.delete()) {
            // Best effort: a stale file will be replaced on the next download.
        }
        call.resolve();
    }

    @PluginMethod
    public void delete(PluginCall call) {
        File file = destination(call.getString("episodeId"));
        if (file != null && file.exists() && !file.delete()) {
            // Best effort: the metadata is removed regardless.
        }
        call.resolve();
    }
}
