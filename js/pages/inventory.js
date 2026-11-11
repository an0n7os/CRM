'use strict';
/* ===== Inventory: items, serials, stock moves, purchases, vendors ===== */
const Inventory = {
  tab: 'items', f: { q: '', cat: '', low: false },
  lowStock: () => DB.all('items').filter(i => !i.service && num(i.stock) <= num(i.minStock)),
  stockValue: () => sum(DB.all('items').filter(i => !i.service), i => num(i.stock) * num(i.purchaseRate || i.rate)),

  async stockMove({ itemId, type, qty, serials = [], leadId = '', jobcardId = '', invoiceId = '', purchaseId = '', note = '' }) {
    const it = DB.get('items', itemId); if (!it || it.service) return;
    qty = num(qty); const sign = ['in', 'return'].includes(type) ? 1 : -1;
    it.stock = num(it.stock) + sign * qty;
    if (it.serialized && serials.length) {
      it.serials = it.serials || [];
      serials.forEach(sn => {
        let s = it.serials.find(x => x.sn === sn);
        if (!s) { s = { sn, status: 'in' }; it.serials.push(s); }
        if (type === 'in' || type === 'return') { s.status = 'in'; s.leadId = ''; }
        else if (type === 'issue') { s.status = 'issued'; s.leadId = leadId; }
        else if (type === 'sale') { s.status = 'sold'; s.invoiceId = invoiceId; }
        else s.status = 'out';
      });
    }
    await DB.put('items', it);
    await DB.put('stockMoves', { id: uid('sm_'), itemId, type, qty, serials, leadId, jobcardId, invoiceId, purchaseId, note, at: Date.now(), by: App.user.id });
  },

  render(el) {
    const low = this.lowStock();
    el.innerHTML = `${low.length ? `<div class="alert warn">⚠️ <b>Low stock:</b> ${low.map(i => `${esc(i.name)} (${i.stock})`).join(', ')}</div>` : ''}
      ${tabs([['items', '📦 Items & stock'], ['moves', '↔ Stock in / out'], ['purchases', '🛒 Purchases'], ['vendors', '🏭 Vendors']], this.tab, 'Inventory.setTab')}
      <div id="invOut"></div>`;
    this['draw_' + this.tab]();
  },
  setTab(t) { this.tab = t; App.refresh(); },

  draw_items() {
    const f = this.f, q = f.q.toLowerCase();
    const list = DB.all('items').filter(i => (!q || `${i.name} ${i.hsn}`.toLowerCase().includes(q) || (i.serials || []).some(s => s.sn.toLowerCase().includes(q))) && (!f.cat || i.category === f.cat) && (!f.low || (!i.service && i.stock <= i.minStock)))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    $('#invOut').innerHTML = `<div class="row mb">
      <input type="search" style="max-width:300px" placeholder="🔍 Item, HSN or serial no…" value="${esc(f.q)}" oninput="Inventory.f.q=this.value;Inventory.draw_items();this.focus()" id="invQ">
      <select style="width:auto" onchange="Inventory.f.cat=this.value;Inventory.draw_items()">${opts(ITEM_CATS, f.cat, 'All categories')}</select>
      <label class="row" style="color:var(--ink);margin:0"><input type="checkbox" ${f.low ? 'checked' : ''} onchange="Inventory.f.low=this.checked;Inventory.draw_items()"> Low stock only</label>
      <span class="spacer"></span><span class="muted">Stock value: <b>${inr(this.stockValue())}</b></span>
      <button class="btn" onclick="Inventory.exportCSV()">⬇ CSV</button>
      <button class="btn" onclick="Inventory.issueForm({})">Issue to job</button>
      <button class="btn primary" onclick="Inventory.itemForm()">+ Item</button></div>
      ${table(['Item', 'Category', 'HSN/SAC', { t: 'Rate', num: 1 }, 'GST', { t: 'Stock', num: 1 }, { t: 'Min', num: 1 }, ''], list.map(i => {
      const low = !i.service && i.stock <= i.minStock;
      return { attrs: `class="click ${low ? 'warn' : ''}" onclick="Inventory.itemView('${i.id}')"`, cells: [`<b>${esc(i.name)}</b>${i.serialized ? ' <small class="muted">· serial tracked</small>' : ''}`, esc(catLabel(i.category)), esc(i.hsn), inr(i.rate) + (i.unit !== 'nos' ? `<small class="muted">/${esc(i.unit)}</small>` : ''), i.gst + '%', i.service ? '<small class="muted">service</small>' : `<b>${i.stock}</b> ${esc(i.unit)}`, i.service ? '' : i.minStock, low ? badge('Low', 'red') : ''] };
    }), { empty: 'No items' })}`;
    const qi = $('#invQ'); if (qi && f.q) { qi.setSelectionRange(f.q.length, f.q.length); }
  },
  itemForm(id) {
    const i = id ? DB.get('items', id) : { category: 'cctv', unit: 'nos', gst: 18, stock: 0, minStock: 2, warrantyMonths: 12 };
    modal(id ? 'Edit item' : 'New item', `<form class="form-grid" onsubmit="Inventory.saveItem(event,'${id || ''}')">
      ${field('Item name *', inp('name', i.name, 'text', 'required'), 'full')}
      ${field('Category', sel('category', ITEM_CATS, i.category))}
      ${field('HSN / SAC', inp('hsn', i.hsn))}
      ${field('Unit', sel('unit', ['nos', 'm', 'kW', 'set', 'job', 'pair', 'box'], i.unit))}
      ${field('Selling rate (excl. GST) ₹', inp('rate', i.rate, 'number', 'min="0" step="any" required'))}
      ${field('Purchase rate ₹', inp('purchaseRate', i.purchaseRate, 'number', 'min="0" step="any"'))}
      ${field('GST %', sel('gst', [0, 5, 12, 18, 28], i.gst))}
      ${field('Minimum stock (alert)', inp('minStock', i.minStock, 'number', 'min="0"'))}
      ${field('Warranty (months)', inp('warrantyMonths', i.warrantyMonths, 'number', 'min="0"'))}
      ${field('Type', sel('kind', [['', 'Product'], ['labour', 'Labour charge'], ['cable', 'Cable / per metre']], i.kind || ''))}
      <div class="full checks"><label><input type="checkbox" name="serialized" ${i.serialized ? 'checked' : ''}> Track serial numbers</label><label><input type="checkbox" name="service" ${i.service ? 'checked' : ''}> Service / labour (no stock)</label></div>
      ${!id ? field('Opening stock', inp('stock', 0, 'number', 'min="0"')) : ''}
      <div class="full modal-foot">${id ? `<button type="button" class="btn danger" onclick="Inventory.delItem('${id}')">Delete</button><span class="spacer"></span>` : ''}<button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveItem(e, id) {
    e.preventDefault(); const d = formData(e.target);
    const i = id ? DB.get('items', id) : { id: uid('it_'), serials: [], stock: 0 };
    Object.assign(i, { name: d.name, category: d.category, hsn: d.hsn, unit: d.unit, rate: num(d.rate), purchaseRate: num(d.purchaseRate), gst: num(d.gst), minStock: num(d.minStock), warrantyMonths: num(d.warrantyMonths), kind: d.kind, serialized: d.serialized, service: d.service });
    await DB.put('items', i);
    if (!id && num(d.stock) > 0) await this.stockMove({ itemId: i.id, type: 'in', qty: num(d.stock), note: 'Opening stock' });
    closeModal(); toast('Item saved'); App.refresh();
  },
  async delItem(id) {
    if (DB.find('stockMoves', m => m.itemId === id) && !confirmBox('This item has stock history. Delete anyway?')) return;
    if (!confirmBox('Delete this item permanently?')) return;
    await DB.del('items', id); closeModal(); App.refresh();
  },
  itemView(id) {
    const i = DB.get('items', id);
    const moves = DB.where('stockMoves', m => m.itemId === id).sort((a, b) => b.at - a.at).slice(0, 15);
    const sers = (i.serials || []);
    modal(i.name, `<div class="dl mb"><div><span>Stock</span><b>${i.service ? 'Service' : i.stock + ' ' + i.unit}</b></div><div><span>Rate</span><b>${inr(i.rate)} + ${i.gst}% GST</b></div><div><span>HSN</span><b>${esc(i.hsn)}</b></div><div><span>Warranty</span><b>${i.warrantyMonths || 0} months</b></div></div>
      ${i.service ? '' : `<div class="row mb"><button class="btn" onclick="Inventory.stockForm('${id}','in')">+ Stock in</button><button class="btn" onclick="Inventory.stockForm('${id}','out')">− Stock out</button><button class="btn" onclick="Inventory.issueForm({itemId:'${id}'})">Issue to job</button><span class="spacer"></span><button class="btn" onclick="Inventory.itemForm('${id}')">✏️ Edit</button></div>`}
      ${i.serialized ? `<h3 class="mb">Serial numbers (${sers.filter(s => s.status === 'in').length} in stock)</h3><div class="mb" style="max-height:160px;overflow:auto">${sers.map(s => badge(s.sn + ' · ' + s.status, { in: 'green', issued: 'amber', sold: 'blue', out: 'grey' }[s.status])).join(' ') || '<span class="muted">None</span>'}</div>` : ''}
      <h3 class="mb">Recent movements</h3>${table(['When', 'Type', { t: 'Qty', num: 1 }, 'Ref / note'], moves.map(m => [fmtDT(m.at), this.typeBadge(m.type), m.qty, esc(m.note || '') + (m.serials && m.serials.length ? `<br><small>${esc(m.serials.join(', '))}</small>` : '')]), { empty: 'No movements', cards: false })}
      ${i.service ? `<div class="modal-foot"><button class="btn" onclick="Inventory.itemForm('${id}')">✏️ Edit</button></div>` : ''}`, { wide: true, noFocus: true });
  },
  typeBadge: t => badge({ in: 'Stock in', out: 'Stock out', issue: 'Issued to job', return: 'Returned', sale: 'Sold' }[t] || t, { in: 'green', return: 'green', out: 'red', issue: 'amber', sale: 'blue' }[t]),
  stockForm(id, type) {
    const i = DB.get('items', id);
    const avail = (i.serials || []).filter(s => s.status === 'in');
    modal((type === 'in' ? 'Stock in — ' : 'Stock out — ') + i.name, `<form class="form-grid" onsubmit="Inventory.saveStock(event,'${id}','${type}')">
      ${field('Quantity', inp('qty', 1, 'number', 'min="1" step="any" required'))}
      ${field('Note / reason', inp('note', '', 'text', `placeholder="${type === 'in' ? 'e.g. received from vendor' : 'e.g. damaged, demo unit'}"`))}
      ${i.serialized ? (type === 'in' ? field('Serial numbers (one per line)', txt('serials', '', 'placeholder="SN001\nSN002"'), 'full') : field('Serials going out', `<div class="checks">${avail.map(s => `<label><input type="checkbox" name="serials" value="${esc(s.sn)}" data-multi> ${esc(s.sn)}</label>`).join('') || '<span class="muted">No serials in stock</span>'}</div>`, 'full')) : ''}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveStock(e, id, type) {
    e.preventDefault(); const d = formData(e.target);
    const serials = Array.isArray(d.serials) ? d.serials : String(d.serials || '').split(/\n|,/).map(s => s.trim()).filter(Boolean);
    const i = DB.get('items', id);
    if (i.serialized && type === 'in' && serials.length && serials.length !== num(d.qty)) return toast(`You entered ${serials.length} serials for qty ${d.qty}`, 'err');
    if (type === 'out' && num(d.qty) > i.stock && !confirmBox('Quantity is more than stock. Continue?')) return;
    await this.stockMove({ itemId: id, type, qty: num(d.qty), serials, note: d.note || (type === 'in' ? 'Manual stock in' : 'Manual stock out') });
    closeModal(); toast('Stock updated'); App.refresh();
  },
  issueForm({ leadId = '', itemId = '' }) {
    const leads = DB.all('leads').filter(l => l.status === 'open' && CATS[l.category].path !== 'service');
    const items = DB.all('items').filter(i => !i.service);
    modal('Issue material to job', `<form class="form-grid" onsubmit="Inventory.saveIssue(event)">
      ${field('Job / lead *', sel('leadId', leads.map(l => [l.id, `${l.name} · ${CATS[l.category].label} · ${l.stage}`]), leadId, '— select —', 'required'), 'full')}
      ${field('Item *', `<select name="itemId" required onchange="Inventory.issueSerials(this.value)">${opts(items.map(i => [i.id, `${i.name} (stock ${i.stock})`]), itemId, '— select —')}</select>`, 'full')}
      ${field('Quantity', inp('qty', 1, 'number', 'min="1" step="any" required'))}
      ${field('Note', inp('note'))}
      <div class="full" id="issueSer"></div>
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Issue</button></div></form>`);
    if (itemId) this.issueSerials(itemId);
  },
  issueSerials(itemId) {
    const i = DB.get('items', itemId), box = $('#issueSer'); if (!box) return;
    box.innerHTML = i && i.serialized ? field('Serials issued', `<div class="checks">${(i.serials || []).filter(s => s.status === 'in').map(s => `<label><input type="checkbox" name="serials" value="${esc(s.sn)}" data-multi> ${esc(s.sn)}</label>`).join('') || '<span class="muted">No serials in stock</span>'}</div>`) : '';
  },
  async saveIssue(e) {
    e.preventDefault(); const d = formData(e.target), it = DB.get('items', d.itemId), l = DB.get('leads', d.leadId);
    if (num(d.qty) > it.stock && !confirmBox(`Only ${it.stock} in stock. Issue anyway?`)) return;
    await this.stockMove({ itemId: d.itemId, type: 'issue', qty: num(d.qty), serials: d.serials || [], leadId: d.leadId, note: `Issued to ${l.name}${d.note ? ' — ' + d.note : ''}` });
    if (CATS[l.category].path === 'project') await Leads.advanceTo(l, 'Material issued');
    closeModal(); toast('Material issued'); App.refresh();
  },

  draw_moves() {
    const list = DB.all('stockMoves').slice().sort((a, b) => b.at - a.at).slice(0, 300);
    $('#invOut').innerHTML = `<div class="row mb"><span class="muted">Latest 300 movements</span><span class="spacer"></span><button class="btn" onclick="Inventory.exportMoves()">⬇ CSV</button><button class="btn" onclick="Inventory.issueForm({})">Issue to job</button></div>
      ${table(['When', 'Item', 'Type', { t: 'Qty', num: 1 }, 'Job / ref', 'By'], list.map(m => {
      const l = m.leadId && DB.get('leads', m.leadId);
      return [fmtDT(m.at), esc((DB.get('items', m.itemId) || { name: '(deleted)' }).name) + (m.serials && m.serials.length ? `<br><small class="muted">${esc(m.serials.join(', '))}</small>` : ''), this.typeBadge(m.type), m.qty, (l ? `<a href="#lead/${l.id}">${esc(l.name)}</a> ` : '') + `<small>${esc(m.note || '')}</small>`, esc(userName(m.by))];
    }), { empty: 'No stock movements' })}`;
  },

  draw_purchases() {
    const list = DB.all('purchases').slice().sort((a, b) => b.date.localeCompare(a.date));
    $('#invOut').innerHTML = `<div class="row mb"><span class="spacer"></span><button class="btn primary" onclick="Inventory.purchaseForm()">+ Purchase entry</button></div>
      ${table(['Date', 'Vendor', 'Bill no', 'Items', { t: 'Amount', num: 1 }, 'Paid'], list.map(p => [fmtDate(p.date), esc((DB.get('vendors', p.vendorId) || {}).name), esc(p.billNo), p.lines.map(l => `${esc((DB.get('items', l.itemId) || {}).name)} × ${l.qty}`).join('<br>'), inr(p.total), p.paid ? badge('Paid', 'green') : badge('Credit', 'amber')]), { empty: 'No purchases' })}`;
  },
  purchaseForm() {
    const items = DB.all('items').filter(i => !i.service).sort((a, b) => a.name.localeCompare(b.name));
    window._pItems = items;
    modal('Purchase entry (stock in from vendor)', `<form onsubmit="Inventory.savePurchase(event)">
      <div class="form-grid">${field('Vendor *', sel('vendorId', DB.all('vendors').map(v => [v.id, v.name]), '', '— select —', 'required'))}${field('Vendor bill no', inp('billNo', '', 'text', 'required'))}${field('Bill date', inp('date', today(), 'date'))}
      ${field('Payment', sel('paid', [['', 'On credit'], ['1', 'Paid']], ''))}</div>
      <h3 class="mt mb">Items</h3><div id="pLines"></div><button type="button" class="btn sm" onclick="Inventory.pRow()">+ Row</button>
      <div class="right mt"><b>Total: <span id="pTot">₹0</span></b></div>
      <div class="modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save & add to stock</button></div></form>`, { wide: true });
    this.pRow();
  },
  pRow() {
    $('#pLines').insertAdjacentHTML('beforeend', `<div class="form-grid p-row mb" style="grid-template-columns:2fr 70px 110px 80px 2fr 40px;align-items:end">
      ${field('Item', `<select data-k="itemId" onchange="const it=DB.get('items',this.value);const r=this.closest('.p-row');r.querySelector('[data-k=rate]').value=it?(it.purchaseRate||''):'';r.querySelector('[data-k=gst]').value=it?it.gst:18;Inventory.pTotal()">${opts(window._pItems.map(i => [i.id, i.name]), '', '— item —')}</select>`)}
      ${field('Qty', '<input data-k="qty" type="number" min="1" value="1" oninput="Inventory.pTotal()">')}
      ${field('Rate ₹', '<input data-k="rate" type="number" min="0" step="any" oninput="Inventory.pTotal()">')}
      ${field('GST %', '<input data-k="gst" type="number" value="18" oninput="Inventory.pTotal()">')}
      ${field('Serials (comma separated)', '<input data-k="serials" placeholder="if serial tracked">')}
      <button type="button" class="btn sm danger" onclick="this.closest('.p-row').remove();Inventory.pTotal()">✕</button></div>`);
  },
  pLines() { return $$('.p-row').map(r => { const o = {}; $$('[data-k]', r).forEach(x => o[x.dataset.k] = x.value); return { itemId: o.itemId, qty: num(o.qty), rate: num(o.rate), gst: num(o.gst), serials: o.serials.split(/[,\s]+/).filter(Boolean) }; }).filter(l => l.itemId && l.qty > 0); },
  pTotal() { const t = sum(this.pLines(), l => l.qty * l.rate * (1 + l.gst / 100)); $('#pTot').textContent = inr(t, 2); return t; },
  async savePurchase(e) {
    e.preventDefault(); const d = formData(e.target), lines = this.pLines();
    if (!lines.length) return toast('Add at least one item', 'err');
    const p = { id: uid('pu_'), vendorId: d.vendorId, billNo: d.billNo, date: d.date, paid: !!d.paid, lines, total: round2(this.pTotal()), createdAt: Date.now(), by: App.user.id };
    await DB.put('purchases', p);
    for (const l of lines) {
      await this.stockMove({ itemId: l.itemId, type: 'in', qty: l.qty, serials: l.serials, purchaseId: p.id, note: `Purchase ${d.billNo} · ${(DB.get('vendors', d.vendorId) || {}).name}` });
      const it = DB.get('items', l.itemId); it.purchaseRate = l.rate; await DB.put('items', it);
    }
    closeModal(); toast('Purchase saved and stock updated'); App.refresh();
  },

  draw_vendors() {
    $('#invOut').innerHTML = `<div class="row mb"><span class="spacer"></span><button class="btn primary" onclick="Inventory.vendorForm()">+ Vendor</button></div>
      ${table(['Vendor', 'Phone', 'GSTIN', 'Supplies', { t: 'Purchases', num: 1 }], DB.all('vendors').map(v => ({ attrs: `class="click" onclick="Inventory.vendorForm('${v.id}')"`, cells: [`<b>${esc(v.name)}</b><br><small>${esc(v.address || '')}</small>`, esc(v.phone), esc(v.gstin), esc(v.supplies || ''), inr(sum(DB.where('purchases', p => p.vendorId === v.id), p => p.total))] })), { empty: 'No vendors' })}`;
  },
  vendorForm(id) {
    const v = id ? DB.get('vendors', id) : {};
    modal(id ? 'Edit vendor' : 'New vendor', `<form class="form-grid" onsubmit="Inventory.saveVendor(event,'${id || ''}')">
      ${field('Name *', inp('name', v.name, 'text', 'required'))}${field('Phone', inp('phone', v.phone, 'tel'))}${field('GSTIN', inp('gstin', v.gstin))}${field('Supplies', inp('supplies', v.supplies, 'text', 'placeholder="CCTV, HDD…"'))}
      ${field('Address', txt('address', v.address), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveVendor(e, id) { e.preventDefault(); const d = formData(e.target); await DB.put('vendors', { ...(id ? DB.get('vendors', id) : {}), ...d, id: id || uid('ve_') }); closeModal(); App.refresh(); },
  exportCSV() { const rows = [['Item', 'Category', 'HSN', 'Unit', 'Rate', 'GST%', 'Purchase rate', 'Stock', 'Min stock', 'Stock value', 'Serials in stock']]; DB.all('items').forEach(i => rows.push([i.name, catLabel(i.category), i.hsn, i.unit, i.rate, i.gst, i.purchaseRate, i.service ? '' : i.stock, i.minStock, i.service ? '' : round2(i.stock * (i.purchaseRate || i.rate)), (i.serials || []).filter(s => s.status === 'in').map(s => s.sn).join(' ')])); downloadCSV('stock-' + today(), rows); },
  exportMoves() { const rows = [['Date', 'Item', 'Type', 'Qty', 'Serials', 'Lead', 'Note', 'By']]; DB.all('stockMoves').forEach(m => rows.push([fmtDT(m.at), (DB.get('items', m.itemId) || {}).name, m.type, m.qty, (m.serials || []).join(' '), (DB.get('leads', m.leadId) || {}).name || '', m.note, userName(m.by)])); downloadCSV('stock-moves-' + today(), rows); },
};
Pages.inventory = { title: 'Inventory', render: el => Inventory.render(el) };
