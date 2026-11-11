'use strict';
/* ===== Dashboard (role aware) ===== */
const Dashboard = {
  render(el) {
    const me = App.user, r = me.role, t = today(), [mFrom] = rangePreset('month');
    const leads = Leads.visible();
    const due = leads.filter(l => l.status === 'open' && l.followUp && l.followUp <= t).sort((a, b) => a.followUp.localeCompare(b.followUp));
    const open = leads.filter(l => l.status === 'open');
    const invMonth = DB.where('invoices', i => i.date >= mFrom && (r !== 'sales' || i.salesBy === me.id));
    const collToday = sum(Billing.allPayments().filter(p => p.date === t), p => p.amount);
    const dues = DB.where('invoices', i => Billing.balance(i) > 0);
    const low = Inventory.lowStock();
    const ready = DB.where('jobcards', j => (DB.get('leads', j.leadId) || {}).stage === 'Ready');
    const renew = AMC.renewalsDue();
    const money = r !== 'sales';
    const greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

    let html = `<div class="row mb"><h2>${greet}, ${esc(me.name.split(' ')[0])} 👋</h2><span class="spacer"></span><span class="muted">${fmtDate(t)}</span></div>
    <div class="kpis">
      ${kpi("Today's follow-ups", due.length, due.filter(l => l.followUp < t).length + ' overdue', due.length ? 'amber' : '', "App.go('leads/due')")}
      ${kpi('Open jobs / deals', open.length, `${open.filter(l => l.score === 'hot').length} hot`, '', "App.go('pipeline')")}
      ${kpi(r === 'sales' ? 'My revenue (month)' : 'Revenue this month', inr(sum(invMonth, i => i.total)), invMonth.length + ' invoices', 'green')}
      ${money ? kpi('Collected today', inr(collToday), '', 'green', App.allowed('billing') ? "Billing.tab='payments';App.go('billing')" : '') : ''}
      ${money ? kpi('Pending dues', inr(sum(dues, i => Billing.balance(i))), dues.filter(i => Billing.overdue(i)).length + ' overdue', 'red', App.allowed('billing') ? "Billing.tab='dues';App.go('billing')" : '') : ''}
      ${money ? kpi('Low stock items', low.length, '', low.length ? 'red' : '', App.allowed('inventory') ? "Inventory.tab='items';Inventory.f.low=true;App.go('inventory')" : '') : ''}
    </div>`;

    if (r === 'sales') {
      const p = Perf.sales(me, mFrom, t);
      html += `<div class="card"><h3 class="mb">🎯 My target — ${MONTHS[new Date().getMonth()]}</h3><div class="row" style="flex-wrap:nowrap"><div class="progress" style="flex:1;height:14px"><span style="width:${Math.min(100, p.ach)}%"></span></div><b>${p.ach}%</b></div>
        <div class="muted mt">${inr(p.revenue)} of ${inr(p.target)} · ${p.leads} leads · ${p.calls} calls · ${p.won} won · conversion ${p.conv}%</div></div>`;
    }
    html += `<div class="grid g2">
      <div class="card"><div class="card-head"><h3>📞 Follow-ups due</h3>${App.allowed('leads') ? '<a class="btn sm" href="#leads/due">View all</a>' : ''}</div>
        ${due.slice(0, 8).map(l => `<div class="list-item"><div class="grow"><b><a href="#lead/${l.id}">${esc(l.name)}</a></b><small class="muted">${esc(CATS[l.category].label)} · ${esc(l.stage)} · ${l.followUp < t ? `<span style="color:var(--danger)">${daysBetween(l.followUp, t)}d overdue</span>` : 'today'}</small></div>
          ${scoreChip(l.score)}<a class="btn sm" href="tel:${esc(l.phone)}">📞</a><button class="btn sm wa" onclick="Leads.wa('${l.id}')">WA</button><button class="btn sm" onclick="Leads.callForm('${l.id}')">Log</button></div>`).join('') || '<div class="empty">No follow-ups due 🎉</div>'}</div>
      <div class="card"><h3 class="mb">🧭 Open jobs by status</h3>${Object.keys(PATHS).map(p => {
        const ls = open.filter(l => CATS[l.category].path === p); if (!ls.length) return '';
        return `<div class="mb"><b style="font-size:12.5px">${PATH_LABEL[p]}</b>${hbars(PATHS[p].map(s => ({ label: s, value: ls.filter(l => l.stage === s).length })).filter(x => x.value), v => v)}</div>`;
      }).join('') || '<div class="empty">No open jobs</div>'}</div>`;

    if (App.role('admin', 'frontdesk')) {
      html += `<div class="card"><div class="card-head"><h3>📦 Ready for delivery (${ready.length})</h3><a class="btn sm" href="#jobcards">Job cards</a></div>${ready.map(j => {
        const l = DB.get('leads', j.leadId), days = j.readyAt ? daysBetween(tsDate(j.readyAt), t) : 0;
        return `<div class="list-item"><div class="grow"><b><a href="#jobcard/${j.id}">${esc(j.no)} · ${esc(l.name)}</a></b><small class="muted">${esc(j.device)} ${esc(j.brand)} ${esc(j.model)} · ready ${days} day(s)</small></div>${days >= 30 ? badge('30+ days — not collected', 'red') : ''}<button class="btn sm wa" onclick="JobCards.waFor('${l.id}')">WA</button></div>`;
      }).join('') || '<div class="empty">Nothing waiting</div>'}</div>`;
    }
    if (App.role('admin', 'accounts', 'frontdesk')) {
      html += `<div class="card"><div class="card-head"><h3>⏰ Overdue payments</h3><a class="btn sm" href="#billing" onclick="Billing.tab='dues'">Due list</a></div>${dues.filter(i => Billing.overdue(i)).sort((a, b) => Billing.overdue(b) - Billing.overdue(a)).slice(0, 6).map(i => `<div class="list-item"><div class="grow"><b><a href="#invoice/${i.id}">${esc(cust(i.customerId).name)}</a></b><small class="muted">${esc(i.no)} · ${Billing.overdue(i)} days overdue</small></div><b>${inr(Billing.balance(i))}</b><button class="btn sm wa" onclick="Billing.waPay('${i.id}')">Remind</button></div>`).join('') || '<div class="empty">No overdue payments</div>'}</div>
        <div class="card"><div class="card-head"><h3>⚠️ Low stock</h3><a class="btn sm" href="#inventory">Inventory</a></div>${low.slice(0, 8).map(i => `<div class="list-item"><div class="grow"><b>${esc(i.name)}</b><small class="muted">min ${i.minStock}</small></div>${badge(i.stock + ' left', 'red')}</div>`).join('') || '<div class="empty">Stock is healthy</div>'}</div>
        <div class="card"><div class="card-head"><h3>🛡️ AMC renewals due</h3><a class="btn sm" href="#amc">AMC</a></div>${renew.slice(0, 6).map(a => `<div class="list-item"><div class="grow"><b>${esc(cust(a.customerId).name)}</b><small class="muted">${esc(a.title)} · ends ${fmtDate(a.end)}</small></div>${AMC.amcBadge(a)}<button class="btn sm wa" onclick="AMC.waAmc('${a.id}')">Remind</button></div>`).join('') || '<div class="empty">No renewals due</div>'}</div>`;
    }
    if (r === 'admin') {
      html += `<div class="card"><div class="card-head"><h3>📍 Technicians now</h3><a class="btn sm" href="#field">Field tracking</a></div>${users('technician').map(u => { const s = Field.techState(u); return `<div class="list-item"><span class="avatar">${initials(u.name)}</span><div class="grow"><b>${esc(u.name)}</b><small class="muted">${s.job ? esc(s.job.title) : ''} ${s.last ? '· ' + ago(s.last.at) : ''}</small></div><span><span class="dot ${s.cls}"></span>${esc(s.status)}</span></div>`; }).join('')}</div>`;
    }
    if (r === 'accounts') {
      const claims = DB.where('attendance', a => a.claimStatus === 'Pending' && a.out);
      html += `<div class="card"><div class="card-head"><h3>🛵 Travel claims pending</h3><a class="btn sm" href="#attendance">Attendance</a></div><div class="kpis">${kpi('Claims', claims.length)}${kpi('Amount', inr(sum(claims, a => a.claim)), '', 'amber')}</div></div>`;
    }
    el.innerHTML = html + '</div>';
  },
};
Pages.dashboard = { title: 'Dashboard', render: el => Dashboard.render(el) };
