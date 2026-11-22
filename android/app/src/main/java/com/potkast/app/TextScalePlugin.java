package com.potkast.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the WebView text size independent from Xiaomi "Simple mode" / system
 * font scaling when the user turns on the fixed-text-size preference.
 */
@CapacitorPlugin(name = "TextScale")
public class TextScalePlugin extends Plugin {

    private static final String PREFS_NAME = "sada_text_scale";
    private static final String KEY_FIXED = "fixed";
    private static final int NORMAL_ZOOM = 100;

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static boolean isFixed(Context context) {
        return prefs(context).getBoolean(KEY_FIXED, false);
    }

    static void setFixed(Context context, boolean fixed) {
        prefs(context).edit().putBoolean(KEY_FIXED, fixed).apply();
    }

    /** 100 keeps the designed size; otherwise follow the current system font scale. */
    static int targetZoom(Context context, boolean fixed) {
        if (fixed) return NORMAL_ZOOM;
        float scale = context.getResources().getConfiguration().fontScale;
        if (Float.isNaN(scale) || Float.isInfinite(scale) || scale <= 0) return NORMAL_ZOOM;
        return Math.max(50, Math.min(300, Math.round(scale * 100)));
    }

    static void apply(Context context, WebView webView) {
        if (webView == null) {
            Log.d("TextScale", "apply skipped: no WebView");
            return;
        }
        try {
            int zoom = targetZoom(context, isFixed(context));
            webView.getSettings().setTextZoom(zoom);
            Log.d("TextScale", "apply fixed=" + isFixed(context) + " zoom=" + zoom
                    + " current=" + webView.getSettings().getTextZoom());
        } catch (Exception ex) {
            Log.d("TextScale", "apply failed: " + ex.getMessage());
            // Older WebViews may not expose text zoom; the CSS fallback still applies.
        }
    }

    @PluginMethod
    public void setFixed(PluginCall call) {
        boolean fixed = call.getBoolean("fixed", false);
        setFixed(getContext(), fixed);

        // Capacitor plugin methods run on a background bridge thread, but every
        // WebView setting must be changed on the WebView's own (main) thread.
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView != null) {
            webView.post(() -> apply(getContext(), webView));
        }

        JSObject result = new JSObject();
        result.put("fixed", fixed);
        call.resolve(result);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        boolean fixed = isFixed(getContext());
        JSObject result = new JSObject();
        result.put("fixed", fixed);
        result.put("zoom", targetZoom(getContext(), fixed));
        call.resolve(result);
    }
}
