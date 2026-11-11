'use strict';
/* ===== Customers & 360° profile ===== */
const Customers = {
  q: '',
  stats(c) {
    const inv = DB.where('invoices', i => i.customerId === c.id);
    return { leads: DB.where('leads', l => l.customerId === c.id), inv, value: sum(inv, i => i.total), due: sum(inv, i => Billing.balance(i)) };
  },
  render(el) {
    el.innerHTML = `<div class="row mb"><input type="search" id="cq" style="max-width:360px" placeholder="🔍 Name, phone, area…" value="${esc(this.q)}" oninput="Customers.q=this.value;Customers.draw()">
      <span class="spacer"></span><button class="btn" onclick="Customers.exportCSV()">⬇ CSV</button><button class="btn primary" onclick="Customers.form()">+ Customer</button></div><div id="cOut"></div>`;
    this.draw();
  },
  draw() {
    const q = this.q.toLowerCase();
    const list = DB.all('customers').filter(c => !q || `${c.name} ${c.phone} ${c.area} ${c.address}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    $('#cOut').innerHTML = `<div class="muted mb">${list.length} customers</div>` + table(['Customer', 'Area', 'Business lines', { t: 'Jobs', num: 1 }, { t: 'Lifetime value', num: 1 }, { t: 'Outstanding', num: 1 }], list.map(c => {
      const s = this.stats(c), cats = [...new Set(s.leads.map(l => l.category).concat(s.inv.map(i => i.category)))];
      return { attrs: `class="click" onclick="App.go('customer/${c.id}')"`, cells: [`<b>${esc(c.name)}</b><br><small>${esc(c.phone)}</small>`, esc(c.area || ''), cats.map(catChip).join(' ') || '—', s.leads.length, inr(s.value), s.due > 0 ? `<b style="color:var(--danger)">${inr(s.due)}</b>` : '—'] };
    }), { empty: 'No customers' });
  },
  form(id) {
    const c = id ? DB.get('customers', id) : {};
    modal(id ? 'Edit customer' : 'New customer', `<form class="form-grid" onsubmit="Customers.save(event,'${id || ''}')">
      ${field('Name *', inp('name', c.name, 'text', 'required'))}${field('Phone *', inp('phone', c.phone, 'tel', 'maxlength="10" required'))}${field('WhatsApp', inp('whatsapp', c.whatsapp, 'tel', 'maxlength="10"'))}
      ${field('Area', inp('area', c.area))}${field('GSTIN (business customers)', inp('gstin', c.gstin))}${field('Email', inp('email', c.email, 'email'))}
      ${field('Address', txt('address', c.address), 'full')}
      <div class="full modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">Save</button></div></form>`);
  },
  async save(e, id) {
    e.preventDefault(); const d = formData(e.target); d.phone = cleanPhone(d.phone); d.whatsapp = cleanPhone(d.whatsapp) || d.phone;
    if (!validPhone(d.phone)) return toast('Enter a valid 10-digit phone', 'err');
    const dup = DB.find('customers', x => x.phone === d.phone && x.id !== id);
    if (dup) return toast('Another customer already has this phone: ' + dup.name, 'err');
    const c = { ...(id ? DB.get('customers', id) : { id: uid('cu_'), createdAt: Date.now() }), ...d };
    await DB.put('customers', c); closeModal(); toast('Customer saved'); id ? App.refresh() : App.go('customer/' + c.id);
  },
  profile(el, id) {
    const c = DB.get('customers', id); if (!c) { el.innerHTML = '<div class="empty">Customer not found</div>'; return; }
    $('#pageTitle').textContent = c.name;
    const s = this.stats(c);
    const jcs = DB.where('jobcards', j => j.customerId === id), qs = DB.where('quotes', q => q.customerId === id);
    const tks = DB.where('tickets', t => t.customerId === id), amcs = DB.where('amcs', a => a.customerId === id), assets = DB.where('assets', a => a.customerId === id);
    const jobs = DB.where('fieldJobs', j => j.customerId === id), svs = DB.where('surveys', x => x.customerId === id);
    const devices = assets.map(a => ({ name: a.itemName, sn: a.serial, src: 'Purchased ' + fmtDate(a.saleDate), war: a.warrantyEnd }))
      .concat(jcs.map(j => ({ name: `${j.device} ${j.brand} ${j.model}`, sn: j.serial, src: 'Serviced (' + j.no + ')', war: '' })));
    // timeline
    const ev = [];
    s.leads.forEach(l => (l.history || []).forEach(h => ev.push({ at: h.at, t: `${CATS[l.category].icon} ${l.stage === h.stage && h.from === '' ? 'Enquiry' : 'Stage'}: <b>${esc(h.stage)}</b> — ${esc(CATS[l.category].label)}`, by: h.by, link: '#lead/' + l.id })));
    s.leads.forEach(l => (l.calls || []).forEach(k => ev.push({ at: k.at, t: `☎️ Call: ${esc(k.outcome)}${k.note ? ' — ' + esc(k.note) : ''}`, by: k.by })));
    qs.forEach(q => ev.push({ at: q.createdAt, t: `📝 Quotation ${esc(q.no)} v${q.version} — ${inr(Quotes.total(q))}`, by: q.createdBy, link: '#quote/' + q.id }));
    s.inv.forEach(i => { ev.push({ at: new Date(i.date + 'T12:00').getTime(), t: `🧾 Invoice ${esc(i.no)} — ${inr(i.total)}`, by: i.createdBy, link: '#invoice/' + i.id }); (i.payments || []).forEach(p => ev.push({ at: new Date(p.date + 'T13:00').getTime(), t: `💰 Payment ${inr(p.amount)} (${esc(p.mode)})`, by: p.by })); });
    jcs.forEach(j => ev.push({ at: j.createdAt, t: `🔧 Job card ${esc(j.no)} — ${esc(j.device)} ${esc(j.brand)}`, by: j.createdBy, link: '#jobcard/' + j.id }));
    tks.forEach(t => ev.push({ at: t.createdAt, t: `🎫 Complaint ${esc(t.no)}: ${esc(t.subject)} (${esc(t.status)})`, by: t.createdBy }));
    amcs.forEach(a => ev.push({ at: a.createdAt, t: `🛡️ AMC ${esc(a.no)} ${esc(a.title)} till ${fmtDate(a.end)}`, by: a.createdBy }));
    jobs.filter(j => j.completedAt).forEach(j => ev.push({ at: j.completedAt, t: `✅ ${esc(j.type)} completed by ${esc(userName(j.techId))}${j.completion && j.completion.rating ? ' · ' + '★'.repeat(j.completion.rating) : ''}`, by: j.techId }));
    svs.forEach(x => ev.push({ at: new Date(x.date + 'T10:00').getTime(), t: `📐 Site survey`, by: x.by, link: '#survey/' + x.id }));
    ev.sort((a, b) => b.at - a.at);

    el.innerHTML = `<div class="row mb"><a class="btn sm" href="#customers">← Customers</a><span class="spacer"></span>
      <a class="btn" href="tel:${esc(c.phone)}">📞 Call</a><button class="btn wa" onclick="Customers.wa('${id}')">WhatsApp</button><button class="btn" onclick="Customers.form('${id}')">✏️ Edit</button>
      ${App.allowed('leads') ? `<button class="btn primary" onclick="Leads.form(null,{name:Customers.v('${id}','name'),phone:Customers.v('${id}','phone'),whatsapp:Customers.v('${id}','whatsapp'),address:Customers.v('${id}','address'),area:Customers.v('${id}','area')})">+ New enquiry</button>` : ''}</div>
    <div class="card"><div class="card-head"><span class="avatar" style="width:44px;height:44px;font-size:16px">${initials(c.name)}</span><h2>${esc(c.name)}</h2></div>
      <div class="dl"><div><span>Phone</span><b>${esc(c.phone)}</b></div><div><span>WhatsApp</span><b>${esc(c.whatsapp || c.phone)}</b></div><div><span>Area</span><b>${esc(c.area || '—')}</b></div><div><span>Address</span><b>${esc(c.address || '—')}</b></div>${c.gstin ? `<div><span>GSTIN</span><b>${esc(c.gstin)}</b></div>` : ''}<div><span>Customer since</span><b>${fmtDate(tsDate(c.createdAt || Date.now()))}</b></div></div></div>
    <div class="kpis">${kpi('Lifetime value', inr(s.value), s.inv.length + ' invoices', 'green')}${kpi('Outstanding', inr(s.due), '', s.due > 0 ? 'red' : '')}${kpi('Enquiries / jobs', s.leads.length)}${kpi('Devices', devices.length)}${kpi('Open complaints', tks.filter(t => !['Resolved', 'Closed'].includes(t.status)).length)}</div>
    <div class="grid g2">
      <div class="card"><h3 class="mb">Enquiries & jobs (all categories)</h3>${table(['Category', 'Stage', 'Created', 'Assigned'], s.leads.sort((a, b) => b.createdAt - a.createdAt).map(l => ({ attrs: App.allowed('leads') ? `class="click" onclick="App.go('lead/${l.id}')"` : '', cells: [catChip(l.category), Leads.stageBadge(l), fmtDate(tsDate(l.createdAt)), esc(userName(l.assignedTo))] })), { empty: 'None', cards: false })}</div>
      <div class="card"><h3 class="mb">Devices & serial numbers</h3>${table(['Device', 'Serial', 'Source', 'Warranty'], devices.map(d => [esc(d.name), esc(d.sn || '—'), `<small>${esc(d.src)}</small>`, d.war ? (d.war < today() ? badge('Expired', 'red') : badge('till ' + fmtDate(d.war), 'green')) : '—']), { empty: 'No devices', cards: false })}</div>
      <div class="card"><h3 class="mb">Invoices</h3>${table(['Invoice', 'Date', { t: 'Total', num: 1 }, 'Status'], s.inv.map(i => ({ attrs: App.allowed('billing') ? `class="click" onclick="App.go('invoice/${i.id}')"` : '', cells: [esc(i.no), fmtDate(i.date), inr(i.total), Billing.statusBadge(i)] })), { empty: 'No invoices', cards: false })}</div>
      <div class="card"><h3 class="mb">Tickets & AMC</h3>
        ${table(['Ticket', 'Subject', 'Status'], tks.map(t => [esc(t.no), esc(t.subject), AMC.tBadge(t.status)]), { empty: 'No complaints', cards: false })}
        <div class="mt">${table(['AMC', 'Period', 'Status'], amcs.map(a => [esc(a.no) + '<br><small>' + esc(a.title) + '</small>', `${fmtDate(a.start)} – ${fmtDate(a.end)}`, AMC.amcBadge(a)]), { empty: 'No AMC', cards: false })}</div></div>
    </div>
    <div class="card"><h3 class="mb">Timeline</h3><ul class="timeline">${ev.slice(0, 80).map(e => `<li>${e.link ? `<a href="${e.link}">${e.t}</a>` : e.t}<small>${fmtDT(e.at)}${e.by ? ' · ' + esc(userName(e.by)) : ''}</small></li>`).join('') || '<li>No activity</li>'}</ul></div>`;
  },
  v(id, k) { return (DB.get('customers', id) || {})[k] || ''; },
  wa(id) {
    const c = DB.get('customers', id), items = [];
    DB.where('invoices', i => i.customerId === id && Billing.balance(i) > 0).forEach(i => items.push(Billing.waPayItem(i)));
    DB.where('jobcards', j => j.customerId === id).slice(-1).forEach(j => items.push(...JobCards.waItems(j)));
    DB.where('amcs', a => a.customerId === id && !a.renewedTo).forEach(a => items.push({ key: 'amc', label: 'AMC reminder', data: { name: c.name, item: a.title, date: fmtDate(a.end) } }));
    items.push({ key: 'review', label: 'Review request', data: { name: c.name } });
    waPicker(c.whatsapp || c.phone, c.name, items);
  },
  exportCSV() { const rows = [['Name', 'Phone', 'WhatsApp', 'Area', 'Address', 'GSTIN', 'Enquiries', 'Lifetime value', 'Outstanding']]; DB.all('customers').forEach(c => { const s = this.stats(c); rows.push([c.name, c.phone, c.whatsapp, c.area, c.address, c.gstin || '', s.leads.length, s.value, s.due]); }); downloadCSV('customers-' + today(), rows); },
};
Pages.customers = { title: 'Customers', render: el => Customers.render(el) };
Pages.customer = { title: 'Customer', render: (el, a) => Customers.profile(el, a[0]) };
