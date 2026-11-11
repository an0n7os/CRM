'use strict';
/* ===== Service job cards (chip-level) ===== */
const JobCards = {
  f: { q: '', stage: 'active' },
  lead: jc => DB.get('leads', jc.leadId) || {},
  visible() {
    let l = DB.all('jobcards');
    if (App.user.role === 'technician') l = l.filter(j => j.techId === App.user.id);
    return l;
  },
  partsTotal: jc => sum(jc.parts || [], p => num(p.qty) * num(p.price)),

  render(el) {
    const f = this.f;
    el.innerHTML = `<div class="row mb"><span class="spacer"></span>${App.role('admin', 'frontdesk') ? '<button class="btn primary" onclick="JobCards.create()">+ New job card (device inward)</button>' : ''}</div>
      <div class="filters"><input type="search" placeholder="🔍 Search job no, customer, phone, device, serial…" value="${esc(f.q)}" oninput="JobCards.f.q=this.value;JobCards.draw()">
      <select onchange="JobCards.f.stage=this.value;JobCards.draw()">${opts([['active', 'In shop (not delivered)'], ['Ready', 'Ready for delivery'], ['waiting', 'Waiting for part'], ['all', 'All'], ...PATHS.service.map(s => [s, s])], f.stage)}</select></div>
      <div id="jcOut"></div>`;
    this.draw();
  },
  draw() {
    const f = this.f, q = f.q.toLowerCase(), t = today();
    const list = this.visible().filter(j => {
      const l = this.lead(j);
      if (q && !`${j.no} ${l.name} ${l.phone} ${j.device} ${j.brand} ${j.model} ${j.serial}`.toLowerCase().includes(q)) return false;
      if (f.stage === 'active') return !['Delivered', 'Closed'].includes(l.stage) && l.status !== 'lost';
      if (f.stage === 'waiting') return l.subStatus === 'Waiting for part';
      if (f.stage !== 'all') return l.stage === f.stage;
      return true;
    }).sort((a, b) => b.no.localeCompare(a.no));
    $('#jcOut').innerHTML = table(['Job no', 'Inward', 'Customer', 'Device', 'Complaint', 'Stage', 'Technician', 'Est. delivery', { t: 'Estimate', num: 1 }],
      list.map(j => {
        const l = this.lead(j); const late = j.estDelivery && j.estDelivery < t && !['Ready', 'Delivered', 'Closed'].includes(l.stage);
        const readyLong = l.stage === 'Ready' && j.readyAt && daysBetween(tsDate(j.readyAt), t) >= 30;
        return {
          attrs: `class="click ${late || readyLong ? 'bad' : ''}" onclick="App.go('jobcard/${j.id}')"`,
          cells: [`<b>${esc(j.no)}</b>`, fmtDate(j.inwardDate), `${esc(l.name)}<br><small>${esc(l.phone)}</small>`, `${esc(j.device)} · ${esc(j.brand)} ${esc(j.model)}<br><small class="muted">SN ${esc(j.serial || '—')}</small>`,
            `<small>${esc((j.complaint || '').slice(0, 70))}</small>`, Leads.stageBadge(l) + (readyLong ? `<br>${badge('Not collected 30+ days', 'red')}` : ''), esc(userName(j.techId)),
            late ? `<span style="color:var(--danger)">${fmtDate(j.estDelivery)}<br><small>late</small></span>` : fmtDate(j.estDelivery), j.estimate ? inr(j.estimate) : '—']
        };
      }), { empty: 'No job cards' });
  },

  create(leadId) {
    const l = leadId ? DB.get('leads', leadId) : null, d = l ? l.details : {};
    modal('New job card — device inward', `<form class="form-grid" onsubmit="JobCards.save(event,'${leadId || ''}')">
      ${l ? `<div class="full alert info">Customer: <b>${esc(l.name)}</b> · ${esc(l.phone)}</div>` : `
        ${field('Customer name *', inp('name', '', 'text', 'required'))}
        ${field('Phone *', inp('phone', '', 'tel', 'maxlength="10" inputmode="numeric" required'))}
        ${field('WhatsApp', inp('whatsapp', '', 'tel', 'maxlength="10" placeholder="Same as phone"'))}
        ${field('Area', inp('area', '', 'text', 'list="areaList2"') + `<datalist id="areaList2">${AREAS.map(a => `<option value="${a}">`).join('')}</datalist>`)}
        ${field('Source', sel('source', SOURCES, 'Walk-in'))}`}
      <div class="section-title">Device</div>
      ${field('Device *', sel('device', CAT_FIELDS.chip[0].o, d.device || 'Laptop'))}
      ${field('Brand *', inp('brand', d.brand, 'text', 'required'))}
      ${field('Model', inp('model', d.model))}
      ${field('Serial no.', inp('serial', d.serial))}
      ${field('Complaint *', txt('complaint', d.complaint || '', 'required'), 'full')}
      ${field('Accessories received', checks('accessories', ACCESSORIES, ['Charger / Adapter']), 'full')}
      ${field('Password / PIN (device)', inp('password', '', 'text', 'autocomplete="off"'))}
      ${field('Inward date', inp('inwardDate', today(), 'date'))}
      ${field('Estimated delivery', inp('estDelivery', addDays(today(), 3), 'date'))}
      ${field('Technician', sel('techId', userOpts('technician'), '', '— assign later —'))}
      ${field('Physical condition', txt('condition', '', 'placeholder="Scratches, broken hinge, missing screws…"'), 'full')}
      ${field('Device photos', '<input type="file" name="photos" accept="image/*" capture="environment" multiple>', 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Create job card</button></div></form>`, { wide: true });
  },
  async save(e, leadId) {
    e.preventDefault(); const form = e.target, d = formData(form);
    let l = leadId ? DB.get('leads', leadId) : null;
    if (!l) {
      d.phone = cleanPhone(d.phone); d.whatsapp = cleanPhone(d.whatsapp) || d.phone;
      if (!validPhone(d.phone)) return toast('Enter a valid 10-digit phone', 'err');
      l = { id: uid('le_'), name: d.name, phone: d.phone, whatsapp: d.whatsapp, area: d.area, address: '', category: 'chip', source: d.source, score: 'hot', budget: 0, assignedTo: App.user.id, followUp: d.estDelivery, requirement: d.complaint, stage: 'New', status: 'open', history: [{ from: '', stage: 'New', at: Date.now(), by: App.user.id, note: 'Walk-in device inward' }], calls: [], createdAt: Date.now(), createdBy: App.user.id };
    }
    l.details = { device: d.device, brand: d.brand, model: d.model, serial: d.serial, complaint: d.complaint };
    l.customerId = await Leads.upsertCustomer(l);
    await DB.put('leads', l);
    const photos = await readImages(form.photos);
    const jc = {
      id: uid('jc_'), no: DB.nextNo('jobcards', 'JC-'), leadId: l.id, customerId: l.customerId, inwardDate: d.inwardDate, device: d.device, brand: d.brand, model: d.model, serial: d.serial,
      complaint: d.complaint, accessories: d.accessories, password: d.password, condition: d.condition, estDelivery: d.estDelivery, techId: d.techId, photos,
      diagnosis: '', estimate: 0, parts: [], approvals: [], createdAt: Date.now(), createdBy: App.user.id
    };
    await DB.put('jobcards', jc);
    await Leads.advanceTo(l, 'Job card', 'Job card ' + jc.no);
    closeModal(); toast('Job card ' + jc.no + ' created'); App.go('jobcard/' + jc.id);
  },

  detail(el, id) {
    const jc = DB.get('jobcards', id); if (!jc) { el.innerHTML = '<div class="empty">Job card not found</div>'; return; }
    const l = this.lead(jc), st = PATHS.service, ci = st.indexOf(l.stage);
    $('#pageTitle').textContent = 'Job card ' + jc.no;
    const partsTotal = this.partsTotal(jc);
    const inv = DB.find('invoices', i => i.leadId === l.id);
    const canEdit = App.role('admin', 'frontdesk', 'technician');
    el.innerHTML = `
    <div class="row mb"><a class="btn sm" href="#jobcards">← Job cards</a><a class="btn sm" href="#lead/${l.id}">Lead</a><span class="spacer"></span>
      <button class="btn" onclick="JobCards.print('${id}')">🖨️ Print job card</button>
      <button class="btn wa" onclick="JobCards.waFor('${l.id}')">WhatsApp</button>
      ${canEdit ? `<button class="btn" onclick="JobCards.edit('${id}')">✏️ Edit</button>` : ''}
      ${App.role('admin', 'frontdesk') && l.stage === 'Ready' ? `<button class="btn primary" onclick="JobCards.deliver('${id}')">✅ Mark delivered</button>` : ''}
      ${App.allowed('billing') && !inv ? `<button class="btn" onclick="Billing.createFromLead('${l.id}')">🧾 Create invoice</button>` : inv ? `<a class="btn" href="#invoice/${inv.id}">🧾 ${esc(inv.no)}</a>` : ''}
    </div>
    <div class="card"><div class="card-head"><h2>${esc(jc.no)} · ${esc(jc.device)} ${esc(jc.brand)} ${esc(jc.model)}</h2>${Leads.stageBadge(l)}</div>
      <div class="stepper">${st.map((s, i) => `<span class="step ${i < ci ? 'done' : i === ci ? 'cur' : ''}" onclick="Leads.setStage('${l.id}','${s}')">${i < ci ? '✓ ' : ''}${s}</span>`).join('')}</div>
      ${l.stage === 'Repairing' ? `<label class="row" style="color:var(--ink)"><input type="checkbox" ${l.subStatus ? 'checked' : ''} onchange="Leads.toggleWaiting('${l.id}',this.checked)"> Waiting for part</label>` : ''}
      <div class="dl mt">
        <div><span>Customer</span><b><a href="#customer/${l.customerId}">${esc(l.name)}</a> · ${esc(l.phone)}</b></div>
        <div><span>Inward date</span><b>${fmtDate(jc.inwardDate)}</b></div>
        <div><span>Est. delivery</span><b>${fmtDate(jc.estDelivery)}</b></div>
        <div><span>Technician</span><b>${esc(userName(jc.techId))}</b></div>
        <div><span>Serial no.</span><b>${esc(jc.serial || '—')}</b></div>
        <div><span>Password</span><b>${esc(jc.password || '—')}</b></div>
        <div><span>Estimate</span><b>${jc.estimate ? inr(jc.estimate) : '—'}</b></div>
        <div><span>Parts cost</span><b>${inr(partsTotal)}</b></div>
      </div>
      <div class="grid g2 mt">
        <div><small class="muted">Complaint</small><div>${esc(jc.complaint)}</div></div>
        <div><small class="muted">Physical condition</small><div>${esc(jc.condition || '—')}</div></div>
        <div><small class="muted">Accessories received</small><div>${(jc.accessories || []).map(a => badge('✓ ' + a, 'teal')).join(' ') || '—'}</div></div>
        <div><small class="muted">Diagnosis</small><div>${esc(jc.diagnosis || '—')}</div></div>
      </div>
    </div>
    <div class="card"><div class="card-head"><h3>Device photos</h3></div>
      <div class="row">${photoGrid(jc.photos, canEdit ? `JobCards.rmPhoto.bind(null,'${id}')` : '')}${canEdit ? photoAdd(`JobCards.addPhotos('${id}',this)`) : ''}</div></div>
    <div class="grid g2">
      <div class="card"><div class="card-head"><h3>Parts used</h3>${canEdit ? `<button class="btn sm" onclick="JobCards.partForm('${id}')">+ Add part</button>` : ''}</div>
        ${table(['Part', { t: 'Qty', num: 1 }, { t: 'Cost', num: 1 }, { t: 'Amount', num: 1 }, ''], (jc.parts || []).map((p, i) => [esc(p.name) + (p.serial ? `<br><small>SN ${esc(p.serial)}</small>` : ''), p.qty, inr(p.price), inr(p.qty * p.price), canEdit ? `<button class="btn sm danger" onclick="JobCards.rmPart('${id}',${i})">✕</button>` : '']), { empty: 'No parts used yet', foot: (jc.parts || []).length ? ['Total', '', '', inr(partsTotal), ''] : null })}
      </div>
      <div class="card"><div class="card-head"><h3>Customer approval log</h3>${canEdit ? `<button class="btn sm" onclick="JobCards.approvalForm('${id}')">+ Add entry</button>` : ''}</div>
        ${(jc.approvals || []).length ? `<ul class="timeline">${jc.approvals.slice().reverse().map(a => `<li><b>${esc(a.status)}</b> · ${inr(a.amount)} <small>${fmtDT(a.at)} · via ${esc(a.mode)} · ${esc(userName(a.by))}</small>${a.note ? `<div>${esc(a.note)}</div>` : ''}</li>`).join('')}</ul>` : '<div class="muted">No approvals recorded. Send the estimate, then record the customer’s answer here.</div>'}
      </div>
    </div>`;
  },
  edit(id) {
    const jc = DB.get('jobcards', id);
    modal('Edit job card ' + jc.no, `<form class="form-grid" onsubmit="JobCards.saveEdit(event,'${id}')">
      ${field('Device', sel('device', CAT_FIELDS.chip[0].o, jc.device))}${field('Brand', inp('brand', jc.brand))}${field('Model', inp('model', jc.model))}${field('Serial no.', inp('serial', jc.serial))}
      ${field('Complaint', txt('complaint', jc.complaint), 'full')}
      ${field('Accessories received', checks('accessories', ACCESSORIES, jc.accessories || []), 'full')}
      ${field('Password', inp('password', jc.password))}${field('Est. delivery', inp('estDelivery', jc.estDelivery, 'date'))}
      ${field('Technician', sel('techId', userOpts('technician'), jc.techId, '— none —'))}
      ${field('Estimate amount (₹, incl. GST)', inp('estimate', jc.estimate || '', 'number', 'min="0"'))}
      ${field('Physical condition', txt('condition', jc.condition), 'full')}
      ${field('Diagnosis / technician notes', txt('diagnosis', jc.diagnosis), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`, { wide: true });
  },
  async saveEdit(e, id) {
    e.preventDefault(); const d = formData(e.target), jc = DB.get('jobcards', id);
    Object.assign(jc, d, { estimate: num(d.estimate) });
    await DB.put('jobcards', jc);
    const l = this.lead(jc); l.details = { ...l.details, device: d.device, brand: d.brand, model: d.model, serial: d.serial, complaint: d.complaint };
    if (d.diagnosis && l.stage === 'Job card') await Leads.move(l, 'Diagnosis'); else await DB.put('leads', l);
    closeModal(); toast('Saved'); App.refresh();
  },
  async addPhotos(id, input) { const jc = DB.get('jobcards', id); jc.photos = (jc.photos || []).concat(await readImages(input)); await DB.put('jobcards', jc); App.refresh(); },
  async rmPhoto(id, i) { if (!confirmBox('Remove this photo?')) return; const jc = DB.get('jobcards', id); jc.photos.splice(i, 1); await DB.put('jobcards', jc); App.refresh(); },
  partForm(id) {
    const items = DB.all('items').filter(i => !i.service).sort((a, b) => (a.category === 'chip' ? -1 : 1) - (b.category === 'chip' ? -1 : 1) || a.name.localeCompare(b.name));
    modal('Add part used', `<form class="form-grid" onsubmit="JobCards.savePart(event,'${id}')">
      ${field('Part from stock', `<select name="itemId" onchange="const it=DB.get('items',this.value);this.form.price.value=it?it.rate:'';this.form.name.value=it?it.name:''">${opts(items.map(i => [i.id, `${i.name} (stock ${i.stock})`]), '', '— outside purchase / not in stock —')}</select>`, 'full')}
      ${field('Part name', inp('name', '', 'text', 'required'))}
      ${field('Qty', inp('qty', 1, 'number', 'min="1" required'))}
      ${field('Price to customer (₹)', inp('price', '', 'number', 'min="0" required'))}
      ${field('Serial no. (optional)', inp('serial'))}
      <div class="full muted">Parts picked from stock are deducted from inventory automatically.</div>
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Add</button></div></form>`);
  },
  async savePart(e, id) {
    e.preventDefault(); const d = formData(e.target), jc = DB.get('jobcards', id);
    const qty = num(d.qty);
    if (d.itemId) {
      const it = DB.get('items', d.itemId);
      if (it.stock < qty && !confirmBox(`Only ${it.stock} in stock. Continue anyway?`)) return;
      await Inventory.stockMove({ itemId: d.itemId, type: 'issue', qty, serials: d.serial ? [d.serial] : [], leadId: jc.leadId, jobcardId: id, note: 'Job card ' + jc.no });
    }
    jc.parts = jc.parts || []; jc.parts.push({ itemId: d.itemId, name: d.name, qty, price: num(d.price), serial: d.serial, at: Date.now(), by: App.user.id });
    await DB.put('jobcards', jc); closeModal(); toast('Part added'); App.refresh();
  },
  async rmPart(id, i) {
    if (!confirmBox('Remove this part? Stock will be returned.')) return;
    const jc = DB.get('jobcards', id), p = jc.parts[i];
    if (p.itemId) await Inventory.stockMove({ itemId: p.itemId, type: 'return', qty: p.qty, serials: p.serial ? [p.serial] : [], leadId: jc.leadId, jobcardId: id, note: 'Returned from ' + jc.no });
    jc.parts.splice(i, 1); await DB.put('jobcards', jc); App.refresh();
  },
  approvalForm(id) {
    const jc = DB.get('jobcards', id);
    modal('Customer approval', `<form class="form-grid" onsubmit="JobCards.saveApproval(event,'${id}')">
      ${field('Estimate amount (₹)', inp('amount', jc.estimate || '', 'number', 'min="0" required'))}
      ${field('Customer response', sel('status', ['Approved', 'Rejected', 'Asked to wait', 'Estimate sent']))}
      ${field('Via', sel('mode', ['Phone call', 'WhatsApp', 'In person', 'SMS']))}
      ${field('Note', txt('note'), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveApproval(e, id) {
    e.preventDefault(); const d = formData(e.target), jc = DB.get('jobcards', id), l = this.lead(jc);
    jc.approvals = jc.approvals || []; jc.approvals.push({ at: Date.now(), by: App.user.id, amount: num(d.amount), status: d.status, mode: d.mode, note: d.note });
    jc.estimate = num(d.amount); await DB.put('jobcards', jc);
    if (d.status === 'Approved') await Leads.advanceTo(l, 'Estimate approved', 'Customer approved ' + inr(d.amount));
    if (d.status === 'Estimate sent') await Leads.advanceTo(l, 'Estimate sent');
    closeModal(); toast('Approval logged'); App.refresh();
  },
  async deliver(id) {
    const jc = DB.get('jobcards', id), l = this.lead(jc);
    jc.deliveredAt = Date.now(); await DB.put('jobcards', jc);
    await Leads.move(l, 'Delivered', 'Handed over to customer');
    toast('Marked delivered');
    if (!DB.find('invoices', i => i.leadId === l.id) && App.allowed('billing') && confirmBox('Create the invoice now?')) return Billing.createFromLead(l.id);
    App.refresh();
  },
  waItems(jc) {
    const l = this.lead(jc), dev = `${jc.device} ${jc.brand} ${jc.model}`.trim();
    const inv = DB.find('invoices', i => i.leadId === l.id);
    const amt = inv ? Billing.balance(inv) : jc.estimate;
    const note = l.stage === 'Estimate sent' ? `Estimate: ${inr(jc.estimate)} (${jc.diagnosis || 'repair'}). Please reply YES to approve.` : (l.subStatus ? 'We are waiting for a spare part.' : '');
    return [
      { key: 'jobstatus', label: 'Job status', data: { name: l.name, device: dev, no: jc.no, status: l.stage + (l.subStatus ? ' (' + l.subStatus + ')' : ''), note } },
      { key: 'ready', label: 'Delivery ready', data: { name: l.name, device: dev, no: jc.no, amount: inr(amt) } },
    ];
  },
  waFor(leadId) {
    const l = DB.get('leads', leadId), jc = DB.find('jobcards', j => j.leadId === leadId);
    if (!jc) return Leads.wa(leadId);
    waPicker(l.whatsapp || l.phone, l.name, [...this.waItems(jc), { key: 'review', label: 'Review request', data: { name: l.name } }]);
  },
  print(id) {
    const jc = DB.get('jobcards', id), l = this.lead(jc), s = App.settings;
    const qrSvg = QRCode.svg(`JOB:${jc.no}|DEV:${jc.device}|SN:${jc.serial || 'NA'}|TEL:${l.phone}`, 85);
    const html = `${Docs.header()}
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px">
        <div>
          <div class="title" style="margin:0;font-size:18px">SERVICE JOB CARD</div>
          <small>Computer &amp; Electronic Hardware Service Slip</small>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${qrSvg}
          <div class="r" style="font-size:12px"><b>Job no:</b> ${esc(jc.no)}<br><b>Inward:</b> ${fmtDate(jc.inwardDate)}<br><b>Est. delivery:</b> ${fmtDate(jc.estDelivery)}</div>
        </div>
      </div>
      <table><tr><th style="width:50%">Customer</th><th>Device</th></tr>
      <tr><td><b>${esc(l.name)}</b><br>Ph: ${esc(l.phone)}<br>${esc(l.address || '')} ${esc(l.area || '')}</td>
      <td>${esc(jc.device)} · ${esc(jc.brand)} ${esc(jc.model)}<br>Serial: ${esc(jc.serial || '—')}<br>Password: ${esc(jc.password || '—')}</td></tr>
      <tr><td colspan="2"><b>Complaint:</b> ${esc(jc.complaint)}</td></tr>
      <tr><td colspan="2"><b>Physical condition:</b> ${esc(jc.condition || '—')}</td></tr>
      <tr><td colspan="2"><b>Accessories received:</b> ${ACCESSORIES.map(a => `${(jc.accessories || []).includes(a) ? '☑' : '☐'} ${a}`).join(' &nbsp; ')}</td></tr>
      <tr><td><b>Estimate:</b> ${jc.estimate ? inr(jc.estimate) : 'After diagnosis'}</td><td><b>Technician:</b> ${esc(userName(jc.techId))}</td></tr></table>
      ${(jc.photos || []).length ? `<div class="doc-photos"><b>Inward photos:</b><br>${jc.photos.slice(0, 6).map(p => `<img src="${p}">`).join('')}</div>` : ''}
      <p style="font-size:11px;margin-top:10px"><b>Terms:</b> ${esc(s.jobTerms)}</p>
      <div class="sign"><div style="border:0"><div class="sigbox"></div>Customer signature</div><div style="border:0"><div class="sigbox"></div>For ${esc(s.bizName)}</div></div>`;
    printPreview('Job card ' + jc.no, html);
  },
};
Pages.jobcards = { title: 'Job Cards', render: el => JobCards.render(el) };
Pages.jobcard = { title: 'Job card', render: (el, a) => JobCards.detail(el, a[0]) };
