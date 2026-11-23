package com.potkast.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Foreground service that owns the Android media notification while the web
 * <audio> element keeps playing inside the WebView.
 */
public class AudioPlaybackService extends Service {

    static final String ACTION_START = "com.potkast.app.media.START";
    static final String ACTION_UPDATE = "com.potkast.app.media.UPDATE";
    static final String ACTION_STOP = "com.potkast.app.media.STOP";
    static final String ACTION_PLAY = "com.potkast.app.media.PLAY";
    static final String ACTION_PAUSE = "com.potkast.app.media.PAUSE";
    static final String ACTION_NEXT = "com.potkast.app.media.NEXT";
    static final String ACTION_PREV = "com.potkast.app.media.PREV";
    static final String ACTION_SEEK = "com.potkast.app.media.SEEK";

    static final String EXTRA_TITLE = "title";
    static final String EXTRA_ARTIST = "artist";
    static final String EXTRA_ARTWORK = "artwork";
    static final String EXTRA_DURATION = "duration";
    static final String EXTRA_POSITION = "position";
    static final String EXTRA_PLAYING = "playing";
    static final String EXTRA_SILENT = "silent";

    private static final String CHANNEL_ID = "sada_audio";
    private static final int NOTIFICATION_ID = 1001;

    private MediaSessionCompat mediaSession;
    private PendingIntent openIntent;
    private final ExecutorService artworkExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private String title = "Sada";
    private String artist = "";
    private String artworkUrl = "";
    private Bitmap artwork;
    private long durationMs = 0;
    private long positionMs = 0;
    private boolean playing = false;
    private boolean started = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent = PendingIntent.getActivity(
                this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );

        // No media-button receiver here: system/headset buttons must reach the
        // callback below, which forwards them to the web player.
        mediaSession = new MediaSessionCompat(this, "SadaAudio");
        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
                        | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { sendAction("play", 0); }

            @Override public void onPause() { sendAction("pause", 0); }

            @Override public void onSkipToNext() { sendAction("next", 0); }

            @Override public void onSkipToPrevious() { sendAction("prev", 0); }

            @Override public void onSeekTo(long pos) { sendAction("seek", pos / 1000.0); }

            @Override public void onStop() { sendAction("stop", 0); }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            stopPlayback(intent.getBooleanExtra(EXTRA_SILENT, false));
            return START_NOT_STICKY;
        }
        if (ACTION_PLAY.equals(action)) {
            sendAction("play", 0);
            return START_NOT_STICKY;
        }
        if (ACTION_PAUSE.equals(action)) {
            sendAction("pause", 0);
            return START_NOT_STICKY;
        }
        if (ACTION_NEXT.equals(action)) {
            sendAction("next", 0);
            return START_NOT_STICKY;
        }
        if (ACTION_PREV.equals(action)) {
            sendAction("prev", 0);
            return START_NOT_STICKY;
        }
        if (ACTION_SEEK.equals(action)) {
            sendAction("seek", intent != null ? intent.getDoubleExtra(EXTRA_POSITION, 0) : 0);
            return START_NOT_STICKY;
        }

        if (intent != null) {
            title = valueOr(intent.getStringExtra(EXTRA_TITLE), title);
            artist = valueOr(intent.getStringExtra(EXTRA_ARTIST), artist);
            durationMs = intent.hasExtra(EXTRA_DURATION) ? intent.getLongExtra(EXTRA_DURATION, durationMs) : durationMs;
            positionMs = intent.hasExtra(EXTRA_POSITION) ? intent.getLongExtra(EXTRA_POSITION, positionMs) : positionMs;
            if (intent.hasExtra(EXTRA_PLAYING)) {
                playing = intent.getBooleanExtra(EXTRA_PLAYING, playing);
            }
            String nextArtwork = intent.getStringExtra(EXTRA_ARTWORK);
            if (nextArtwork != null && !nextArtwork.equals(artworkUrl)) {
                artworkUrl = nextArtwork;
                loadArtwork(artworkUrl);
            }
        }

        publish();
        return START_NOT_STICKY;
    }

    private void publish() {
        if (mediaSession == null) return;

        MediaMetadataCompat.Builder metadata = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
        if (artwork != null) metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, artwork);
        mediaSession.setMetadata(metadata.build());

        long actions = PlaybackStateCompat.ACTION_PLAY
                | PlaybackStateCompat.ACTION_PAUSE
                | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                | PlaybackStateCompat.ACTION_SEEK_TO
                | PlaybackStateCompat.ACTION_STOP;
        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(
                        playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                        positionMs,
                        1.0f,
                        SystemClock.elapsedRealtime()
                )
                .build());

        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_headset)
                .setContentTitle(title)
                .setContentText(artist)
                .setContentIntent(openIntent)
                .setDeleteIntent(actionIntent(ACTION_STOP, 5))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));

        if (artwork != null) notification.setLargeIcon(artwork);

        notification.addAction(
                android.R.drawable.ic_media_previous,
                "السابق",
                actionIntent(ACTION_PREV, 1)
        );
        notification.addAction(
                playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                playing ? "إيقاف مؤقت" : "تشغيل",
                actionIntent(playing ? ACTION_PAUSE : ACTION_PLAY, 2)
        );
        notification.addAction(
                android.R.drawable.ic_media_next,
                "التالي",
                actionIntent(ACTION_NEXT, 3)
        );

        Notification built = notification.build();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(
                        this,
                        NOTIFICATION_ID,
                        built,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );
            } else {
                startForeground(NOTIFICATION_ID, built);
            }
            started = true;
        } catch (Exception ignored) {
            // A notification-denied device can still play audio; the app UI
            // remains the fallback control surface.
        }
    }

    private void loadArtwork(String url) {
        artworkExecutor.execute(() -> {
            Bitmap decoded = null;
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(4000);
                connection.setReadTimeout(4000);
                connection.setDoInput(true);
                connection.connect();
                Bitmap raw = BitmapFactory.decodeStream(connection.getInputStream());
                if (raw != null && raw.getWidth() > 0 && raw.getHeight() > 0) {
                    int size = Math.min(320, Math.max(raw.getWidth(), raw.getHeight()));
                    float scale = size / (float) Math.max(raw.getWidth(), raw.getHeight());
                    decoded = Bitmap.createScaledBitmap(
                            raw,
                            Math.max(1, Math.round(raw.getWidth() * scale)),
                            Math.max(1, Math.round(raw.getHeight() * scale)),
                            true
                    );
                }
            } catch (Exception ignored) {
                // No artwork is fine — the title and icon still identify the track.
            } finally {
                if (connection != null) connection.disconnect();
            }
            final Bitmap result = decoded;
            mainHandler.post(() -> {
                artwork = result;
                if (started) publish();
            });
        });
    }

    private void stopPlayback(boolean silent) {
        // When JS asked us to stop, do not echo "stop" back or the web player's
        // stop handler would call this service again in a loop.
        if (!silent) sendAction("stop", 0);
        started = false;
        if (mediaSession != null) {
            mediaSession.setActive(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    private void sendAction(String action, double value) {
        MediaNotificationPlugin.emitAction(action, value);
    }

    private PendingIntent actionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, AudioPlaybackService.class);
        intent.setAction(action);
        return PendingIntent.getService(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag()
        );
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "تشغيل الصوت",
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("التحكم في تشغيل البودكاست أثناء استخدام التطبيقات الأخرى");
        channel.setSound(null, null);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }

    private static int immutableFlag() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Swiping the app away also destroys the WebView audio element, so the
        // notification must not outlive it.
        stopPlayback(true);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        artworkExecutor.shutdownNow();
        super.onDestroy();
    }
}
