import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Public browser configuration. RLS protects every exposed table.
const SUPABASE_URL = "https://cmnkimnhogeatciffpkm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vOMTWsxLhOt2bjyFFUX-Rg_Y2AUwpxN";
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (selector) => document.querySelector(selector);
const lang = () => localStorage.getItem("bst-lang") || "ru";
const tr = (ru, en) => lang() === "ru" ? ru : en;
const esc = (value = "") => String(value).replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]));
const formatName = (value) => value === "single_elimination" ? "Single Elimination" : "Swiss System";
const statusName = (value) => ({
  draft: tr("Черновик","Draft"), upcoming: tr("Предстоящий","Upcoming"),
  active: tr("Идёт","Active"), finished: tr("Завершён","Finished"),
  cancelled: tr("Отменён","Cancelled")
}[value] || value);
const dateText = (value) => value ? new Date(value).toLocaleDateString(lang() === "ru" ? "ru-RU" : "en-US") : "—";
const errorText = (error) => {
  console.error("Supabase:", error);
  return tr("Не удалось загрузить данные. Проверь настройки Data API и RLS в Supabase.",
            "Could not load data. Check the Supabase Data API and RLS settings.");
};
const showError = (container, error) => {
  if (container) container.innerHTML = '<div class="table-empty">' + esc(errorText(error)) + '</div>';
};
const card = (t) => `
  <a class="format-card tournament-card" href="tournament.html?id=${encodeURIComponent(t.id)}">
    <span class="format-index">${esc(formatName(t.format))} · ${esc(statusName(t.status))}</span>
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.description || tr("Описание пока не добавлено.","No description yet."))}</p>
    <span class="format-link">${esc(tr("Открыть турнир","Open tournament"))} <b>↗</b></span>
  </a>`;

async function loadHome() {
  const root = $("#homeTournaments");
  if (!root) return;
  const { data, error } = await db.from("tournaments")
    .select("id,name,description,format,status,starts_at")
    .in("status", ["upcoming","active"])
    .order("starts_at", { ascending: true, nullsFirst: false }).limit(3);
  if (error) return showError(root, error);
  if (!data.length) return;
  root.innerHTML = data.map(card).join("");
}

async function loadTournamentList() {
  const root = $("#tournamentList");
  if (!root) return;
  const formatButtons = [...document.querySelectorAll(".filter-tab")];
  const statusSelect = $("#statusFilter");
  const params = new URLSearchParams(location.search);
  let format = params.get("format") || "all";
  if (format === "single") format = "single_elimination";
  if (format === "swiss") format = "swiss";
  let status = "all";
  const apply = async () => {
    formatButtons.forEach(b => b.classList.toggle("active",
      (format === "all" && b.dataset.format === "all") ||
      (format === "single_elimination" && b.dataset.format === "single") ||
      (format === "swiss" && b.dataset.format === "swiss")));
    const query = db.from("tournaments")
      .select("id,name,description,format,status,starts_at")
      .neq("status","draft").order("starts_at", { ascending: true, nullsFirst: false });
    if (format !== "all") query.eq("format", format);
    if (status !== "all") query.eq("status", status);
    const { data, error } = await query;
    if (error) return showError(root, error);
    if (!data.length) {
      root.innerHTML = `<div class="empty-state listing-empty"><div class="empty-icon">＋</div><h2>${esc(tr("ТУРНИРОВ ПОКА НЕТ","NO TOURNAMENTS YET"))}</h2><p>${esc(tr("По выбранным фильтрам турниров нет.","No tournaments match these filters."))}</p></div>`;
      return;
    }
    root.innerHTML = data.map(card).join("");
  };
  formatButtons.forEach(btn => btn.addEventListener("click", () => {
    format = btn.dataset.format === "single" ? "single_elimination" : btn.dataset.format;
    apply();
  }));
  if (statusSelect) statusSelect.addEventListener("change", () => { status = statusSelect.value; apply(); });
  await apply();
}

async function loadTournamentDetail() {
  const id = new URLSearchParams(location.search).get("id");
  const cover = $("#tournamentCover");
  if (!cover) return;
  if (!id) {
    $("#detailName").textContent = tr("ТУРНИР НЕ ВЫБРАН","NO TOURNAMENT SELECTED");
    $("#detailDescription").textContent = tr("Открой турнир из общего списка.","Open a tournament from the directory.");
    return;
  }
  const { data: t, error } = await db.from("tournaments")
    .select("id,name,description,format,status,starts_at,ends_at")
    .eq("id", id).maybeSingle();
  if (error) return showError(cover, error);
  if (!t) {
    $("#detailName").textContent = tr("ТУРНИР НЕ НАЙДЕН","TOURNAMENT NOT FOUND");
    $("#detailDescription").textContent = tr("Возможно, турнир удалён или ещё не опубликован.","The tournament may have been removed or is not published.");
    return;
  }
  document.title = t.name + " — Block Strike Tournaments";
  $("#detailName").textContent = t.name;
  $("#detailDescription").textContent = t.description || "";
  $("#detailStatus").textContent = statusName(t.status).toUpperCase();
  $("#detailFormat").textContent = formatName(t.format);
  $("#detailStatusFact").textContent = statusName(t.status);
  $("#detailDates").textContent = dateText(t.starts_at) + (t.ends_at ? " — " + dateText(t.ends_at) : "");
  const [pRes, rRes, mRes] = await Promise.all([
    db.from("participants").select("id,seed,player:players(nickname)").eq("tournament_id", id).order("seed", {ascending:true,nullsFirst:false}),
    db.from("rounds").select("id,round_number,title").eq("tournament_id", id).order("round_number"),
    db.from("matches").select("id,round_id,player1_participant_id,player2_participant_id,winner_participant_id,player1_score,player2_score,status,scheduled_at").eq("tournament_id", id).order("created_at")
  ]);
  if (pRes.error) showError($("#detailParticipants"), pRes.error);
  if (rRes.error) showError($("#detailMatches"), rRes.error);
  if (mRes.error) showError($("#detailMatches"), mRes.error);
  const participants = pRes.data || [];
  const rounds = rRes.data || [];
  const matches = mRes.data || [];
  $("#detailParticipantCount").textContent = String(participants.length);
  const names = new Map(participants.map(p => [p.id, p.player?.nickname || "—"]));
  $("#detailParticipants").innerHTML = participants.length
    ? '<div class="table-empty">' + participants.map((p,i) => `<div style="padding:8px;border-bottom:1px solid #292932">${i+1}. ${esc(p.player?.nickname || "—")}</div>`).join("") + '</div>'
    : '<div class="table-empty">' + esc(tr("Список участников пока пуст.","No participants yet.")) + '</div>';
  const roundName = new Map(rounds.map(r => [r.id, r.title || tr("Раунд ","Round ") + r.round_number]));
  $("#detailMatches").innerHTML = matches.length
    ? matches.map(m => `<div style="display:flex;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid #292932;font-size:10px"><span>${esc(roundName.get(m.round_id) || "")} · ${esc(names.get(m.player1_participant_id) || "—")} — ${esc(names.get(m.player2_participant_id) || "—")}</span><b>${m.player1_score ?? "—"} : ${m.player2_score ?? "—"}</b></div>`).join("")
    : '<div class="table-empty">' + esc(tr("Матчи пока не добавлены.","No matches yet.")) + '</div>';
  if (t.format === "single_elimination") {
    $("#detailBracket").innerHTML = matches.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:12px;padding:18px">' + matches.map(m => `<div class="bracket-node">${esc(names.get(m.player1_participant_id) || "—")}<br><b>${m.player1_score ?? "—"} : ${m.player2_score ?? "—"}</b><br>${esc(names.get(m.player2_participant_id) || "—")}</div>`).join("") + '</div>'
      : '<div class="table-empty">' + esc(tr("Сетка ещё не сформирована.","The bracket has not been generated yet.")) + '</div>';
  } else {
    $("#detailBracket").innerHTML = '<div class="table-empty">' + esc(tr("Для Swiss System используется таблица результатов.","Swiss System uses a standings table.")) + '</div>';
  }
  if (t.format === "swiss") {
    $("#detailStandings").innerHTML = participants.length
      ? '<div class="table-empty">' + participants.map(p => `<div style="padding:8px;border-bottom:1px solid #292932">${esc(p.player?.nickname || "—")}</div>`).join("") + '</div>'
      : '<div class="table-empty">' + esc(tr("Таблица пока не сформирована.","Standings are not available yet.")) + '</div>';
  } else {
    $("#standings").style.display = "none";
  }
}

loadHome();
loadTournamentList();
loadTournamentDetail();
