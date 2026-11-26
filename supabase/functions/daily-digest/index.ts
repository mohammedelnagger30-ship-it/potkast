import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentHour = now.getUTCHours();

    // Fetch all notification settings where daily tip or reminder is enabled
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*");

    if (settingsError) {
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: "No settings found", sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const setting of settings) {
      const reminderHour = parseInt((setting.reminder_time || "08:00").split(":")[0], 10);
      const shouldSendTip = setting.daily_tip_enabled && currentHour === reminderHour;
      const shouldSendReminder = setting.reminder_enabled && currentHour === reminderHour;

      if (!shouldSendTip && !shouldSendReminder) continue;

      // 1. Send daily tip
      if (shouldSendTip) {
        let tipSent = false;

        if (setting.categories && setting.categories.length > 0) {
          // Get category IDs matching the user's selected categories
          const interestCategoryNames = setting.categories.map((c: string) => {
            const map: Record<string, string> = {
              spiritual: "روحاني / ديني",
              science: "العلوم",
              culture: "ثقافة وأدب",
              health: "الصحة واللياقة",
              career: "المسيرة المهنية",
              finance: "المال والاستثمار",
              relationships: "العلاقات والأسرة",
              mental: "الصحة النفسية",
              leadership: "القيادة",
              technology: "التقنية",
            };
            return map[c] || null;
          }).filter(Boolean);

          if (interestCategoryNames.length > 0) {
            const { data: cats } = await supabase
              .from("categories")
              .select("id")
              .in("name_ar", interestCategoryNames);
            if (cats && cats.length > 0) {
              const catIds = cats.map((c) => c.id);
              const { data: tips } = await supabase
                .from("tips")
                .select("*")
                .in("category_id", catIds);
              if (tips && tips.length > 0) {
                const idx = today.split("-").reduce((acc, p) => acc + parseInt(p, 10), 0) % tips.length;
                const tip = tips[idx];
                await supabase.from("notifications").insert({
                  user_id: setting.user_id,
                  type: "tip",
                  title: `نصيحة اليوم: ${tip.type === "verse" ? "آية" : tip.type === "hadith" ? "حديث" : tip.type === "quote" ? "اقتباس" : tip.type === "fact" ? "معلومة" : "نصيحة"}`,
                  body: `${tip.text_ar}${tip.author_or_source ? " — " + tip.author_or_source : ""}`,
                });
                sentCount++;
                tipSent = true;
              }
            }
          }
        }

        // Fallback: any tip. Do not skip the reminder below when a tip was found.
        if (!tipSent) {
          const { data: allTips } = await supabase.from("tips").select("*");
          if (allTips && allTips.length > 0) {
            const idx = today.split("-").reduce((acc, p) => acc + parseInt(p, 10), 0) % allTips.length;
            const tip = allTips[idx];
            await supabase.from("notifications").insert({
              user_id: setting.user_id,
              type: "tip",
              title: "نصيحة اليوم",
              body: `${tip.text_ar}${tip.author_or_source ? " — " + tip.author_or_source : ""}`,
            });
            sentCount++;
          }
        }
      }

      // 2. Send pending missions reminder
      if (shouldSendReminder) {
        const { data: pendingMissions } = await supabase
          .from("user_missions")
          .select("id, mission:missions(title)")
          .eq("user_id", setting.user_id)
          .eq("assigned_date", today)
          .in("status", ["pending", "in_progress"]);

        if (pendingMissions && pendingMissions.length > 0) {
          await supabase.from("notifications").insert({
            user_id: setting.user_id,
            type: "reminder",
            title: "تذكير: مهام غير مكتملة",
            body: `لديك ${pendingMissions.length} مهام غير مكتملة اليوم. ابدأ الآن وحافظ على سلسلتك!`,
            link: "/missions",
          });
          sentCount++;
        }
      }

      // 3. Streak lost check — if user had a streak but didn't complete any mission today or yesterday
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const { data: recentCompletions } = await supabase
        .from("user_missions")
        .select("completed_at")
        .eq("user_id", setting.user_id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1);

      if (recentCompletions && recentCompletions.length > 0 && recentCompletions[0].completed_at) {
        const lastCompleted = recentCompletions[0].completed_at.split("T")[0];
        if (lastCompleted < yesterday) {
          // Check if we already sent a streak reminder recently (last 2 days)
          const { data: existingStreakNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", setting.user_id)
            .eq("type", "streak_lost")
            .gte("created_at", new Date(Date.now() - 2 * 86400000).toISOString())
            .limit(1);

          if (!existingStreakNotif || existingStreakNotif.length === 0) {
            await supabase.from("notifications").insert({
              user_id: setting.user_id,
              type: "streak_lost",
              title: "لا تدع سلسلتك تنقطع!",
              body: "انقطعت سلسلتك اليومية. كل بداية جديدة قوة — ابدأ مهمة اليوم واستعد عادتك!",
              link: "/missions",
            });
            sentCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: "Digest processed", sent: sentCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
