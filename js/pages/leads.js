'use strict';
/* ===== Leads, pipeline board and lead detail ===== */
const Leads = {
  f: { q: '', cat: '', src: '', score: '', status: 'open', who: '', fu: '' },
  boardPath: 'project',

  path: l => CATS[l.category].path,
  stages(l) { return PATHS[this.path(l)]; },
  idx(l) { return this.stages(l).indexOf(l.stage); },
  stageIdx(l, stage) { return this.stages(l).indexOf(stage); },
  isWon(l) { return l.status !== 'lost' && this.idx(l) >= this.stageIdx(l, WON_STAGE[this.path(l)]); },
  isQuoted(l) { return this.idx(l) >= this.stageIdx(l, QUOTE_STAGE[this.path(l)]) || DB.all('quotes').some(q => q.leadId === l.id) || !!DB.find('jobcards', j => j.leadId === l.id && j.estimate > 0); },
  isContacted(l) { return this.idx(l) >= 1 || (l.calls || []).length > 0; },
  visible() { let l = DB.all('leads'); if (App.user.role === 'sales') l = l.filter(x => x.assignedTo === App.user.id); return l; },
  title(l) { return `${l.name} — ${catLabel(l.category)}`; },

  async move(l, stage, note = '') {
    if (l.stage === stage) return;
    l.history = l.history || [];
    l.history.push({ from: l.stage, stage, at: Date.now(), by: App.user.id, note });
    l.stage = stage;
    if (stage === 'Closed') l.status = 'closed'; else if (l.status === 'closed') l.status = 'open';
    if (stage !== 'Repairing') l.subStatus = '';
    await DB.put('leads', l);
    if (stage === 'Ready') { const jc = DB.find('jobcards', j => j.leadId === l.id); if (jc) { jc.readyAt = Date.now(); await DB.put('jobcards', jc); } }
  },
  /* move forward only (used by automatic updates from other screens) */
  async advanceTo(l, stage, note) {
    if (!l || l.status === 'lost') return;
    if (this.stageIdx(l, stage) > this.idx(l)) await this.move(l, stage, note || 'Auto update');
  },

  async upsertCustomer(d) {
    const ph = cleanPhone(d.phone);
    let c = DB.find('customers', x => x.phone === ph);
    if (c) {
      c.name = d.name || c.name; c.whatsapp = d.whatsapp || c.whatsapp; c.address = d.address || c.address; c.area = d.area || c.area;
      if (d.gstin) c.gstin = d.gstin;
    } else c = { id: uid('cu_'), name: d.name, phone: ph, whatsapp: d.whatsapp || ph, address: d.address || '', area: d.area || '', gstin: d.gstin || '', createdAt: Date.now() };
    await DB.put('customers', c); return c.id;
  },

  /* ---------- list & board ---------- */
  filtered(boardMode) {
    const f = this.f, q = f.q.toLowerCase(), t = today();
    return this.visible().filter(l => {
      if (q && !`${l.name} ${l.phone} ${l.area} ${l.requirement} ${l.address}`.toLowerCase().includes(q)) return false;
      if (f.cat && l.category !== f.cat) return false;
      if (f.src && l.source !== f.src) return false;
      if (f.score && l.score !== f.score) return false;
      if (f.who && l.assignedTo !== f.who) return false;
      if (boardMode) { if (l.status === 'lost' || this.path(l) !== this.boardPath) return false; }
      else if (f.status !== 'all' && l.status !== f.status) return false;
      if (f.fu === 'today' && !(l.followUp === t)) return false;
      if (f.fu === 'overdue' && !(l.followUp && l.followUp < t && l.status === 'open')) return false;
      if (f.fu === 'due' && !(l.followUp && l.followUp <= t && l.status === 'open')) return false;
      return true;
    }).sort((a, b) => (a.followUp || '9999').localeCompare(b.followUp || '9999'));
  },
  setF(k, v, view) { this.f[k] = v; this.draw(view); },
  filterBar(view) {
    const f = this.f, board = view === 'board';
    const cats = board ? CAT_LIST.filter(([k]) => CATS[k].path === this.boardPath) : CAT_LIST;
    return `<div class="filters">
      <input type="search" placeholder="🔍 Search name, phone, area, requirement…" value="${esc(f.q)}" oninput="Leads.setF('q',this.value,'${view}')">
      <select onchange="Leads.setF('cat',this.value,'${view}')">${opts(cats, f.cat, 'All categories')}</select>
      <select onchange="Leads.setF('src',this.value,'${view}')">${opts(SOURCES, f.src, 'All sources')}</select>
      <select onchange="Leads.setF('score',this.value,'${view}')">${opts([['hot', 'Hot'], ['warm', 'Warm'], ['cold', 'Cold']], f.score, 'All scores')}</select>
      ${App.user.role !== 'sales' ? `<select onchange="Leads.setF('who',this.value,'${view}')">${opts(userOpts(['sales', 'admin', 'frontdesk']), f.who, 'All staff')}</select>` : ''}
      ${board ? '' : `<select onchange="Leads.setF('status',this.value,'${view}')">${opts([['open', 'Open'], ['closed', 'Closed (won)'], ['lost', 'Lost'], ['all', 'All status']], f.status)}</select>`}
      <select onchange="Leads.setF('fu',this.value,'${view}')">${opts([['due', 'Follow-up due (today + overdue)'], ['today', 'Follow-up today'], ['overdue', 'Overdue follow-ups']], f.fu, 'Any follow-up')}</select>
    </div>`;
  },
  render(el, args, view) {
    if (args[0] === 'due') { this.f.fu = 'due'; this.f.status = 'open'; }
    el.innerHTML = `<div class="row mb">
      <div class="btn-group"><button class="${view === 'list' ? 'on' : ''}" onclick="App.go('leads')">☰ List</button><button class="${view === 'board' ? 'on' : ''}" onclick="App.go('pipeline')">▦ Board</button></div>
      ${view === 'board' ? `<div class="btn-group">${Object.keys(PATHS).map(p => `<button class="${this.boardPath === p ? 'on' : ''}" onclick="Leads.boardPath='${p}';Leads.f.cat='';App.refresh()">${{ project: 'Projects', service: 'Service', sales: 'Sales' }[p]}</button>`).join('')}</div>` : ''}
      <span class="spacer"></span>
      <button class="btn" onclick="Leads.exportCSV()">⬇ Export CSV</button>
      <button class="btn primary" onclick="Leads.form()">+ New lead</button></div>
      ${this.filterBar(view)}<div id="leadsOut"></div>`;
    this.draw(view);
  },
  draw(view) {
    const out = $('#leadsOut'); if (!out) return;
    if (view === 'board') return this.drawBoard(out);
    const t = today(), list = this.filtered();
    out.innerHTML = `<div class="muted mb">${list.length} lead(s)</div>` + table(
      ['Customer', 'Category', 'Source', 'Stage', 'Score', 'Assigned', 'Follow-up', { t: 'Budget', num: 1 }, ''],
      list.map(l => ({
        attrs: `class="click ${l.status === 'open' && l.followUp && l.followUp < t ? 'warn' : ''}" onclick="App.go('lead/${l.id}')"`,
        cells: [`<b>${esc(l.name)}</b><br><small>${esc(l.phone)} · ${esc(l.area || '')}</small>`, catChip(l.category), esc(l.source),
          this.stageBadge(l), scoreChip(l.score), esc(userName(l.assignedTo)), this.fuText(l), l.budget ? inr(l.budget) : '—',
          `<span class="row nowrap"><a class="btn sm" href="tel:${esc(l.phone)}" onclick="event.stopPropagation()" title="Call">📞</a><button class="btn sm wa" onclick="event.stopPropagation();Leads.wa('${l.id}')" title="WhatsApp">WA</button></span>`]
      })), { empty: 'No leads match these filters' });
  },
  stageBadge(l) {
    if (l.status === 'lost') return badge('Lost', 'red');
    if (l.stage === 'Closed') return badge('Closed', 'green');
    return badge(l.stage, this.isWon(l) ? 'teal' : 'blue') + (l.subStatus ? `<br>${badge(l.subStatus, 'amber')}` : '');
  },
  fuText(l) {
    if (!l.followUp || l.status !== 'open') return '<span class="muted">—</span>';
    const d = daysBetween(today(), l.followUp);
    if (d < 0) return `<span style="color:var(--danger);font-weight:600">${fmtDate(l.followUp)}<br><small>${-d} day(s) overdue</small></span>`;
    if (d === 0) return `<b style="color:var(--warn)">Today</b>`;
    return fmtDate(l.followUp);
  },
  drawBoard(out) {
    const list = this.filtered(true), t = today();
    const stages = PATHS[this.boardPath];
    out.innerHTML = `<div class="muted mb">Drag a card to another column to change its stage (or open the lead and tap a stage). Lost leads are hidden.</div><div class="board">${stages.map(s => {
      const cards = list.filter(l => l.stage === s);
      const val = sum(cards, l => l.budget);
      return `<div class="col-k" data-stage="${esc(s)}" ondragover="event.preventDefault();this.classList.add('drop')" ondragleave="this.classList.remove('drop')" ondrop="Leads.drop(event,this)">
        <div class="col-k-head"><span>${esc(s)} <small class="muted">(${cards.length})</small></span><small class="muted">${val ? inr(val) : ''}</small></div>
        <div class="col-k-body">${cards.map(l => `<div class="kcard ${l.followUp && l.followUp < t && l.status === 'open' ? 'overdue' : ''}" style="border-left-color:${CATS[l.category].color}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${l.id}')" onclick="App.go('lead/${l.id}')">
          <b>${esc(l.name)}</b><small class="muted">${esc(l.area || '')} · ${esc(CATS[l.category].label)}</small>
          <div class="row">${scoreChip(l.score)}${l.budget ? `<small>${inr(l.budget)}</small>` : ''}${l.subStatus ? badge(l.subStatus, 'amber') : ''}</div>
          <div class="row"><small class="muted">👤 ${esc(userName(l.assignedTo).split(' ')[0])}</small>${l.followUp && l.status === 'open' ? `<small class="muted">📅 ${l.followUp === t ? 'Today' : fmtDate(l.followUp).slice(0, 6)}</small>` : ''}</div>
        </div>`).join('')}</div></div>`;
    }).join('')}</div>`;
  },
  async drop(e, col) {
    e.preventDefault(); col.classList.remove('drop');
    const l = DB.get('leads', e.dataTransfer.getData('text/plain')); const stage = col.dataset.stage;
    if (!l || l.stage === stage) return;
    await this.move(l, stage); toast(`${l.name} → ${stage}`); App.refresh();
  },

  /* ---------- form ---------- */
  form(id, preset = {}) {
    const me = App.user;
    const l = id ? DB.get('leads', id) : { category: 'cctv', source: 'Walk-in', score: 'warm', assignedTo: me.role === 'sales' ? me.id : '', followUp: addDays(today(), 1), details: {}, ...preset };
    const staff = userOpts(['sales', 'admin', 'frontdesk']);
    modal(id ? 'Edit lead' : 'New lead', `<form id="leadForm" class="form-grid" onsubmit="Leads.save(event,'${id || ''}')">
      ${field('Customer name *', inp('name', l.name, 'text', 'required'))}
      ${field('Phone (10 digit) *', inp('phone', l.phone, 'tel', 'maxlength="10" inputmode="numeric" required oninput="this.classList.toggle(\'invalid\',this.value.length>0&&!validPhone(this.value))"'))}
      ${field('WhatsApp number', inp('whatsapp', l.whatsapp, 'tel', 'maxlength="10" inputmode="numeric" placeholder="Same as phone if blank"'))}
      ${field('Area / locality', inp('area', l.area, 'text', 'list="areaList"') + `<datalist id="areaList">${AREAS.map(a => `<option value="${a}">`).join('')}</datalist>`)}
      ${field('Address', txt('address', l.address, 'style="min-height:44px"'), 'full')}
      ${field('Category *', sel('category', CAT_LIST, l.category, null, `onchange="Leads.catFields(this.value)" ${id ? 'disabled' : ''}`))}
      ${field('Source *', sel('source', SOURCES, l.source))}
      ${field('Lead score', sel('score', [['hot', 'Hot'], ['warm', 'Warm'], ['cold', 'Cold']], l.score))}
      ${field('Budget (₹)', inp('budget', l.budget, 'number', 'min="0"'))}
      ${field('Assigned to', sel('assignedTo', staff, l.assignedTo, '— select —'))}
      ${field('Next follow-up date', inp('followUp', l.followUp, 'date'))}
      ${field('Requirement', txt('requirement', l.requirement), 'full')}
      <div id="catFields" class="full form-grid"></div>
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save lead</button></div>
    </form>`);
    this.catFields(l.category, l.details);
  },
  catFields(cat, vals = {}) {
    const box = $('#catFields'); if (!box) return;
    box.innerHTML = `<div class="section-title">${CATS[cat].icon} ${esc(CATS[cat].label)} details</div>` + CAT_FIELDS[cat].map(fd => {
      const n = 'd_' + fd.k, v = vals[fd.k];
      const inner = fd.t === 'select' ? sel(n, fd.o, v, '— select —') : fd.t === 'multi' ? checks(n, fd.o, v || []) : fd.t === 'textarea' ? txt(n, v) : inp(n, v, fd.t, fd.t === 'number' ? 'min="0" step="any"' : '');
      return field(fd.l, inner, fd.t === 'multi' || fd.t === 'textarea' ? 'full' : '');
    }).join('');
  },
  async save(e, id) {
    e.preventDefault(); const form = e.target, d = formData(form);
    d.phone = cleanPhone(d.phone); d.whatsapp = cleanPhone(d.whatsapp) || d.phone;
    if (!d.name) return toast('Name is required', 'err');
    if (!validPhone(d.phone)) { form.phone.classList.add('invalid'); return toast('Enter a valid 10-digit mobile number', 'err'); }
    if (!validPhone(d.whatsapp)) { form.whatsapp.classList.add('invalid'); return toast('WhatsApp number must be 10 digits', 'err'); }
    const l = id ? DB.get('leads', id) : { id: uid('le_'), stage: 'New', status: 'open', history: [], calls: [], createdAt: Date.now(), createdBy: App.user.id, category: d.category };
    const details = {};
    Object.keys(d).filter(k => k.startsWith('d_')).forEach(k => { details[k.slice(2)] = d[k]; delete d[k]; });
    Object.assign(l, { name: d.name, phone: d.phone, whatsapp: d.whatsapp, address: d.address, area: d.area, source: d.source, score: d.score, budget: num(d.budget), assignedTo: d.assignedTo, followUp: d.followUp, requirement: d.requirement, details });
    if (!id) l.history.push({ from: '', stage: 'New', at: Date.now(), by: App.user.id, note: 'Lead created' });
    l.customerId = await this.upsertCustomer(l);
    await DB.put('leads', l); closeModal(); toast('Lead saved');
    if (id) App.refresh(); else App.go('lead/' + l.id);
  },

  /* ---------- detail ---------- */
  detail(el, id) {
    const l = DB.get('leads', id);
    if (!l) { el.innerHTML = '<div class="empty">Lead not found</div>'; return; }
    $('#pageTitle').textContent = l.name;
    const p = this.path(l), st = this.stages(l), ci = this.idx(l);
    const next = st[ci + 1];
    const det = CAT_FIELDS[l.category].map(fd => [fd.l, Array.isArray(l.details[fd.k]) ? l.details[fd.k].join(', ') : l.details[fd.k]]).filter(x => x[1] !== undefined && x[1] !== '');
    el.innerHTML = `
    <div class="row mb"><a class="btn sm" href="#leads">← Leads</a><a class="btn sm" href="#customer/${l.customerId}">👤 Customer profile</a><span class="spacer"></span>
      <a class="btn" href="tel:${esc(l.phone)}">📞 Call</a>
      <button class="btn wa" onclick="Leads.wa('${l.id}')">WhatsApp</button>
      <button class="btn" onclick="Leads.callForm('${l.id}')">☎️ Log call</button>
      <button class="btn" onclick="Leads.form('${l.id}')">✏️ Edit</button>
      ${l.status === 'lost' ? `<button class="btn" onclick="Leads.reopen('${l.id}')">↺ Reopen</button>` : `<button class="btn danger" onclick="Leads.lostForm('${l.id}')">✖ Mark lost</button>`}
    </div>
    ${l.status === 'lost' ? `<div class="alert err"><b>Lost</b> on ${fmtDT(l.lostAt)} — Reason: <b>${esc(l.lostReason)}</b>${l.lostNote ? ' · ' + esc(l.lostNote) : ''}</div>` : ''}
    <div class="card">
      <div class="card-head"><h2>${esc(l.name)}</h2>${catChip(l.category)} ${scoreChip(l.score)} ${this.stageBadge(l)}</div>
      <div class="dl">
        <div><span>Phone</span><b><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a></b></div>
        <div><span>WhatsApp</span><b>${esc(l.whatsapp)}</b></div>
        <div><span>Area</span><b>${esc(l.area || '—')}</b></div>
        <div><span>Source</span><b>${esc(l.source)}</b></div>
        <div><span>Assigned to</span><b>${esc(userName(l.assignedTo))}</b></div>
        <div><span>Budget</span><b>${l.budget ? inr(l.budget) : '—'}</b></div>
        <div><span>Next follow-up</span><b>${this.fuText(l)}</b></div>
        <div><span>Created</span><b>${fmtDT(l.createdAt)}</b></div>
      </div>
      ${l.address ? `<div class="mt"><small class="muted">Address</small><div>${esc(l.address)} <a href="${mapSearch(l.address + ' ' + (l.area || ''))}" target="_blank" rel="noopener">map</a></div></div>` : ''}
      ${l.requirement ? `<div class="mt"><small class="muted">Requirement</small><div>${esc(l.requirement)}</div></div>` : ''}
    </div>
    <div class="card">
      <div class="card-head"><h3>Pipeline · ${PATH_LABEL[p]}</h3>${next && l.status !== 'lost' ? `<button class="btn primary sm" onclick="Leads.setStage('${l.id}','${next}')">Move to “${next}” →</button>` : ''}</div>
      <div class="stepper">${st.map((s, i) => `<span class="step ${i < ci ? 'done' : i === ci ? 'cur' : ''}" onclick="Leads.setStage('${l.id}','${s}')" title="Set stage">${i < ci ? '✓ ' : ''}${esc(s)}</span>`).join('')}</div>
      ${l.stage === 'Repairing' ? `<label class="row" style="color:var(--ink)"><input type="checkbox" ${l.subStatus ? 'checked' : ''} onchange="Leads.toggleWaiting('${l.id}',this.checked)"> Sub-status: <b>Waiting for part</b></label>` : ''}
      <div class="muted">Tap any stage to move. Every change is saved with date, time and user in Stage history below.</div>
    </div>
    <div class="grid g2">
      <div class="card"><h3 class="mb">${CATS[l.category].icon} Requirement details</h3>${det.length ? `<div class="dl">${det.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : '<div class="muted">No details yet — use Edit.</div>'}
        ${l.category === 'solar' ? `<div class="mt"><button class="btn sm" onclick="Quotes.solarCalc({kw:${num(l.details.kw) || 3},bill:${num(l.details.bill) || 0}})">☀️ Subsidy & payback calculator</button></div>` : ''}
      </div>
      <div class="card"><h3 class="mb">Related work</h3>${this.related(l)}</div>
    </div>
    <div class="grid g2">
      <div class="card"><h3 class="mb">Stage history</h3><ul class="timeline">${(l.history || []).slice().reverse().map(h => `<li><b>${esc(h.stage)}</b>${h.from ? ` <small class="muted" style="display:inline">from ${esc(h.from)}</small>` : ''}<small>${fmtDT(h.at)} · ${esc(userName(h.by))}${h.note ? ' · ' + esc(h.note) : ''}</small></li>`).join('') || '<li>No history</li>'}</ul></div>
      <div class="card"><div class="card-head"><h3>Calls & notes (${(l.calls || []).length})</h3><button class="btn sm" onclick="Leads.callForm('${l.id}')">+ Log call</button></div>
        ${(l.calls || []).length ? `<ul class="timeline">${l.calls.slice().reverse().map(c => `<li><b>${esc(c.outcome)}</b><small>${fmtDT(c.at)} · ${esc(userName(c.by))}</small>${c.note ? `<div>${esc(c.note)}</div>` : ''}</li>`).join('')}</ul>` : '<div class="muted">No calls logged yet.</div>'}
      </div>
    </div>`;
  },
  related(l) {
    const p = this.path(l), out = [];
    const row = (label, items, addBtn) => `<div class="list-item"><div class="grow"><b>${label}</b>${items || '<small class="muted">None yet</small>'}</div>${addBtn || ''}</div>`;
    if (p === 'service') {
      const jc = DB.find('jobcards', j => j.leadId === l.id);
      out.push(row('Job card', jc ? `<a href="#jobcard/${jc.id}">${esc(jc.no)} · ${esc(jc.device)} ${esc(jc.brand)} ${esc(jc.model)}</a>${jc.estimate ? ` · Estimate ${inr(jc.estimate)}` : ''}` : '',
        jc ? '' : (App.allowed('jobcards') ? `<button class="btn sm primary" onclick="JobCards.create('${l.id}')">+ Job card</button>` : '')));
    }
    if (p === 'project') {
      const sv = DB.where('surveys', s => s.leadId === l.id);
      out.push(row('Site surveys', sv.map(s => `<div><a href="#survey/${s.id}">${fmtDate(s.date)} · by ${esc(userName(s.by))}</a></div>`).join(''), App.allowed('surveys') ? `<button class="btn sm" onclick="Surveys.create('${l.id}')">+ Survey</button>` : ''));
    }
    if (p !== 'service') {
      const qs = DB.where('quotes', q => q.leadId === l.id).sort((a, b) => b.createdAt - a.createdAt);
      out.push(row('Quotations', qs.map(q => `<div><a href="#quote/${q.id}">${esc(q.no)} v${q.version}</a> · ${inr(Quotes.total(q))} · ${badge(q.status, q.status === 'Accepted' ? 'green' : 'grey')}</div>`).join(''),
        App.allowed('quotes') ? `<button class="btn sm" onclick="Quotes.create('${l.id}')">+ Quote</button>` : ''));
      const adv = l.advances || [];
      out.push(row('Advance / payments received', adv.map(a => `<div>${fmtDate(a.date)} · ${inr(a.amount)} · ${esc(a.mode)}${a.invoiceId ? ' <small class="muted">(in invoice)</small>' : ''}</div>`).join(''),
        App.role('admin', 'accounts', 'frontdesk', 'sales') ? `<button class="btn sm" onclick="Billing.advanceForm('${l.id}')">+ Advance</button>` : ''));
    }
    if (p === 'project') {
      const mv = DB.where('stockMoves', m => m.leadId === l.id && m.type === 'issue');
      out.push(row('Material issued', mv.map(m => `<div>${fmtDate(tsDate(m.at))} · ${esc((DB.get('items', m.itemId) || {}).name)} × ${m.qty}</div>`).join(''),
        App.allowed('inventory') ? `<button class="btn sm" onclick="Inventory.issueForm({leadId:'${l.id}'})">Issue</button>` : ''));
    }
    const fj = DB.where('fieldJobs', j => j.leadId === l.id);
    out.push(row('Field jobs', fj.map(j => `<div>${esc(j.no)} · ${esc(j.type)} · ${fmtDate(j.date)} · ${esc(userName(j.techId))} · ${Field.statusBadge(j.status)}</div>`).join(''),
      App.isAdmin() ? `<button class="btn sm" onclick="Field.jobForm({leadId:'${l.id}'})">+ Field job</button>` : ''));
    const inv = DB.where('invoices', i => i.leadId === l.id);
    out.push(row('Invoices', inv.map(i => `<div><a href="#invoice/${i.id}">${esc(i.no)}</a> · ${inr(i.total)} · ${Billing.statusBadge(i)}</div>`).join(''),
      App.allowed('billing') ? `<button class="btn sm" onclick="Billing.createFromLead('${l.id}')">+ Invoice</button>` : ''));
    return out.join('');
  },
  async setStage(id, stage) {
    const l = DB.get('leads', id); if (l.stage === stage) return;
    if (l.status === 'lost') return toast('Reopen the lead first', 'err');
    await this.move(l, stage); toast('Stage → ' + stage); App.refresh();
    if (this.path(l) === 'service' && ['Estimate sent', 'Ready', 'Delivered'].includes(stage) && confirmBox('Send a WhatsApp update to the customer now?')) JobCards.waFor(l.id);
  },
  async toggleWaiting(id, on) {
    const l = DB.get('leads', id); l.subStatus = on ? 'Waiting for part' : '';
    l.history.push({ from: 'Repairing', stage: 'Repairing', at: Date.now(), by: App.user.id, note: on ? 'Waiting for part' : 'Part received' });
    await DB.put('leads', l); App.refresh();
  },
  callForm(id) {
    const l = DB.get('leads', id);
    modal('Log call — ' + l.name, `<form class="form-grid" onsubmit="Leads.saveCall(event,'${id}')">
      ${field('Outcome', sel('outcome', ['Connected', 'No answer', 'Busy', 'Call back later', 'Interested', 'Not interested', 'Visited shop']))}
      ${field('Next follow-up', inp('followUp', addDays(today(), 2), 'date'))}
      ${field('Score', sel('score', [['hot', 'Hot'], ['warm', 'Warm'], ['cold', 'Cold']], l.score))}
      ${field('Notes', txt('note'), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveCall(e, id) {
    e.preventDefault(); const d = formData(e.target), l = DB.get('leads', id);
    l.calls = l.calls || []; l.calls.push({ at: Date.now(), by: App.user.id, outcome: d.outcome, note: d.note });
    l.followUp = d.followUp; l.score = d.score;
    if (l.stage === 'New' && ['Connected', 'Interested', 'Visited shop'].includes(d.outcome) && this.path(l) === 'project') await this.move(l, 'Qualified', 'After call');
    await DB.put('leads', l); closeModal(); toast('Call logged'); App.refresh();
  },
  lostForm(id) {
    modal('Mark lead as lost', `<form class="form-grid" onsubmit="Leads.saveLost(event,'${id}')">
      ${field('Reason (required) *', sel('reason', LOST_REASONS, '', '— select reason —', 'required'), 'full')}
      ${field('Details', txt('note', '', 'placeholder="e.g. went with competitor at ₹4,000 less"'), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn danger">Mark lost</button></div></form>`);
  },
  async saveLost(e, id) {
    e.preventDefault(); const d = formData(e.target);
    if (!d.reason) return toast('Lost reason is mandatory', 'err');
    if (d.reason === 'Other' && !d.note) return toast('Please write the reason in Details', 'err');
    const l = DB.get('leads', id);
    Object.assign(l, { status: 'lost', lostReason: d.reason, lostNote: d.note, lostAt: Date.now(), lostBy: App.user.id });
    l.history.push({ from: l.stage, stage: 'Lost', at: Date.now(), by: App.user.id, note: d.reason + (d.note ? ' — ' + d.note : '') });
    await DB.put('leads', l); closeModal(); toast('Marked as lost'); App.refresh();
  },
  async reopen(id) {
    const l = DB.get('leads', id); l.status = l.stage === 'Closed' ? 'closed' : 'open';
    l.history.push({ from: 'Lost', stage: l.stage, at: Date.now(), by: App.user.id, note: 'Reopened' });
    await DB.put('leads', l); App.refresh();
  },
  wa(id) {
    const l = DB.get('leads', id), items = [];
    const q = DB.where('quotes', x => x.leadId === id).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (q) items.push(Quotes.waItem(q));
    const jc = DB.find('jobcards', j => j.leadId === id);
    if (jc) items.push(...JobCards.waItems(jc));
    else items.push({ key: 'jobstatus', label: 'Job status', data: { name: l.name, device: CATS[l.category].label + ' work', no: l.id.slice(-5).toUpperCase(), status: l.stage, note: '' } });
    DB.where('invoices', i => i.leadId === id && Billing.balance(i) > 0).forEach(i => items.push(Billing.waPayItem(i)));
    items.push({ key: 'review', label: 'Review request', data: { name: l.name } });
    waPicker(l.whatsapp || l.phone, l.name, items);
  },
  exportCSV() {
    const rows = [['Name', 'Phone', 'WhatsApp', 'Area', 'Address', 'Category', 'Source', 'Requirement', 'Budget', 'Assigned', 'Score', 'Stage', 'Status', 'Lost reason', 'Follow-up', 'Created', 'Calls', 'Details']];
    this.filtered().forEach(l => rows.push([l.name, l.phone, l.whatsapp, l.area, l.address, catLabel(l.category), l.source, l.requirement, l.budget, userName(l.assignedTo), l.score, l.stage, l.status, l.lostReason || '', l.followUp, fmtDate(tsDate(l.createdAt)), (l.calls || []).length, JSON.stringify(l.details)]));
    downloadCSV('leads-' + today(), rows);
  },
};
Pages.leads = { title: 'Leads', render: (el, a) => Leads.render(el, a, 'list') };
Pages.pipeline = { title: 'Pipeline Board', render: (el, a) => Leads.render(el, a, 'board') };
Pages.lead = { title: 'Lead', render: (el, a) => Leads.detail(el, a[0]) };
