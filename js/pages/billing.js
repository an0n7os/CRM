'use strict';
/* ===== Printable document layout (quotation / invoice / receipt) ===== */
function addMonths(iso, m) { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + num(m)); return isoDate(d); }
function fyLabel(iso = today()) { const d = new Date(iso + 'T00:00:00'); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String(y + 1).slice(2)}`; }

const Docs = {
  header() {
    const s = App.settings;
    return `<div class="head"><div>${s.logo ? `<img src="${s.logo}" style="max-height:56px;margin-bottom:4px"><br>` : ''}<h1>${esc(s.bizName)}</h1><div>${esc(s.address)}</div><div>Ph: ${esc(s.phone)}${s.email ? ' · ' + esc(s.email) : ''}</div></div>
      <div class="r"><b>GSTIN: ${esc(s.gstin)}</b><br>State: Kerala (32)${s.website ? '<br>' + esc(s.website) : ''}</div></div>`;
  },
  render(o) {
    const s = App.settings, t = calcTotals(o.lines, o.discount, o.interstate);
    const f = t.sub > 0 ? 1 - t.discount / t.sub : 1;
    const paid = sum(o.payments || [], p => p.amount);
    return `${this.header()}<div class="title">${esc(o.title)}</div>
      <table class="noborder" style="margin-bottom:8px"><tr><td style="width:55%"><b>Bill to:</b><br><b>${esc(o.customer.name)}</b><br>${esc(o.customer.address || '')}<br>Ph: ${esc(o.customer.phone || '')}${o.customer.gstin ? `<br>GSTIN: ${esc(o.customer.gstin)}` : ''}<br>Place of supply: ${o.interstate ? 'Other state (IGST)' : 'Kerala (32)'}</td>
      <td class="r">${o.meta.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join('<br>')}</td></tr></table>
      <table><thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Taxable</th><th>GST</th><th>Amount</th></tr></thead><tbody>
      ${o.lines.map((l, i) => { const tx = num(l.qty) * num(l.rate) * f; return `<tr><td>${i + 1}</td><td>${esc(l.name)}${l.serials && l.serials.length ? `<br><small>S/N: ${esc(l.serials.join(', '))}</small>` : ''}</td><td>${esc(l.hsn || '')}</td><td class="r">${l.qty} ${esc(l.unit || '')}</td><td class="r">${num(l.rate).toFixed(2)}</td><td class="r">${tx.toFixed(2)}</td><td class="r">${l.gst}%</td><td class="r">${(tx * (1 + num(l.gst) / 100)).toFixed(2)}</td></tr>`; }).join('')}
      </tbody></table>
      <table style="margin-top:6px"><tr><td style="width:58%;vertical-align:top">
        <b>Amount in words:</b> ${inWords(t.total)}<br><br>
        <table><tr><th>HSN/SAC</th><th>Taxable</th>${o.interstate ? '<th>IGST</th>' : '<th>CGST</th><th>SGST</th>'}</tr>
        ${t.byHsn.map(h => `<tr><td>${esc(h.hsn)} @${h.rate}%</td><td class="r">${h.taxable.toFixed(2)}</td>${o.interstate ? `<td class="r">${h.tax.toFixed(2)}</td>` : `<td class="r">${(h.tax / 2).toFixed(2)}</td><td class="r">${(h.tax / 2).toFixed(2)}</td>`}</tr>`).join('')}</table>
      </td><td style="vertical-align:top"><table class="noborder">
        <tr><td>Subtotal</td><td class="r">${t.sub.toFixed(2)}</td></tr>
        ${t.discount ? `<tr><td>Discount</td><td class="r">-${t.discount.toFixed(2)}</td></tr>` : ''}
        <tr><td>Taxable value</td><td class="r">${t.taxable.toFixed(2)}</td></tr>
        ${o.interstate ? `<tr><td>IGST</td><td class="r">${t.igst.toFixed(2)}</td></tr>` : `<tr><td>CGST</td><td class="r">${t.cgst.toFixed(2)}</td></tr><tr><td>SGST</td><td class="r">${t.sgst.toFixed(2)}</td></tr>`}
        <tr><td>Round off</td><td class="r">${t.roundOff.toFixed(2)}</td></tr>
        <tr><td><b>Grand total</b></td><td class="r"><b>${inr(t.total, 2)}</b></td></tr>
        ${o.payments ? `<tr><td>Received</td><td class="r">${inr(paid, 2)}</td></tr><tr><td><b>Balance due</b></td><td class="r"><b>${inr(t.total - paid, 2)}</b></td></tr>` : ''}
      </table></td></tr></table>
      ${o.extra || ''}
      ${o.notes ? `<p><b>Notes:</b> ${esc(o.notes)}</p>` : ''}
      ${o.terms ? `<p style="font-size:11px;white-space:pre-line"><b>Terms & conditions:</b>\n${esc(o.terms)}</p>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;padding:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px">
        <div style="font-size:11.5px">
          <b>Bank:</b> ${esc(s.bank)}<br>
          <b>UPI ID:</b> ${esc(s.upi)}
          ${s.upi ? '<div style="font-size:10.5px;color:#666;margin-top:2px">Scan QR code using GPay, PhonePe, or Paytm to pay</div>' : ''}
        </div>
        ${s.upi ? `<div style="text-align:center">${QRCode.svg(QRCode.upiUri(s.upi, s.bizName, o.payments ? Math.max(0, t.total - paid) : t.total, o.title || 'Invoice Payment'), 80)}<div style="font-size:9.5px;font-weight:600">Scan &amp; Pay UPI</div></div>` : ''}
      </div>
      <div class="sign"><div>Customer signature</div><div>For ${esc(s.bizName)}<br>Authorised signatory</div></div>`;
  },
};

/* ===== Billing: GST invoices, advances, payments, dues ===== */
const Billing = {
  tab: 'invoices', f: { q: '', st: '', range: 'month', from: '', to: '' }, draft: null,
  paid: i => sum(i.payments || [], p => p.amount),
  balance(i) { return Math.max(0, round2(num(i.total) - this.paid(i))); },
  overdue(i) { return this.balance(i) > 0 && i.dueDate < today() ? daysBetween(i.dueDate, today()) : 0; },
  statusBadge(i) {
    const b = this.balance(i), od = this.overdue(i);
    if (b <= 0) return badge('Paid', 'green');
    return badge(this.paid(i) > 0 ? 'Partly paid' : 'Unpaid', od ? 'red' : 'amber') + (od ? ` <small style="color:var(--danger)">${od}d overdue</small>` : '');
  },
  allPayments() {
    const out = [];
    DB.all('invoices').forEach(i => (i.payments || []).forEach(p => out.push({ ...p, invoice: i })));
    DB.all('leads').forEach(l => (l.advances || []).filter(a => !a.invoiceId).forEach(a => out.push({ ...a, lead: l, advance: true })));
    return out;
  },

  render(el) {
    el.innerHTML = `<div class="row mb"><span class="spacer"></span><button class="btn" onclick="Billing.quickSale()">⚡ Quick sale bill</button><button class="btn primary" onclick="Billing.pickLead()">+ Invoice from lead / order</button></div>
      ${tabs([['invoices', '🧾 Invoices'], ['dues', '⏰ Due list'], ['payments', '💰 Payments received']], this.tab, 'Billing.setTab')}<div id="bOut"></div>`;
    this['draw_' + this.tab]();
  },
  setTab(t) { this.tab = t; App.refresh(); },
  rangeBar(fn) {
    const f = this.f; if (f.range !== 'custom') [f.from, f.to] = rangePreset(f.range);
    return `<select style="width:auto" onchange="Billing.f.range=this.value;${fn}()">${opts(RANGE_PRESETS, f.range)}</select>
      ${f.range === 'custom' ? `<input type="date" style="width:auto" value="${f.from}" onchange="Billing.f.from=this.value;${fn}()"><input type="date" style="width:auto" value="${f.to}" onchange="Billing.f.to=this.value;${fn}()">` : `<span class="muted">${fmtDate(f.from)} – ${fmtDate(f.to)}</span>`}`;
  },
  draw_invoices() {
    const f = this.f, q = f.q.toLowerCase(); if (f.range !== 'custom') [f.from, f.to] = rangePreset(f.range);
    const list = DB.all('invoices').filter(i => inRange(i.date, f.from, f.to) && (!q || `${i.no} ${cust(i.customerId).name} ${cust(i.customerId).phone}`.toLowerCase().includes(q))
      && (!f.st || (f.st === 'paid' ? this.balance(i) <= 0 : this.balance(i) > 0))).sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no));
    $('#bOut').innerHTML = `<div class="filters"><input type="search" placeholder="🔍 Invoice no or customer…" value="${esc(f.q)}" oninput="Billing.f.q=this.value;Billing.draw_invoices()" id="bq">
      ${this.rangeBar('Billing.draw_invoices')}<select style="width:auto" onchange="Billing.f.st=this.value;Billing.draw_invoices()">${opts([['paid', 'Paid'], ['due', 'With balance']], f.st, 'All')}</select>
      <span class="spacer"></span><button class="btn" onclick="Billing.exportInvoices()">⬇ CSV</button></div>
      <div class="kpis">${kpi('Invoiced', inr(sum(list, i => i.total)), list.length + ' invoices')}${kpi('Received', inr(sum(list, i => this.paid(i))), '', 'green')}${kpi('Balance', inr(sum(list, i => this.balance(i))), '', 'red')}</div>
      ${table(['Invoice', 'Date', 'Customer', 'Category', { t: 'Total', num: 1 }, { t: 'Balance', num: 1 }, 'Status'], list.map(i => ({ attrs: `class="click" onclick="App.go('invoice/${i.id}')"`, cells: [`<b>${esc(i.no)}</b>`, fmtDate(i.date), esc(cust(i.customerId).name), catChip(i.category), inr(i.total), inr(this.balance(i)), this.statusBadge(i)] })), { empty: 'No invoices in this period' })}`;
    const b = $('#bq'); if (b && f.q) { b.focus(); b.setSelectionRange(f.q.length, f.q.length); }
  },
  draw_dues() {
    const list = DB.all('invoices').filter(i => this.balance(i) > 0).sort((a, b) => this.overdue(b) - this.overdue(a));
    const buckets = [['Not yet due', i => !this.overdue(i)], ['1–30 days', i => this.overdue(i) >= 1 && this.overdue(i) <= 30], ['31–60 days', i => this.overdue(i) > 30 && this.overdue(i) <= 60], ['60+ days', i => this.overdue(i) > 60]];
    $('#bOut').innerHTML = `<div class="kpis">${kpi('Total pending', inr(sum(list, i => this.balance(i))), list.length + ' invoices', 'red')}${buckets.map(([l, fn]) => kpi(l, inr(sum(list.filter(fn), i => this.balance(i))), list.filter(fn).length + ' invoices', l === 'Not yet due' ? '' : 'amber')).join('')}</div>
      <div class="row mb"><span class="spacer"></span><button class="btn" onclick="Billing.exportDues()">⬇ CSV</button></div>
      ${table(['Invoice', 'Customer', 'Invoice date', 'Due date', 'Days overdue', { t: 'Total', num: 1 }, { t: 'Paid', num: 1 }, { t: 'Balance', num: 1 }, ''], list.map(i => {
      const c = cust(i.customerId), od = this.overdue(i);
      return { attrs: `class="${od > 30 ? 'bad' : od ? 'warn' : ''}"`, cells: [`<a href="#invoice/${i.id}"><b>${esc(i.no)}</b></a>`, `${esc(c.name)}<br><small>${esc(c.phone)}</small>`, fmtDate(i.date), fmtDate(i.dueDate), od ? `<b style="color:var(--danger)">${od} days</b>` : '<span class="muted">Not due</span>', inr(i.total), inr(this.paid(i)), `<b>${inr(this.balance(i))}</b>`,
        `<span class="row nowrap"><button class="btn sm wa" onclick="Billing.waPay('${i.id}')">Remind</button><button class="btn sm" onclick="Billing.payForm('${i.id}')">+ Pay</button></span>`] };
    }), { empty: 'No pending dues 🎉' })}`;
  },
  draw_payments() {
    const f = this.f; if (f.range !== 'custom') [f.from, f.to] = rangePreset(f.range);
    const list = this.allPayments().filter(p => inRange(p.date, f.from, f.to)).sort((a, b) => b.date.localeCompare(a.date));
    const byMode = groupBy(list, p => p.mode);
    $('#bOut').innerHTML = `<div class="filters">${this.rangeBar('Billing.draw_payments')}<span class="spacer"></span><button class="btn" onclick="Billing.exportPayments()">⬇ CSV</button></div>
      <div class="kpis">${kpi('Total received', inr(sum(list, p => p.amount)), list.length + ' receipts', 'green')}${Object.entries(byMode).map(([m, ps]) => kpi(m, inr(sum(ps, p => p.amount)), ps.length + ' receipts')).join('')}</div>
      ${table(['Date', 'Customer', 'Against', 'Mode', 'Reference', { t: 'Amount', num: 1 }, 'By'], list.map(p => {
      const c = p.invoice ? cust(p.invoice.customerId) : cust(p.lead.customerId);
      return [fmtDate(p.date), esc(c.name), p.invoice ? `<a href="#invoice/${p.invoice.id}">${esc(p.invoice.no)}</a>${p.advance ? ' <small>(advance)</small>' : ''}` : `<a href="#lead/${p.lead.id}">Advance — ${esc(p.lead.name)}</a>`, esc(p.mode), esc(p.ref || ''), inr(p.amount), esc(userName(p.by))];
    }), { empty: 'No payments in this period' })}`;
  },

  /* ---------- create ---------- */
  pickLead() {
    const leads = DB.all('leads').filter(l => l.status !== 'lost' && !DB.find('invoices', i => i.leadId === l.id));
    modal('Invoice from lead / order', `<form class="form-grid" onsubmit="event.preventDefault();Billing.createFromLead(this.leadId.value)">
      ${field('Lead / order', sel('leadId', leads.map(l => [l.id, `${l.name} · ${CATS[l.category].label} · ${l.stage}`]), '', '— select —', 'required'), 'full')}
      <div class="full muted">Items are copied from the accepted (or latest) quotation, or from the job card parts for service jobs. Advances already received are adjusted.</div>
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Continue</button></div></form>`);
  },
  newDraft(o) {
    const s = App.settings;
    return { id: '', no: '', date: today(), dueDate: addDays(today(), o.creditDays ?? 0), lines: [], discount: 0, interstate: false, notes: '', terms: s.invoiceTerms, payments: [], category: 'laptop', ...o };
  },
  createFromLead(leadId, quoteId) {
    const l = DB.get('leads', leadId); if (!l) return;
    const ex = DB.find('invoices', i => i.leadId === leadId);
    if (ex && !confirmBox(`Invoice ${ex.no} already exists for this lead. Create another?`)) return;
    const qs = DB.where('quotes', q => q.leadId === leadId).sort((a, b) => b.createdAt - a.createdAt);
    const q = (quoteId && DB.get('quotes', quoteId)) || qs.find(x => x.status === 'Accepted') || qs[0];
    const d = this.newDraft({ leadId, customerId: l.customerId, category: l.category, quoteId: q ? q.id : '', creditDays: CATS[l.category].path === 'project' ? 15 : 0, salesBy: l.assignedTo });
    if (q) { d.lines = JSON.parse(JSON.stringify(q.lines)); d.discount = q.discount; d.interstate = q.interstate; }
    const jc = DB.find('jobcards', j => j.leadId === leadId);
    if (jc && !d.lines.length) {
      const lab = DB.find('items', i => i.kind === 'labour' && i.category === 'chip');
      jc.parts.forEach(p => { const it = p.itemId && DB.get('items', p.itemId); d.lines.push({ itemId: '', name: p.name, hsn: it ? it.hsn : '8473', qty: p.qty, unit: 'nos', rate: round2(p.price / (1 + (it ? it.gst : 18) / 100)), gst: it ? it.gst : 18, serials: [] }); });
      const partsIncl = sum(jc.parts, p => p.qty * p.price), rest = num(jc.estimate) - partsIncl;
      if (lab && rest > 0) d.lines.push({ itemId: lab.id, name: `${lab.name} — ${jc.device} ${jc.brand} ${jc.model} (${jc.no})`, hsn: lab.hsn, qty: 1, unit: 'job', rate: round2(rest / (1 + lab.gst / 100)), gst: lab.gst, serials: [] });
      d.notes = `Job card ${jc.no}. ${jc.diagnosis || ''}`;
    }
    this.draft = d; closeModal(); App.go('invoice/new');
  },
  quickSale() { this.draft = this.newDraft({ leadId: '', customerId: '', salesBy: App.user.id, quick: true, cust: { name: '', phone: '', gstin: '', address: '' } }); App.go('invoice/new'); },

  editor(el) {
    const d = this.draft; if (!d) { App.go('billing'); return; }
    const l = d.leadId ? DB.get('leads', d.leadId) : null;
    const adv = l ? (l.advances || []).filter(a => !a.invoiceId) : [];
    $('#pageTitle').textContent = 'New GST invoice';
    el.innerHTML = `<div class="row mb"><a class="btn sm" href="#billing">← Billing</a><span class="spacer"></span></div>
    <div class="card"><div class="card-head"><h2>${l ? esc(l.name) : 'Quick sale'}</h2>${l ? catChip(l.category) : ''}</div>
      <div class="form-grid">
        ${d.quick ? `${field('Customer name *', `<input value="${esc(d.cust.name)}" oninput="Billing.draft.cust.name=this.value">`)}
          ${field('Phone *', `<input maxlength="10" inputmode="numeric" value="${esc(d.cust.phone)}" oninput="Billing.draft.cust.phone=this.value;Billing.fillCust(this.value)">`)}
          ${field('Customer GSTIN (B2B)', `<input value="${esc(d.cust.gstin)}" id="qsGst" oninput="Billing.draft.cust.gstin=this.value">`)}
          ${field('Address', `<input value="${esc(d.cust.address)}" id="qsAddr" oninput="Billing.draft.cust.address=this.value">`)}
          ${field('Category', `<select onchange="Billing.draft.category=this.value">${opts(CAT_LIST, d.category)}</select>`)}`
        : field('Customer', `<div style="padding-top:6px">${esc(l.phone)} · ${esc(l.area || '')}${cust(l.customerId).gstin ? ' · GSTIN ' + esc(cust(l.customerId).gstin) : ''}</div>`)}
        ${field('Invoice date', `<input type="date" value="${d.date}" onchange="Billing.draft.date=this.value">`)}
        ${field('Due date', `<input type="date" value="${d.dueDate}" onchange="Billing.draft.dueDate=this.value">`)}
        ${field('Salesperson', `<select onchange="Billing.draft.salesBy=this.value">${opts(userOpts(['sales', 'admin', 'frontdesk']), d.salesBy, '—')}</select>`)}
      </div></div>
    <div class="card"><h3 class="mb">Items <small class="muted">— pick serial numbers for warranty tracking</small></h3><div id="leLines"></div>${LineEditor.toolbar()}
      <div class="grid g2 mt"><div>
        <div class="form-grid">${field('Discount (₹, before GST)', `<input type="number" min="0" value="${d.discount || ''}" oninput="Billing.draft.discount=num(this.value);LineEditor.totals()">`)}
        ${field('Supply type', `<label class="row" style="color:var(--ink);margin-top:8px"><input type="checkbox" ${d.interstate ? 'checked' : ''} onchange="Billing.draft.interstate=this.checked;LineEditor.totals()"> Inter-state (IGST)</label>`)}</div>
        ${adv.length ? `<div class="alert ok mt">Advance received will be adjusted: ${adv.map(a => `${fmtDate(a.date)} ${inr(a.amount)} (${esc(a.mode)})`).join(', ')} — total <b>${inr(sum(adv, a => a.amount))}</b></div>` : ''}
        <div class="mt">${field('Notes', `<textarea oninput="Billing.draft.notes=this.value">${esc(d.notes)}</textarea>`)}</div>
        <div class="mt">${field('Payment received now (₹)', `<div class="row"><input type="number" min="0" id="payNow" style="max-width:160px" placeholder="0"><select id="payMode" style="max-width:130px">${opts(PAY_MODES)}</select><input id="payRef" placeholder="Ref / UTR" style="max-width:160px"></div>`)}</div>
      </div><div id="leTotals"></div></div>
      <div class="row mt"><span class="spacer"></span><button class="btn primary lg" onclick="Billing.saveDraft()">✅ Save invoice</button></div></div>`;
    LineEditor.mount(d, { category: d.category, serials: true, labourQty: 1 });
  },
  fillCust(ph) {
    const c = validPhone(ph) && DB.find('customers', x => x.phone === ph);
    if (c) { const d = this.draft; d.cust.name = c.name; d.cust.address = c.address + ' ' + (c.area || ''); d.cust.gstin = c.gstin || ''; toast('Existing customer: ' + c.name); App.refresh(); }
  },
  async saveDraft() {
    const d = this.draft; d.lines = d.lines.filter(x => x.name && num(x.qty) > 0);
    if (!d.lines.length) return toast('Add at least one item', 'err');
    for (const ln of d.lines) {
      const it = ln.itemId && DB.get('items', ln.itemId);
      if (it && it.serialized && (ln.serials || []).length && ln.serials.length !== num(ln.qty)) return toast(`${it.name}: ${ln.serials.length} serial(s) for qty ${ln.qty}`, 'err');
    }
    if (d.lines.some(ln => { const it = ln.itemId && DB.get('items', ln.itemId); return it && it.serialized && !(ln.serials || []).length; }) && !confirmBox('Some serial-tracked items have no serial number. Warranty will not be tracked for them. Continue?')) return;
    let l = d.leadId ? DB.get('leads', d.leadId) : null;
    if (d.quick) {
      d.cust.phone = cleanPhone(d.cust.phone);
      if (!d.cust.name || !validPhone(d.cust.phone)) return toast('Enter customer name and valid 10-digit phone', 'err');
      d.customerId = await Leads.upsertCustomer({ name: d.cust.name, phone: d.cust.phone, address: d.cust.address, gstin: d.cust.gstin });
    }
    const t = calcTotals(d.lines, d.discount, d.interstate);
    const inv = { id: uid('in_'), no: DB.nextNo('invoices', `INV/${fyLabel(d.date)}/`), leadId: d.leadId, quoteId: d.quoteId, customerId: d.customerId, category: d.category, date: d.date, dueDate: d.dueDate,
      lines: d.lines, discount: t.discount, interstate: d.interstate, notes: d.notes, terms: d.terms, total: t.total, tax: round2(t.tax), payments: [], salesBy: d.salesBy, createdAt: Date.now(), createdBy: App.user.id };
    if (l) (l.advances || []).filter(a => !a.invoiceId).forEach(a => { a.invoiceId = inv.id; inv.payments.push({ id: a.id, date: a.date, amount: a.amount, mode: a.mode, ref: a.ref, by: a.by, advance: true }); });
    const pn = num($('#payNow') && $('#payNow').value);
    if (pn > 0) inv.payments.push({ id: uid('pa_'), date: d.date, amount: pn, mode: $('#payMode').value, ref: $('#payRef').value, by: App.user.id });
    await DB.put('invoices', inv);
    // stock & warranty
    for (const ln of inv.lines) {
      const it = ln.itemId && DB.get('items', ln.itemId); if (!it || it.service) continue;
      const issued = d.leadId ? sum(DB.where('stockMoves', m => m.leadId === d.leadId && m.itemId === it.id && m.type === 'issue'), m => m.qty) - sum(DB.where('stockMoves', m => m.leadId === d.leadId && m.itemId === it.id && m.type === 'return'), m => m.qty) : 0;
      const already = d.leadId ? sum(DB.where('stockMoves', m => m.leadId === d.leadId && m.itemId === it.id && m.type === 'sale' && m.invoiceId !== inv.id), m => m.qty) : 0;
      const fromIssued = Math.max(0, Math.min(num(ln.qty), issued - already));
      const serIssued = (ln.serials || []).filter(sn => (it.serials || []).some(s => s.sn === sn && s.status === 'issued'));
      serIssued.forEach(sn => { const s = it.serials.find(x => x.sn === sn); s.status = 'sold'; s.invoiceId = inv.id; });
      if (serIssued.length) await DB.put('items', it);
      const deduct = num(ln.qty) - fromIssued;
      await this.recordSale(it, deduct, (ln.serials || []).filter(sn => !serIssued.includes(sn)), inv, d.leadId, fromIssued);
      for (const sn of (ln.serials || [])) await DB.put('assets', { id: uid('as_'), customerId: inv.customerId, itemId: it.id, itemName: it.name, serial: sn, invoiceId: inv.id, saleDate: inv.date, warrantyEnd: addMonths(inv.date, it.warrantyMonths || 12), category: inv.category });
    }
    if (l) {
      await DB.put('leads', l);
      const p = CATS[l.category].path;
      if (p === 'project') await Leads.advanceTo(l, 'Invoiced', 'Invoice ' + inv.no);
      if (p === 'sales' && this.balance(inv) <= 0) await Leads.advanceTo(l, 'Paid', 'Invoice ' + inv.no + ' paid');
    }
    if (inv.quoteId) { const q = DB.get('quotes', inv.quoteId); if (q) { q.status = 'Accepted'; await DB.put('quotes', q); } }
    this.draft = null; toast('Invoice ' + inv.no + ' saved'); App.go('invoice/' + inv.id);
  },
  async recordSale(it, qty, serials, inv, leadId, fromIssued) {
    // log a sale move: stock reduces only for qty not already issued to the job
    it.stock = num(it.stock) - Math.max(0, qty);
    (serials || []).forEach(sn => { let s = (it.serials = it.serials || []).find(x => x.sn === sn); if (!s) { s = { sn }; it.serials.push(s); } s.status = 'sold'; s.invoiceId = inv.id; });
    await DB.put('items', it);
    await DB.put('stockMoves', { id: uid('sm_'), itemId: it.id, type: 'sale', qty: Math.max(0, qty) + fromIssued, serials, leadId, invoiceId: inv.id, note: `Invoice ${inv.no}${fromIssued ? ` (${fromIssued} already issued to job)` : ''}`, at: Date.now(), by: App.user.id });
  },

  /* ---------- view ---------- */
  view(el, id) {
    if (id === 'new') return this.editor(el);
    const i = DB.get('invoices', id); if (!i) { el.innerHTML = '<div class="empty">Invoice not found</div>'; return; }
    const c = cust(i.customerId);
    $('#pageTitle').textContent = 'Invoice ' + i.no;
    el.innerHTML = `<div class="row mb"><a class="btn sm" href="#billing">← Billing</a>${i.leadId && App.allowed('leads') ? `<a class="btn sm" href="#lead/${i.leadId}">Lead</a>` : ''}<a class="btn sm" href="#customer/${i.customerId}">Customer</a><span class="spacer"></span>
      <button class="btn" onclick="Billing.print('${id}')">🖨️ Print / PDF</button>
      ${this.balance(i) > 0 ? `<button class="btn wa" onclick="Billing.waPay('${id}')">Payment reminder</button><button class="btn primary" onclick="Billing.payForm('${id}')">+ Record payment</button>` : `<button class="btn wa" onclick="Billing.waPay('${id}')">Review request</button>`}</div>
    <div class="kpis">${kpi('Invoice total', inr(i.total))}${kpi('Received', inr(this.paid(i)), '', 'green')}${kpi('Balance', inr(this.balance(i)), this.overdue(i) ? this.overdue(i) + ' days overdue' : 'Due ' + fmtDate(i.dueDate), this.balance(i) > 0 ? 'red' : 'green')}</div>
    <div class="grid g-doc">
      <div class="card"><div class="doc">${this.docHTML(i)}</div></div>
      <div class="card"><h3 class="mb">Payments</h3>${(i.payments || []).length ? `<ul class="timeline">${i.payments.map(p => `<li><b>${inr(p.amount)}</b> · ${esc(p.mode)}${p.advance ? ' (advance)' : ''}<small>${fmtDate(p.date)} · ${esc(p.ref || '')} · ${esc(userName(p.by))}</small></li>`).join('')}</ul>` : '<div class="muted">No payments yet</div>'}</div>
    </div>`;
  },
  docHTML(i) {
    const c = cust(i.customerId);
    return Docs.render({ title: 'TAX INVOICE', meta: [['Invoice no', i.no], ['Date', fmtDate(i.date)], ['Due date', fmtDate(i.dueDate)]], customer: { name: c.name, phone: c.phone, address: `${c.address || ''} ${c.area || ''}`, gstin: c.gstin }, lines: i.lines, discount: i.discount, interstate: i.interstate, notes: i.notes, terms: i.terms, payments: i.payments });
  },
  print(id) { const i = DB.get('invoices', id); printPreview('Invoice ' + i.no, this.docHTML(i)); },
  payForm(id) {
    const i = DB.get('invoices', id);
    modal('Record payment — ' + i.no, `<form class="form-grid" onsubmit="Billing.savePay(event,'${id}')">
      ${field('Amount (₹)', inp('amount', this.balance(i), 'number', 'min="1" step="any" required'))}
      ${field('Mode', sel('mode', PAY_MODES))}${field('Date', inp('date', today(), 'date'))}${field('Reference / UTR / EMI no', inp('ref'))}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save payment</button></div></form>`);
  },
  async savePay(e, id) {
    e.preventDefault(); const d = formData(e.target), i = DB.get('invoices', id);
    if (num(d.amount) > this.balance(i) + 1 && !confirmBox('Amount is more than balance. Continue?')) return;
    i.payments.push({ id: uid('pa_'), date: d.date, amount: num(d.amount), mode: d.mode, ref: d.ref, by: App.user.id });
    await DB.put('invoices', i);
    const l = i.leadId && DB.get('leads', i.leadId);
    if (l && CATS[l.category].path === 'sales' && this.balance(i) <= 0) await Leads.advanceTo(l, 'Paid');
    closeModal(); toast('Payment recorded'); App.refresh();
  },
  advanceForm(leadId) {
    const l = DB.get('leads', leadId);
    modal('Advance received — ' + l.name, `<form class="form-grid" onsubmit="Billing.saveAdvance(event,'${leadId}')">
      ${field('Amount (₹)', inp('amount', '', 'number', 'min="1" required'))}${field('Mode', sel('mode', PAY_MODES))}${field('Date', inp('date', today(), 'date'))}${field('Reference / UTR', inp('ref'))}
      <div class="full muted">This amount is automatically adjusted when you create the invoice for this lead.</div>
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async saveAdvance(e, leadId) {
    e.preventDefault(); const d = formData(e.target), l = DB.get('leads', leadId);
    l.advances = l.advances || []; l.advances.push({ id: uid('pa_'), date: d.date, amount: num(d.amount), mode: d.mode, ref: d.ref, by: App.user.id });
    await DB.put('leads', l);
    if (CATS[l.category].path === 'project') await Leads.advanceTo(l, 'Advance paid', 'Advance ' + inr(d.amount));
    closeModal(); toast('Advance recorded'); App.refresh();
  },
  waPayItem(i) { const c = cust(i.customerId); return { key: 'payment', label: 'Payment reminder ' + i.no, data: { name: c.name, no: i.no, date: fmtDate(i.date), amount: inr(this.balance(i)) } }; },
  waPay(id) {
    const i = DB.get('invoices', id), c = cust(i.customerId), rv = { key: 'review', label: 'Review request', data: { name: c.name } };
    waPicker(c.whatsapp || c.phone, c.name, this.balance(i) > 0 ? [this.waPayItem(i), rv] : [rv]);
  },

  exportInvoices() { const rows = [['Invoice', 'Date', 'Customer', 'Phone', 'GSTIN', 'Category', 'Taxable', 'GST', 'Total', 'Paid', 'Balance', 'Due date', 'Days overdue', 'Salesperson']]; DB.all('invoices').forEach(i => { const c = cust(i.customerId); rows.push([i.no, i.date, c.name, c.phone, c.gstin || '', catLabel(i.category), round2(i.total - i.tax), i.tax, i.total, this.paid(i), this.balance(i), i.dueDate, this.overdue(i), userName(i.salesBy)]); }); downloadCSV('invoices-' + today(), rows); },
  exportDues() { const rows = [['Invoice', 'Customer', 'Phone', 'Date', 'Due date', 'Days overdue', 'Total', 'Paid', 'Balance']]; DB.all('invoices').filter(i => this.balance(i) > 0).forEach(i => { const c = cust(i.customerId); rows.push([i.no, c.name, c.phone, i.date, i.dueDate, this.overdue(i), i.total, this.paid(i), this.balance(i)]); }); downloadCSV('dues-' + today(), rows); },
  exportPayments() { const rows = [['Date', 'Customer', 'Invoice / advance', 'Mode', 'Reference', 'Amount', 'By']]; this.allPayments().forEach(p => { const c = p.invoice ? cust(p.invoice.customerId) : cust(p.lead.customerId); rows.push([p.date, c.name, p.invoice ? p.invoice.no : 'Advance', p.mode, p.ref || '', p.amount, userName(p.by)]); }); downloadCSV('payments-' + today(), rows); },
};
Pages.billing = { title: 'Billing & Dues', render: el => Billing.render(el) };
Pages.invoice = { title: 'Invoice', render: (el, a) => Billing.view(el, a[0]) };
