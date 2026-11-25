package com.potkast.app;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdatePlugin.class);
        registerPlugin(TextScalePlugin.class);
        registerPlugin(MediaNotificationPlugin.class);
        registerPlugin(AudioDownloadPlugin.class);
        super.onCreate(savedInstanceState);
        allowPlaybackFromMediaNotification();
        applyTextScale();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyTextScale();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyTextScale();
    }

    private void applyTextScale() {
        if (getBridge() != null) {
            TextScalePlugin.apply(this, getBridge().getWebView());
        }
    }

    /**
     * Notification/headset play actions are native events, not WebView user
     * gestures. Without this, audio.play() is rejected while the app is in the
     * background and the user has to reopen it just to resume.
     */
    private void allowPlaybackFromMediaNotification() {
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }
}
