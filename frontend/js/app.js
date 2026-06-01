const API_BASE = 'http://localhost:5000/api';

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')) || null; }
  catch { return null; }
}

function getToken() {
  return localStorage.getItem('token');
}

function requireAuth() {
  if (!getToken()) window.location.href = 'login.html';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

async function authFetch(endpoint, method, body) {
  method = method || 'GET';
  body = body || null;
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + endpoint, options);
    const data = await res.json();
    if (res.status === 401) { logout(); return; }
    return { ok: res.ok, status: res.status, data: data };
  } catch (err) {
    showToast('Network error. Is the server running?', 'error');
    return { ok: false, data: { message: 'Network error' } };
  }
}

async function authUpload(endpoint, formData) {
  const res = await fetch(API_BASE + endpoint, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + getToken() },
    body: formData
  });
  const data = await res.json();
  return { ok: res.ok, data: data };
}

function showToast(message, type) {
  type = type || 'success';
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(function() { toast.classList.remove('show'); }, 3500);
}

function renderSidebar(activePage) {
  const user = getUser();
  if (!user) return;

  const isAdmin = user.role === 'admin';

  const navItems = [
    { id: 'dashboard', icon: 'O', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'tasks', icon: '+', label: 'Tasks', href: 'tasks.html' },
    { id: 'kanban', icon: '=', label: 'Kanban Board', href: 'kanban.html' },
  ];

  const adminItems = isAdmin ? [
    { id: 'users', icon: '@', label: 'User Management', href: 'users.html' },
  ] : [];

  const sidebar = document.getElementById('sidebar');

  let navHtml = '';
  navItems.forEach(function(item) {
    navHtml += '<a href="' + item.href + '" class="nav-item ' + (activePage === item.id ? 'active' : '') + '">' +
      '<span class="icon">' + item.icon + '</span>' + item.label + '</a>';
  });

  let adminHtml = '';
  if (adminItems.length) {
    adminHtml = '<div class="nav-label">Admin</div>';
    adminItems.forEach(function(item) {
      adminHtml += '<a href="' + item.href + '" class="nav-item ' + (activePage === item.id ? 'active' : '') + '">' +
        '<span class="icon">' + item.icon + '</span>' + item.label + '</a>';
    });
  }

  sidebar.innerHTML =
    '<div class="sidebar-logo"><span>T</span> To-Do-Platform</div>' +
    '<nav class="nav-section">' +
    '<div class="nav-label">Main Menu</div>' +
    navHtml + adminHtml +
    '</nav>' +
    '<div class="sidebar-user" onclick="logout()">' +
    '<div class="avatar">' + user.name.charAt(0).toUpperCase() + '</div>' +
    '<div class="user-info">' +
    '<div class="user-name">' + user.name + '</div>' +
    '<div class="user-role">' + user.role + '</div>' +
    '</div>' +
    '<span style="margin-left:auto;color:var(--text-muted);font-size:0.8rem;">logout</span>' +
    '</div>';
}