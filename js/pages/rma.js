'use strict';
/* ===== RMA & Brand / Vendor Warranty Tracker ===== */
const RMA = {
  f: { q: '', status: 'active' },
  BRANDS: ['Asus', 'Gigabyte', 'MSI', 'HP', 'Dell', 'Lenovo', 'Acer', 'Western Digital (WD)', 'Seagate', 'Kingston', 'Crucial', 'Corsair', 'CP Plus', 'Hikvision', 'Dahua', 'Zebronics', 'Frontech', 'Epson', 'Canon', 'Other'],
  STATUSES: ['Logged', 'Dispatched', 'In Process', 'Received', 'Delivered', 'Rejected'],

  render(el) {
    const f = this.f;
    el.innerHTML = `
      <div class="row mb">
        <div>
          <h2>🔁 RMA &amp; Brand Warranty Tracker</h2>
          <small class="muted">Track warranty claims sent to brand authorized service centers &amp; distributors</small>
        </div>
        <span class="spacer"></span>
        ${App.role('admin', 'frontdesk', 'technician') ? '<button class="btn primary" onclick="RMA.create()">+ New RMA Entry</button>' : ''}
      </div>
      <div class="filters">
        <input type="search" placeholder="🔍 Search RMA no, customer, phone, serial, brand, AWB…" value="${esc(f.q)}" oninput="RMA.f.q=this.value;RMA.draw()">
        <select onchange="RMA.f.status=this.value;RMA.draw()">
          ${opts([['active', 'Active (At brand / Pending)'], ['Logged', 'Logged (Not yet dispatched)'], ['Dispatched', 'Dispatched / In transit'], ['In Process', 'In Process at Brand'], ['Received', 'Received (Ready for customer)'], ['Delivered', 'Delivered / Closed'], ['Rejected', 'Rejected by brand'], ['all', 'All records']], f.status)}
        </select>
      </div>
      <div id="rmaStats" class="grid g4 mb"></div>
      <div id="rmaOut"></div>`;
    this.drawStats();
    this.draw();
  },

  drawStats() {
    const all = DB.all('rma');
    const atBrand = all.filter(r => ['Dispatched', 'In Process'].includes(r.status)).length;
    const ready = all.filter(r => r.status === 'Received').length;
    const pendingDisp = all.filter(r => r.status === 'Logged').length;
    const closed = all.filter(r => r.status === 'Delivered').length;
    $('#rmaStats').innerHTML = `
      ${kpi('Pending Dispatch', pendingDisp, 'Items waiting in shop', pendingDisp ? 'bad' : '')}
      ${kpi('At Brand Center', atBrand, 'Under testing / replacement', atBrand ? 'warn' : '')}
      ${kpi('Ready for Customer', ready, 'Replacement received', ready ? 'ok' : '')}
      ${kpi('Delivered to Customer', closed, 'Completed claims')}
    `;
  },

  draw() {
    const f = this.f, q = f.q.toLowerCase();
    const list = DB.all('rma').filter(r => {
      const hay = `${r.no} ${r.custName} ${r.phone} ${r.item} ${r.brand} ${r.serial} ${r.rmaNo || ''} ${r.courierAwb || ''} ${r.newSerial || ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (f.status === 'active') return !['Delivered', 'Rejected'].includes(r.status);
      if (f.status !== 'all') return r.status === f.status;
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);

    $('#rmaOut').innerHTML = table(
      ['RMA no', 'Date', 'Customer', 'Product & Brand', 'Original Serial', 'Brand / Center', 'Courier / RMA Ref', 'Status', 'Action'],
      list.map(r => {
        let stColor = 'grey';
        if (r.status === 'Logged') stColor = 'blue';
        if (r.status === 'Dispatched' || r.status === 'In Process') stColor = 'orange';
        if (r.status === 'Received') stColor = 'green';
        if (r.status === 'Rejected') stColor = 'red';

        return {
          attrs: `class="click" onclick="RMA.detail('${r.id}')"`,
          cells: [
            `<b>${esc(r.no)}</b>`,
            fmtDate(r.inwardDate),
            `${esc(r.custName)}<br><small>${esc(r.phone)}</small>`,
            `<b>${esc(r.brand)}</b> ${esc(r.item)}`,
            `<code>${esc(r.serial)}</code>`,
            `${esc(r.serviceCenter || r.brand)}<br><small class="muted">${r.city || ''}</small>`,
            `${r.rmaNo ? `<b>RMA:</b> ${esc(r.rmaNo)}<br>` : ''}${r.courierAwb ? `<small>AWB: ${esc(r.courierAwb)}</small>` : '—'}`,
            `<span class="badge ${stColor}">${esc(r.status)}</span>${r.newSerial ? `<br><small style="color:var(--ok)">New: ${esc(r.newSerial)}</small>` : ''}`,
            `<button class="btn sm" onclick="event.stopPropagation();RMA.wa('${r.id}')">💬 WA</button>`
          ]
        };
      }), { empty: 'No RMA records found' }
    );
  },

  create(leadId) {
    const l = leadId ? DB.get('leads', leadId) : null;
    modal('New RMA Entry — Send Item to Brand Center', `
      <form class="form-grid" onsubmit="RMA.save(event)">
        <div class="section-title">Customer Information</div>
        ${field('Customer Name *', inp('custName', l ? l.name : '', 'text', 'required'))}
        ${field('Customer Phone *', inp('phone', l ? l.phone : '', 'tel', 'maxlength="10" required'))}
        ${field('Customer Area', inp('area', l ? l.area : ''))}

        <div class="section-title">Faulty Hardware Details</div>
        ${field('Item / Product Name *', inp('item', '', 'text', 'placeholder="e.g. H610M Motherboard / 1TB SSD" required'))}
        ${field('Brand *', sel('brand', RMA.BRANDS, 'Asus'))}
        ${field('Serial Number *', inp('serial', '', 'text', 'placeholder="Serial no on component sticker" required'))}
        ${field('Original Purchase / Invoice Date', inp('purchaseDate', '', 'date'))}
        ${field('Reported Fault / Problem *', txt('fault', '', 'placeholder="No display, burnt smell, bad sectors..." required'), 'full')}

        <div class="section-title">Service Center &amp; Dispatch</div>
        ${field('Authorized Center / Vendor', inp('serviceCenter', '', 'text', 'placeholder="e.g. Kaizen Infoserve / RP tech / Digicomp"'))}
        ${field('City / Location', inp('city', 'Kochi', 'text'))}
        ${field('Dispatch Date', inp('dispatchDate', '', 'date'))}
        ${field('Courier / AWB / Docket No', inp('courierAwb', '', 'text', 'placeholder="Professional Courier / ST / DTDC AWB"'))}
        ${field('Brand RMA / Ticket Number', inp('rmaNo', '', 'text', 'placeholder="Ticket no from Asus/Gigabyte portal"'))}
        ${field('Status', sel('status', RMA.STATUSES, 'Logged'))}
        ${field('Internal Notes', txt('notes', '', 'placeholder="Estimated return, technician remarks"'), 'full')}

        <div class="modal-foot full">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn primary">Save RMA Record</button>
        </div>
      </form>
    `, { wide: true });
  },

  async save(e, editId) {
    e.preventDefault();
    const d = formData(e.target);
    let r = editId ? DB.get('rma', editId) : {
      id: uid('rma_'),
      no: DB.nextNo('rma', 'RMA-', 'no'),
      inwardDate: today(),
      createdAt: Date.now()
    };
    Object.assign(r, d);
    await DB.put('rma', r);
    closeModal();
    toast('RMA record saved');
    App.refresh();
  },

  detail(id) {
    const r = DB.get('rma', id);
    if (!r) return;
    modal(`RMA #${r.no} — ${r.brand} ${r.item}`, `
      <div class="grid g2 mb">
        <div class="card">
          <div class="card-head"><h3>Customer</h3></div>
          <div><b>${esc(r.custName)}</b></div>
          <div>Ph: ${esc(r.phone)}</div>
          <div>Area: ${esc(r.area || '—')}</div>
          <div class="mt">
            <button class="btn sm" onclick="RMA.wa('${r.id}')">💬 Send WhatsApp Update</button>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Product Details</h3></div>
          <div><b>Item:</b> ${esc(r.item)} (${esc(r.brand)})</div>
          <div><b>Serial No:</b> <code>${esc(r.serial)}</code></div>
          <div><b>Fault:</b> ${esc(r.fault)}</div>
          ${r.newSerial ? `<div class="mt ok" style="padding:6px;background:var(--ok-soft);border-radius:6px"><b>Replacement Serial:</b> <code>${esc(r.newSerial)}</code></div>` : ''}
        </div>
      </div>

      <div class="card mb">
        <div class="card-head"><h3>Service Center &amp; Courier Tracking</h3></div>
        <div class="grid g3">
          <div><b>Service Center:</b> ${esc(r.serviceCenter || '—')} (${esc(r.city || '—')})</div>
          <div><b>Brand RMA Ticket:</b> <code>${esc(r.rmaNo || 'Pending')}</code></div>
          <div><b>Courier AWB:</b> <code>${esc(r.courierAwb || '—')}</code></div>
          <div><b>Inward Date:</b> ${fmtDate(r.inwardDate)}</div>
          <div><b>Dispatch Date:</b> ${fmtDate(r.dispatchDate)}</div>
          <div><b>Current Status:</b> <span class="badge blue">${esc(r.status)}</span></div>
        </div>
        ${r.notes ? `<p class="mt"><b>Notes:</b> ${esc(r.notes)}</p>` : ''}
      </div>

      <form class="card" onsubmit="RMA.updateStatus(event, '${r.id}')">
        <div class="card-head"><h3>Update Status &amp; Replacement Details</h3></div>
        <div class="grid g3">
          ${field('Update Status', sel('status', RMA.STATUSES, r.status))}
          ${field('Brand RMA / Ticket No', inp('rmaNo', r.rmaNo || ''))}
          ${field('Courier AWB / Docket', inp('courierAwb', r.courierAwb || ''))}
          ${field('Replacement S/N (if new unit)', inp('newSerial', r.newSerial || '', 'text', 'placeholder="New serial provided by brand"'))}
          ${field('Return Date to Shop', inp('receivedDate', r.receivedDate || today(), 'date'))}
          ${field('Delivery Date to Customer', inp('deliveredDate', r.deliveredDate || '', 'date'))}
        </div>
        <div class="mt">
          <button class="btn primary">Update RMA Status</button>
          <button type="button" class="btn" onclick="RMA.print('${r.id}')">🖨️ Print Slip</button>
          <button type="button" class="btn danger" onclick="RMA.delete('${r.id}')">Delete</button>
        </div>
      </form>
    `, { wide: true });
  },

  async updateStatus(e, id) {
    e.preventDefault();
    const d = formData(e.target);
    const r = DB.get('rma', id);
    if (!r) return;
    Object.assign(r, d);
    await DB.put('rma', r);
    closeModal();
    toast('RMA status updated');
    App.refresh();
  },

  async delete(id) {
    if (!confirmBox('Delete this RMA record?')) return;
    await DB.del('rma', id);
    closeModal();
    toast('RMA deleted');
    App.refresh();
  },

  wa(id) {
    const r = DB.get('rma', id);
    if (!r) return;
    const s = App.settings;
    let msg = `Hello ${r.custName},\nUpdate regarding your ${r.brand} ${r.item} (S/N: ${r.serial}):\nStatus: *${r.status}*\n`;
    if (r.rmaNo) msg += `Brand RMA No: ${r.rmaNo}\n`;
    if (r.courierAwb) msg += `Courier Docket: ${r.courierAwb}\n`;
    if (r.status === 'Received') msg += `\nGood news! Your replacement/repaired component has arrived at our shop. You may collect it anytime.\n`;
    msg += `\nThank you,\n${s.bizName}\nPh: ${s.phone}`;
    window.open(`https://wa.me/91${cleanPhone(r.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  print(id) {
    const r = DB.get('rma', id), s = App.settings;
    const qrSvg = QRCode.svg(`RMA:${r.no}|SN:${r.serial}|${r.custName}`, 100);
    const html = `
      ${Docs.header()}
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px">
        <div>
          <h2 style="margin:0;font-size:18px">RMA &amp; BRAND WARRANTY INWARD SLIP</h2>
          <small>Acknowledgment for item accepted for manufacturer warranty claim</small>
        </div>
        <div style="text-align:right">
          <b>RMA No: ${esc(r.no)}</b><br>
          <small>Date: ${fmtDate(r.inwardDate)}</small>
        </div>
      </div>
      <table class="noborder" style="margin-bottom:12px">
        <tr>
          <td style="width:65%">
            <b>Customer Details:</b><br>
            Name: <b>${esc(r.custName)}</b><br>
            Phone: ${esc(r.phone)}<br>
            Area: ${esc(r.area || '—')}
          </td>
          <td style="text-align:right">
            ${qrSvg}
          </td>
        </tr>
      </table>
      <table>
        <tr><th>Product</th><th>Brand</th><th>Serial Number</th></tr>
        <tr>
          <td><b>${esc(r.item)}</b></td>
          <td>${esc(r.brand)}</td>
          <td><code>${esc(r.serial)}</code></td>
        </tr>
        <tr>
          <td colspan="3"><b>Reported Problem / Fault:</b><br>${esc(r.fault)}</td>
        </tr>
      </table>
      <div style="font-size:11px;margin-top:14px;color:#444">
        <b>Terms &amp; Conditions:</b><br>
        1. Warranty approval, repair or replacement is solely decided by the manufacturer/authorized service center.<br>
        2. Physical damage, burnt components, track cut, serial sticker tampered, or liquid ingress are strictly NOT covered under warranty.<br>
        3. Standard brand turn-around time is 7 to 21 working days depending on spare availability at the brand warehouse.<br>
        4. Please produce this original slip at the time of collecting your replaced/repaired product.
      </div>
      <div class="sign" style="margin-top:24px">
        <div>Customer Signature</div>
        <div>For ${esc(s.bizName)}<br>Authorized Signatory</div>
      </div>
    `;
    printPreview('RMA Slip ' + r.no, html);
  }
};
Pages.rma = { title: 'RMA / Brand Warranty', render: el => RMA.render(el) };
