'use strict';
/* ===== App shell: login, role menus, router ===== */
const App = {
  user: null, settings: null, page: null, args: [],

  async start() {
    try { await DB.init(); }
    catch (e) { document.body.innerHTML = '<p style="padding:20px;font-family:sans-serif">Could not open the browser database (IndexedDB). Please open this file in Google Chrome and allow site data.</p>'; return; }
    if (!DB.all('users').length) await Seed.load();
    else {
      const b = Seed.build();
      if (!DB.all('rma').length && b.rma) await DB.bulk('rma', b.rma);
      if (!DB.all('expenses').length && b.expenses) await DB.bulk('expenses', b.expenses);
      if (!DB.all('licenses').length && b.licenses) await DB.bulk('licenses', b.licenses);
    }
    this.loadSettings();
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        App.openSearch();
      } else if (e.key === 'Escape') {
        App.closeSearch();
        const cd = $('#createDropdown'); if (cd) cd.setAttribute('hidden', '');
        const nd = $('#notifDropdown'); if (nd) nd.setAttribute('hidden', '');
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.quick-create-wrap')) { const cd = $('#createDropdown'); if (cd) cd.setAttribute('hidden', ''); }
      if (!e.target.closest('.notif-wrap')) { const nd = $('#notifDropdown'); if (nd) nd.setAttribute('hidden', ''); }
    });
    const id = LS.get('crm_user'); const u = id && user(id);
    if (u && u.active !== false) this.enter(u); else this.showLogin();
  },
  loadSettings() {
    this.settings = DB.get('meta', 'settings') || Seed.defaultSettings();
    if (this.settings.bizName === 'Kerala IT & Solar Solutions' || this.settings.bizName === 'IT & Solar CRM') {
      this.settings.bizName = 'CRM';
      this.saveSettings();
    }
    this.settings.wa = { ...DEFAULT_WA, ...(this.settings.wa || {}) };
  },
  async saveSettings() { await DB.put('meta', this.settings); },

  showLogin() {
    this.user = null; $('#app').hidden = true; const L = $('#login'); L.hidden = false;
    const s = this.settings;
    L.innerHTML = `<div class="login-box">
      <div class="login-header">
        <div class="login-badge">🔒 Secure CRM Access</div>
        <h1>${esc(s.bizName)}</h1>
        <div class="subtitle">Select your profile and enter PIN to access CRM</div>
      </div>
      <div class="login-users">
        ${users().map(u => `
          <button class="login-user" data-id="${u.id}" onclick="App.pickUser('${u.id}')">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="avatar" style="width:28px;height:28px;font-size:11px">${initials(u.name)}</span>
              <div style="overflow:hidden">
                <b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</b>
                <span>${ROLES[u.role]}</span>
              </div>
            </div>
          </button>`).join('')}
      </div>
      <form onsubmit="App.tryLogin(event)" class="pin-section">
        <div class="pin-label">
          <span>Security PIN</span>
          <span class="muted" style="font-weight:400">4-digit code</span>
        </div>
        <input id="pin" class="pin-input" type="password" inputmode="numeric" maxlength="6" placeholder="••••" autocomplete="off" disabled>
        <button class="btn primary lg" style="width:100%;margin-top:14px" id="loginBtn" disabled>Sign In to Workspace →</button>
      </form>
      <div style="margin-top:16px;text-align:center">
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">1-Click Client Demo Profiles</div>
        <div class="demo-chips" style="justify-content:center">
          <button type="button" class="demo-chip" onclick="App.quickDemo('u_admin','1111')">👑 Owner (1111)</button>
          <button type="button" class="demo-chip" onclick="App.quickDemo('u_s1','2222')">💼 Sales (2222)</button>
          <button type="button" class="demo-chip" onclick="App.quickDemo('u_fd','3333')">📋 Front Desk (3333)</button>
          <button type="button" class="demo-chip" onclick="App.quickDemo('u_t1','4444')">🔧 Tech (4444)</button>
          <button type="button" class="demo-chip" onclick="App.quickDemo('u_acc','5555')">📊 Accounts (5555)</button>
        </div>
      </div>
      <div style="text-align:center;margin-top:16px;color:#94a3b8;font-size:11px">
        🔒 Role-Based Access Control · Offline IndexedDB Storage
      </div>
    </div>`;
  },
  pickUser(id) {
    this._pick = id; $$('.login-user').forEach(b => b.classList.toggle('sel', b.dataset.id === id));
    const p = $('#pin'); p.disabled = false; p.value = ''; p.focus(); $('#loginBtn').disabled = false;
  },
  quickDemo(id, pin) {
    this.pickUser(id);
    const p = $('#pin');
    if (p) p.value = pin;
    const u = user(id);
    if (u) {
      toast(`Signed in as ${u.name} (${ROLES[u.role]})`, 'ok');
      this.enter(u);
    }
  },
  tryLogin(e) {
    e.preventDefault(); const u = user(this._pick);
    if (!u) return toast('Select your name first', 'err');
    if (String(u.pin) !== $('#pin').value.trim()) { $('#pin').value = ''; return toast('Wrong PIN', 'err'); }
    this.enter(u);
  },
  enter(u) {
    this.user = u; LS.set('crm_user', u.id);
    $('#login').hidden = true; $('#app').hidden = false;
    $('#bizName').textContent = this.settings.bizName;
    $('#userBox').innerHTML = `<span class="uname"><b>${esc(u.name)}</b><br><small>${ROLES[u.role]}</small></span><span class="avatar">${initials(u.name)}</span><button class="icon-btn" onclick="App.logout()" title="Switch user / Log out" style="font-size:14px;padding:4px 6px;color:#64748b" aria-label="Logout">⎋</button>`;
    if (!this.allowed(location.hash.replace(/^#\/?/, '').split('/')[0])) location.hash = this.home();
    this.route();
  },
  logout() { LS.del('crm_user'); location.hash = ''; this.showLogin(); },
  home() { return this.user && this.user.role === 'technician' ? 'myjobs' : 'dashboard'; },
  allowed(page) {
    if (!page || !this.user) return false;
    const m = MENUS.find(x => x.id === page);
    if (m) return m.roles.includes(this.user.role);
    return (ROUTE_PARENT[page] || []).some(p => this.allowed(p));
  },
  isAdmin() { return this.user && this.user.role === 'admin'; },
  role(...r) { return this.user && r.includes(this.user.role); },

  renderNav() {
    const r = this.user.role, t = today();
    const counts = {
      leads: Leads.visible().filter(l => l.status === 'open' && l.followUp && l.followUp <= t).length,
      myjobs: DB.where('fieldJobs', j => j.techId === this.user.id && j.status !== 'Completed' && j.date <= t).length,
      billing: DB.all('invoices').filter(i => Billing.balance(i) > 0 && i.dueDate < t).length,
      inventory: Inventory.lowStock().length,
      field: DB.where('fieldJobs', j => j.status === 'Unassigned').length,
      rma: DB.where('rma', r => r.status === 'Received').length,
      licenses: DB.where('licenses', l => l.expiryDate >= t && daysBetween(t, l.expiryDate) <= 30).length,
    };
    $('#nav').innerHTML = MENUS.filter(m => m.roles.includes(r)).map(m =>
      `<a href="#${m.id}" data-id="${m.id}"><span class="ic">${m.icon}</span>${m.label}${counts[m.id] ? `<span class="cnt">${counts[m.id]}</span>` : ''}</a>`).join('');
    
    // Update topbar notification badge
    const totalAlerts = counts.leads + counts.billing + counts.inventory + (counts.field || 0);
    const b = $('#notifBadge');
    if (b) {
      if (totalAlerts > 0) { b.textContent = totalAlerts > 99 ? '99+' : totalAlerts; b.removeAttribute('hidden'); }
      else { b.setAttribute('hidden', ''); }
    }
  },
  toggleCreateMenu(e) {
    e.stopPropagation();
    const d = $('#createDropdown');
    if (!d) return;
    if (!d.hasAttribute('hidden')) { d.setAttribute('hidden', ''); return; }
    const nd = $('#notifDropdown'); if (nd) nd.setAttribute('hidden', '');
    let html = `<div class="dropdown-header">Quick Create</div>`;
    if (this.allowed('leads')) html += `<button type="button" onclick="App.createAction('lead')">📇 New Lead / Deal</button>`;
    if (this.allowed('customers')) html += `<button type="button" onclick="App.createAction('customer')">👥 New Customer</button>`;
    if (this.allowed('jobcards')) html += `<button type="button" onclick="App.createAction('jobcard')">🔧 New Job Card</button>`;
    if (this.allowed('quotes')) html += `<button type="button" onclick="App.createAction('quote')">📝 New Quotation</button>`;
    if (this.allowed('billing')) html += `<button type="button" onclick="App.createAction('sale')">🧾 Quick Counter Sale</button>`;
    d.innerHTML = html;
    d.removeAttribute('hidden');
  },
  createAction(act) {
    const cd = $('#createDropdown'); if (cd) cd.setAttribute('hidden', '');
    if (act === 'lead') Leads.form();
    else if (act === 'customer') Customers.form();
    else if (act === 'jobcard') JobCards.form();
    else if (act === 'quote') this.go('quotes');
    else if (act === 'sale') Billing.quickSale();
  },
  toggleNotifMenu(e) {
    e.stopPropagation();
    const d = $('#notifDropdown');
    if (!d) return;
    if (!d.hasAttribute('hidden')) { d.setAttribute('hidden', ''); return; }
    const cd = $('#createDropdown'); if (cd) cd.setAttribute('hidden', '');
    const t = today();
    const dueLeads = Leads.visible().filter(l => l.status === 'open' && l.followUp && l.followUp <= t);
    const dues = DB.where('invoices', i => Billing.balance(i) > 0 && i.dueDate < t);
    const lowStock = Inventory.lowStock();
    const unassigned = DB.where('fieldJobs', j => j.status === 'Unassigned');

    let itemsHtml = '';
    if (dueLeads.length) {
      itemsHtml += `<div class="dropdown-header">Follow-ups Due (${dueLeads.length})</div>`;
      dueLeads.slice(0, 4).forEach(l => {
        itemsHtml += `<a class="notif-item" href="#lead/${l.id}" onclick="$('#notifDropdown').setAttribute('hidden','');"><span class="n-icon">📞</span><div class="n-body"><b>${esc(l.name)}</b><small>${esc(CATS[l.category]?.label || '')} · ${esc(l.stage)}</small></div></a>`;
      });
    }
    if (dues.length && this.allowed('billing')) {
      itemsHtml += `<div class="dropdown-header">Overdue Payments (${dues.length})</div>`;
      dues.slice(0, 3).forEach(i => {
        itemsHtml += `<a class="notif-item" href="#invoice/${i.id}" onclick="$('#notifDropdown').setAttribute('hidden','');"><span class="n-icon">⚠️</span><div class="n-body"><b>${esc(cust(i.customerId).name)}</b><small>${inr(Billing.balance(i))} pending · ${esc(i.no)}</small></div></a>`;
      });
    }
    if (lowStock.length && this.allowed('inventory')) {
      itemsHtml += `<div class="dropdown-header">Low Stock Alert (${lowStock.length})</div>`;
      lowStock.slice(0, 3).forEach(i => {
        itemsHtml += `<a class="notif-item" href="#inventory" onclick="$('#notifDropdown').setAttribute('hidden','');"><span class="n-icon">📦</span><div class="n-body"><b>${esc(i.name)}</b><small>Only ${i.stock} ${esc(i.unit || 'nos')} left</small></div></a>`;
      });
    }
    if (unassigned.length && this.allowed('field')) {
      itemsHtml += `<div class="dropdown-header">Unassigned Field Jobs (${unassigned.length})</div>`;
      unassigned.slice(0, 2).forEach(j => {
        itemsHtml += `<a class="notif-item" href="#field" onclick="$('#notifDropdown').setAttribute('hidden','');"><span class="n-icon">📍</span><div class="n-body"><b>${esc(j.title)}</b><small>${esc(j.no)} · ${fmtDate(j.date)}</small></div></a>`;
      });
    }
    if (!itemsHtml) {
      itemsHtml = `<div class="cmd-empty" style="padding:24px 16px">🎉 All caught up! No urgent alerts.</div>`;
    }
    d.innerHTML = `<div class="notif-menu-header"><span>Action Center</span><small class="muted">${fmtDate(t)}</small></div><div class="notif-list">${itemsHtml}</div>`;
    d.removeAttribute('hidden');
  },
  openSearch() {
    if (!this.user) return;
    const root = $('#cmdRoot');
    root.innerHTML = `<div class="cmd-overlay" onclick="if(event.target===this)App.closeSearch()">
      <div class="cmd-dialog">
        <div class="cmd-input-wrap">
          <span class="cmd-search-icon">🔍</span>
          <input id="cmdSearchInput" class="cmd-input" type="search" placeholder="Type to search customers, leads, jobs, quotes, invoices, items..." autocomplete="off">
          <button class="icon-btn" onclick="App.closeSearch()" style="font-size:14px;color:#94a3b8">✕</button>
        </div>
        <div id="cmdResults" class="cmd-results"></div>
        <div class="cmd-footer">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Open with <kbd>Enter</kbd></span>
          <span>Close with <kbd>Esc</kbd></span>
        </div>
      </div>
    </div>`;
    const inp = $('#cmdSearchInput');
    inp.focus();
    inp.addEventListener('input', e => App.searchQuery(e.target.value.trim()));
    inp.addEventListener('keydown', e => App.searchKey(e));
    App.searchQuery('');
  },
  closeSearch() {
    const r = $('#cmdRoot'); if (r) r.innerHTML = '';
  },
  searchQuery(q) {
    const res = $('#cmdResults');
    if (!res) return;
    q = q.toLowerCase();
    const hits = [];

    // Search Customers
    DB.all('customers').forEach(c => {
      if (!q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.area && c.area.toLowerCase().includes(q))) {
        hits.push({ type: 'Customer', ic: '👥', title: c.name, sub: `${c.phone || ''} · ${c.area || 'Kerala'}`, hash: `customer/${c.id}` });
      }
    });

    // Search Leads
    DB.all('leads').forEach(l => {
      if (!q || l.name.toLowerCase().includes(q) || (l.phone && l.phone.includes(q)) || (l.category && l.category.toLowerCase().includes(q))) {
        hits.push({ type: 'Lead', ic: '📇', title: l.name, sub: `${CATS[l.category]?.label || l.category} · Stage: ${l.stage}`, hash: `lead/${l.id}` });
      }
    });

    // Search Job Cards
    DB.all('jobcards').forEach(j => {
      if (!q || j.no.toLowerCase().includes(q) || (j.device && j.device.toLowerCase().includes(q)) || (j.brand && j.brand.toLowerCase().includes(q)) || (j.serial && j.serial.toLowerCase().includes(q))) {
        hits.push({ type: 'Job Card', ic: '🔧', title: `${j.no} — ${j.device} ${j.brand || ''}`, sub: `Serial: ${j.serial || '—'} · Tech: ${userName(j.techId)}`, hash: `jobcard/${j.id}` });
      }
    });

    // Search Invoices
    if (this.allowed('billing')) {
      DB.all('invoices').forEach(i => {
        const c = cust(i.customerId);
        if (!q || i.no.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q))) {
          hits.push({ type: 'Invoice', ic: '🧾', title: `${i.no} — ${c.name || 'Customer'}`, sub: `Total: ${inr(i.total)} · Due: ${inr(Billing.balance(i))}`, hash: `invoice/${i.id}` });
        }
      });
    }

    // Search Quotations
    if (this.allowed('quotes')) {
      DB.all('quotes').forEach(qt => {
        const c = cust(qt.customerId);
        if (!q || qt.no.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q))) {
          hits.push({ type: 'Quote', ic: '📝', title: `${qt.no} — ${c.name || 'Customer'}`, sub: `Total: ${inr(qt.total)} · ${qt.status}`, hash: `quote/${qt.id}` });
        }
      });
    }

    // Search Inventory
    if (this.allowed('inventory')) {
      DB.all('items').forEach(it => {
        if (!q || it.name.toLowerCase().includes(q) || (it.hsn && it.hsn.includes(q))) {
          hits.push({ type: 'Item', ic: '📦', title: it.name, sub: `Stock: ${it.stock} ${it.unit || 'nos'} · Rate: ${inr(it.rate)}`, hash: 'inventory' });
        }
      });
    }

    const items = hits.slice(0, 14);
    if (!items.length) {
      res.innerHTML = `<div class="cmd-empty">No results found for "${esc(q)}"</div>`;
      return;
    }

    res.innerHTML = items.map((it, idx) => `
      <div class="cmd-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" data-hash="${it.hash}" onclick="App.pickSearchResult('${it.hash}')">
        <span class="cmd-ic">${it.ic}</span>
        <div class="cmd-content">
          <div class="cmd-title">${esc(it.title)} <span class="cmd-tag">${esc(it.type)}</span></div>
          <div class="cmd-sub">${esc(it.sub)}</div>
        </div>
      </div>
    `).join('');
  },
  pickSearchResult(hash) {
    this.closeSearch();
    this.go(hash);
  },
  searchKey(e) {
    const res = $('#cmdResults');
    if (!res) return;
    const items = [...res.querySelectorAll('.cmd-item')];
    if (!items.length) return;
    let cur = items.findIndex(el => el.classList.contains('active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cur < items.length - 1) cur++;
      items.forEach((el, i) => el.classList.toggle('active', i === cur));
      items[cur]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cur > 0) cur--;
      items.forEach((el, i) => el.classList.toggle('active', i === cur));
      items[cur]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cur >= 0 && items[cur]) {
        App.pickSearchResult(items[cur].dataset.hash);
      }
    }
  },
  route(keepScroll) {
    if (!this.user) return;
    let [page, ...args] = location.hash.replace(/^#\/?/, '').split('/');
    args = args.map(decodeURIComponent);
    if (!page || !this.allowed(page) || !Pages[page]) { page = this.home(); history.replaceState(null, '', '#' + page); args = []; }
    const P = Pages[page];
    document.body.classList.remove('nav-open'); closeModal();
    const sameView = this.page === page && this.args.join('/') === args.join('/');
    this.page = page; this.args = args;
    this.renderNav();
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.id === page || ((ROUTE_PARENT[page] || [])[0] === a.dataset.id)));
    $('#pageTitle').textContent = P.title;
    document.title = P.title + ' · ' + this.settings.bizName;
    const v = $('#view'); const y = window.scrollY;
    try { v.innerHTML = ''; P.render(v, args); }
    catch (e) { console.error(e); v.innerHTML = `<div class="alert err">Something went wrong on this screen: ${esc(e.message)}</div>`; }
    if (keepScroll || sameView) window.scrollTo(0, y); else window.scrollTo(0, 0);
  },
  go(hash) { if (location.hash === '#' + hash) this.route(); else location.hash = hash; },
  refresh() { this.route(true); },
};

window.addEventListener('DOMContentLoaded', () => App.start());
