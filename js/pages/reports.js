'use strict';
/* ===== Reports ===== */
const Reports = {
  f: { range: 'fy', from: '', to: '', cat: '' },
  data() {
    const f = this.f; if (f.range !== 'custom') [f.from, f.to] = rangePreset(f.range);
    const catOk = c => !f.cat || c === f.cat, tsIn = ts => ts && inRange(tsDate(ts), f.from, f.to);
    const leads = DB.where('leads', l => catOk(l.category) && tsIn(l.createdAt));
    const inv = DB.where('invoices', i => catOk(i.category) && inRange(i.date, f.from, f.to));
    const pays = Billing.allPayments().filter(p => inRange(p.date, f.from, f.to) && catOk(p.invoice ? p.invoice.category : p.lead.category));
    const dues = DB.where('invoices', i => catOk(i.category) && Billing.balance(i) > 0);
    return { f, leads, inv, pays, dues, won: leads.filter(l => Leads.isWon(l)) };
  },
  render(el) {
    const d = this.data(), f = d.f;
    const amcRev = sum(DB.where('amcs', a => (!f.cat || a.category === f.cat) && inRange(a.start, f.from, f.to)), a => a.amount);
    // source vs conversion
    const src = SOURCES.map(s => { const ls = d.leads.filter(l => l.source === s), w = ls.filter(l => Leads.isWon(l)); return { s, n: ls.length, w: w.length, conv: pct(w.length, ls.length), rev: sum(DB.where('invoices', i => w.some(l => l.id === i.leadId)), i => i.total) }; }).filter(x => x.n);
    // revenue by category
    const byCat = Object.keys(CATS).map(k => ({ label: CATS[k].label, value: sum(d.inv.filter(i => i.category === k), i => i.total), color: CATS[k].color })).filter(x => !f.cat || x.value);
    // monthly trend: 12 months ending at range end
    const end = new Date(f.to + 'T00:00:00'), months = [];
    for (let k = 11; k >= 0; k--) { const m = new Date(end.getFullYear(), end.getMonth() - k, 1); months.push(isoDate(m).slice(0, 7)); }
    const trend = months.map(m => ({ label: MONTHS[+m.slice(5) - 1], value: sum(DB.where('invoices', i => (!f.cat || i.category === f.cat) && monthKey(i.date) === m), i => i.total) }));
    const funnel = [['Leads', d.leads.length], ['Contacted', d.leads.filter(l => Leads.isContacted(l)).length], ['Quoted', d.leads.filter(l => Leads.isQuoted(l)).length], ['Won', d.won.length]];
    const salesLb = users('sales').map(u => Perf.sales(u, f.from, f.to)).sort((a, b) => b.revenue - a.revenue);
    const techLb = users('technician').map(u => Perf.tech(u, f.from, f.to)).sort((a, b) => b.done - a.done || b.rating - a.rating);
    const lost = groupBy(d.leads.filter(l => l.status === 'lost'), l => l.lostReason);
    const renewals = AMC.renewalsDue();
    const rt = DB.where('jobcards', j => j.deliveredAt && inRange(tsDate(j.deliveredAt), f.from, f.to)).map(j => daysBetween(j.inwardDate, tsDate(j.deliveredAt)));
    el.innerHTML = `<div class="filters"><select style="width:auto" onchange="Reports.f.range=this.value;App.refresh()">${opts(RANGE_PRESETS, f.range)}</select>
      ${f.range === 'custom' ? `<input type="date" style="width:auto" value="${f.from}" onchange="Reports.f.from=this.value;App.refresh()"><input type="date" style="width:auto" value="${f.to}" onchange="Reports.f.to=this.value;App.refresh()">` : `<span class="muted">${fmtDate(f.from)} – ${fmtDate(f.to)}</span>`}
      <select style="width:auto" onchange="Reports.f.cat=this.value;App.refresh()">${opts(CAT_LIST, f.cat, 'All categories')}</select>
      <span class="spacer"></span><select style="width:auto" onchange="Reports.export(this.value);this.value=''">${opts([['leads', 'Leads'], ['invoices', 'Invoices'], ['payments', 'Payments'], ['dues', 'Pending dues'], ['source', 'Source vs conversion'], ['category', 'Revenue by category'], ['monthly', 'Monthly trend'], ['stock', 'Stock'], ['jobs', 'Field jobs'], ['amc', 'AMC'], ['performance', 'Staff performance']], '', '⬇ Export to Excel (CSV)…')}</select></div>
    <div class="kpis">${kpi('Revenue', inr(sum(d.inv, i => i.total)), d.inv.length + ' invoices', 'green')}${kpi('Collections', inr(sum(d.pays, p => p.amount)))}${kpi('New leads', d.leads.length)}${kpi('Conversion', pct(d.won.length, d.leads.length) + '%', d.won.length + ' won')}${kpi('Pending dues', inr(sum(d.dues, i => Billing.balance(i))), d.dues.length + ' invoices (all time)', 'red', "Billing.tab='dues';App.go('billing')")}${kpi('AMC sold', inr(amcRev))}${kpi('Repair turnaround', rt.length ? (sum(rt) / rt.length).toFixed(1) + ' days' : '—', rt.length + ' devices delivered')}</div>
    <div class="grid g2">
      <div class="card"><h3 class="mb">📈 Monthly revenue trend <small class="muted">(${monthLabel(months[0])} – ${monthLabel(months[11])})</small></h3>${columns(trend)}</div>
      <div class="card"><h3 class="mb">🏷️ Revenue by category</h3>${hbars(byCat, v => inr(v))}</div>
      <div class="card"><h3 class="mb">🎯 Lead source vs conversion</h3>${table(['Source', { t: 'Leads', num: 1 }, { t: 'Won', num: 1 }, { t: 'Conversion', num: 1 }, { t: 'Revenue', num: 1 }], src.sort((a, b) => b.n - a.n).map(x => [esc(x.s), x.n, x.w, `<b>${x.conv}%</b>`, inr(x.rev)]), { cards: false, empty: 'No leads in this period' })}
        <div class="mt">${hbars(src.map(x => ({ label: x.s, value: x.conv, extra: `${x.w}/${x.n}` })), v => v + '%')}</div></div>
      <div class="card"><h3 class="mb">🔻 Sales funnel</h3><div class="funnel">${funnel.map(([l, v], i) => `<div style="width:${Math.max(30, 100 - i * 20)}%;opacity:${1 - i * 0.12}">${l}: ${v}${i ? ` <small style="font-weight:400">(${pct(v, funnel[0][1])}%)</small>` : ''}</div>`).join('')}</div>
        ${Object.keys(lost).length ? `<h3 class="mt mb">Lost reasons</h3>${hbars(Object.entries(lost).map(([k, v]) => ({ label: k, value: v.length, color: '#ef4444' })).sort((a, b) => b.value - a.value))}` : ''}</div>
      <div class="card"><h3 class="mb">🏆 Salesperson leaderboard</h3>${table(['#', 'Name', { t: 'Revenue', num: 1 }, { t: 'Won', num: 1 }, { t: 'Target', num: 1 }], salesLb.map((r, i) => [['🥇', '🥈', '🥉'][i] || i + 1, esc(r.u.name), inr(r.revenue), r.won, r.ach + '%']), { cards: false })}</div>
      <div class="card"><h3 class="mb">🛠️ Technician leaderboard</h3>${table(['#', 'Name', { t: 'Jobs', num: 1 }, { t: 'On-time', num: 1 }, 'Rating', { t: 'Rework', num: 1 }], techLb.map((r, i) => [['🥇', '🥈', '🥉'][i] || i + 1, esc(r.u.name), r.done, r.done ? r.onTime + '%' : '—', r.rating ? '★ ' + r.rating.toFixed(1) : '—', r.rework]), { cards: false })}</div>
      <div class="card"><h3 class="mb">🛡️ AMC renewals due (30 days)</h3>${table(['AMC', 'Customer', 'Ends', ''], renewals.map(a => [esc(a.no) + '<br><small>' + esc(a.title) + '</small>', esc(cust(a.customerId).name), fmtDate(a.end) + '<br>' + AMC.amcBadge(a), `<button class="btn sm wa" onclick="AMC.waAmc('${a.id}')">Remind</button>`]), { cards: false, empty: 'No renewals due' })}</div>
      <div class="card"><h3 class="mb">⏰ Top pending dues</h3>${table(['Invoice', 'Customer', { t: 'Overdue', num: 1 }, { t: 'Balance', num: 1 }, ''], d.dues.sort((a, b) => Billing.overdue(b) - Billing.overdue(a)).slice(0, 10).map(i => [`<a href="#invoice/${i.id}">${esc(i.no)}</a>`, esc(cust(i.customerId).name), Billing.overdue(i) + ' d', inr(Billing.balance(i)), `<button class="btn sm wa" onclick="Billing.waPay('${i.id}')">Remind</button>`]), { cards: false, empty: 'No dues' })}</div>
    </div>`;
  },
  export(k) {
    if (!k) return; const d = this.data(), f = d.f, sfx = `${f.from}-to-${f.to}`;
    if (k === 'leads') { Leads.f = { q: '', cat: f.cat, src: '', score: '', status: 'all', who: '', fu: '' }; return Leads.exportCSV(); }
    if (k === 'invoices') return Billing.exportInvoices();
    if (k === 'payments') return Billing.exportPayments();
    if (k === 'dues') return Billing.exportDues();
    if (k === 'stock') return Inventory.exportCSV();
    if (k === 'amc') return AMC.exportAmc();
    if (k === 'performance') { Perf.f = { range: 'custom', from: f.from, to: f.to }; return Perf.exportCSV(); }
    if (k === 'source') { const rows = [['Source', 'Leads', 'Won', 'Conversion %']]; SOURCES.forEach(s => { const ls = d.leads.filter(l => l.source === s), w = ls.filter(l => Leads.isWon(l)).length; rows.push([s, ls.length, w, pct(w, ls.length)]); }); return downloadCSV('source-conversion-' + sfx, rows); }
    if (k === 'category') { const rows = [['Category', 'Invoices', 'Revenue', 'Tax']]; Object.keys(CATS).forEach(c => { const iv = d.inv.filter(i => i.category === c); rows.push([CATS[c].label, iv.length, sum(iv, i => i.total), sum(iv, i => i.tax)]); }); return downloadCSV('revenue-by-category-' + sfx, rows); }
    if (k === 'monthly') { const g = groupBy(DB.all('invoices').filter(i => !f.cat || i.category === f.cat), i => monthKey(i.date)); const rows = [['Month', 'Invoices', 'Revenue']]; Object.keys(g).sort().forEach(m => rows.push([monthLabel(m), g[m].length, sum(g[m], i => i.total)])); return downloadCSV('monthly-revenue', rows); }
    if (k === 'jobs') { const rows = [['Job', 'Type', 'Title', 'Customer', 'Date', 'Technician', 'Status', 'Completed', 'Rating', 'Repeat visit']]; DB.all('fieldJobs').forEach(j => rows.push([j.no, j.type, j.title, cust(j.customerId).name, j.date, userName(j.techId), j.status, j.completedAt ? fmtDT(j.completedAt) : '', (j.completion || {}).rating || '', j.reworkOf ? 'Yes' : ''])); return downloadCSV('field-jobs', rows); }
  },
};
Pages.reports = { title: 'Reports', render: el => Reports.render(el) };
