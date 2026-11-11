'use strict';
/* ===== Warranty (by serial), AMC contracts, complaint tickets ===== */
const AMC = {
  tab: 'amc', f: { q: '', st: '' },
  amcStatus(a) { const d = daysBetween(today(), a.end); return d < 0 ? 'Expired' : d <= 30 ? 'Renewal due' : 'Active'; },
  amcBadge(a) { const s = this.amcStatus(a); return badge(s, { Expired: 'red', 'Renewal due': 'amber', Active: 'green' }[s]) + (s === 'Renewal due' ? ` <small>${daysBetween(today(), a.end)}d left</small>` : ''); },
  warStatus(as) { const d = daysBetween(today(), as.warrantyEnd); return d < 0 ? 'Expired' : d <= 30 ? 'Expiring' : 'Active'; },
  renewalsDue: () => DB.all('amcs').filter(a => !a.renewedTo && daysBetween(today(), a.end) <= 30 && daysBetween(today(), a.end) >= -30),
  nextVisit: a => (a.visits || []).filter(v => !v.done).sort((x, y) => x.date.localeCompare(y.date))[0],

  render(el) {
    el.innerHTML = `${tabs([['amc', '🛡️ AMC contracts'], ['warranty', '🔖 Warranty by serial'], ['tickets', '🎫 Complaint tickets']], this.tab, 'AMC.setTab')}<div id="aOut"></div>`;
    this['draw_' + this.tab]();
  },
  setTab(t) { this.tab = t; this.f = { q: '', st: '' }; App.refresh(); },
  bar(ph, stOpts, fn, btn) {
    return `<div class="filters"><input type="search" placeholder="🔍 ${ph}" value="${esc(this.f.q)}" oninput="AMC.f.q=this.value;AMC.${fn}();const s=$('#aq');s.focus();s.setSelectionRange(s.value.length,s.value.length)" id="aq">
      <select style="width:auto" onchange="AMC.f.st=this.value;AMC.${fn}()">${opts(stOpts, this.f.st, 'All status')}</select><span class="spacer"></span>${btn}</div>`;
  },

  /* ---------- AMC ---------- */
  draw_amc() {
    const q = this.f.q.toLowerCase();
    const list = DB.all('amcs').filter(a => (!q || `${a.no} ${a.title} ${cust(a.customerId).name} ${cust(a.customerId).phone}`.toLowerCase().includes(q)) && (!this.f.st || this.amcStatus(a) === this.f.st)).sort((a, b) => a.end.localeCompare(b.end));
    const due = this.renewalsDue().filter(a => daysBetween(today(), a.end) >= 0);
    $('#aOut').innerHTML = `${due.length ? `<div class="alert warn">🔔 <b>${due.length} AMC renewal(s) due within 30 days.</b> Send reminders using the WhatsApp button.</div>` : ''}
      ${this.bar('AMC no, customer, title…', ['Active', 'Renewal due', 'Expired'], 'draw_amc', `<button class="btn" onclick="AMC.exportAmc()">⬇ CSV</button>${App.role('admin', 'frontdesk', 'accounts') ? '<button class="btn primary" onclick="AMC.amcForm()">+ New AMC</button>' : ''}`)}
      ${table(['AMC', 'Customer', 'Period', 'Visits', 'Next visit', { t: 'Amount', num: 1 }, 'Status', ''], list.map(a => {
      const c = cust(a.customerId), nv = this.nextVisit(a), done = (a.visits || []).filter(v => v.done).length;
      return { attrs: `class="click ${this.amcStatus(a) === 'Renewal due' ? 'warn' : ''}" onclick="AMC.amcView('${a.id}')"`, cells: [`<b>${esc(a.no)}</b><br><small>${esc(a.title)}</small>`, `${esc(c.name)}<br><small>${esc(c.phone)}</small>`, `${fmtDate(a.start)} –<br>${fmtDate(a.end)}`, `${done}/${(a.visits || []).length}`, nv ? (nv.date < today() ? `<span style="color:var(--danger)">${fmtDate(nv.date)}</span>` : fmtDate(nv.date)) : '—', inr(a.amount), this.amcBadge(a) + (a.renewedTo ? '<br><small class="muted">renewed</small>' : ''),
        `<button class="btn sm wa" onclick="event.stopPropagation();AMC.waAmc('${a.id}')">Remind</button>`] };
    }), { empty: 'No AMC contracts' })}`;
  },
  amcForm(preset = {}) {
    const a = { start: today(), months: 12, visitsPerYear: 4, category: 'cctv', amount: 4500, ...preset };
    modal(preset.renewOf ? 'Renew AMC' : 'New AMC contract', `<form class="form-grid" onsubmit="AMC.saveAmc(event,'${preset.renewOf || ''}')">
      ${field('Customer *', sel('customerId', DB.all('customers').sort((x, y) => x.name.localeCompare(y.name)).map(c => [c.id, `${c.name} · ${c.phone}`]), a.customerId, '— select —', 'required'), 'full')}
      ${field('Category', sel('category', CAT_LIST, a.category))}
      ${field('Title', inp('title', a.title || '', 'text', 'placeholder="e.g. CCTV AMC — 8 cameras" required'))}
      ${field('Start date', inp('start', a.start, 'date'))}
      ${field('Duration (months)', inp('months', a.months, 'number', 'min="1"'))}
      ${field('Visits per year', inp('visitsPerYear', a.visitsPerYear, 'number', 'min="0"'))}
      ${field('AMC amount (₹)', inp('amount', a.amount, 'number', 'min="0"'))}
      ${field('Coverage / notes', txt('notes', a.notes || '', 'placeholder="Labour + cleaning; parts extra"'), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save — visit schedule is auto-created</button></div></form>`);
  },
  async saveAmc(e, renewOf) {
    e.preventDefault(); const d = formData(e.target);
    const end = addDays(addMonths(d.start, d.months), -1), n = Math.round(num(d.visitsPerYear) * num(d.months) / 12);
    const visits = []; for (let k = 0; k < n; k++) visits.push({ id: uid('vi_'), date: addDays(d.start, Math.round((k + 0.5) * daysBetween(d.start, end) / n)), done: false });
    const a = { id: uid('am_'), no: DB.nextNo('amcs', 'AMC-'), customerId: d.customerId, category: d.category, title: d.title, start: d.start, end, amount: num(d.amount), visitsPerYear: num(d.visitsPerYear), notes: d.notes, visits, createdAt: Date.now(), createdBy: App.user.id };
    await DB.put('amcs', a);
    if (renewOf) { const o = DB.get('amcs', renewOf); o.renewedTo = a.id; await DB.put('amcs', o); }
    closeModal(); toast('AMC ' + a.no + ' saved with ' + n + ' visits'); App.refresh();
  },
  amcView(id) {
    const a = DB.get('amcs', id), c = cust(a.customerId);
    modal(`${a.no} · ${a.title}`, `<div class="dl mb"><div><span>Customer</span><b><a href="#customer/${c.id}">${esc(c.name)}</a> · ${esc(c.phone)}</b></div><div><span>Period</span><b>${fmtDate(a.start)} – ${fmtDate(a.end)}</b></div><div><span>Amount</span><b>${inr(a.amount)}</b></div><div><span>Status</span><b>${this.amcBadge(a)}</b></div></div>
      ${a.notes ? `<div class="mb muted">${esc(a.notes)}</div>` : ''}
      <h3 class="mb">Visit schedule</h3>
      ${table(['#', 'Planned date', 'Status', 'Technician', 'Notes', ''], (a.visits || []).map((v, i) => {
      const j = v.jobId && DB.get('fieldJobs', v.jobId);
      return [i + 1, fmtDate(v.date), v.done ? badge('Done ' + fmtDate(v.doneDate), 'green') : j ? Field.statusBadge(j.status) : v.date < today() ? badge('Missed', 'red') : badge('Planned', 'grey'), esc(userName(v.techId || (j && j.techId))), esc(v.notes || ''),
        v.done ? '' : `<span class="row nowrap">${!j && App.isAdmin() ? `<button class="btn sm" onclick="AMC.assignVisit('${id}','${v.id}')">Assign</button>` : ''}<button class="btn sm" onclick="AMC.markVisit('${id}','${v.id}')">Mark done</button></span>`];
    }), { cards: false, empty: 'No visits' })}
      <div class="modal-foot"><button class="btn wa" onclick="AMC.waAmc('${id}')">AMC reminder</button>${!a.renewedTo ? `<button class="btn primary" onclick="AMC.renew('${id}')">↻ Renew</button>` : ''}</div>`, { wide: true, noFocus: true });
  },
  async markVisit(id, vid, viaJob) {
    const a = DB.get('amcs', id), v = a.visits.find(x => x.id === vid);
    const note = viaJob ? 'Completed via field job' : await promptModal('Complete AMC Visit', 'Visit notes (optional):', '', null, { textarea: true });
    if (note === null) return;
    Object.assign(v, { done: true, doneDate: today(), notes: note, techId: v.techId || (viaJob && viaJob.techId) || App.user.id });
    await DB.put('amcs', a); if (!viaJob) { toast('Visit marked done'); this.amcView(id); }
  },
  assignVisit(id, vid) {
    const a = DB.get('amcs', id), v = a.visits.find(x => x.id === vid), c = cust(a.customerId);
    Field.jobForm({ type: 'AMC visit', customerId: c.id, amcId: id, visitId: vid, title: `AMC visit — ${a.title}`, date: v.date < today() ? today() : v.date });
  },
  renew(id) { const a = DB.get('amcs', id); this.amcForm({ renewOf: id, customerId: a.customerId, category: a.category, title: a.title, start: addDays(a.end, 1), amount: a.amount, visitsPerYear: a.visitsPerYear, notes: a.notes }); },
  waAmc(id) { const a = DB.get('amcs', id), c = cust(a.customerId); waPicker(c.whatsapp || c.phone, c.name, [{ key: 'amc', label: 'AMC reminder', data: { name: c.name, item: a.title, date: fmtDate(a.end) } }]); },

  /* ---------- Warranty ---------- */
  draw_warranty() {
    const q = this.f.q.toLowerCase();
    const list = DB.all('assets').filter(x => (!q || `${x.serial} ${x.itemName} ${cust(x.customerId).name} ${cust(x.customerId).phone}`.toLowerCase().includes(q)) && (!this.f.st || this.warStatus(x) === this.f.st)).sort((a, b) => a.warrantyEnd.localeCompare(b.warrantyEnd));
    $('#aOut').innerHTML = `${this.bar('Serial no, product, customer…', ['Active', 'Expiring', 'Expired'], 'draw_warranty', `<button class="btn" onclick="AMC.exportWar()">⬇ CSV</button><button class="btn primary" onclick="AMC.assetForm()">+ Register device</button>`)}
      ${table(['Serial no', 'Product', 'Customer', 'Sold on', 'Warranty till', 'Status', ''], list.map(x => {
      const c = cust(x.customerId), s = this.warStatus(x), d = daysBetween(today(), x.warrantyEnd);
      return { attrs: `class="${s === 'Expiring' ? 'warn' : ''}"`, cells: [`<b>${esc(x.serial)}</b>`, esc(x.itemName), `<a href="#customer/${c.id}">${esc(c.name)}</a><br><small>${esc(c.phone)}</small>`, fmtDate(x.saleDate), fmtDate(x.warrantyEnd), badge(s + (s !== 'Expired' ? ` · ${d}d` : ''), { Active: 'green', Expiring: 'amber', Expired: 'red' }[s]) + (x.invoiceId ? '' : ' <small class="muted">manual</small>'),
        `<span class="row nowrap"><button class="btn sm" onclick="AMC.ticketForm({customerId:'${c.id}',assetId:'${x.id}'})">Complaint</button>${s !== 'Active' ? `<button class="btn sm wa" onclick="AMC.waWar('${x.id}')">AMC offer</button>` : ''}</span>`] };
    }), { empty: 'No devices registered. Devices are added automatically when you invoice serial-tracked items.' })}`;
  },
  assetForm() {
    modal('Register customer device', `<form class="form-grid" onsubmit="AMC.saveAsset(event)">
      ${field('Customer *', sel('customerId', DB.all('customers').map(c => [c.id, `${c.name} · ${c.phone}`]), '', '— select —', 'required'), 'full')}
      ${field('Product *', inp('itemName', '', 'text', 'required'))}${field('Serial no *', inp('serial', '', 'text', 'required'))}
      ${field('Purchase date', inp('saleDate', today(), 'date'))}${field('Warranty till', inp('warrantyEnd', addMonths(today(), 12), 'date'))}
      ${field('Category', sel('category', CAT_LIST, 'cctv'))}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveAsset(e) { e.preventDefault(); const d = formData(e.target); await DB.put('assets', { id: uid('as_'), ...d }); closeModal(); App.refresh(); },
  waWar(id) { const x = DB.get('assets', id), c = cust(x.customerId); waPicker(c.whatsapp || c.phone, c.name, [{ key: 'amc', label: 'Warranty / AMC offer', data: { name: c.name, item: `${x.itemName} (S/N ${x.serial}) warranty`, date: fmtDate(x.warrantyEnd) } }]); },

  /* ---------- Tickets ---------- */
  draw_tickets() {
    const q = this.f.q.toLowerCase();
    const list = DB.all('tickets').filter(t => (!q || `${t.no} ${t.subject} ${cust(t.customerId).name} ${cust(t.customerId).phone}`.toLowerCase().includes(q)) && (this.f.st ? t.status === this.f.st : true))
      .sort((a, b) => (['Resolved', 'Closed'].includes(a.status) - ['Resolved', 'Closed'].includes(b.status)) || b.createdAt - a.createdAt);
    $('#aOut').innerHTML = `${this.bar('Ticket no, customer, subject…', TICKET_STATUS, 'draw_tickets', '<button class="btn primary" onclick="AMC.ticketForm({})">+ New complaint</button>')}
      ${table(['Ticket', 'Customer', 'Complaint', 'Priority', 'SLA due', 'Technician', 'Status'], list.map(t => {
      const c = cust(t.customerId), late = !['Resolved', 'Closed'].includes(t.status) && t.slaDue < today();
      return { attrs: `class="click ${late ? 'bad' : ''}" onclick="AMC.ticketView('${t.id}')"`, cells: [`<b>${esc(t.no)}</b><br><small>${fmtDate(tsDate(t.createdAt))}</small>`, `${esc(c.name)}<br><small>${esc(c.phone)}</small>`, `${esc(t.subject)}${t.amcId ? ' ' + badge('AMC', 'teal') : ''}${t.assetId ? ' ' + badge('Warranty', 'blue') : ''}`, badge(t.priority, { Urgent: 'red', High: 'amber' }[t.priority] || 'grey'), late ? `<b style="color:var(--danger)">${fmtDate(t.slaDue)}</b>` : fmtDate(t.slaDue), esc(userName(t.techId)), this.tBadge(t.status)] };
    }), { empty: 'No tickets' })}`;
  },
  tBadge: s => badge(s, { Open: 'red', Assigned: 'blue', 'In progress': 'amber', Resolved: 'green', Closed: 'grey' }[s]),
  ticketForm(p) {
    const custs = DB.all('customers').sort((a, b) => a.name.localeCompare(b.name));
    modal('New complaint ticket', `<form class="form-grid" onsubmit="AMC.saveTicket(event)">
      ${field('Customer *', sel('customerId', custs.map(c => [c.id, `${c.name} · ${c.phone}`]), p.customerId, '— select —', 'required onchange="AMC.tkLinks(this.value)"'), 'full')}
      <div id="tkLinks" class="full form-grid"></div>
      ${field('Subject *', inp('subject', '', 'text', 'required placeholder="e.g. Camera 3 not showing"'), 'full')}
      ${field('Details', txt('desc'), 'full')}
      ${field('Priority', sel('priority', PRIORITIES, 'Normal'))}${field('SLA due date', inp('slaDue', addDays(today(), 1), 'date'))}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Create ticket</button></div></form>`);
    this.tkLinks(p.customerId, p.assetId);
  },
  tkLinks(cid, assetId) {
    const box = $('#tkLinks'); if (!box || !cid) { if (box) box.innerHTML = ''; return; }
    box.innerHTML = field('Device / serial', sel('assetId', DB.where('assets', a => a.customerId === cid).map(a => [a.id, `${a.itemName} · ${a.serial} (${this.warStatus(a)})`]), assetId, '— none —')) +
      field('AMC contract', sel('amcId', DB.where('amcs', a => a.customerId === cid && this.amcStatus(a) !== 'Expired').map(a => [a.id, `${a.no} · ${a.title}`]), '', '— none —'));
  },
  async saveTicket(e) {
    e.preventDefault(); const d = formData(e.target);
    const t = { id: uid('tk_'), no: DB.nextNo('tickets', 'TK-'), ...d, status: 'Open', createdAt: Date.now(), createdBy: App.user.id, history: [{ status: 'Open', at: Date.now(), by: App.user.id, note: 'Ticket created' }] };
    await DB.put('tickets', t); closeModal(); toast('Ticket ' + t.no + ' created');
    if (App.isAdmin() && confirmBox('Assign a technician now?')) return this.assignTicket(t.id);
    App.refresh();
  },
  ticketView(id) {
    const t = DB.get('tickets', id), c = cust(t.customerId), as = t.assetId && DB.get('assets', t.assetId), am = t.amcId && DB.get('amcs', t.amcId), j = t.jobId && DB.get('fieldJobs', t.jobId);
    modal(`${t.no} · ${t.subject}`, `<div class="dl mb"><div><span>Customer</span><b><a href="#customer/${c.id}">${esc(c.name)}</a> · ${esc(c.phone)}</b></div><div><span>Priority</span><b>${esc(t.priority)}</b></div><div><span>SLA due</span><b>${fmtDate(t.slaDue)}</b></div><div><span>Status</span><b>${this.tBadge(t.status)}</b></div>
      ${as ? `<div><span>Device</span><b>${esc(as.itemName)} · ${esc(as.serial)} (${this.warStatus(as)})</b></div>` : ''}${am ? `<div><span>AMC</span><b>${esc(am.no)} (${this.amcStatus(am)})</b></div>` : ''}
      ${j ? `<div><span>Field job</span><b>${esc(j.no)} · ${esc(userName(j.techId))} · ${Field.statusBadge(j.status)}</b></div>` : ''}</div>
      ${t.desc ? `<p>${esc(t.desc)}</p>` : ''}
      <form class="form-grid" onsubmit="AMC.saveTkStatus(event,'${id}')">${field('Change status', sel('status', TICKET_STATUS, t.status))}${field('Note', inp('note'))}
      <div class="full modal-foot">${!j && App.isAdmin() ? `<button type="button" class="btn" onclick="AMC.assignTicket('${id}')">👷 Assign technician</button>` : ''}<button type="button" class="btn wa" onclick="AMC.waTicket('${id}')">WhatsApp</button><button class="btn primary">Update</button></div></form>
      <h3 class="mb">History</h3><ul class="timeline">${(t.history || []).slice().reverse().map(h => `<li><b>${esc(h.status)}</b><small>${fmtDT(h.at)} · ${esc(userName(h.by))}${h.note ? ' · ' + esc(h.note) : ''}</small></li>`).join('')}</ul>`, { wide: true, noFocus: true });
  },
  async setTicketStatus(t, status, note, by) {
    t.status = status; t.history = t.history || []; t.history.push({ status, at: Date.now(), by: by || App.user.id, note });
    if (status === 'Resolved') t.resolvedAt = Date.now();
    await DB.put('tickets', t);
  },
  async saveTkStatus(e, id) { e.preventDefault(); const d = formData(e.target); await this.setTicketStatus(DB.get('tickets', id), d.status, d.note); closeModal(); toast('Ticket updated'); App.refresh(); },
  assignTicket(id) { const t = DB.get('tickets', id), c = cust(t.customerId); Field.jobForm({ type: 'Complaint', customerId: c.id, ticketId: id, title: `${t.no}: ${t.subject}`, date: today() }); },
  waTicket(id) { const t = DB.get('tickets', id), c = cust(t.customerId); waPicker(c.whatsapp || c.phone, c.name, [{ key: 'jobstatus', label: 'Ticket status', data: { name: c.name, device: t.subject, no: t.no, status: t.status, note: '' } }, { key: 'review', label: 'Review request', data: { name: c.name } }]); },
  exportAmc() { const rows = [['AMC', 'Customer', 'Phone', 'Title', 'Start', 'End', 'Amount', 'Visits done', 'Visits total', 'Status']]; DB.all('amcs').forEach(a => { const c = cust(a.customerId); rows.push([a.no, c.name, c.phone, a.title, a.start, a.end, a.amount, a.visits.filter(v => v.done).length, a.visits.length, this.amcStatus(a)]); }); downloadCSV('amc-' + today(), rows); },
  exportWar() { const rows = [['Serial', 'Product', 'Customer', 'Phone', 'Sold on', 'Warranty till', 'Status']]; DB.all('assets').forEach(a => { const c = cust(a.customerId); rows.push([a.serial, a.itemName, c.name, c.phone, a.saleDate, a.warrantyEnd, this.warStatus(a)]); }); downloadCSV('warranty-' + today(), rows); },
};
Pages.amc = { title: 'Warranty & AMC', render: el => AMC.render(el) };
