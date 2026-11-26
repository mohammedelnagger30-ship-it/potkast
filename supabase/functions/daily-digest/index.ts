import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Public VAPID key. The private key is a Supabase Edge Function secret
// (VAPID_PRIVATE_KEY, base64url scalar) — never ship it to the client.
const VAPID_PUBLIC_KEY =
  "BGal4dQ87wB16f4-F7jpJGlCfkzpIeKfT5HIaIK3WIDsIeY0dbS0S-SjKtZWJoSubkcOj6QZd220iL04Htndn_Q";
const VAPID_SUBJECT = "mailto:admin@sada.app";
const FCM_CHANNEL = "sada-notifications";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Sada-Cron-Secret",
};

const DEFAULT_TYPES = [
  "tip", "reminder", "streak_lost", "mission_assigned", "mission_completed",
  "achievement", "new_episode", "app_update", "admin",
];

type WebSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type Delivery = {
  success: boolean;
  reason?: string;
  pushSubscription?: WebSubscription | null;
  pushPlatform?: string | null;
  deviceToken?: string | null;
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function zonedParts(date: Date, timeZone: string) {
  const safeZone = timeZone || "UTC";
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: safeZone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      })
        .formatToParts(date)
        .map((p) => [p.type, p.value]),
    );
    const localDate = `${parts.year}-${parts.month}-${parts.day}`;
    const minutes = ((Number(parts.hour) % 24) * 60) + Number(parts.minute);
    return { localDate, minutes };
  } catch {
    return {
      localDate: date.toISOString().split("T")[0],
      minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
    };
  }
}

function reminderMinutes(value: string | null | undefined): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!match) return 8 * 60;
  const hours = Math.min(23, Number(match[1]));
  const minutes = Math.min(59, Number(match[2]));
  return hours * 60 + minutes;
}

function isEnabled(setting: any, type: string): boolean {
  const types: string[] = Array.isArray(setting.types_enabled)
    ? setting.types_enabled
    : DEFAULT_TYPES;
  return types.includes(type);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBytes(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    const account = JSON.parse(raw) as ServiceAccount;
    return account.project_id && account.client_email && account.private_key
      ? account
      : null;
  } catch {
    try {
      const account = JSON.parse(atob(raw)) as ServiceAccount;
      return account.project_id && account.client_email && account.private_key
        ? account
        : null;
    } catch {
      console.error("FCM_SERVICE_ACCOUNT is not valid JSON");
      return null;
    }
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getFcmAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    alg: "RS256",
    typ: "JWT",
  })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  })));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`FCM token request failed: ${response.status}`);
  }
  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: issuedAt + Number(data.expires_in || 3600),
  };
  return cachedToken.value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (vapidPrivateKey) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, vapidPrivateKey);
    }
    const serviceAccount = parseServiceAccount();

    const enqueue = async (
      userId: string, type: string, title: string, body: string,
      link: string | null, day: string, force = false,
    ): Promise<Delivery> => {
      const { data, error } = await supabase.rpc("enqueue_notification", {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_body: body,
        p_link: link,
        p_day: day,
        p_force: force,
      });
      if (error) {
        console.error("enqueue_notification failed", error.message);
        return { success: false, reason: error.message };
      }
      return (data as Delivery) || { success: false, reason: "no result" };
    };

    const deliverWebPush = async (
      subscription: WebSubscription, title: string, body: string,
      link: string | null, userId: string,
    ): Promise<boolean> => {
      if (!vapidPrivateKey) return false;
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title,
          body,
          url: link || "/notifications",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        }));
        return true;
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("notification_settings").update({
            push_enabled: false, push_subscription: null, updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
        } else {
          console.error("Web Push failed", status || String(err));
        }
        return false;
      }
    };

    const deliverFcmPush = async (
      deviceToken: string | null | undefined, title: string, body: string,
      link: string | null, userId: string,
    ): Promise<boolean> => {
      if (!deviceToken || !serviceAccount) return false;
      try {
        const accessToken = await getFcmAccessToken(serviceAccount);
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: deviceToken,
                notification: { title, body },
                data: {
                  url: link || "/notifications",
                  title,
                  body,
                },
                android: {
                  ttl: "3600s",
                  notification: {
                    channelId: FCM_CHANNEL,
                    notificationPriority: "PRIORITY_HIGH",
                    visibility: "PUBLIC",
                  },
                },
              },
            }),
          },
        );
        if (response.ok) return true;
        const detail = await response.text();
        console.error("FCM send failed", response.status, detail.slice(0, 300));
        if ([400, 401, 403, 404].includes(response.status)) {
          cachedToken = null;
          await supabase.from("notification_settings").update({
            device_token: null, updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
        }
        return false;
      } catch (err) {
        console.error("FCM send error", String(err));
        return false;
      }
    };

    const sendPush = async (
      delivery: Delivery, title: string, body: string, link: string | null, userId: string,
    ): Promise<boolean> => {
      const webSent = delivery.pushSubscription
        ? await deliverWebPush(delivery.pushSubscription, title, body, link, userId)
        : false;
      const fcmSent = delivery.deviceToken
        ? await deliverFcmPush(delivery.deviceToken, title, body, link, userId)
        : false;
      return webSent || fcmSent;
    };

    const requestBody = await req.json().catch(() => ({}));

    // Explicit test notification from the settings screen (user-authenticated).
    if (requestBody?.action === "test") {
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Missing authorization" }, 401);
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) return json({ error: "Invalid session" }, 401);

      const local = zonedParts(new Date(), "UTC");
      const result = await enqueue(
        data.user.id, "tip", "إشعار تجريبي",
        "وصل الإشعار بنجاح — هتصلك النصائح والتذكيرات هنا وعلى جهازك.",
        "/notifications", local.localDate, true,
      );
      if (!result.success) return json({ error: result.reason || "failed" }, 500);
      const pushed = await sendPush(result, "إشعار تجريبي", "سدى — وصل الإشعار بنجاح", "/notifications", data.user.id);
      return json({ sent: 1, pushed, webPush: !!vapidPrivateKey, fcm: !!serviceAccount });
    }

    // Scheduled digest. Optional shared secret protects the public endpoint.
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && req.headers.get("x-sada-cron-secret") !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const utcToday = now.toISOString().split("T")[0];

    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*");
    if (settingsError) return json({ error: settingsError.message }, 500);
    if (!settings || settings.length === 0) return json({ sent: 0, message: "No settings found" });

    let sentCount = 0;
    let pushCount = 0;

    for (const setting of settings) {
      const local = zonedParts(now, setting.timezone);
      const atReminder = isEnabled(setting, "tip") || isEnabled(setting, "reminder")
        ? local.minutes >= reminderMinutes(setting.reminder_time) &&
          local.minutes < reminderMinutes(setting.reminder_time) + 5
        : false;

      // Daily tip — one per user per local day.
      if (atReminder && isEnabled(setting, "tip")) {
        const interestNames: Record<string, string> = {
          spiritual: "روحاني / ديني", science: "العلوم", culture: "ثقافة وأدب",
          health: "الصحة واللياقة", career: "المسيرة المهنية", finance: "المال والاستثمار",
          relationships: "العلاقات والأسرة", mental: "الصحة النفسية",
          leadership: "القيادة", technology: "التقنية",
        };
        const names = (setting.categories || []).map((c: string) => interestNames[c]).filter(Boolean);
        let tips: any[] = [];
        if (names.length > 0) {
          const { data: cats } = await supabase.from("categories").select("id").in("name_ar", names);
          const catIds = (cats || []).map((c) => c.id);
          if (catIds.length) {
            const { data } = await supabase.from("tips").select("*").in("category_id", catIds);
            tips = data || [];
          }
        }
        if (!tips.length) {
          const { data } = await supabase.from("tips").select("*");
          tips = data || [];
        }
        if (tips.length) {
          const idx = local.localDate.split("-").reduce((a, p) => a + Number(p), 0) % tips.length;
          const tip = tips[idx];
          const title = `نصيحة اليوم: ${tip.type === "verse" ? "آية" : tip.type === "hadith" ? "حديث" : tip.type === "quote" ? "اقتباس" : tip.type === "fact" ? "معلومة" : "نصيحة"}`;
          const body = `${tip.text_ar}${tip.author_or_source ? " — " + tip.author_or_source : ""}`;
          const result = await enqueue(setting.user_id, "tip", title, body, null, local.localDate);
          if (result.success) {
            sentCount++;
            if (await sendPush(result, title, body, null, setting.user_id)) pushCount++;
          }
        }
      }

      // Pending mission reminder — one per user per local day.
      if (atReminder && isEnabled(setting, "reminder")) {
        const { data: pending } = await supabase
          .from("user_missions")
          .select("id")
          .eq("user_id", setting.user_id)
          .eq("assigned_date", utcToday)
          .in("status", ["pending", "in_progress"]);
        if (pending && pending.length) {
          const title = "تذكير: مهام غير مكتملة";
          const body = `لديك ${pending.length} مهام غير مكتملة اليوم. ابدأ الآن وحافظ على سلسلتك!`;
          const result = await enqueue(setting.user_id, "reminder", title, body, "/missions", local.localDate);
          if (result.success) {
            sentCount++;
            if (await sendPush(result, title, body, "/missions", setting.user_id)) pushCount++;
          }
        }
      }

      // Streak encouragement — one per user per local day.
      if (isEnabled(setting, "streak_lost")) {
        const { data: recent } = await supabase
          .from("user_missions")
          .select("completed_at")
          .eq("user_id", setting.user_id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1);
        const lastDay = recent?.[0]?.completed_at?.split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        if (lastDay && lastDay < yesterday) {
          const title = "لا تدع سلسلتك تنقطع!";
          const body = "انقطعت سلسلتك اليومية. كل بداية جديدة قوة — ابدأ مهمة اليوم واستعد عادتك!";
          const result = await enqueue(setting.user_id, "streak_lost", title, body, "/missions", local.localDate);
          if (result.success) {
            sentCount++;
            if (await sendPush(result, title, body, "/missions", setting.user_id)) pushCount++;
          }
        }
      }
    }

    // Drain all pending push deliveries (missions, achievements, admin, updates...).
    const { data: pendingPush, error: pendingError } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, link")
      .eq("push_sent", false)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString())
      .limit(100);
    if (!pendingError && pendingPush) {
      for (const item of pendingPush) {
        const { data: subs } = await supabase
          .from("notification_settings")
          .select("push_subscription, push_enabled, device_token")
          .eq("user_id", item.user_id)
          .maybeSingle();
        if (subs?.push_enabled) {
          const delivered = await sendPush(
            {
              success: true,
              pushSubscription: subs.push_subscription as WebSubscription | null,
              deviceToken: subs.device_token,
            },
            item.title, item.body || "", item.link || "/notifications", item.user_id,
          );
          if (delivered) pushCount++;
        }
        await supabase.from("notifications").update({ push_sent: true }).eq("id", item.id);
      }
    }

    return json({
      message: "Digest processed",
      sent: sentCount,
      push: pushCount,
      webPush: !!vapidPrivateKey,
      fcm: !!serviceAccount,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
