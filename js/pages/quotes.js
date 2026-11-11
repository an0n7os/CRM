'use strict';
/* ===== Shared line-item editor (quotations & invoices) ===== */
const LineEditor = {
  doc: null, o: {},
  mount(doc, o = {}) { this.doc = doc; this.o = o; this.draw(); },
  itemOptions(selId) {
    return ITEM_CATS.map(([k, l]) => {
      const its = DB.all('items').filter(i => i.category === k).sort((a, b) => a.name.localeCompare(b.name));
      return its.length ? `<optgroup label="${l}">${its.map(i => `<option value="${i.id}" ${i.id === selId ? 'selected' : ''}>${esc(i.name)}${i.service ? '' : ` (${i.stock})`}</option>`).join('')}</optgroup>` : '';
    }).join('');
  },
  draw() {
    const d = this.doc, ser = this.o.serials;
    const I = (i, k, v, extra = '') => `<input value="${esc(v ?? '')}" data-i="${i}" data-k="${k}" oninput="LineEditor.upd(this)" ${extra}>`;
    const rows = d.lines.map((l, i) => {
      const it = l.itemId && DB.get('items', l.itemId);
      return `<tr>
      <td data-label="Item" style="min-width:200px;width:40%"><select onchange="LineEditor.pick(${i},this.value)"><option value="">✎ Custom item</option>${this.itemOptions(l.itemId)}</select>${I(i, 'name', l.name, 'placeholder="Description" style="margin-top:4px"')}</td>
      <td data-label="HSN/SAC">${I(i, 'hsn', l.hsn, 'style="width:66px;padding:7px 6px"')}</td>
      <td data-label="Qty">${I(i, 'qty', l.qty, 'type="number" min="0" step="any" style="width:62px;padding:7px 6px"')}</td>
      <td data-label="Unit">${I(i, 'unit', l.unit, 'style="width:48px;padding:7px 6px"')}</td>
      <td data-label="Rate (excl. GST)">${I(i, 'rate', l.rate, 'type="number" min="0" step="any" style="width:86px;padding:7px 6px"')}</td>
      <td data-label="GST %"><select data-i="${i}" data-k="gst" onchange="LineEditor.upd(this)" style="width:62px;padding:7px 4px">${opts([0, 5, 12, 18, 28], l.gst)}</select></td>
      ${ser ? `<td data-label="Serial nos">${it && it.serialized ? `${I(i, 'serials', (l.serials || []).join(', '), 'placeholder="SN1, SN2" style="min-width:140px"')}<button type="button" class="btn sm" style="margin-top:4px" onclick="LineEditor.pickSerials(${i})">Pick from stock</button>` : '<small class="muted">—</small>'}</td>` : ''}
      <td class="num" data-label="Amount" id="amt${i}">${inr(num(l.qty) * num(l.rate), 2)}</td>
      <td><button type="button" class="btn sm danger" onclick="LineEditor.rm(${i})" title="Remove">✕</button></td></tr>`;
    }).join('');
    $('#leLines').innerHTML = `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Item</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th>Rate</th><th>GST</th>${ser ? '<th>Serial nos</th>' : ''}<th class="num">Amount</th><th></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="9"><div class="empty">No items yet — add items, a package, labour or cable below.</div></td></tr>`}</tbody></table></div>`;
    this.totals();
  },
  upd(el) {
    const i = +el.dataset.i, k = el.dataset.k, l = this.doc.lines[i];
    if (k === 'serials') l.serials = el.value.split(/[,\s]+/).filter(Boolean);
    else l[k] = ['qty', 'rate', 'gst'].includes(k) ? num(el.value) : el.value;
    const a = $('#amt' + i); if (a) a.textContent = inr(num(l.qty) * num(l.rate), 2);
    this.totals();
  },
  pick(i, itemId) {
    const it = DB.get('items', itemId), l = this.doc.lines[i]; l.itemId = itemId || '';
    if (it) Object.assign(l, { name: it.name, hsn: it.hsn, rate: it.rate, gst: it.gst, unit: it.unit, serials: [] });
    this.draw();
  },
  line(it, qty) { return { itemId: it.id, name: it.name, hsn: it.hsn, qty, unit: it.unit, rate: it.rate, gst: it.gst, serials: [] }; },
  add(itemId, qty = 1) {
    const it = itemId && DB.get('items', itemId);
    if (it) { const ex = this.doc.lines.find(l => l.itemId === it.id); if (ex) ex.qty = num(ex.qty) + qty; else this.doc.lines.push(this.line(it, qty)); }
    else this.doc.lines.push({ itemId: '', name: '', hsn: '', qty: 1, unit: 'nos', rate: 0, gst: 18, serials: [] });
    this.draw();
  },
  rm(i) { this.doc.lines.splice(i, 1); this.draw(); },
  addPackage(pid) {
    const p = DB.get('packages', pid); if (!p) return;
    p.lines.forEach(x => { const it = DB.get('items', x.itemId); if (it) this.add(it.id, x.qty); });
    toast('Added package: ' + p.name);
  },
  addKind(kind, qty) {
    const cat = this.o.category;
    const it = DB.find('items', i => i.kind === kind && i.category === cat) || DB.find('items', i => i.kind === kind && (kind === 'cable' ? i.category === 'cctv' : true));
    if (!it) return toast('No ' + kind + ' item in item master', 'err');
    if (!(qty > 0)) return toast('Enter quantity', 'err');
    this.add(it.id, qty);
  },
  pickSerials(i) {
    const l = this.doc.lines[i], it = DB.get('items', l.itemId); if (!it) return;
    const avail = (it.serials || []).filter(s => s.status === 'in' || (s.status === 'issued' && this.doc.leadId && s.leadId === this.doc.leadId) || (l.serials || []).includes(s.sn));
    window._serPick = i;
    modal('Pick serial numbers — ' + it.name, `<div class="muted mb">Select ${l.qty} serial(s). ${avail.length} available.</div>
      <div class="checks" id="serChecks" style="flex-direction:column">${avail.map(s => `<label><input type="checkbox" value="${esc(s.sn)}" ${(l.serials || []).includes(s.sn) ? 'checked' : ''}> ${esc(s.sn)} ${s.status === 'issued' ? badge('issued to this job', 'amber') : ''}</label>`).join('') || '<div class="empty">No serials in stock</div>'}</div>
      <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="LineEditor.setSerials()">Use selected</button></div>`);
  },
  setSerials() {
    const l = this.doc.lines[window._serPick];
    l.serials = $$('#serChecks input:checked').map(c => c.value);
    if (l.serials.length) l.qty = Math.max(num(l.qty), l.serials.length);
    closeModal(); this.draw();
  },
  toolbar() {
    const cat = this.o.category;
    const pk = DB.all('packages').filter(p => !cat || p.category === cat || CATS[cat].path !== 'project');
    return `<div class="row mt">
      <button type="button" class="btn" onclick="LineEditor.add()">+ Add item</button>
      ${pk.length ? `<select id="pkgSel" style="width:auto">${opts(pk.map(p => [p.id, p.name]), '', '— package template —')}</select><button type="button" class="btn" onclick="LineEditor.addPackage($('#pkgSel').value)">+ Add package</button>` : ''}
      <span class="row" style="gap:4px"><input id="labQty" type="number" min="0" step="any" value="${this.o.labourQty || 1}" style="width:70px" title="Labour qty"><button type="button" class="btn" onclick="LineEditor.addKind('labour',num($('#labQty').value))">+ Labour</button></span>
      <span class="row" style="gap:4px"><input id="cabQty" type="number" min="0" step="any" placeholder="metres" style="width:90px"><button type="button" class="btn" onclick="LineEditor.addKind('cable',num($('#cabQty').value))">+ Cable (per m)</button></span>
    </div>`;
  },
  totals() {
    const d = this.doc, t = calcTotals(d.lines, d.discount, d.interstate);
    const box = $('#leTotals'); if (!box) return t;
    box.innerHTML = `<table class="tbl" style="max-width:360px;margin-left:auto">
      <tr><td>Subtotal</td><td class="num">${inr(t.sub, 2)}</td></tr>
      ${t.discount ? `<tr><td>Discount</td><td class="num">-${inr(t.discount, 2)}</td></tr><tr><td>Taxable value</td><td class="num">${inr(t.taxable, 2)}</td></tr>` : ''}
      ${d.interstate ? `<tr><td>IGST</td><td class="num">${inr(t.igst, 2)}</td></tr>` : `<tr><td>CGST</td><td class="num">${inr(t.cgst, 2)}</td></tr><tr><td>SGST</td><td class="num">${inr(t.sgst, 2)}</td></tr>`}
      <tr><td>Round off</td><td class="num">${t.roundOff.toFixed(2)}</td></tr>
      <tr><td><b>Grand total</b></td><td class="num"><b style="font-size:16px">${inr(t.total)}</b></td></tr></table>`;
    if (this.o.onTotals) this.o.onTotals(t);
    return t;
  },
};

/* ===== Quotations ===== */
const Quotes = {
  f: { q: '', status: '', cat: '' }, cur: null,
  total: q => calcTotals(q.lines, q.discount, q.interstate).total,
  visible() { let l = DB.all('quotes'); if (App.user.role === 'sales') l = l.filter(q => (DB.get('leads', q.leadId) || {}).assignedTo === App.user.id || q.createdBy === App.user.id); return l; },

  render(el) {
    const f = this.f;
    el.innerHTML = `<div class="row mb"><span class="spacer"></span><button class="btn" onclick="Quotes.solarCalc({})">☀️ Solar subsidy & payback calculator</button><button class="btn primary" onclick="Quotes.create()">+ New quotation</button></div>
      <div class="filters"><input type="search" placeholder="🔍 Search quote no or customer…" value="${esc(f.q)}" oninput="Quotes.f.q=this.value;Quotes.draw()">
      <select onchange="Quotes.f.cat=this.value;Quotes.draw()">${opts(CAT_LIST.filter(c => c[0] !== 'chip'), f.cat, 'All categories')}</select>
      <select onchange="Quotes.f.status=this.value;Quotes.draw()">${opts(['Draft', 'Sent', 'Accepted', 'Rejected', 'Superseded'], f.status, 'All status')}</select></div><div id="qOut"></div>`;
    this.draw();
  },
  draw() {
    const f = this.f, q = f.q.toLowerCase();
    const list = this.visible().filter(x => {
      const l = DB.get('leads', x.leadId) || {};
      return (!q || `${x.no} ${l.name} ${l.phone}`.toLowerCase().includes(q)) && (!f.status || x.status === f.status) && (!f.cat || x.category === f.cat);
    }).sort((a, b) => b.createdAt - a.createdAt);
    $('#qOut').innerHTML = table(['Quote', 'Date', 'Customer', 'Category', { t: 'Amount', num: 1 }, 'Status', 'By'], list.map(x => {
      const l = DB.get('leads', x.leadId) || {};
      return { attrs: `class="click" onclick="App.go('quote/${x.id}')"`, cells: [`<b>${esc(x.no)}</b> v${x.version}`, fmtDate(x.date), `${esc(l.name)}<br><small>${esc(l.phone || '')}</small>`, catChip(x.category), inr(this.total(x)), this.statusBadge(x.status), esc(userName(x.createdBy))] };
    }), { empty: 'No quotations' });
  },
  statusBadge: s => badge(s, { Accepted: 'green', Sent: 'blue', Rejected: 'red', Superseded: 'grey', Draft: 'amber' }[s]),

  create(leadId) {
    if (!leadId) {
      const leads = Leads.visible().filter(l => l.status === 'open' && CATS[l.category].path !== 'service');
      return modal('New quotation — pick lead', `<form class="form-grid" onsubmit="event.preventDefault();Quotes.create(this.leadId.value)">
        ${field('Lead / customer', sel('leadId', leads.map(l => [l.id, `${l.name} · ${CATS[l.category].label} · ${l.stage}`]), '', '— select —', 'required'), 'full')}
        <div class="full muted">Need a new customer? Create a lead first (Leads → New lead).</div>
        <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Create</button></div></form>`);
    }
    const l = DB.get('leads', leadId);
    const q = { id: uid('qt_'), no: DB.nextNo('quotes', App.settings.quotePrefix || 'Q-'), version: 1, leadId, customerId: l.customerId, category: l.category, date: today(), validTill: addDays(today(), 15), lines: [], discount: 0, interstate: false, notes: '', terms: App.settings.quoteTerms, status: 'Draft', createdAt: Date.now(), createdBy: App.user.id };
    // suggest a package template from the lead details
    const d = l.details || {};
    let pk = null;
    if (l.category === 'cctv') { const n = num(d.cameras); pk = DB.all('packages').filter(p => p.category === 'cctv').sort((a, b) => a.size - b.size).find(p => p.size >= n); }
    if (l.category === 'solar') { const k = num(d.kw); pk = DB.all('packages').filter(p => p.category === 'solar').sort((a, b) => a.size - b.size).find(p => p.size >= k); }
    if (pk) pk.lines.forEach(x => { const it = DB.get('items', x.itemId); if (it) q.lines.push(LineEditor.line(it, x.qty)); });
    DB.put('quotes', q).then(() => { closeModal(); toast(pk ? `Started from template “${pk.name}” — edit as needed` : 'Quotation created'); App.go('quote/' + q.id); });
  },
  detail(el, id) {
    const q0 = DB.get('quotes', id); if (!q0) { el.innerHTML = '<div class="empty">Quotation not found</div>'; return; }
    const q = this.cur = JSON.parse(JSON.stringify(q0)); const l = DB.get('leads', q.leadId) || {};
    $('#pageTitle').textContent = `Quotation ${q.no} v${q.version}`;
    const versions = DB.where('quotes', x => x.no === q.no).sort((a, b) => a.version - b.version);
    const inv = DB.find('invoices', i => i.quoteId === q.id);
    el.innerHTML = `<div class="row mb"><a class="btn sm" href="#quotes">← Quotations</a>${App.allowed('leads') ? `<a class="btn sm" href="#lead/${l.id}">Lead</a>` : ''}
      ${versions.length > 1 ? `<span class="btn-group">${versions.map(v => `<button class="${v.id === q.id ? 'on' : ''}" onclick="App.go('quote/${v.id}')">v${v.version}</button>`).join('')}</span>` : ''}
      <span class="spacer"></span>
      <button class="btn" onclick="Quotes.print()">🖨️ Print / PDF</button>
      <button class="btn wa" onclick="Quotes.wa()">WhatsApp</button>
      <button class="btn" onclick="Quotes.newVersion()">⧉ New version (v${Math.max(...versions.map(v => v.version)) + 1})</button>
      ${q.category === 'solar' ? `<button class="btn" onclick="Quotes.solarCalc({kw:${num(l.details && l.details.kw) || 3},bill:${num(l.details && l.details.bill)},cost:Quotes.total(Quotes.cur)})">☀️ Subsidy & payback</button>` : ''}
      ${App.allowed('billing') ? (inv ? `<a class="btn" href="#invoice/${inv.id}">🧾 ${esc(inv.no)}</a>` : `<button class="btn" onclick="Quotes.save(true).then(()=>Billing.createFromLead('${l.id}','${q.id}'))">🧾 Convert to invoice</button>`) : ''}
    </div>
    ${q.status === 'Superseded' ? '<div class="alert warn">This is an older version. A newer version exists.</div>' : ''}
    <div class="card"><div class="card-head"><h2>${esc(l.name)}</h2>${catChip(q.category)} ${this.statusBadge(q.status)}</div>
      <div class="form-grid">
        ${field('Quote date', `<input type="date" value="${q.date}" onchange="Quotes.cur.date=this.value">`)}
        ${field('Valid till', `<input type="date" value="${q.validTill}" onchange="Quotes.cur.validTill=this.value">`)}
        ${field('Status', `<select onchange="Quotes.cur.status=this.value">${opts(['Draft', 'Sent', 'Accepted', 'Rejected', 'Superseded'], q.status)}</select>`)}
        ${field('Customer', `<div style="padding-top:6px">${esc(l.phone)} · ${esc(l.area || '')}</div>`)}
      </div></div>
    <div class="card"><h3 class="mb">Items</h3><div id="leLines"></div>${LineEditor.toolbar()}
      <div class="grid g2 mt"><div>
        <div class="form-grid">${field('Discount (₹, before GST)', `<input type="number" min="0" value="${q.discount || ''}" oninput="Quotes.cur.discount=num(this.value);LineEditor.totals()">`)}
        ${field('Supply type', `<label class="row" style="color:var(--ink);margin-top:8px"><input type="checkbox" ${q.interstate ? 'checked' : ''} onchange="Quotes.cur.interstate=this.checked;LineEditor.totals()"> Inter-state (IGST)</label>`)}</div>
        <div class="mt">${field('Notes (shown on quote)', `<textarea oninput="Quotes.cur.notes=this.value">${esc(q.notes)}</textarea>`)}</div>
        <div class="mt">${field('Terms & conditions', `<textarea style="min-height:110px" oninput="Quotes.cur.terms=this.value">${esc(q.terms)}</textarea>`)}</div>
      </div><div id="leTotals"></div></div>
      <div class="row mt"><span class="spacer"></span><button class="btn primary lg" onclick="Quotes.save()">💾 Save quotation</button></div>
    </div>`;
    const labourQty = q.category === 'cctv' ? (num(l.details && l.details.cameras) || 4) : q.category === 'solar' ? (num(l.details && l.details.kw) || 3) : 1;
    LineEditor.mount(q, { category: q.category, labourQty });
  },
  async save(silent) {
    const q = this.cur;
    q.lines = q.lines.filter(x => x.name);
    if (!q.lines.length) { toast('Add at least one item', 'err'); throw new Error('empty'); }
    q.updatedAt = Date.now(); await DB.put('quotes', JSON.parse(JSON.stringify(q)));
    const l = DB.get('leads', q.leadId);
    await Leads.advanceTo(l, QUOTE_STAGE[CATS[l.category].path], `Quotation ${q.no} v${q.version}`);
    if (!silent) { toast('Quotation saved'); App.refresh(); }
  },
  async newVersion() {
    await this.save(true);
    const old = DB.get('quotes', this.cur.id);
    const maxV = Math.max(...DB.where('quotes', x => x.no === old.no).map(x => x.version));
    const n = { ...JSON.parse(JSON.stringify(old)), id: uid('qt_'), version: maxV + 1, status: 'Draft', date: today(), validTill: addDays(today(), 15), createdAt: Date.now(), createdBy: App.user.id };
    DB.where('quotes', x => x.no === old.no && x.status !== 'Accepted').forEach(x => { x.status = 'Superseded'; DB.put('quotes', x); });
    await DB.put('quotes', n); toast('Created v' + n.version); App.go('quote/' + n.id);
  },
  summary(q) { return q.lines.slice(0, 3).map(l => `${l.name} × ${l.qty}`).join(', ') + (q.lines.length > 3 ? ` + ${q.lines.length - 3} more` : ''); },
  waItem(q) {
    const l = DB.get('leads', q.leadId) || {};
    const pk = CATS[q.category] ? CATS[q.category].label : '';
    return { key: 'quotation', label: 'Quotation', data: { name: l.name, no: `${q.no} v${q.version}`, item: `${pk} — ${this.summary(q)}`, amount: inr(this.total(q)), date: fmtDate(q.validTill) } };
  },
  async wa() {
    try { await this.save(true); } catch (e) { return; }
    const q = DB.get('quotes', this.cur.id), l = DB.get('leads', q.leadId);
    if (q.status === 'Draft') { q.status = 'Sent'; await DB.put('quotes', q); this.cur.status = 'Sent'; }
    waPicker(l.whatsapp || l.phone, l.name, [this.waItem(q)]);
    toast('Tip: Print → Save as PDF, then attach the PDF in WhatsApp');
  },
  print() {
    const q = this.cur, l = DB.get('leads', q.leadId) || {}, c = cust(l.customerId);
    printPreview(`Quotation ${q.no}`, Docs.render({
      title: 'QUOTATION', meta: [['Quote no', `${q.no} (v${q.version})`], ['Date', fmtDate(q.date)], ['Valid till', fmtDate(q.validTill)]],
      customer: { name: l.name, phone: l.phone, address: `${l.address || ''} ${l.area || ''}`, gstin: c.gstin }, lines: q.lines, discount: q.discount, interstate: q.interstate,
      notes: q.notes, terms: q.terms, extra: q.category === 'solar' ? this.solarBlock(num(l.details && l.details.kw) || sum(q.lines.filter(x => /panel/i.test(x.name)), x => x.qty) * 0.54, this.total(q), num(l.details && l.details.bill)) : ''
    }));
  },

  /* ---------- Solar subsidy & payback ---------- */
  subsidy(kw) { kw = num(kw); if (kw <= 0) return 0; if (kw <= 2) return 30000 * kw; if (kw <= 3) return 60000 + 18000 * (kw - 2); return 78000; },
  solarNumbers({ kw, cost, tariff = 7, gen = 4, residential = true, bill = 0 }) {
    kw = num(kw); const sub = residential ? this.subsidy(kw) : 0;
    const units = kw * gen * 30; const monthly = units * num(tariff);
    const net = Math.max(0, num(cost) - sub);
    return { kw, sub, net, units, monthly, yearly: monthly * 12, payback: monthly > 0 ? net / (monthly * 12) : 0, life: monthly * 12 * 25 * 0.9 - net, suggestKw: bill > 0 ? Math.ceil((bill / num(tariff)) / (gen * 30) * 2) / 2 : 0 };
  },
  solarBlock(kw, cost, bill) {
    const n = this.solarNumbers({ kw, cost, bill });
    return `<br><table><tr><th colspan="2">Solar savings estimate (${n.kw.toFixed(1)} kW)</th></tr>
      <tr><td>Expected generation</td><td class="r">${Math.round(n.units)} units / month</td></tr>
      <tr><td>PM Surya Ghar subsidy (residential, on-grid)</td><td class="r">${inr(n.sub)}</td></tr>
      <tr><td>Net cost after subsidy</td><td class="r">${inr(n.net)}</td></tr>
      <tr><td>Estimated saving (@ ₹7/unit)</td><td class="r">${inr(n.monthly)} / month · ${inr(n.yearly)} / year</td></tr>
      <tr><td>Simple payback</td><td class="r"><b>${n.payback.toFixed(1)} years</b></td></tr></table>
      <p style="font-size:10.5px">Estimates only. Generation ~4 units/kW/day in Kerala; subsidy credited by Govt. to customer’s bank account after KSEB net-meter commissioning.</p>`;
  },
  solarCalc(p = {}) {
    modal('☀️ Solar subsidy & payback calculator', `<div class="form-grid" id="solarF" oninput="Quotes.solarDraw()">
      ${field('Monthly KSEB bill (₹)', `<input name="bill" type="number" value="${p.bill || ''}" placeholder="e.g. 3000">`)}
      ${field('System size (kW)', `<input name="kw" type="number" step="0.5" value="${p.kw || 3}">`)}
      ${field('Total system cost (₹)', `<input name="cost" type="number" value="${Math.round(p.cost || (num(p.kw || 3) * 62000))}">`)}
      ${field('Tariff (₹ per unit)', `<input name="tariff" type="number" step="0.1" value="7">`)}
      ${field('Generation (units/kW/day)', `<input name="gen" type="number" step="0.1" value="4">`)}
      ${field('Customer type', `<select name="res"><option value="1">Residential (subsidy)</option><option value="0">Commercial (no subsidy)</option></select>`)}
      </div><div id="solarOut" class="mt"></div>
      <div class="muted mt">Subsidy: ₹30,000/kW up to 2 kW, ₹18,000 for the 3rd kW, max ₹78,000 (PM Surya Ghar, residential on-grid). Edit the numbers to match current rates.</div>`, { wide: true, onOpen: () => setTimeout(() => Quotes.solarDraw(), 0) });
  },
  solarDraw() {
    const g = n => num($(`#solarF [name=${n}]`).value);
    const n = this.solarNumbers({ kw: g('kw'), cost: g('cost'), tariff: g('tariff') || 7, gen: g('gen') || 4, residential: $('#solarF [name=res]').value === '1', bill: g('bill') });
    $('#solarOut').innerHTML = `<div class="kpis">
      ${n.suggestKw ? kpi('Suggested size (from bill)', n.suggestKw + ' kW', `≈ ${Math.round(g('bill') / (g('tariff') || 7))} units/month`) : ''}
      ${kpi('Subsidy', inr(n.sub), 'PM Surya Ghar', 'green')}
      ${kpi('Net cost', inr(n.net))}
      ${kpi('Generation', Math.round(n.units) + ' units', 'per month')}
      ${kpi('Saving', inr(n.monthly), inr(n.yearly) + ' per year', 'green')}
      ${kpi('Payback', n.payback.toFixed(1) + ' yrs', '', 'amber')}
      ${kpi('25-year net gain', inr(n.life), 'after 10% degradation')}</div>`;
  },
};
Pages.quotes = { title: 'Quotations', render: el => Quotes.render(el) };
Pages.quote = { title: 'Quotation', render: (el, a) => Quotes.detail(el, a[0]) };
