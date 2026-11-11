'use strict';
/* ===== Staff performance (sales & technicians) ===== */
const Perf = {
  f: { range: 'month', from: '', to: '' },
  range() { const f = this.f; if (f.range !== 'custom') [f.from, f.to] = rangePreset(f.range); return [f.from, f.to]; },
  months(from, to) { const a = new Date(from), b = new Date(to); return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1); },
  wonAt(l) {
    if (!Leads.isWon(l)) return null;
    const wi = Leads.stageIdx(l, WON_STAGE[Leads.path(l)]);
    const h = (l.history || []).find(x => Leads.stageIdx(l, x.stage) >= wi);
    return h ? h.at : l.createdAt;
  },
  sales(u, from, to) {
    const tsIn = ts => ts && inRange(tsDate(ts), from, to);
    const mine = DB.where('leads', l => l.assignedTo === u.id);
    const leads = mine.filter(l => tsIn(l.createdAt));
    const calls = sum(mine, l => (l.calls || []).filter(c => c.by === u.id && tsIn(c.at)).length);
    const quotes = DB.where('quotes', q => q.createdBy === u.id && inRange(q.date, from, to)).length;
    const won = mine.filter(l => tsIn(this.wonAt(l))).length;
    const revenue = sum(DB.where('invoices', i => i.salesBy === u.id && inRange(i.date, from, to)), i => i.total);
    const target = num(u.target) * this.months(from, to);
    const overdue = mine.filter(l => l.status === 'open' && l.followUp && l.followUp < today()).length;
    const lost = mine.filter(l => l.status === 'lost' && tsIn(l.lostAt)).length;
    return { u, leads: leads.length, calls, quotes, won, lost, conv: pct(won, leads.length), revenue, target, ach: pct(revenue, target), overdue };
  },
  tech(u, from, to) {
    const done = DB.where('fieldJobs', j => j.techId === u.id && j.completedAt && inRange(tsDate(j.completedAt), from, to));
    const onTime = done.filter(j => j.completedAt <= Field.dueAt(j)).length;
    const times = done.filter(j => j.startedAt).map(j => (j.completedAt - j.startedAt) / 3600000);
    const rated = done.filter(j => j.completion && j.completion.rating);
    const rework = DB.where('fieldJobs', j => j.reworkOf && inRange(tsDate(j.createdAt), from, to) && (DB.get('fieldJobs', j.reworkOf) || {}).techId === u.id).length;
    const bench = DB.where('jobcards', j => j.techId === u.id && j.deliveredAt && inRange(tsDate(j.deliveredAt), from, to)).length;
    return { u, done: done.length, onTime: pct(onTime, done.length), avg: times.length ? sum(times) / times.length : 0, rating: rated.length ? sum(rated, j => j.completion.rating) / rated.length : 0, ratedN: rated.length, rework, bench };
  },
  salesTable(rows) {
    return table(['Salesperson', { t: 'Leads', num: 1 }, { t: 'Calls', num: 1 }, { t: 'Quotes', num: 1 }, { t: 'Won', num: 1 }, { t: 'Conversion', num: 1 }, { t: 'Revenue', num: 1 }, 'Target achievement', { t: 'Overdue follow-ups', num: 1 }],
      rows.map(r => [`<b>${esc(r.u.name)}</b>`, r.leads, r.calls, r.quotes, r.won, r.conv + '%', inr(r.revenue),
        `<div class="row" style="flex-wrap:nowrap"><div class="progress" style="flex:1"><span style="width:${Math.min(100, r.ach)}%;background:${r.ach >= 100 ? 'var(--ok)' : r.ach >= 60 ? 'var(--accent)' : 'var(--danger)'}"></span></div><small class="nowrap">${r.ach}% of ${short(r.target)}</small></div>`,
        r.overdue ? `<b style="color:var(--danger)">${r.overdue}</b>` : 0]), { empty: 'No sales staff' });
  },
  techTable(rows) {
    return table(['Technician', { t: 'Field jobs done', num: 1 }, { t: 'Bench jobs delivered', num: 1 }, { t: 'On-time', num: 1 }, { t: 'Avg job time', num: 1 }, 'Customer rating', { t: 'Rework (30d)', num: 1 }],
      rows.map(r => [`<b>${esc(r.u.name)}</b>`, r.done, r.bench, r.done ? r.onTime + '%' : '—', r.avg ? r.avg.toFixed(1) + ' h' : '—', r.rating ? `<span style="color:#f59e0b">${'★'.repeat(Math.round(r.rating))}</span> ${r.rating.toFixed(1)} <small class="muted">(${r.ratedN})</small>` : '—', r.rework ? `<b style="color:var(--danger)">${r.rework}</b>` : 0]), { empty: 'No technicians' });
  },
  render(el) {
    const [from, to] = this.range(), f = this.f, me = App.user;
    let sales = users(['sales']).map(u => this.sales(u, from, to)), techs = users('technician').map(u => this.tech(u, from, to));
    if (me.role === 'sales') { sales = sales.filter(r => r.u.id === me.id); techs = []; }
    if (me.role === 'technician') { techs = techs.filter(r => r.u.id === me.id); sales = []; }
    el.innerHTML = `<div class="filters"><select style="width:auto" onchange="Perf.f.range=this.value;App.refresh()">${opts(RANGE_PRESETS.filter(x => x[0] !== 'today'), f.range)}</select>
      ${f.range === 'custom' ? `<input type="date" style="width:auto" value="${f.from}" onchange="Perf.f.from=this.value;App.refresh()"><input type="date" style="width:auto" value="${f.to}" onchange="Perf.f.to=this.value;App.refresh()">` : `<span class="muted">${fmtDate(from)} – ${fmtDate(to)}</span>`}
      <span class="spacer"></span>${App.isAdmin() ? '<button class="btn" onclick="Perf.exportCSV()">⬇ CSV</button>' : ''}</div>
      ${sales.length ? `<div class="card"><h3 class="mb">💼 Sales performance</h3>${this.salesTable(sales.sort((a, b) => b.revenue - a.revenue))}<div class="muted mt">Won = lead reached Advance paid / Estimate approved / Paid. Monthly targets are set in Settings → Users.</div></div>` : ''}
      ${techs.length ? `<div class="card"><h3 class="mb">🛠️ Technician performance</h3>${this.techTable(techs.sort((a, b) => b.done - a.done))}<div class="muted mt">On-time = completed before scheduled time + estimated hours. Rework = repeat complaint/service visit for the same customer within 30 days of your completed job.</div></div>` : ''}`;
  },
  exportCSV() {
    const [from, to] = this.range();
    const rows = [['Type', 'Name', 'Leads', 'Calls', 'Quotes', 'Won', 'Conversion %', 'Revenue', 'Target', 'Achievement %', 'Overdue follow-ups', 'Jobs done', 'On-time %', 'Avg hours', 'Rating', 'Rework']];
    users('sales').forEach(u => { const r = this.sales(u, from, to); rows.push(['Sales', u.name, r.leads, r.calls, r.quotes, r.won, r.conv, r.revenue, r.target, r.ach, r.overdue, '', '', '', '', '']); });
    users('technician').forEach(u => { const r = this.tech(u, from, to); rows.push(['Technician', u.name, '', '', '', '', '', '', '', '', '', r.done, r.onTime, r.avg.toFixed(1), r.rating.toFixed(1), r.rework]); });
    downloadCSV(`performance-${from}-to-${to}`, rows);
  },
};
Pages.performance = { title: 'Performance', render: el => Perf.render(el) };
