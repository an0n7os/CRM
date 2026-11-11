'use strict';
/* ===== Software & Antivirus License Expiry Tracker ===== */
const Licenses = {
  f: { q: '', status: 'active' },
  PRODUCTS: [
    'QuickHeal Total Security (1 PC / 1 Year)',
    'QuickHeal Total Security (1 PC / 3 Years)',
    'QuickHeal Total Security (3 PC / 3 Years)',
    'QuickHeal Antivirus Pro (1 PC / 1 Year)',
    'Kaspersky Plus / Standard (1 Device / 1 Year)',
    'Net Protector Antivirus (NPAV) (1 Year)',
    'McAfee Total Protection (1 User)',
    'Microsoft 365 Personal / Family (1 Year)',
    'Microsoft Office 2021 / 2024 Home & Student',
    'Windows 11 Pro OEM / Retail Key',
    'Tally Prime Silver (Single User)',
    'Tally Prime Gold (Multi-User)',
    'Tally TSS Renewal (1 Year)',
    'Other Software'
  ],

  render(el) {
    const f = this.f;
    el.innerHTML = `
      <div class="row mb">
        <div>
          <h2>🔑 Software &amp; Antivirus License Tracker</h2>
          <small class="muted">Track Antivirus, Office, Windows, and Tally renewals; send WhatsApp expiry reminders</small>
        </div>
        <span class="spacer"></span>
        <button class="btn primary" onclick="Licenses.create()">+ Add New License</button>
      </div>

      <div class="filters">
        <input type="search" placeholder="🔍 Search customer, phone, software, license key…" value="${esc(f.q)}" oninput="Licenses.f.q=this.value;Licenses.draw()">
        <select onchange="Licenses.f.status=this.value;Licenses.draw()">
          ${opts([['active', 'Active & Expiring Soon'], ['due', 'Expiring within 30 days (Due)'], ['expired', 'Expired'], ['all', 'All Licenses']], f.status)}
        </select>
      </div>

      <div id="licStats" class="grid g4 mb"></div>
      <div id="licOut"></div>
    `;
    this.drawStats();
    this.draw();
  },

  drawStats() {
    const t = today();
    const all = DB.all('licenses');
    const active = all.filter(l => l.expiryDate > t).length;
    const expiringSoon = all.filter(l => l.expiryDate >= t && daysBetween(t, l.expiryDate) <= 30).length;
    const expired = all.filter(l => l.expiryDate < t).length;

    $('#licStats').innerHTML = `
      ${kpi('Total Licenses', all.length, 'Tracked keys')}
      ${kpi('Active Licenses', active, 'Protected devices', 'ok')}
      ${kpi('Renewal Due (30d)', expiringSoon, 'Send WhatsApp reminder', expiringSoon ? 'warn' : '')}
      ${kpi('Expired Licenses', expired, 'Needs immediate renewal', expired ? 'bad' : '')}
    `;
  },

  draw() {
    const f = this.f, q = f.q.toLowerCase(), t = today();
    const list = DB.all('licenses').filter(l => {
      const hay = `${l.customerName} ${l.phone} ${l.software} ${l.key || ''} ${l.deviceNote || ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      const days = daysBetween(t, l.expiryDate);
      if (f.status === 'active') return l.expiryDate >= t;
      if (f.status === 'due') return l.expiryDate >= t && days <= 30;
      if (f.status === 'expired') return l.expiryDate < t;
      return true;
    }).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    $('#licOut').innerHTML = table(
      ['Customer', 'Software Product', 'License Key', 'Activated', 'Expiry Date', 'Status', 'Actions'],
      list.map(l => {
        const days = daysBetween(t, l.expiryDate);
        let badgeColor = 'green';
        let statusText = `${days} days left`;
        if (days < 0) {
          badgeColor = 'red';
          statusText = `Expired (${Math.abs(days)}d ago)`;
        } else if (days <= 30) {
          badgeColor = 'orange';
          statusText = `Expiring soon (${days}d)`;
        }

        return [
          `<b>${esc(l.customerName)}</b><br><small>${esc(l.phone)}</small>`,
          `<b>${esc(l.software)}</b>${l.deviceNote ? `<br><small class="muted">${esc(l.deviceNote)}</small>` : ''}`,
          `<code>${esc(l.key || '—')}</code>`,
          fmtDate(l.startDate),
          `<b>${fmtDate(l.expiryDate)}</b>`,
          `<span class="badge ${badgeColor}">${statusText}</span>`,
          `
            <button class="btn sm" onclick="Licenses.wa('${l.id}')">💬 Remind</button>
            <button class="btn sm" onclick="Licenses.renew('${l.id}')">🔄 Renew</button>
            <button class="btn sm danger" onclick="Licenses.delete('${l.id}')">✕</button>
          `
        ];
      }), { empty: 'No software licenses found' }
    );
  },

  create() {
    modal('Add Software / Antivirus License', `
      <form class="form-grid" onsubmit="Licenses.save(event)">
        <div class="section-title">Customer Information</div>
        ${field('Customer Name *', inp('customerName', '', 'text', 'required'))}
        ${field('Phone Number *', inp('phone', '', 'tel', 'maxlength="10" required'))}

        <div class="section-title">License Details</div>
        ${field('Software Product *', sel('software', Licenses.PRODUCTS, Licenses.PRODUCTS[0]))}
        ${field('Product Key / Serial', inp('key', '', 'text', 'placeholder="e.g. QH12-3456-7890-ABCD"'))}
        ${field('Device / PC Note', inp('deviceNote', '', 'text', 'placeholder="e.g. Accounts HP Laptop / Office PC 1"'))}
        ${field('Activation Date *', inp('startDate', today(), 'date', 'required'))}
        ${field('Duration', sel('duration', [['1', '1 Year'], ['2', '2 Years'], ['3', '3 Years'], ['custom', 'Custom Expiry']], '1', null, 'onchange="Licenses.calcExpiry(this.form)"'))}
        ${field('Expiry Date *', inp('expiryDate', addDays(today(), 365), 'date', 'required'))}
        ${field('Selling Price (₹)', inp('price', '950', 'number'))}

        <div class="modal-foot full">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn primary">Save License</button>
        </div>
      </form>
    `);
  },

  calcExpiry(form) {
    const dur = form.duration.value;
    const start = form.startDate.value || today();
    if (dur === '1') form.expiryDate.value = addDays(start, 365);
    else if (dur === '2') form.expiryDate.value = addDays(start, 730);
    else if (dur === '3') form.expiryDate.value = addDays(start, 1095);
  },

  async save(e) {
    e.preventDefault();
    const d = formData(e.target);
    d.id = uid('lic_');
    d.createdAt = Date.now();
    await DB.put('licenses', d);
    closeModal();
    toast('License registered');
    App.refresh();
  },

  wa(id) {
    const l = DB.get('licenses', id), s = App.settings;
    if (!l) return;
    const days = daysBetween(today(), l.expiryDate);
    let msg = `Hello ${l.customerName},\nThis is a renewal reminder from ${s.bizName}.\nYour license for *${l.software}* `;
    if (days < 0) msg += `has *expired on ${fmtDate(l.expiryDate)}*.\n`;
    else msg += `is expiring on *${fmtDate(l.expiryDate)}* (in ${days} days).\n`;
    msg += `Renew now to keep your PC protected from viruses and malware.\n\nReply YES to renew or call ${s.phone}.\nThank you!`;
    window.open(`https://wa.me/91${cleanPhone(l.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  renew(id) {
    const l = DB.get('licenses', id);
    if (!l) return;
    modal(`Renew License — ${esc(l.customerName)}`, `
      <form class="form-grid" onsubmit="Licenses.saveRenewal(event, '${l.id}')">
        <div class="full alert info">Renewing: <b>${esc(l.software)}</b> for ${esc(l.customerName)}</div>
        ${field('New Product Key', inp('key', '', 'text', 'placeholder="New activation key"'))}
        ${field('Renewal Duration', sel('duration', [['1', '1 Year (+365 days)'], ['3', '3 Years (+1095 days)']], '1'))}
        ${field('Renewal Amount (₹)', inp('price', l.price || 950, 'number'))}
        <div class="modal-foot full">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn primary">Confirm Renewal</button>
        </div>
      </form>
    `);
  },

  async saveRenewal(e, id) {
    e.preventDefault();
    const d = formData(e.target);
    const l = DB.get('licenses', id);
    if (!l) return;
    const base = l.expiryDate > today() ? l.expiryDate : today();
    const addYrs = num(d.duration) || 1;
    l.startDate = today();
    l.expiryDate = addDays(base, addYrs * 365);
    if (d.key) l.key = d.key;
    if (d.price) l.price = num(d.price);
    await DB.put('licenses', l);
    closeModal();
    toast('License renewed successfully!');
    App.refresh();
  },

  async delete(id) {
    if (!confirmBox('Delete this license record?')) return;
    await DB.del('licenses', id);
    toast('License deleted');
    App.refresh();
  }
};
Pages.licenses = { title: 'Software & Antivirus Licenses', render: el => Licenses.render(el) };
