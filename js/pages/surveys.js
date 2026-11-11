'use strict';
/* ===== Site surveys for projects (CCTV, Automation, Solar) ===== */
const Surveys = {
  q: '',
  render(el) {
    el.innerHTML = `<div class="row mb"><input type="search" style="max-width:340px" placeholder="🔍 Search customer, area…" value="${esc(this.q)}" oninput="Surveys.q=this.value;Surveys.draw()"><span class="spacer"></span>
      ${App.role('admin', 'sales', 'technician') ? '<button class="btn primary" onclick="Surveys.create()">+ New site survey</button>' : ''}</div><div id="svOut"></div>`;
    this.draw();
  },
  draw() {
    const q = this.q.toLowerCase();
    let list = DB.all('surveys');
    if (App.user.role === 'sales') list = list.filter(s => (DB.get('leads', s.leadId) || {}).assignedTo === App.user.id || s.by === App.user.id);
    list = list.filter(s => { const l = DB.get('leads', s.leadId) || {}; return !q || `${l.name} ${l.area} ${l.phone}`.toLowerCase().includes(q); }).sort((a, b) => b.date.localeCompare(a.date));
    $('#svOut').innerHTML = table(['Date', 'Customer', 'Category', 'Surveyed by', 'Checklist', 'Photos', 'Lead stage'], list.map(s => {
      const l = DB.get('leads', s.leadId) || {}, cl = SURVEY_CHECKLIST[s.category] || [];
      const done = cl.filter(c => (s.checklist || {})[c]).length;
      return { attrs: `class="click" onclick="App.go('survey/${s.id}')"`, cells: [fmtDate(s.date), `<b>${esc(l.name)}</b><br><small>${esc(l.area || '')}</small>`, catChip(s.category), esc(userName(s.by)), `${done}/${cl.length} ${done === cl.length ? badge('Complete', 'green') : badge('Pending', 'amber')}`, (s.photos || []).length, l.stage ? Leads.stageBadge(l) : ''] };
    }), { empty: 'No site surveys yet' });
  },
  create(leadId) {
    if (!leadId) {
      const leads = Leads.visible().filter(l => CATS[l.category].path === 'project' && l.status === 'open');
      return modal('New site survey — pick lead', `<form class="form-grid" onsubmit="event.preventDefault();Surveys.create(this.leadId.value)">
        ${field('Project lead', sel('leadId', leads.map(l => [l.id, `${l.name} · ${CATS[l.category].label} · ${l.area || ''}`]), '', '— select —', 'required'), 'full')}
        <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Start survey</button></div></form>`);
    }
    const l = DB.get('leads', leadId);
    const s = { id: uid('sv_'), leadId, customerId: l.customerId, category: l.category, date: today(), by: App.user.id, checklist: {}, measurements: this.defaultMeasurements(l.category), notes: '', photos: [], createdAt: Date.now() };
    DB.put('surveys', s).then(async () => { await Leads.advanceTo(l, 'Site survey', 'Survey started'); closeModal(); App.go('survey/' + s.id); });
  },
  defaultMeasurements(cat) {
    const m = { cctv: [['Cable length (approx)', '', 'm'], ['DVR to farthest camera', '', 'm'], ['Mounting height', '', 'ft']], automation: [['Switchboards', '', 'nos'], ['Curtain track length', '', 'ft']], solar: [['Usable roof area', '', 'sq ft'], ['Roof height', '', 'ft'], ['Inverter to DB distance', '', 'm'], ['Shadow-free hours', '', 'hrs']] }[cat] || [];
    return m.map(([label, value, unit]) => ({ label, value, unit }));
  },
  detail(el, id) {
    const s = DB.get('surveys', id); if (!s) { el.innerHTML = '<div class="empty">Survey not found</div>'; return; }
    const l = DB.get('leads', s.leadId) || {};
    $('#pageTitle').textContent = 'Site survey — ' + (l.name || '');
    const cl = SURVEY_CHECKLIST[s.category] || [];
    el.innerHTML = `<div class="row mb"><a class="btn sm" href="#surveys">← Surveys</a>${App.allowed('leads') ? `<a class="btn sm" href="#lead/${l.id}">Lead</a>` : ''}<span class="spacer"></span>
      <button class="btn" onclick="Surveys.print('${id}')">🖨️ Print report</button>
      ${App.allowed('quotes') ? `<button class="btn" onclick="Quotes.create('${l.id}')">📝 Make quotation</button>` : ''}</div>
    <form id="svForm" onsubmit="Surveys.save(event,'${id}')">
    <div class="card"><div class="card-head"><h2>${esc(l.name)}</h2>${catChip(s.category)}</div>
      <div class="dl mb"><div><span>Phone</span><b>${esc(l.phone)}</b></div><div><span>Address</span><b>${esc(l.address || '')} ${esc(l.area || '')} <a href="${mapSearch((l.address || '') + ' ' + (l.area || ''))}" target="_blank" rel="noopener">map</a></b></div>
      ${Object.entries(l.details || {}).filter(([k, v]) => v && !Array.isArray(v)).slice(0, 4).map(([k, v]) => `<div><span>${esc((CAT_FIELDS[s.category].find(f => f.k === k) || { l: k }).l)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="form-grid">${field('Survey date', inp('date', s.date, 'date'))}${field('Surveyed by', sel('by', userOpts(['sales', 'technician', 'admin']), s.by))}</div></div>
    <div class="grid g2">
      <div class="card"><h3 class="mb">Survey checklist — ${esc(CATS[s.category].label)}</h3>
        <div style="display:flex;flex-direction:column;gap:8px">${cl.map((c, i) => `<label class="row" style="color:var(--ink);font-size:13.5px"><input type="checkbox" name="cl_${i}" ${(s.checklist || {})[c] ? 'checked' : ''}> ${esc(c)}</label>`).join('')}</div></div>
      <div class="card"><div class="card-head"><h3>Measurements</h3><button type="button" class="btn sm" onclick="Surveys.addRow()">+ Row</button></div>
        <div id="mRows">${(s.measurements || []).map(m => this.mRow(m)).join('')}</div></div>
    </div>
    <div class="card"><h3 class="mb">Notes</h3>${txt('notes', s.notes, 'style="min-height:100px" placeholder="Site observations, customer requests, risks…"')}</div>
    <div class="card"><h3 class="mb">Site photos</h3><div class="row">${photoGrid(s.photos, `Surveys.rmPhoto.bind(null,'${id}')`)}${photoAdd(`Surveys.addPhotos('${id}',this)`)}</div></div>
    <div class="row"><span class="spacer"></span><button class="btn primary lg">💾 Save survey</button></div>
    </form>`;
  },
  mRow(m = { label: '', value: '', unit: '' }) {
    return `<div class="row mb m-row" style="flex-wrap:nowrap"><input placeholder="Measurement" value="${esc(m.label)}" data-k="label" style="flex:2"><input placeholder="Value" value="${esc(m.value)}" data-k="value" style="flex:1"><input placeholder="Unit" value="${esc(m.unit)}" data-k="unit" style="flex:0 0 70px"><button type="button" class="btn sm danger" onclick="this.parentNode.remove()">✕</button></div>`;
  },
  addRow() { $('#mRows').insertAdjacentHTML('beforeend', this.mRow()); },
  collect(id) {
    const s = DB.get('surveys', id), form = $('#svForm'), d = formData(form);
    const cl = SURVEY_CHECKLIST[s.category] || []; s.checklist = {};
    cl.forEach((c, i) => s.checklist[c] = !!d['cl_' + i]);
    s.measurements = $$('.m-row', form).map(r => { const o = {}; $$('input', r).forEach(i => o[i.dataset.k] = i.value.trim()); return o; }).filter(m => m.label);
    s.date = d.date; s.by = d.by; s.notes = d.notes; return s;
  },
  async save(e, id) { e.preventDefault(); const s = this.collect(id); s.updatedAt = Date.now(); await DB.put('surveys', s); toast('Survey saved'); App.refresh(); },
  async addPhotos(id, input) { const s = this.collect(id); s.photos = (s.photos || []).concat(await readImages(input)); await DB.put('surveys', s); App.refresh(); },
  async rmPhoto(id, i) { if (!confirmBox('Remove this photo?')) return; const s = this.collect(id); s.photos.splice(i, 1); await DB.put('surveys', s); App.refresh(); },
  print(id) {
    const s = DB.get('surveys', id), l = DB.get('leads', s.leadId) || {}, cl = SURVEY_CHECKLIST[s.category] || [];
    printPreview('Site survey report', `${Docs.header()}<div class="title">SITE SURVEY REPORT — ${esc(CATS[s.category].label.toUpperCase())}</div>
      <table><tr><td><b>Customer:</b> ${esc(l.name)} · ${esc(l.phone)}<br>${esc(l.address || '')} ${esc(l.area || '')}</td><td><b>Date:</b> ${fmtDate(s.date)}<br><b>Surveyed by:</b> ${esc(userName(s.by))}</td></tr></table><br>
      <table><tr><th>Checklist</th><th style="width:80px">Status</th></tr>${cl.map(c => `<tr><td>${esc(c)}</td><td>${(s.checklist || {})[c] ? '✔ Done' : '—'}</td></tr>`).join('')}</table><br>
      <table><tr><th>Measurement</th><th>Value</th></tr>${(s.measurements || []).map(m => `<tr><td>${esc(m.label)}</td><td>${esc(m.value)} ${esc(m.unit)}</td></tr>`).join('')}</table>
      <p><b>Notes:</b> ${esc(s.notes || '—')}</p>
      ${(s.photos || []).length ? `<div class="doc-photos">${s.photos.map(p => `<img src="${p}">`).join('')}</div>` : ''}`);
  },
};
Pages.surveys = { title: 'Site Surveys', render: el => Surveys.render(el) };
Pages.survey = { title: 'Site survey', render: (el, a) => Surveys.detail(el, a[0]) };
