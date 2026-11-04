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
  if (owner) loadAdmins();
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
        const reset = document.createElement("button");
        reset.className = "button-small";
        reset.textContent = "Сменить пароль";
        reset.addEventListener("click", async () => {
          const password = prompt("Новый пароль (минимум 10 символов):");
          if (password === null) return;
          try { await request("update_admin", { admin_id: item.id, password }); alert("Пароль обновлён."); }
          catch (e) { alert(e.message); }
        });
        actions.append(toggle, reset);
        row.append(actions);
      }
      list.append(row);
    }
  } catch (e) { list.textContent = e.message; }
}
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
