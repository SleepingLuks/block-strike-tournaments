import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sleepingluks.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function verifyTelegram(payload: Record<string, unknown>, botToken: string) {
  const suppliedHash = String(payload.hash || "");
  const authDate = Number(payload.auth_date || 0);
  if (!/^[a-f0-9]{64}$/i.test(suppliedHash) || !Number.isInteger(authDate)) return false;
  if (Math.abs(Date.now() / 1000 - authDate) > 300) return false;

  const entries = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  const checkString = entries.map(([key, value]) => key + "=" + value).join("\n");

  const secret = await crypto.subtle.digest("SHA-256", encoder.encode(botToken));
  const cryptoKey = await crypto.subtle.importKey(
    "raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const expected = hex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(checkString)));
  return expected.length === suppliedHash.length &&
    [...expected].every((char, i) => char === suppliedHash[i].toLowerCase());
}

function hasPermission(admin: any, permission: string) {
  return admin.role === "main_admin" || admin.permissions?.[permission] === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const mainAdminId = Deno.env.get("MAIN_ADMIN_TELEGRAM_ID");
  if (!supabaseUrl || !secretKey || !botToken || !mainAdminId) {
    return json({ error: "Server environment is not configured" }, 500);
  }

  const db = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (body.action === "login") {
    const telegram = body.telegram;
    if (!telegram || !(await verifyTelegram(telegram, botToken))) {
      return json({ error: "Telegram authentication is invalid or expired" }, 401);
    }
    const telegramId = Number(telegram.id);
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) return json({ error: "Invalid Telegram ID" }, 400);

    let admin: any = null;
    if (String(telegramId) === mainAdminId) {
      const { data, error } = await db.from("admins").upsert({
        telegram_id: telegramId, role: "main_admin", permissions: {},
      }, { onConflict: "telegram_id" }).select("telegram_id,role,permissions").single();
      if (error) return json({ error: error.message }, 500);
      admin = data;
    } else {
      const { data, error } = await db.from("admins")
        .select("telegram_id,role,permissions").eq("telegram_id", telegramId).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      admin = data;
    }
    if (!admin) return json({ error: "This Telegram account is not an administrator" }, 403);

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const sessionToken = hex(tokenBytes.buffer);
    const tokenHash = await sha256(sessionToken);
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    await db.from("admin_sessions").delete().lt("expires_at", new Date().toISOString());
    const { error: sessionError } = await db.from("admin_sessions").insert({
      telegram_id: telegramId, token_hash: tokenHash, expires_at: expiresAt,
    });
    if (sessionError) return json({ error: sessionError.message }, 500);
    return json({
      token: sessionToken, expires_at: expiresAt,
      admin: { telegram_id: admin.telegram_id, role: admin.role, permissions: admin.permissions },
    });
  }

  const bearer = req.headers.get("Authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token || token.length !== 64) return json({ error: "Unauthorized" }, 401);
  const tokenHash = await sha256(token);
  const { data: session, error: sessionError } = await db.from("admin_sessions")
    .select("telegram_id,expires_at").eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (sessionError || !session) return json({ error: "Session expired. Sign in again." }, 401);

  const { data: admin, error: adminError } = await db.from("admins")
    .select("telegram_id,role,permissions").eq("telegram_id", session.telegram_id).maybeSingle();
  if (adminError || !admin) return json({ error: "Administrator access revoked" }, 403);

  const requirePermission = (permission: string) =>
    hasPermission(admin, permission) || admin.role === "main_admin";

  if (body.action === "create_tournament") {
    if (!requirePermission("tournaments_manage")) return json({ error: "Permission denied" }, 403);
    const { name, format, description, starts_at } = body;
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) return json({ error: "Tournament name must be 1–100 characters" }, 400);
    if (!["single_elimination", "swiss"].includes(format)) return json({ error: "Invalid tournament format" }, 400);
    const { data, error } = await db.from("tournaments").insert({
      name: name.trim(), format, description: String(description || "").slice(0, 5000),
      starts_at: starts_at || null, status: "draft",
    }).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ tournament: data });
  }

  if (body.action === "publish_tournament") {
    if (!requirePermission("tournaments_manage")) return json({ error: "Permission denied" }, 403);
    const { tournament_id, status } = body;
    if (!["upcoming", "active", "finished", "cancelled", "draft"].includes(status)) return json({ error: "Invalid status" }, 400);
    const { data, error } = await db.from("tournaments").update({ status, updated_at: new Date().toISOString() })
      .eq("id", tournament_id).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ tournament: data });
  }

  if (body.action === "add_participant") {
    if (!requirePermission("players_manage")) return json({ error: "Permission denied" }, 403);
    const nickname = String(body.nickname || "").trim();
    if (nickname.length < 1 || nickname.length > 32) return json({ error: "Nickname must be 1–32 characters" }, 400);
    const { data: player, error: playerError } = await db.from("players")
      .insert({ nickname, block_strike_id: body.block_strike_id ? String(body.block_strike_id).slice(0, 64) : null })
      .select().single();
    if (playerError) return json({ error: playerError.message }, 400);
    const { data: participant, error } = await db.from("participants")
      .insert({ tournament_id: body.tournament_id, player_id: player.id, seed: body.seed || null })
      .select("id,tournament_id,player_id,seed,player:players(nickname)").single();
    if (error) {
      await db.from("players").delete().eq("id", player.id);
      return json({ error: error.message }, 400);
    }
    return json({ participant });
  }

  if (body.action === "generate_single_elimination") {
    if (!requirePermission("matches_manage")) return json({ error: "Permission denied" }, 403);
    const tournamentId = body.tournament_id;
    const { data: tournament, error: tError } = await db.from("tournaments")
      .select("id,format,status").eq("id", tournamentId).single();
    if (tError || !tournament) return json({ error: "Tournament not found" }, 404);
    if (tournament.format !== "single_elimination") return json({ error: "This action is only for Single Elimination" }, 400);
    const { data: existing } = await db.from("rounds").select("id").eq("tournament_id", tournamentId).limit(1);
    if (existing?.length) return json({ error: "Rounds already exist for this tournament" }, 409);
    const { data: participants, error: pError } = await db.from("participants")
      .select("id,seed").eq("tournament_id", tournamentId).order("seed", { ascending: true, nullsFirst: false }).order("created_at");
    if (pError) return json({ error: pError.message }, 500);
    if (!participants || participants.length < 2) return json({ error: "At least two participants are required" }, 400);

    const size = 2 ** Math.ceil(Math.log2(participants.length));
    const roundCount = Math.log2(size);
    const slots: (string | null)[] = [...participants.map(p => p.id), ...Array(size - participants.length).fill(null)];
    const roundIds: string[] = [];
    const matchesByRound: any[][] = [];
    for (let round = 1; round <= roundCount; round++) {
      const { data: roundRow, error: roundError } = await db.from("rounds").insert({
        tournament_id: tournamentId, round_number: round, title: "Round " + round,
      }).select().single();
      if (roundError) return json({ error: roundError.message }, 500);
      roundIds.push(roundRow.id);
      const count = size / (2 ** round);
      const rows = Array.from({ length: count }, (_, i) => ({
        tournament_id: tournamentId, round_id: roundRow.id,
        player1_participant_id: round === 1 ? slots[i * 2] : null,
        player2_participant_id: round === 1 ? slots[i * 2 + 1] : null,
        status: "pending",
      }));
      const { data: matches, error: matchError } = await db.from("matches").insert(rows).select();
      if (matchError) return json({ error: matchError.message }, 500);
      matchesByRound.push(matches || []);
    }
    // Automatically advance first-round byes.
    for (let i = 0; i < matchesByRound[0].length; i++) {
      const match = matchesByRound[0][i];
      const onlyPlayer = match.player1_participant_id || match.player2_participant_id;
      if (onlyPlayer && (!match.player1_participant_id || !match.player2_participant_id)) {
        await db.from("matches").update({
          status: "bye", winner_participant_id: onlyPlayer, completed_at: new Date().toISOString(),
        }).eq("id", match.id);
        const next = matchesByRound[1]?.[Math.floor(i / 2)];
        if (next) {
          const field = i % 2 === 0 ? "player1_participant_id" : "player2_participant_id";
          await db.from("matches").update({ [field]: onlyPlayer }).eq("id", next.id);
        }
      }
    }
    await db.from("tournaments").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", tournamentId);
    return json({ rounds: roundCount, matches: matchesByRound.reduce((n, r) => n + r.length, 0) });
  }

  if (body.action === "set_match_result") {
    if (!requirePermission("matches_manage")) return json({ error: "Permission denied" }, 403);
    const { match_id, player1_score, player2_score } = body;
    if (!Number.isInteger(player1_score) || !Number.isInteger(player2_score) || player1_score < 0 || player2_score < 0 || player1_score === player2_score) {
      return json({ error: "Scores must be non-negative integers and cannot be tied" }, 400);
    }
    const { data: match, error } = await db.from("matches").select("*").eq("id", match_id).single();
    if (error || !match) return json({ error: "Match not found" }, 404);
    if (!match.player1_participant_id || !match.player2_participant_id) return json({ error: "Both players must be assigned before entering a result" }, 400);
    const winner = player1_score > player2_score ? match.player1_participant_id : match.player2_participant_id;
    const { error: updateError } = await db.from("matches").update({
      player1_score, player2_score, winner_participant_id: winner,
      status: "completed", completed_at: new Date().toISOString(),
    }).eq("id", match_id);
    if (updateError) return json({ error: updateError.message }, 500);

    const { data: tournament } = await db.from("tournaments").select("format").eq("id", match.tournament_id).single();
    if (tournament?.format === "single_elimination") {
      const { data: rounds } = await db.from("rounds").select("id,round_number")
        .eq("tournament_id", match.tournament_id).order("round_number");
      const currentIndex = rounds?.findIndex(r => r.id === match.round_id) ?? -1;
      if (currentIndex >= 0 && currentIndex < (rounds?.length || 0) - 1) {
        const { data: currentMatches } = await db.from("matches").select("id")
          .eq("round_id", match.round_id).order("created_at");
        const matchIndex = currentMatches?.findIndex(m => m.id === match_id) ?? -1;
        const { data: nextMatches } = await db.from("matches").select("id")
          .eq("round_id", rounds![currentIndex + 1].id).order("created_at");
        const next = nextMatches?.[Math.floor(matchIndex / 2)];
        if (next && matchIndex >= 0) {
          const field = matchIndex % 2 === 0 ? "player1_participant_id" : "player2_participant_id";
          await db.from("matches").update({ [field]: winner }).eq("id", next.id);
        }
      } else if (currentIndex === (rounds?.length || 0) - 1) {
        await db.from("tournaments").update({ status: "finished", updated_at: new Date().toISOString() })
          .eq("id", match.tournament_id);
      }
    }
    return json({ winner_participant_id: winner });
  }

  if (body.action === "manage_admin") {
    if (admin.role !== "main_admin") return json({ error: "Only the main administrator can manage admins" }, 403);
    const targetId = Number(body.telegram_id);
    if (!Number.isSafeInteger(targetId) || targetId <= 0 || targetId === Number(mainAdminId)) return json({ error: "Invalid target Telegram ID" }, 400);
    if (body.operation === "remove") {
      const { error } = await db.from("admins").delete().eq("telegram_id", targetId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }
    if (body.operation === "grant") {
      const allowed = ["tournaments_manage", "players_manage", "matches_manage"];
      const permissions: Record<string, boolean> = {};
      for (const key of allowed) permissions[key] = body.permissions?.[key] === true;
      const { error } = await db.from("admins").upsert({
        telegram_id: targetId, role: "admin", permissions,
      }, { onConflict: "telegram_id" });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }
  }

  return json({ error: "Unknown action" }, 400);
});
