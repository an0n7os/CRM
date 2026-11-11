'use strict';
/* ===== Settings: business, users, templates, packages, backup ===== */
const Settings = {
  tab: 'business',
  render(el) {
    el.innerHTML = `${tabs([['business', '🏢 Business & GST'], ['users', '👤 Users & roles'], ['wa', '💬 WhatsApp templates'], ['packages', '📦 Package templates'], ['data', '💾 Backup & restore']], this.tab, 'Settings.setTab')}<div id="sOut"></div>`;
    this['draw_' + this.tab]();
  },
  setTab(t) { this.tab = t; App.refresh(); },

  draw_business() {
    const s = App.settings;
    $('#sOut').innerHTML = `<form class="card" onsubmit="Settings.saveBiz(event)"><div class="form-grid">
      ${field('Business name', inp('bizName', s.bizName, 'text', 'required'))}${field('Phone', inp('phone', s.phone))}${field('Email', inp('email', s.email, 'email'))}${field('Website', inp('website', s.website))}
      ${field('GSTIN', inp('gstin', s.gstin))}${field('Address', txt('address', s.address, 'style="min-height:44px"'), 'full')}
      ${field('Bank details (printed on invoice)', inp('bank', s.bank), 'full')}
      ${field('UPI ID', inp('upi', s.upi))}${field('Google review link', inp('reviewLink', s.reviewLink))}
      ${field('Travel claim rate (₹ per km)', inp('kmRate', s.kmRate, 'number', 'min="0" step="0.5"'))}${field('Quotation number prefix', inp('quotePrefix', s.quotePrefix))}
      ${field('Logo (for printouts)', `<input type="file" accept="image/*" onchange="Settings.logo(this)"> ${s.logo ? `<img src="${s.logo}" style="height:36px;margin-top:6px">` : ''}`)}
      ${field('Quotation terms', txt('quoteTerms', s.quoteTerms, 'style="min-height:100px"'), 'full')}
      ${field('Invoice terms', txt('invoiceTerms', s.invoiceTerms, 'style="min-height:80px"'), 'full')}
      ${field('Job card terms', txt('jobTerms', s.jobTerms, 'style="min-height:80px"'), 'full')}
      <div class="full checks"><label><input type="checkbox" name="demoHint" ${s.demoHint ? 'checked' : ''}> Show sample PINs on login screen (turn off when you go live)</label></div>
      <div class="full row"><span class="spacer"></span><button class="btn primary">Save settings</button></div></div></form>`;
  },
  async saveBiz(e) { e.preventDefault(); const d = formData(e.target); Object.assign(App.settings, d, { kmRate: num(d.kmRate) }); await App.saveSettings(); $('#bizName').textContent = App.settings.bizName; toast('Settings saved'); },
  async logo(input) { if (!input.files[0]) return; App.settings.logo = await readImage(input.files[0], 400, 0.85); await App.saveSettings(); toast('Logo saved'); App.refresh(); },

  draw_users() {
    $('#sOut').innerHTML = `<div class="row mb"><span class="muted">Each role sees only its own menus. Monthly target is used in sales performance.</span><span class="spacer"></span><button class="btn primary" onclick="Settings.userForm()">+ User</button></div>
      ${table(['Name', 'Role', 'Phone', 'PIN', { t: 'Monthly target', num: 1 }, 'Status'], DB.all('users').map(u => ({ attrs: `class="click" onclick="Settings.userForm('${u.id}')"`, cells: [`<b>${esc(u.name)}</b>`, esc(ROLES[u.role]), esc(u.phone || ''), '••••', u.role === 'sales' ? inr(u.target) : '—', u.active === false ? badge('Inactive', 'red') : badge('Active', 'green')] })))}
      <div class="card mt"><h3 class="mb">What each role sees</h3>${table(['Menu', ...Object.values(ROLES)], MENUS.map(m => [m.icon + ' ' + m.label, ...Object.keys(ROLES).map(r => m.roles.includes(r) ? '✔' : '')]), { cards: false })}</div>`;
  },
  userForm(id) {
    const u = id ? DB.get('users', id) : { role: 'sales', active: true, target: 0 };
    modal(id ? 'Edit user' : 'New user', `<form class="form-grid" onsubmit="Settings.saveUser(event,'${id || ''}')">
      ${field('Name *', inp('name', u.name, 'text', 'required'))}${field('Role', sel('role', Object.entries(ROLES), u.role))}
      ${field('Phone (WhatsApp)', inp('phone', u.phone, 'tel', 'maxlength="10"'))}${field('PIN (4–6 digits) *', inp('pin', u.pin, 'password', 'inputmode="numeric" pattern="\\d{4,6}" required autocomplete="new-password"'))}
      ${field('Monthly sales target (₹)', inp('target', u.target, 'number', 'min="0"'))}
      <div class="full checks"><label><input type="checkbox" name="active" ${u.active !== false ? 'checked' : ''}> Active (can log in)</label></div>
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveUser(e, id) {
    e.preventDefault(); const d = formData(e.target);
    if (DB.find('users', x => String(x.pin) === d.pin && x.id !== id && x.name === d.name)) return toast('Duplicate user', 'err');
    if (id === App.user.id && (d.role !== 'admin' || !d.active)) return toast('You cannot remove your own admin access', 'err');
    const u = { ...(id ? DB.get('users', id) : { id: uid('us_') }), ...d, target: num(d.target), phone: cleanPhone(d.phone) };
    await DB.put('users', u); closeModal(); toast('User saved'); App.refresh();
  },

  draw_wa() {
    const s = App.settings;
    $('#sOut').innerHTML = `<div class="alert info">Placeholders: {name} {no} {amount} {date} {item} {device} {status} {note} {otp} {business} {phoneBiz} {upi} {review} {phone} {address}. Messages open in WhatsApp (wa.me) with the text filled in — you press Send.</div>
      <form class="card" onsubmit="Settings.saveWa(event)"><div class="form-grid">${Object.keys(DEFAULT_WA).map(k => field(WA_LABELS[k], `<textarea name="${k}" style="min-height:120px">${esc(s.wa[k])}</textarea>`)).join('')}</div>
      <div class="row mt"><button type="button" class="btn" onclick="Settings.resetWa()">Reset to default</button><span class="spacer"></span><button class="btn primary">Save templates</button></div></form>`;
  },
  async saveWa(e) { e.preventDefault(); App.settings.wa = { ...App.settings.wa, ...formData(e.target) }; await App.saveSettings(); toast('Templates saved'); },
  async resetWa() { if (!confirmBox('Reset all WhatsApp templates to default?')) return; App.settings.wa = { ...DEFAULT_WA }; await App.saveSettings(); App.refresh(); },

  draw_packages() {
    $('#sOut').innerHTML = `<div class="row mb"><span class="muted">Package templates can be added to any quotation with one click.</span><span class="spacer"></span><button class="btn primary" onclick="Settings.pkgForm()">+ Package</button></div>
      ${table(['Package', 'Category', 'Items', { t: 'Approx. total (incl. GST)', num: 1 }], DB.all('packages').sort((a, b) => a.category.localeCompare(b.category) || a.size - b.size).map(p => {
      const lines = p.lines.map(x => { const it = DB.get('items', x.itemId); return it ? LineEditor.line(it, x.qty) : null; }).filter(Boolean);
      return { attrs: `class="click" onclick="Settings.pkgForm('${p.id}')"`, cells: [`<b>${esc(p.name)}</b>`, catChip(p.category), `<small>${lines.map(l => `${esc(l.name)} × ${l.qty}`).join('<br>')}</small>`, inr(calcTotals(lines).total)] };
    }))}`;
  },
  pkgForm(id) {
    const p = id ? DB.get('packages', id) : { category: 'cctv', size: 4, lines: [] };
    const items = DB.all('items').sort((a, b) => a.name.localeCompare(b.name));
    window._pkgItems = items;
    modal(id ? 'Edit package' : 'New package', `<form onsubmit="Settings.savePkg(event,'${id || ''}')"><div class="form-grid">
      ${field('Package name *', inp('name', p.name, 'text', 'required'))}${field('Category', sel('category', CAT_LIST, p.category))}${field('Size (cameras / kW) — used for auto-suggest', inp('size', p.size, 'number', 'step="any"'))}</div>
      <h3 class="mt mb">Items</h3><div id="pkRows">${p.lines.map(l => this.pkRow(l)).join('')}</div><button type="button" class="btn sm" onclick="$('#pkRows').insertAdjacentHTML('beforeend',Settings.pkRow({}))">+ Item</button>
      <div class="modal-foot">${id ? `<button type="button" class="btn danger" onclick="Settings.delPkg('${id}')">Delete</button><span class="spacer"></span>` : ''}<button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`, { wide: true });
  },
  pkRow(l) { return `<div class="row mb pk-row" style="flex-wrap:nowrap"><select data-k="itemId" style="flex:3">${opts(window._pkgItems.map(i => [i.id, i.name]), l.itemId, '— item —')}</select><input data-k="qty" type="number" step="any" min="0" value="${l.qty || 1}" style="flex:0 0 90px"><button type="button" class="btn sm danger" onclick="this.parentNode.remove()">✕</button></div>`; },
  async savePkg(e, id) {
    e.preventDefault(); const d = formData(e.target);
    const lines = $$('.pk-row').map(r => ({ itemId: $('[data-k=itemId]', r).value, qty: num($('[data-k=qty]', r).value) })).filter(x => x.itemId && x.qty > 0);
    await DB.put('packages', { id: id || uid('pk_'), name: d.name, category: d.category, size: num(d.size), lines }); closeModal(); App.refresh();
  },
  async delPkg(id) { if (!confirmBox('Delete this package?')) return; await DB.del('packages', id); closeModal(); App.refresh(); },

  draw_data() {
    const counts = DB.STORES.filter(s => s !== 'meta').map(s => `${s}: ${DB.all(s).length}`).join(' · ');
    $('#sOut').innerHTML = `<div class="card"><h3 class="mb">💾 Backup (export JSON)</h3><p class="muted">Download all CRM data (including photos) as one file. Keep it on Google Drive / pen drive. Do this every day.</p>
        <button class="btn primary" onclick="Settings.backup()">⬇ Download backup</button> <span class="muted">Last backup: ${App.settings.lastBackup ? fmtDT(App.settings.lastBackup) : 'never'}</span><div class="muted mt" style="font-size:11.5px">${counts}</div></div>
      <div class="card"><h3 class="mb">♻️ Restore (import JSON)</h3><p class="muted">Replaces ALL current data with the backup file.</p><input type="file" accept=".json,application/json" onchange="Settings.restore(this)"></div>
      <div class="card"><h3 class="mb">🧪 Sample data</h3><p class="muted">Reload the demo data to practise, or erase everything to start fresh with your real business data (users are reset to the sample users — change their PINs after).</p>
        <div class="row"><button class="btn" onclick="Settings.reseed()">Reload sample data</button><button class="btn danger" onclick="Settings.wipe()">Erase all data &amp; start fresh</button></div></div>`;
  },
  async backup() {
    App.settings.lastBackup = Date.now(); await App.saveSettings();
    downloadFile(`crm-backup-${today()}.json`, JSON.stringify(DB.exportAll()), 'application/json'); toast('Backup downloaded');
  },
  restore(input) {
    const f = input.files[0]; if (!f) return;
    if (!confirmBox(`Restore from "${f.name}"? All current data will be replaced.`)) { input.value = ''; return; }
    const fr = new FileReader();
    fr.onload = async () => {
      try { await DB.importAll(JSON.parse(fr.result)); App.loadSettings(); toast('Restored ✔'); setTimeout(() => location.reload(), 600); }
      catch (e) { toast('Restore failed: ' + e.message, 'err'); }
    };
    fr.readAsText(f);
  },
  async reseed() { if (!confirmBox('Replace ALL data with fresh sample data?')) return; await DB.clearAll(); await Seed.load(); LS.del('crm_user'); location.reload(); },
  async wipe() {
    if (!confirmBox('Erase ALL leads, customers, invoices, stock and history? Download a backup first!')) return;
    if (prompt('Type ERASE to confirm') !== 'ERASE') return;
    const keepItems = confirmBox('Keep the item master (products, rates, HSN) and package templates?');
    const items = DB.all('items').map(i => ({ ...i, stock: 0, serials: [] })), pk = DB.all('packages'), us = DB.all('users'), st = App.settings;
    await DB.clearAll();
    await DB.bulk('users', us); await DB.put('meta', { ...st, demoHint: false });
    if (keepItems) { await DB.bulk('items', items); await DB.bulk('packages', pk); }
    toast('All data erased'); setTimeout(() => location.reload(), 600);
  },
};
Pages.settings = { title: 'Settings', render: el => Settings.render(el) };
