'use strict';
/* ===== Daybook & Shop Expense Management ===== */
const Expenses = {
  tab: 'daybook', // 'daybook' | 'expenses'
  selDate: today(),
  f: { cat: '', mode: '', month: monthKey(today()) },
  CATS: ['Shop Rent', 'Electricity & Internet', 'Courier & Transport', 'Technician Petrol / Travel', 'Tea & Refreshments', 'Urgent Spares Purchase', 'Stationery & Printing', 'Shop Repairs & Maintenance', 'Staff Salary / Advance', 'Miscellaneous'],

  render(el) {
    el.innerHTML = `
      <div class="row mb">
        <div>
          <h2>📒 Daybook &amp; Shop Expenses</h2>
          <small class="muted">Daily cash register, shop expenditures, and cashier balance settlement</small>
        </div>
        <span class="spacer"></span>
        <button class="btn primary" onclick="Expenses.createExpense()">+ Record Expense</button>
      </div>
      <div class="tabs mb">
        <button class="${this.tab === 'daybook' ? 'on' : ''}" onclick="Expenses.switchTab('daybook')">📅 Daily Cash Register (Daybook)</button>
        <button class="${this.tab === 'expenses' ? 'on' : ''}" onclick="Expenses.switchTab('expenses')">💸 Expense Ledger &amp; Reports</button>
      </div>
      <div id="expenseContent"></div>
    `;
    if (this.tab === 'daybook') this.drawDaybook();
    else this.drawLedger();
  },

  switchTab(t) {
    this.tab = t;
    this.render($('#view'));
  },

  drawDaybook() {
    const d = this.selDate;
    // Calculate cash in from invoices & payments
    const allInvoices = DB.all('invoices');
    const cashInvoices = [];
    allInvoices.forEach(inv => {
      (inv.payments || []).forEach(p => {
        if (p.mode === 'Cash' && p.date === d) {
          cashInvoices.push({
            type: 'Invoice / Bill',
            ref: inv.no,
            party: inv.customer ? inv.customer.name : 'Counter Sale',
            amount: num(p.amount)
          });
        }
      });
    });

    // Expenses for this date with mode === 'Cash'
    const allExp = DB.all('expenses');
    const cashOut = allExp.filter(e => e.date === d && e.mode === 'Cash');
    const otherExp = allExp.filter(e => e.date === d && e.mode !== 'Cash');

    const totalCashIn = sum(cashInvoices, x => x.amount);
    const totalCashOut = sum(cashOut, x => x.amount);
    const totalDigitalExp = sum(otherExp, x => x.amount);

    // Opening cash balance from settings or stored
    const s = App.settings;
    const openingBalances = s.openingCash || {};
    const opening = num(openingBalances[d] || (s.defaultOpeningCash || 2000));
    const closingExpected = opening + totalCashIn - totalCashOut;

    $('#expenseContent').innerHTML = `
      <div class="card mb">
        <div class="card-head">
          <label><b>Select Date:</b> <input type="date" value="${d}" onchange="Expenses.selDate=this.value;Expenses.drawDaybook()"></label>
          <span class="spacer"></span>
          <button class="btn sm" onclick="Expenses.editOpeningCash('${d}', ${opening})">⚙️ Set Opening Cash (₹${opening})</button>
        </div>
        <div class="grid g4">
          ${kpi('Opening Cash', inr(opening), 'In cash drawer at start')}
          ${kpi('Cash In Today', inr(totalCashIn), `${cashInvoices.length} cash collections`, 'ok')}
          ${kpi('Cash Spent Today', inr(totalCashOut), `${cashOut.length} cash vouchers`, totalCashOut ? 'bad' : '')}
          ${kpi('Expected Drawer Cash', inr(closingExpected), 'Opening + In - Out', 'info')}
        </div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>💵 Cash Inflow Today</h3></div>
          ${table(['Source', 'Ref No', 'Customer / Details', { t: 'Amount', num: 1 }],
            cashInvoices.map(c => [c.type, c.ref, esc(c.party), inr(c.amount)]),
            { empty: 'No cash collected today' }
          )}
        </div>

        <div class="card">
          <div class="card-head"><h3>📤 Cash Expenses Today</h3></div>
          ${table(['Category', 'Paid To / Note', { t: 'Amount', num: 1 }, 'Action'],
            cashOut.map(e => [
              `<b>${esc(e.category)}</b>`,
              `${esc(e.paidTo || '—')}<br><small class="muted">${esc(e.note || '')}</small>`,
              inr(e.amount),
              `<button class="btn sm danger" onclick="Expenses.deleteExpense('${e.id}')">✕</button>`
            ]),
            { empty: 'No cash expenses today' }
          )}
        </div>
      </div>

      ${otherExp.length ? `
        <div class="card mt">
          <div class="card-head"><h3>💳 Digital / UPI / Bank Expenses Today</h3></div>
          ${table(['Category', 'Paid To', 'Payment Mode', 'Note', { t: 'Amount', num: 1 }, 'Action'],
            otherExp.map(e => [
              `<b>${esc(e.category)}</b>`,
              esc(e.paidTo || '—'),
              `<span class="badge blue">${esc(e.mode)}</span>`,
              esc(e.note || '—'),
              inr(e.amount),
              `<button class="btn sm danger" onclick="Expenses.deleteExpense('${e.id}')">✕</button>`
            ])
          )}
        </div>
      ` : ''}
    `;
  },

  drawLedger() {
    const f = this.f;
    const all = DB.all('expenses');
    const filtered = all.filter(e => {
      if (f.month && monthKey(e.date) !== f.month) return false;
      if (f.cat && e.category !== f.cat) return false;
      if (f.mode && e.mode !== f.mode) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));

    const totalSpent = sum(filtered, e => e.amount);
    const byCategory = groupBy(filtered, e => e.category);
    const catData = Object.entries(byCategory).map(([k, list]) => ({
      label: k,
      value: sum(list, x => x.amount)
    })).sort((a, b) => b.value - a.value);

    $('#expenseContent').innerHTML = `
      <div class="filters">
        <input type="month" value="${f.month}" onchange="Expenses.f.month=this.value;Expenses.drawLedger()">
        <select onchange="Expenses.f.cat=this.value;Expenses.drawLedger()">
          ${opts(this.CATS, f.cat, 'All Categories')}
        </select>
        <select onchange="Expenses.f.mode=this.value;Expenses.drawLedger()">
          ${opts(['Cash', 'UPI', 'Bank'], f.mode, 'All Modes')}
        </select>
      </div>

      <div class="grid g-doc mb">
        <div class="card">
          <div class="card-head"><h3>Monthly Expense Breakdown</h3><span class="spacer"></span><b>Total: ${inr(totalSpent)}</b></div>
          ${hbars(catData, v => inr(v))}
        </div>
        <div class="card">
          <div class="card-head"><h3>Summary Stats</h3></div>
          <div><b>Month:</b> ${f.month ? monthLabel(f.month) : 'All'}</div>
          <div><b>Total Vouchers:</b> ${filtered.length}</div>
          <div><b>Average Expense:</b> ${filtered.length ? inr(totalSpent / filtered.length) : '₹0'}</div>
          <div class="mt">
            <button class="btn sm" onclick="Expenses.exportCSV()">📥 Export Expenses to CSV</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>All Expense Vouchers</h3></div>
        ${table(
          ['Date', 'Category', 'Paid To', 'Mode', 'Description / Note', { t: 'Amount', num: 1 }, 'Action'],
          filtered.map(e => [
            fmtDate(e.date),
            `<b>${esc(e.category)}</b>`,
            esc(e.paidTo || '—'),
            `<span class="badge ${e.mode === 'Cash' ? 'green' : 'blue'}">${esc(e.mode)}</span>`,
            esc(e.note || '—'),
            `<b>${inr(e.amount)}</b>`,
            `<button class="btn sm danger" onclick="Expenses.deleteExpense('${e.id}')">✕</button>`
          ]),
          { empty: 'No expenses found for selected filters' }
        )}
      </div>
    `;
  },

  createExpense() {
    modal('Record New Expense', `
      <form class="form-grid" onsubmit="Expenses.saveExpense(event)">
        ${field('Expense Date *', inp('date', today(), 'date', 'required'))}
        ${field('Category *', sel('category', Expenses.CATS, 'Courier & Transport'))}
        ${field('Amount (₹) *', inp('amount', '', 'number', 'step="0.01" min="1" required autofocus'))}
        ${field('Payment Mode *', sel('mode', ['Cash', 'UPI', 'Bank'], 'Cash'))}
        ${field('Paid To (Person / Shop)', inp('paidTo', '', 'text', 'placeholder="e.g. DTDC, Swiggy, Fuel pump, Staff name"'))}
        ${field('Note / Description', txt('note', '', 'placeholder="Purpose of expense or voucher number"'), 'full')}
        <div class="modal-foot full">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn primary">Save Expense</button>
        </div>
      </form>
    `);
  },

  async saveExpense(e) {
    e.preventDefault();
    const d = formData(e.target);
    d.id = uid('exp_');
    d.amount = num(d.amount);
    d.createdAt = Date.now();
    await DB.put('expenses', d);
    closeModal();
    toast('Expense recorded');
    App.refresh();
  },

  async deleteExpense(id) {
    if (!confirmBox('Delete this expense voucher?')) return;
    await DB.del('expenses', id);
    toast('Expense deleted');
    App.refresh();
  },

  async editOpeningCash(date, cur) {
    const val = await promptModal('Daybook — Opening Cash', `Set opening cash balance for ${fmtDate(date)} (₹):`, cur, null, { type: 'number', step: '1', min: '0' });
    if (val === null) return;
    const n = num(val);
    App.settings.openingCash = App.settings.openingCash || {};
    App.settings.openingCash[date] = n;
    await App.saveSettings();
    toast('Opening cash updated');
    Expenses.drawDaybook();
  },

  exportCSV() {
    const list = DB.all('expenses');
    const rows = [['Date', 'Category', 'Paid To', 'Mode', 'Amount', 'Note']];
    list.forEach(e => rows.push([e.date, e.category, e.paidTo || '', e.mode, e.amount, e.note || '']));
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = u; a.download = `expenses-${today()}.csv`; a.click();
  }
};
Pages.expenses = { title: 'Daybook & Expenses', render: el => Expenses.render(el) };
