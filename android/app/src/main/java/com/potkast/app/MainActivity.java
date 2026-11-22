package com.potkast.app;

import android.content.res.Configuration;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdatePlugin.class);
        registerPlugin(TextScalePlugin.class);
        super.onCreate(savedInstanceState);
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
}
