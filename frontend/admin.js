const app = document.getElementById('app');
const adminPassword = localStorage.getItem('bellecure-admin-key') || '';
const adminEmail = localStorage.getItem('bellecure-admin-email') || '';
const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : window.location.origin;

function renderLogin() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div class="bg-gradient-to-r from-brand-red to-red-700 px-6 py-5 text-white">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-xl">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-red-100">Secure access</p>
              <h1 class="text-2xl font-bold">Bellecure Admin</h1>
            </div>
          </div>
        </div>

        <div class="p-6">
          <p class="text-sm text-slate-500 mb-5">Enter your admin email and password to access inquiries and chat logs.</p>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Admin email</label>
              <input id="adminEmailInput" type="email" placeholder="Enter email" class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none" />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Admin password</label>
              <input id="adminPasswordInput" type="password" placeholder="Enter password" class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none" />
            </div>

            <button id="loginBtn" class="w-full bg-brand-red text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition">
              Access dashboard
            </button>

            <p id="loginMessage" class="hidden text-sm text-red-600"></p>
          </div>
        </div>
      </div>
    </div>
  `;

  const emailInput = document.getElementById('adminEmailInput');
  const input = document.getElementById('adminPasswordInput');
  const button = document.getElementById('loginBtn');
  const message = document.getElementById('loginMessage');

  button.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = input.value.trim();

    if (!email || !password) {
      message.textContent = 'Please enter both admin email and password.';
      message.classList.remove('hidden');
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        message.textContent = data.message || 'Invalid email or password.';
        message.classList.remove('hidden');
        return;
      }

      localStorage.setItem('bellecure-admin-email', email);
    } catch (error) {
      message.textContent = 'Unable to connect to the server.';
      message.classList.remove('hidden');
    }
  });
}

async function fetchProtected(endpoint) {
  const adminKey = localStorage.getItem('bellecure-admin-key');
  const adminEmail = localStorage.getItem('bellecure-admin-email');

  const response = await fetch(`${apiBase}${endpoint}`, {
    headers: {
      'x-admin-key': adminKey || '',
      'x-admin-email': adminEmail || ''
    }
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Access denied.');
  }

  return data.data || [];
}

async function renderDashboard() {
  try {
    const inquiries = await fetchProtected('/api/inquiries');
    const chatLogs = await fetchProtected('/api/chat-logs');
    const dbStatus = await fetch(`${apiBase}/db-status`).then((res) => res.json());

    app.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 py-10 md:px-8">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p class="text-sm uppercase tracking-[0.2em] text-brand-red font-bold">Dashboard</p>
            <h1 class="text-3xl md:text-4xl font-extrabold text-slate-900">Bellecure Admin Panel</h1>
          </div>
          <button id="logoutBtn" class="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition">
            Logout
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p class="text-sm text-slate-500">Total inquiries</p>
            <p class="text-3xl font-bold text-slate-900 mt-2">${inquiries.length}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p class="text-sm text-slate-500">Chat messages</p>
            <p class="text-3xl font-bold text-slate-900 mt-2">${chatLogs.length}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p class="text-sm text-slate-500">Database status</p>
            <p class="text-xl font-bold text-slate-900 mt-2">${dbStatus.database?.state || 'unknown'}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-slate-900 text-white px-5 py-4">
              <h2 class="text-xl font-bold">Distributor inquiries</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-100 text-left">
                  <tr>
                    <th class="px-4 py-3 font-semibold">Name</th>
                    <th class="px-4 py-3 font-semibold">Phone</th>
                    <th class="px-4 py-3 font-semibold">Location</th>
                    <th class="px-4 py-3 font-semibold">Business</th>
                  </tr>
                </thead>
                <tbody>
                  ${inquiries.length ? inquiries.map((item) => `
                    <tr class="border-t border-slate-200">
                      <td class="px-4 py-3 font-medium">${item.from_name || '-'}</td>
                      <td class="px-4 py-3">${item.phone_number || '-'}</td>
                      <td class="px-4 py-3">${item.city || '-'} / ${item.state || '-'}</td>
                      <td class="px-4 py-3">${item.business_type || '-'}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="4" class="px-4 py-6 text-center text-slate-500">No inquiries saved yet.</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </section>

          <section class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="bg-brand-red text-white px-5 py-4">
              <h2 class="text-xl font-bold">Chat logs</h2>
            </div>
            <div class="max-h-[520px] overflow-y-auto">
              <div class="p-4 space-y-3">
                ${chatLogs.length ? chatLogs.map((log) => `
                  <div class="border border-slate-200 rounded-xl p-3 ${log.sender === 'user' ? 'bg-red-50' : 'bg-slate-50'}">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold uppercase tracking-[0.12em] ${log.sender === 'user' ? 'text-brand-red' : 'text-slate-600'}">${log.sender}</span>
                      <span class="text-[11px] text-slate-500">${new Date(log.createdAt || Date.now()).toLocaleString()}</span>
                    </div>
                    <p class="text-sm text-slate-700 whitespace-pre-wrap">${(log.message || '').replace(/</g, '&lt;')}</p>
                  </div>
                `).join('') : `
                  <div class="border border-dashed border-slate-300 rounded-xl p-5 text-center text-slate-500">No chat logs saved yet.</div>
                `}
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('bellecure-admin-key');
      renderLogin();
    });
  } catch (error) {
    localStorage.removeItem('bellecure-admin-key');
    app.innerHTML = `
      <div class="min-h-screen flex items-center justify-center px-4">
        <div class="bg-white border border-red-100 rounded-2xl p-6 max-w-lg text-center shadow-lg">
          <h2 class="text-2xl font-bold text-slate-900 mb-3">Session expired</h2>
          <p class="text-slate-600 mb-5">${error.message || 'Access denied.'}</p>
          <button id="retryLogin" class="bg-brand-red text-white px-5 py-3 rounded-lg font-semibold hover:bg-red-700 transition">
            Login again
          </button>
        </div>
      </div>
    `;

    document.getElementById('retryLogin').addEventListener('click', renderLogin);
  }
}

if (adminPassword && adminEmail) {
  renderDashboard();
} else {
  renderLogin();
}
