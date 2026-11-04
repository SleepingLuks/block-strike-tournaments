const API = "https://cmnkimnhogeatciffpkm.supabase.co/functions/v1/admin-api";
const API_KEY = "sb_publishable_vOMTWsxLhOt2bjyFFUX-Rg_Y2AUwpxN";
const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const loginMessage = document.getElementById("loginMessage");
const createMessage = document.getElementById("createAdminMessage");
let sessionToken = sessionStorage.getItem("bst-admin-token") || "";
let currentAdmin = null;

async function request(action, payload = {}, authenticated = true) {
  const headers = { "Content-Type": "application/json", "apikey": API_KEY };
  if (authenticated && sessionToken) headers.Authorization = "Bearer " + sessionToken;
  const response = await fetch(API, { method: "POST", headers, body: JSON.stringify({ action, ...payload }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Ошибка сервера");
  return result;
}
function showError(element, error) { element.textContent = error?.message || String(error); }
function permissionsFromForm(form) {
  const values = [...form.querySelectorAll('input[name="permission"]:checked')].map(x => x.value);
  return { tournaments_manage: values.includes("tournaments_manage"), players_manage: values.includes("players_manage"), matches_manage: values.includes("matches_manage") };
}
function permissionLabels(p) {
  const names = { tournaments_manage: "Турниры", players_manage: "Игроки", matches_manage: "Матчи" };
  return Object.keys(names).filter(k => p?.[k]).map(k => names[k]).join(" · ") || "Нет выданных прав";
}
function renderAdmin(admin) {
  currentAdmin = admin;
  loginView.hidden = true;
  adminView.hidden = false;
  document.getElementById("welcomeText").textContent = admin.username;
  document.getElementById("roleLabel").textContent = admin.role === "main_admin" ? "MAIN ADMINISTRATOR" : "MODERATOR";
  const owner = admin.role === "main_admin";
  document.getElementById("accountManagement").hidden = !owner;
  tournamentManagement.hidden = !canManageTournaments(admin);
  if (owner) loadAdmins();
  if (canManageTournaments(admin)) loadTournaments();
}
async function loadAdmins() {
  const list = document.getElementById("adminList");
  try {
    const { admins } = await request("list_admins");
    list.innerHTML = "<h3>Созданные аккаунты</h3>";
    for (const item of admins) {
      const row = document.createElement("div");
      row.className = "admin-account";
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.username + (item.role === "main_admin" ? " · ГЛАВНЫЙ" : "");
      const details = document.createElement("small");
      details.textContent = item.role === "main_admin" ? "Полный доступ" : permissionLabels(item.permissions);
      const status = document.createElement("small");
      status.className = "admin-status " + (item.is_active ? "active" : "");
      status.textContent = item.is_active ? "Активен" : "Отключён";
      info.append(name, details, status);
      row.append(info);
      if (item.role !== "main_admin") {
        const actions = document.createElement("div");
        actions.className = "admin-actions";
        const toggle = document.createElement("button");
        toggle.className = "button-small";
        toggle.textContent = item.is_active ? "Отключить" : "Включить";
        toggle.addEventListener("click", async () => {
          try { await request("update_admin", { admin_id: item.id, is_active: !item.is_active }); await loadAdmins(); }
          catch (e) { alert(e.message); }
        });
        const edit = document.createElement("button");
        edit.className = "button-small";
        edit.textContent = "Изменить права";
        edit.addEventListener("click", async () => {
          const current = ["tournaments_manage", "players_manage", "matches_manage"].filter(k => item.permissions?.[k]).join(", ");
          const value = prompt("Права через запятую:\\ntournaments_manage — турниры\\nplayers_manage — игроки\\nmatches_manage — матчи и результаты\\nОставь поле пустым, чтобы снять все права.", current);
          if (value === null) return;
          const selected = value.split(",").map(x => x.trim());
          try {
            await request("update_admin", { admin_id: item.id, permissions: {
              tournaments_manage: selected.includes("tournaments_manage"),
              players_manage: selected.includes("players_manage"),
              matches_manage: selected.includes("matches_manage")
            }});
            await loadAdmins();
          } catch (e) { alert(e.message); }
        });
        const reset = document.createElement("button");
        reset.className = "button-small";
        reset.textContent = "Сменить пароль";
        reset.addEventListener("click", async () => {
          const password = prompt("Новый пароль (минимум 10 символов):");
          if (password === null) return;
          try { await request("update_admin", { admin_id: item.id, password }); alert("Пароль обновлён."); }
          catch (e) { alert(e.message); }
        });
        actions.append(toggle, edit, reset);
        row.append(actions);
      }
      list.append(row);
    }
  } catch (e) { list.textContent = e.message; }
}
const tournamentManagement = document.getElementById("tournamentManagement");
const tournamentMessage = document.getElementById("tournamentMessage");
const tournamentList = document.getElementById("adminTournamentList");
const canManageTournaments = admin => admin?.role === "main_admin" || admin?.permissions?.tournaments_manage === true;
const tournamentStatus = status => ({ draft: "Черновик", upcoming: "Предстоящий", active: "Идёт", finished: "Завершён", cancelled: "Отменён" }[status] || status);
function renderTournamentRows(tournaments) {
  tournamentList.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = "Созданные турниры";
  tournamentList.append(heading);
  if (!tournaments.length) {
    const empty = document.createElement("p");
    empty.className = "admin-muted";
    empty.textContent = "Турниров пока нет.";
    tournamentList.append(empty);
    return;
  }
  for (const tournament of tournaments) {
    const row = document.createElement("div");
    row.className = "admin-tournament-row";
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = tournament.name;
    const meta = document.createElement("small");
    meta.textContent = (tournament.format === "single_elimination" ? "Single Elimination" : "Swiss System") + " · " + tournamentStatus(tournament.status) + (tournament.starts_at ? " · " + new Date(tournament.starts_at).toLocaleString() : "");
    info.append(name, meta);
    row.append(info);
    if (tournament.status === "draft") {
      const publish = document.createElement("button");
      publish.className = "button-small";
      publish.textContent = "Опубликовать";
      publish.addEventListener("click", async () => {
        publish.disabled = true;
        try {
          await request("publish_tournament", { tournament_id: tournament.id, status: "upcoming" });
          await loadTournaments();
        } catch (error) {
          alert(error.message);
          publish.disabled = false;
        }
      });
      row.append(publish);
    }
    tournamentList.append(row);
  }
}
async function loadTournaments() {
  tournamentList.textContent = "Загрузка турниров…";
  try {
    const { tournaments } = await request("list_tournaments");
    renderTournamentRows(tournaments || []);
  } catch (error) {
    tournamentList.textContent = error.message;
  }
}
document.getElementById("createTournamentForm").addEventListener("submit", async event => {
  event.preventDefault();
  tournamentMessage.textContent = "Создание турнира…";
  const name = document.getElementById("tournamentName").value.trim();
  const format = document.getElementById("tournamentFormat").value;
  const description = document.getElementById("tournamentDescription").value.trim();
  const localDate = document.getElementById("tournamentStartsAt").value;
  const starts_at = localDate ? new Date(localDate).toISOString() : null;
  try {
    const { tournament } = await request("create_tournament", { name, format, description, starts_at });
    tournamentMessage.textContent = "Черновик «" + tournament.name + "» создан.";
    event.currentTarget.reset();
    await loadTournaments();
  } catch (error) {
    tournamentMessage.textContent = error.message;
  }
});

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault(); loginMessage.textContent = "Проверка данных…";
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;
  try {
    const result = await request("login", { username, password }, false);
    sessionToken = result.token;
    sessionStorage.setItem("bst-admin-token", sessionToken);
    renderAdmin(result.admin);
    document.getElementById("loginPassword").value = "";
    loginMessage.textContent = "";
  } catch (e) { showError(loginMessage, e); }
});
document.getElementById("createAdminForm").addEventListener("submit", async event => {
  event.preventDefault(); createMessage.textContent = "Создание аккаунта…";
  const form = event.currentTarget;
  const username = document.getElementById("newAdminUsername").value.trim().toLowerCase();
  const password = document.getElementById("newAdminPassword").value;
  try {
    const result = await request("create_admin", { username, password, permissions: permissionsFromForm(form) });
    createMessage.textContent = "Аккаунт " + result.admin.username + " создан. Передай модератору логин и пароль безопасным способом.";
    form.reset(); await loadAdmins();
  } catch (e) { showError(createMessage, e); }
});
document.getElementById("logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("bst-admin-token"); sessionToken = ""; currentAdmin = null;
  adminView.hidden = true; loginView.hidden = false;
});
if (sessionToken) {
  request("me").then(({ admin }) => renderAdmin(admin)).catch(() => {
    sessionStorage.removeItem("bst-admin-token"); sessionToken = "";
  });
}
