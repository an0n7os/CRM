'use strict';
/* ===== Field jobs: technician app, owner live view, attendance ===== */
const Field = {
  statusBadge: s => badge(s, { Unassigned: 'red', Assigned: 'grey', Travelling: 'blue', 'At site': 'amber', Working: 'amber', Completed: 'green' }[s]),
  dueAt(j) { const d = new Date(`${j.date}T${j.time || '10:00'}:00`); return d.getTime() + num(j.estHours || 3) * 3600000; },
  todayJobs(techId) { const t = today(); return DB.where('fieldJobs', j => j.techId === techId && (j.date === t || (j.date < t && j.status !== 'Completed') || (j.completedAt && tsDate(j.completedAt) === t))); },
  techState(u) {
    const jobs = this.todayJobs(u.id);
    const active = jobs.find(j => ['Travelling', 'At site', 'Working'].includes(j.status));
    const logs = DB.where('fieldJobs', j => j.techId === u.id).flatMap(j => (j.log || []).map(l => ({ ...l, job: j }))).filter(l => l.at && tsDate(l.at) === today()).sort((a, b) => b.at - a.at);
    const att = Attendance.todayRec(u.id);
    const last = logs[0] || (att && att.in ? { at: att.in.at, gps: att.in.gps, status: 'Checked in' } : null);
    if (att && att.out) return { status: 'Off duty', cls: '', job: null, last: { at: att.out.at, gps: att.out.gps }, jobs, att };
    return { status: active ? active.status : jobs.some(j => j.status === 'Assigned') ? 'Free (jobs pending)' : att ? 'Free' : 'Not checked in', cls: active ? 'amber' : att ? 'green' : 'red', job: active, last, jobs, att };
  },
  isFree(u) { const s = this.techState(u); return !s.job && !(s.att && s.att.out); },

  /* ---------- job form / creation ---------- */
  jobForm(p = {}) {
    const l = p.leadId && DB.get('leads', p.leadId);
    if (l) { p.customerId = l.customerId; p.title = p.title || `${CATS[l.category].label} — ${l.requirement || l.stage}`; p.type = p.type || (CATS[l.category].path === 'project' ? (Leads.idx(l) < 3 ? 'Site survey' : 'Installation') : 'Delivery / Setup'); }
    const techs = users('technician');
    window._jobPreset = p;
    modal('New field job', `<form class="form-grid" onsubmit="Field.saveJob(event)">
      ${field('Customer *', sel('customerId', DB.all('customers').sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, `${c.name} · ${c.phone} · ${c.area || ''}`]), p.customerId, '— select —', 'required'), 'full')}
      ${field('Job type', sel('type', JOB_TYPES, p.type || 'Service visit'))}
      ${field('Title / work *', inp('title', p.title || '', 'text', 'required'), '')}
      ${field('Date', inp('date', p.date || today(), 'date'))}${field('Time', inp('time', p.time || '10:00', 'time'))}
      ${field('Estimated hours', inp('estHours', p.estHours || 3, 'number', 'min="0.5" step="0.5"'))}
      ${field('Technician', sel('techId', techs.map(u => [u.id, `${u.name} — ${this.techState(u).status}`]), p.techId || '', '— leave unassigned —'))}
      ${field('Site address (if different)', inp('address', p.address || ''), 'full')}
      ${field('Instructions', txt('notes', p.notes || ''), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save job</button></div></form>`);
  },
  async saveJob(e) {
    e.preventDefault(); const d = formData(e.target), p = window._jobPreset || {};
    const j = await this.createJob({ ...p, ...d });
    closeModal(); toast('Field job ' + j.no + ' created');
    if (j.techId && confirmBox('Send WhatsApp job alert to the technician?')) this.waTech(j.id);
    App.refresh();
  },
  async createJob(d) {
    const c = cust(d.customerId), now = Date.now();
    const recent = DB.where('fieldJobs', x => x.customerId === d.customerId && x.status === 'Completed' && x.completedAt > now - 30 * 864e5).sort((a, b) => b.completedAt - a.completedAt)[0];
    const j = { id: uid('fj_'), no: DB.nextNo('fieldJobs', 'FJ-'), type: d.type, title: d.title, customerId: d.customerId, leadId: d.leadId || '', ticketId: d.ticketId || '', amcId: d.amcId || '', visitId: d.visitId || '',
      address: d.address || `${c.address || ''} ${c.area || ''}`.trim(), phone: c.whatsapp || c.phone, date: d.date, time: d.time, estHours: num(d.estHours) || 3, techId: d.techId || '', notes: d.notes || '',
      status: d.techId ? 'Assigned' : 'Unassigned', log: d.techId ? [{ status: 'Assigned', at: now, by: App.user.id, gps: null }] : [], createdAt: now, createdBy: App.user.id,
      reworkOf: recent && ['Complaint', 'Service visit'].includes(d.type) ? recent.id : '' };
    await DB.put('fieldJobs', j);
    if (j.ticketId) { const t = DB.get('tickets', j.ticketId); if (t) { t.jobId = j.id; t.techId = j.techId; if (j.techId) await AMC.setTicketStatus(t, 'Assigned', 'Assigned to ' + userName(j.techId)); else await DB.put('tickets', t); } }
    if (j.amcId) { const a = DB.get('amcs', j.amcId); const v = a && a.visits.find(x => x.id === j.visitId); if (v) { v.jobId = j.id; v.techId = j.techId; await DB.put('amcs', a); } }
    return j;
  },
  async assign(jobId, techId) {
    if (!techId) return toast('Choose a technician', 'err');
    const j = DB.get('fieldJobs', jobId); j.techId = techId; j.status = 'Assigned';
    j.log = j.log || []; j.log.push({ status: 'Assigned', at: Date.now(), by: App.user.id, gps: null });
    await DB.put('fieldJobs', j);
    if (j.ticketId) { const t = DB.get('tickets', j.ticketId); if (t) { t.techId = techId; await AMC.setTicketStatus(t, 'Assigned', 'Assigned to ' + userName(techId)); } }
    if (j.amcId) { const a = DB.get('amcs', j.amcId), v = a && a.visits.find(x => x.id === j.visitId); if (v) { v.techId = techId; await DB.put('amcs', a); } }
    toast('Assigned to ' + userName(techId));
    if (confirmBox('Send WhatsApp job alert to ' + userName(techId) + '?')) this.waTech(jobId);
    App.refresh();
  },
  waTech(jobId) {
    const j = DB.get('fieldJobs', jobId), u = user(j.techId), c = cust(j.customerId);
    openWA(u.phone, waText('assign', { no: j.no, item: `${j.type}: ${j.title}`, name: c.name, phone: c.phone, address: j.address + (j.address ? '\n' + mapSearch(j.address) : ''), date: `${fmtDate(j.date)} ${j.time || ''}` }));
  },

  /* ---------- owner live view ---------- */
  render(el) {
    const techs = users('technician'), t = today();
    const states = techs.map(u => ({ u, s: this.techState(u) }));
    const un = DB.where('fieldJobs', j => j.status === 'Unassigned').sort((a, b) => a.date.localeCompare(b.date));
    const todays = DB.where('fieldJobs', j => j.date === t).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const upcoming = DB.where('fieldJobs', j => j.date > t && j.date <= addDays(t, 7)).sort((a, b) => a.date.localeCompare(b.date));
    el.innerHTML = `<div class="row mb"><span class="muted">Auto-refreshes every 60 seconds · ${fmtTime(Date.now())}</span><span class="spacer"></span><button class="btn" onclick="App.refresh()">↻ Refresh</button><button class="btn primary" onclick="Field.jobForm({})">+ New field job</button></div>
    <div class="kpis">${kpi('On duty', states.filter(x => x.s.att && !x.s.att.out).length + ' / ' + techs.length)}${kpi('Busy now', states.filter(x => x.s.job).length, '', 'amber')}${kpi('Free', states.filter(x => !x.s.job && x.s.att && !x.s.att.out).length, '', 'green')}${kpi('Unassigned jobs', un.length, '', un.length ? 'red' : '')}${kpi('Completed today', DB.where('fieldJobs', j => j.completedAt && tsDate(j.completedAt) === t).length, '', 'green')}</div>
    <div class="card"><h3 class="mb">👷 Technicians — live status</h3>${table(['Technician', 'Status', 'Current job', 'Last update', 'Last location', 'Today', 'Km today'], states.map(({ u, s }) => {
      const done = s.jobs.filter(j => j.status === 'Completed').length;
      return [`<b>${esc(u.name)}</b><br><small>${s.att && s.att.in ? 'In ' + fmtTime(s.att.in.at) : 'Not checked in'}</small>`, `<span class="dot ${s.cls}"></span>${esc(s.status)}`, s.job ? `${esc(s.job.no)} · ${esc(s.job.title)}<br><small>${esc(cust(s.job.customerId).name)}</small>` : '—',
        s.last ? `${fmtTime(s.last.at)}<br><small>${ago(s.last.at)}</small>` : '—', s.last ? mapLink(s.last.gps) : '—', `${done}/${s.jobs.length} done`, (Attendance.kmToday(u.id)).toFixed(1) + ' km'];
    }), { empty: 'No technicians' })}<div class="muted mt">ℹ️ Location is recorded only when staff tap a status button or check in/out during duty hours (with their consent).</div></div>
    <div class="card"><h3 class="mb">📥 Unassigned jobs</h3>${table(['Job', 'Customer', 'Date', 'Assign to', ''], un.map(j => {
      const c = cust(j.customerId);
      return [`<b>${esc(j.no)}</b> ${badge(j.type, 'blue')}<br>${esc(j.title)}`, `${esc(c.name)}<br><small>${esc(c.area || '')}</small>`, `${fmtDate(j.date)} ${esc(j.time || '')}`,
        `<select id="as_${j.id}">${opts(states.map(({ u, s }) => [u.id, `${u.name} — ${s.job ? 'Busy' : (s.att && !s.att.out) ? 'Free' : s.status}`]), (states.find(x => !x.s.job && x.s.att && !x.s.att.out) || {}).u?.id, '— select —')}</select>`, `<button class="btn sm primary" onclick="Field.assign('${j.id}',$('#as_${j.id}').value)">Assign</button>`];
    }), { empty: 'All jobs are assigned 👍' })}</div>
    <div class="card"><h3 class="mb">📅 Today's jobs</h3>${this.jobTable(todays)}</div>
    <div class="card"><h3 class="mb">🗓️ Next 7 days</h3>${this.jobTable(upcoming)}</div>`;
    clearTimeout(this._t); this._t = setTimeout(() => { if (App.page === 'field' && !$('#modalRoot').innerHTML) App.refresh(); }, 60000);
  },
  jobTable(list) {
    return table(['Job', 'Customer', 'When', 'Technician', 'Status', 'Last update'], list.map(j => {
      const c = cust(j.customerId), last = (j.log || []).slice(-1)[0];
      return { attrs: `class="click" onclick="Field.jobView('${j.id}')"`, cells: [`<b>${esc(j.no)}</b> ${badge(j.type, 'blue')}${j.reworkOf ? ' ' + badge('Repeat visit', 'red') : ''}<br>${esc(j.title)}`, `${esc(c.name)}<br><small>${esc(c.area || '')}</small>`, `${fmtDate(j.date)} ${esc(j.time || '')}`, esc(userName(j.techId)), this.statusBadge(j.status), last ? `${fmtTime(last.at)} ${last.gps ? mapLink(last.gps) : ''}` : '—'] };
    }), { empty: 'No jobs' });
  },
  jobView(id) {
    const j = DB.get('fieldJobs', id), c = cust(j.customerId), cp = j.completion || {};
    modal(`${j.no} · ${j.title}`, `<div class="dl mb"><div><span>Customer</span><b><a href="#customer/${c.id}">${esc(c.name)}</a> · ${esc(c.phone)}</b></div><div><span>Type</span><b>${esc(j.type)}</b></div><div><span>Scheduled</span><b>${fmtDate(j.date)} ${esc(j.time || '')}</b></div><div><span>Technician</span><b>${esc(userName(j.techId))}</b></div><div><span>Status</span><b>${this.statusBadge(j.status)}</b></div><div><span>Address</span><b>${esc(j.address)} <a target="_blank" rel="noopener" href="${mapSearch(j.address)}">map</a></b></div></div>
      ${j.notes ? `<p>${esc(j.notes)}</p>` : ''}
      <h3 class="mb">Status log</h3>${table(['Status', 'Time', 'GPS', 'By'], (j.log || []).map(l => [esc(l.status), fmtDT(l.at), mapLink(l.gps), esc(userName(l.by))]), { cards: false })}
      ${j.status === 'Completed' ? `<h3 class="mt mb">Completion proof</h3><div class="dl mb"><div><span>Verified by</span><b>${cp.otpVerified ? 'Customer OTP ✔' : cp.signature ? 'Customer signature ✔' : '—'}</b></div><div><span>Customer rating</span><b>${cp.rating ? '★'.repeat(cp.rating) + '☆'.repeat(5 - cp.rating) : '—'}</b></div><div><span>Remarks</span><b>${esc(cp.remarks || '—')}</b></div></div>
        <div class="row">${photoGrid(cp.photos || [])}${cp.signature ? `<img src="${cp.signature}" style="height:96px;border:1px solid var(--line);border-radius:8px;background:#fff">` : ''}</div>` : ''}
      <div class="modal-foot">${App.isAdmin() && j.status !== 'Completed' ? `<button class="btn danger" onclick="Field.delJob('${id}')">Delete</button><span class="spacer"></span>` : ''}${j.techId ? `<button class="btn wa" onclick="Field.waTech('${id}')">Alert technician</button>` : ''}<button class="btn" onclick="closeModal()">Close</button></div>`, { wide: true, noFocus: true });
  },
  async delJob(id) { if (!confirmBox('Delete this field job?')) return; await DB.del('fieldJobs', id); closeModal(); App.refresh(); },

  /* ---------- technician: my jobs ---------- */
  myJobs(el) {
    const me = App.user, t = today(), att = Attendance.todayRec(me.id);
    const jobs = DB.where('fieldJobs', j => j.techId === me.id);
    const active = jobs.filter(j => j.status !== 'Completed' && j.date <= t).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    const later = jobs.filter(j => j.status !== 'Completed' && j.date > t).sort((a, b) => a.date.localeCompare(b.date));
    const doneToday = jobs.filter(j => j.completedAt && tsDate(j.completedAt) === t);
    const bench = DB.where('jobcards', j => j.techId === me.id && !['Delivered', 'Closed'].includes((DB.get('leads', j.leadId) || {}).stage));
    el.innerHTML = `${Attendance.card(me.id)}
      ${bench.length ? `<div class="alert info">🔧 You have <b>${bench.length}</b> bench job card(s) in the shop. <a href="#jobcards">Open job cards →</a></div>` : ''}
      <h2 class="mb">Today's jobs (${active.length})</h2>
      ${active.map(j => this.jobCard(j, att)).join('') || '<div class="empty mb">No pending jobs for today 🎉</div>'}
      ${doneToday.length ? `<h3 class="mt mb">Completed today (${doneToday.length})</h3>${doneToday.map(j => `<div class="list-item"><div class="grow"><b>${esc(j.no)} · ${esc(j.title)}</b><small class="muted">${esc(cust(j.customerId).name)} · done ${fmtTime(j.completedAt)}</small></div>${this.statusBadge('Completed')}</div>`).join('')}` : ''}
      ${later.length ? `<h3 class="mt mb">Upcoming</h3>${later.map(j => `<div class="list-item"><div class="grow"><b>${esc(j.title)}</b><small class="muted">${fmtDate(j.date)} ${esc(j.time || '')} · ${esc(cust(j.customerId).name)} · ${esc(cust(j.customerId).area || '')}</small></div>${badge(j.type, 'blue')}</div>`).join('')}` : ''}`;
  },
  jobCard(j, att) {
    const c = cust(j.customerId), ci = FIELD_STATUS.indexOf(j.status), late = j.date < today();
    return `<div class="job"><div class="row between"><div><b style="font-size:15px">${esc(j.title)}</b><br><small class="muted">${esc(j.no)} · ${esc(j.type)} · ${late ? `<b style="color:var(--danger)">from ${fmtDate(j.date)}</b>` : 'today'} ${esc(j.time || '')}</small></div>${this.statusBadge(j.status)}</div>
      <div class="mt"><b>${esc(c.name)}</b> · <a href="tel:${esc(c.phone)}">📞 ${esc(c.phone)}</a><br><span class="muted">${esc(j.address)}</span> <a href="${mapSearch(j.address)}" target="_blank" rel="noopener">🧭 Navigate</a></div>
      ${j.notes ? `<div class="alert info mt" style="margin-bottom:0">${esc(j.notes)}</div>` : ''}
      ${j.reworkOf ? '<div class="alert warn mt" style="margin-bottom:0">Repeat visit — this customer had a job completed in the last 30 days.</div>' : ''}
      <div class="job-status">${FIELD_STATUS.map((s, i) => `<button class="${i < ci ? 'done' : i === ci ? 'cur' : ''}" ${i <= ci || !att || att.out ? 'disabled' : ''} onclick="Field.setStatus('${j.id}','${s}')">${['📋', '🛵', '📍', '🛠️', '✅'][i]}<br>${s}</button>`).join('')}</div>
      ${!att ? '<div class="muted mt">Check in first to update job status.</div>' : ''}</div>`;
  },
  async setStatus(id, status) {
    if (status === 'Completed') return this.completeForm(id);
    const j = DB.get('fieldJobs', id);
    toast('Getting GPS location…');
    const gps = await getGPS();
    j.status = status; j.log = j.log || []; j.log.push({ status, at: Date.now(), by: App.user.id, gps });
    if (status === 'At site') j.startedAt = Date.now();
    await DB.put('fieldJobs', j);
    if (j.ticketId && ['Travelling', 'At site', 'Working'].includes(status)) { const t = DB.get('tickets', j.ticketId); if (t && t.status !== 'In progress') await AMC.setTicketStatus(t, 'In progress', status); }
    if (j.leadId && j.type === 'Installation' && status === 'Working') await Leads.advanceTo(DB.get('leads', j.leadId), 'Installing', 'Technician started work');
    toast(`${status} · ${gps ? 'GPS saved' : 'GPS not available'}`); App.refresh();
  },
  completeForm(id) {
    const j = DB.get('fieldJobs', id), c = cust(j.customerId);
    window._cmp = { photos: [], rating: 0 };
    modal('Complete job — ' + j.no, `
      <div class="alert info">Completion needs <b>at least one photo</b> and <b>customer OTP or signature</b>.</div>
      <h3 class="mb">1. Work photos *</h3><div class="row" id="cmpPhotos">${photoAdd('Field.cmpPhoto(this)', 'Take photo')}</div>
      <h3 class="mt mb">2. Customer verification *</h3>
      <div class="row mb"><button type="button" class="btn wa" onclick="Field.sendOtp('${id}')">Send OTP to ${esc(c.name)} on WhatsApp</button><input id="otpIn" inputmode="numeric" maxlength="4" placeholder="Enter OTP" style="max-width:130px;font-size:18px;letter-spacing:4px"></div>
      <div class="muted mb">— or customer signs below —</div>
      <canvas class="sig" id="sigPad"></canvas><button type="button" class="btn sm mt" onclick="Field._pad.clear()">Clear signature</button>
      <h3 class="mt mb">3. Customer rating</h3><div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<span onclick="Field.rate(${n})">★</span>`).join('')}</div>
      <div class="mt">${field('Work done / remarks', '<textarea id="cmpRemarks" placeholder="e.g. Installed 4 cameras, configured mobile view"></textarea>')}</div>
      <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="Field.complete('${id}')">✅ Mark completed</button></div>`, { wide: true, noFocus: true, onOpen: () => setTimeout(() => { Field._pad = sigPad($('#sigPad')); }, 50) });
  },
  async cmpPhoto(input) {
    const ps = await readImages(input); window._cmp.photos.push(...ps);
    $('#cmpPhotos').innerHTML = photoGrid(window._cmp.photos) + photoAdd('Field.cmpPhoto(this)', 'Add more');
  },
  rate(n) { window._cmp.rating = n; $$('#stars span').forEach((s, i) => s.classList.toggle('on', i < n)); },
  async sendOtp(id) {
    const j = DB.get('fieldJobs', id), c = cust(j.customerId);
    j.otp = String(Math.floor(1000 + Math.random() * 9000)); await DB.put('fieldJobs', j);
    openWA(c.whatsapp || c.phone, waText('otp', { name: c.name, no: j.no, otp: j.otp }));
    toast('OTP sent — ask the customer for the 4-digit code');
  },
  async complete(id) {
    const j = DB.get('fieldJobs', id), cm = window._cmp, otp = $('#otpIn').value.trim();
    if (!cm.photos.length) return toast('Add at least one work photo', 'err');
    const otpOk = j.otp && otp === j.otp, sigOk = !this._pad.isEmpty();
    if (otp && !otpOk) return toast('OTP does not match', 'err');
    if (!otpOk && !sigOk) return toast('Customer OTP or signature is required', 'err');
    toast('Getting GPS location…');
    const gps = await getGPS(), now = Date.now();
    j.completion = { photos: cm.photos, otpVerified: otpOk, signature: sigOk ? this._pad.data() : '', rating: cm.rating, remarks: $('#cmpRemarks').value, at: now };
    j.status = 'Completed'; j.completedAt = now; j.log.push({ status: 'Completed', at: now, by: App.user.id, gps });
    if (!j.startedAt) j.startedAt = (j.log.find(l => l.status === 'At site') || {}).at || now;
    await DB.put('fieldJobs', j);
    if (j.ticketId) { const t = DB.get('tickets', j.ticketId); if (t) await AMC.setTicketStatus(t, 'Resolved', 'Completed by ' + userName(j.techId)); }
    if (j.amcId) await AMC.markVisit(j.amcId, j.visitId, j);
    const l = j.leadId && DB.get('leads', j.leadId);
    if (l && j.type === 'Installation') await Leads.advanceTo(l, 'Handover', 'Installation completed');
    if (l && j.type === 'Delivery / Setup') await Leads.advanceTo(l, 'Delivered', 'Delivered & set up');
    closeModal(); toast('Job completed ✔'); App.refresh();
  },
};

/* ===== Attendance & travel claims ===== */
const Attendance = {
  f: { range: 'month', from: '', to: '', who: '' },
  todayRec: uid_ => DB.find('attendance', a => a.userId === uid_ && a.date === today()),
  points(userId, date) {
    const a = DB.find('attendance', x => x.userId === userId && x.date === date); const pts = [];
    if (a && a.in && a.in.gps) pts.push({ at: a.in.at, ...a.in.gps });
    DB.where('fieldJobs', j => j.techId === userId).forEach(j => (j.log || []).forEach(l => { if (l.gps && l.by === userId && tsDate(l.at) === date) pts.push({ at: l.at, ...l.gps }); }));
    if (a && a.out && a.out.gps) pts.push({ at: a.out.at, ...a.out.gps });
    return pts.sort((x, y) => x.at - y.at);
  },
  autoKm(userId, date) { const p = this.points(userId, date); let k = 0; for (let i = 1; i < p.length; i++) k += haversine(p[i - 1], p[i]); return round2(k * 1.3); },
  kmToday(userId) { const a = this.todayRec(userId); return a && a.km != null && a.out ? num(a.km) : this.autoKm(userId, today()); },
  card(userId) {
    const a = this.todayRec(userId);
    return `<div class="card"><div class="row between"><div><h3>🕘 Attendance — ${fmtDate(today())}</h3>
      <small class="muted">${a ? `Checked in ${fmtTime(a.in.at)}${a.out ? ` · Checked out ${fmtTime(a.out.at)} · ${num(a.km).toFixed(1)} km · claim ${inr(a.claim)}` : ` · ${this.kmToday(userId).toFixed(1)} km so far`}` : 'Not checked in yet'}</small></div>
      ${!a ? `<button class="btn primary lg" onclick="Attendance.checkIn()">📍 Check in</button>` : !a.out ? `<button class="btn lg" onclick="Attendance.checkOut()">⏏ Check out</button>` : badge('Day closed', 'green')}</div>
      ${a && !a.out ? '<div class="muted mt">🟢 Location tracking is ON while you are on duty (only at check-in, job status taps and check-out).</div>' : ''}</div>`;
  },
  async checkIn() {
    if (this.todayRec(App.user.id)) return;
    toast('Getting GPS location…'); const gps = await getGPS();
    await DB.put('attendance', { id: uid('at_'), userId: App.user.id, date: today(), in: { at: Date.now(), gps }, out: null, km: null, claim: 0, claimStatus: 'Pending' });
    toast(gps ? 'Checked in with GPS ✔' : 'Checked in (GPS not available)'); App.refresh();
  },
  async checkOut() {
    const a = this.todayRec(App.user.id); if (!a || a.out) return;
    toast('Getting GPS location…'); const gps = await getGPS();
    a.out = { at: Date.now(), gps };
    a.kmAuto = this.autoKm(App.user.id, today());
    const km = await promptModal('Check Out — Confirm Travel', `Km travelled today (auto calculated from GPS: ${a.kmAuto} km). Edit if your odometer shows different:`, a.kmAuto, null, { type: 'number', step: '0.1', min: '0' });
    if (km === null) return;
    a.km = num(km); a.claim = round2(a.km * num(App.settings.kmRate));
    await DB.put('attendance', a); toast(`Checked out · ${a.km} km · claim ${inr(a.claim)}`); App.refresh();
  },
  render(el) {
    const me = App.user, mgr = App.role('admin', 'accounts'), f = this.f;
    if (f.range !== 'custom') [f.from, f.to] = rangePreset(f.range);
    let list = DB.all('attendance').filter(a => inRange(a.date, f.from, f.to));
    if (!mgr) list = list.filter(a => a.userId === me.id); else if (f.who) list = list.filter(a => a.userId === f.who);
    list.sort((a, b) => b.date.localeCompare(a.date) || userName(a.userId).localeCompare(userName(b.userId)));
    const hrs = a => a.out ? ((a.out.at - a.in.at) / 3600000).toFixed(1) : '—';
    el.innerHTML = `${this.card(me.id)}
      <div class="card"><div class="card-head"><h3>${mgr ? 'Staff attendance & travel claims' : 'My attendance & travel claims'}</h3><small class="muted">Rate: ${inr(App.settings.kmRate, 2)} per km</small></div>
      <div class="filters"><select style="width:auto" onchange="Attendance.f.range=this.value;App.refresh()">${opts(RANGE_PRESETS, f.range)}</select>
        ${f.range === 'custom' ? `<input type="date" style="width:auto" value="${f.from}" onchange="Attendance.f.from=this.value;App.refresh()"><input type="date" style="width:auto" value="${f.to}" onchange="Attendance.f.to=this.value;App.refresh()">` : ''}
        ${mgr ? `<select style="width:auto" onchange="Attendance.f.who=this.value;App.refresh()">${opts(userOpts(), f.who, 'All staff')}</select>` : ''}
        <span class="spacer"></span><button class="btn" onclick="Attendance.exportCSV()">⬇ CSV</button></div>
      <div class="kpis">${kpi('Days present', list.length)}${kpi('Total km', sum(list, a => a.km).toFixed(1))}${kpi('Claims', inr(sum(list, a => a.claim)), 'Pending ' + inr(sum(list.filter(a => a.claimStatus === 'Pending'), a => a.claim)), 'amber')}</div>
      ${table(['Date', 'Staff', 'Check in', 'Check out', 'Hours', { t: 'Km', num: 1 }, { t: 'Claim', num: 1 }, 'Claim status', ''], list.map(a => [fmtDate(a.date), esc(userName(a.userId)),
        `${fmtTime(a.in.at)}<br>${mapLink(a.in.gps)}`, a.out ? `${fmtTime(a.out.at)}<br>${mapLink(a.out.gps)}` : badge('On duty', 'green'), hrs(a), a.km != null ? num(a.km).toFixed(1) : '—', inr(a.claim),
        badge(a.claimStatus, { Pending: 'amber', Approved: 'blue', Paid: 'green', Rejected: 'red' }[a.claimStatus]),
        mgr && a.out ? `<span class="row nowrap"><button class="btn sm" onclick="Attendance.editKm('${a.id}')">Km</button>${a.claimStatus === 'Pending' ? `<button class="btn sm primary" onclick="Attendance.setClaim('${a.id}','Approved')">Approve</button>` : a.claimStatus === 'Approved' ? `<button class="btn sm" onclick="Attendance.setClaim('${a.id}','Paid')">Mark paid</button>` : ''}</span>` : '']), { empty: 'No attendance records in this period' })}
      </div>`;
  },
  async editKm(id) {
    const a = DB.get('attendance', id);
    const km = await promptModal('Adjust Travel Km', `Km for ${userName(a.userId)} on ${fmtDate(a.date)} (GPS auto: ${a.kmAuto ?? this.autoKm(a.userId, a.date)} km):`, a.km, null, { type: 'number', step: '0.1', min: '0' });
    if (km === null) return;
    a.km = num(km); a.claim = round2(a.km * num(App.settings.kmRate)); await DB.put('attendance', a); App.refresh();
  },
  async setClaim(id, st) { const a = DB.get('attendance', id); a.claimStatus = st; a.claimBy = App.user.id; await DB.put('attendance', a); toast('Claim ' + st.toLowerCase()); App.refresh(); },
  exportCSV() {
    const rows = [['Date', 'Staff', 'Role', 'Check in', 'In GPS', 'Check out', 'Out GPS', 'Km', 'Claim', 'Claim status']];
    DB.all('attendance').forEach(a => { const u = user(a.userId) || {}; rows.push([a.date, u.name, ROLES[u.role], fmtTime(a.in.at), a.in.gps ? `${a.in.gps.lat},${a.in.gps.lng}` : '', a.out ? fmtTime(a.out.at) : '', a.out && a.out.gps ? `${a.out.gps.lat},${a.out.gps.lng}` : '', a.km, a.claim, a.claimStatus]); });
    downloadCSV('attendance-' + today(), rows);
  },
};
Pages.myjobs = { title: 'My Jobs Today', render: el => Field.myJobs(el) };
Pages.field = { title: 'Field Tracking', render: el => Field.render(el) };
Pages.attendance = { title: 'Attendance', render: el => Attendance.render(el) };
