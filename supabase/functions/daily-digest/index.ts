import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Public VAPID key. The private key is a Supabase Edge Function secret
// (VAPID_PRIVATE_KEY, base64url scalar) — never ship it to the client.
const VAPID_PUBLIC_KEY =
  "BGal4dQ87wB16f4-F7jpJGlCfkzpIeKfT5HIaIK3WIDsIeY0dbS0S-SjKtZWJoSubkcOj6QZd220iL04Htndn_Q";
const VAPID_SUBJECT = "mailto:admin@sada.app";

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

type Delivery = {
  success: boolean;
  reason?: string;
  pushSubscription?: { endpoint: string; keys: { p256dh: string; auth: string } } | null;
  pushPlatform?: string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    let pushReady = false;
    if (privateKey) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
      pushReady = true;
    }

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

    const sendPush = async (delivery: Delivery, title: string, body: string, link: string | null, userId: string) => {
      const subscription = delivery.pushSubscription;
      if (!pushReady || !subscription?.endpoint || !subscription?.keys?.p256dh) return false;
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
          console.error("push failed", status || String(err));
        }
        return false;
      }
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
      await sendPush(result, "إشعار تجريبي", "سدى — وصل الإشعار بنجاح", "/notifications", data.user.id);
      return json({ sent: 1, pushReady });
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
          .select("push_subscription, push_enabled")
          .eq("user_id", item.user_id)
          .maybeSingle();
        if (subs?.push_enabled && subs?.push_subscription) {
          const delivered = await sendPush(
            { success: true, pushSubscription: subs.push_subscription as any },
            item.title, item.body || "", item.link || "/notifications", item.user_id,
          );
          if (delivered) pushCount++;
        }
        await supabase.from("notifications").update({ push_sent: true }).eq("id", item.id);
      }
    }

    return json({ message: "Digest processed", sent: sentCount, push: pushCount, pushReady });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
