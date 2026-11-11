'use strict';
/* ===== Custom PC Builder & Configurator ===== */
const PCBuilder = {
  parts: {
    cpu: { name: 'Processor (CPU)', item: 'Intel Core i5-12400F (6 Cores, up to 4.4GHz)', cost: 9800 },
    mobo: { name: 'Motherboard', item: 'Gigabyte B760M DS3H AX DDR4 (Wi-Fi + BT)', cost: 11200 },
    ram: { name: 'Memory (RAM)', item: 'Corsair Vengeance LPX 16GB (8x2) DDR4 3200MHz', cost: 3600 },
    ssd: { name: 'Primary Storage (SSD)', item: 'WD Blue SN580 1TB M.2 NVMe Gen4 (Up to 4150MB/s)', cost: 5800 },
    hdd: { name: 'Secondary Storage (HDD)', item: 'None', cost: 0 },
    gpu: { name: 'Graphics Card (GPU)', item: 'Zotac Gaming GeForce RTX 4060 8GB GDDR6', cost: 28500 },
    psu: { name: 'Power Supply (SMPS)', item: 'DeepCool PK650D 650W 80 Plus Bronze', cost: 4200 },
    cooler: { name: 'CPU Cooler', item: 'DeepCool AG400 Single-Tower ARGB Cooler', cost: 1750 },
    case: { name: 'Cabinet / Chassis', item: 'Ant Esports ICE-112 Mid-Tower (4x ARGB Fans)', cost: 3100 },
    monitor: { name: 'Display / Monitor', item: 'Acer EK240Y 23.8" IPS 100Hz 1ms', cost: 6800 },
    kbm: { name: 'Keyboard & Mouse', item: 'Logitech MK215 Wireless Combo', cost: 1350 },
    ups: { name: 'UPS Backup', item: 'Artis 1000VA / 600W Line Interactive UPS', cost: 3800 },
    os: { name: 'Software / Antivirus', item: 'Windows 11 Pro + QuickHeal Total Security 1Yr', cost: 1500 },
  },
  marginPct: 12,
  labour: 1000,
  customer: { name: '', phone: '' },

  PRESETS: {
    office: {
      label: 'Office & Student PC (~₹24,000)',
      parts: {
        cpu: { item: 'Intel Core i3-12100 (Integrated UHD 730)', cost: 8400 },
        mobo: { item: 'Asus Prime H610M-E D4', cost: 6300 },
        ram: { item: 'Crucial 8GB DDR4 3200MHz', cost: 1700 },
        ssd: { item: 'Crucial P3 500GB NVMe M.2 SSD', cost: 3200 },
        hdd: { item: 'None', cost: 0 },
        gpu: { item: 'Integrated UHD Graphics', cost: 0 },
        psu: { item: 'Frontech 450W Standard SMPS', cost: 900 },
        cooler: { item: 'Intel Stock Cooler', cost: 0 },
        case: { item: 'Frontech Micro-ATX Standard Cabinet', cost: 1100 },
        monitor: { item: 'Frontech 19" HD LED Monitor', cost: 3400 },
        kbm: { item: 'Zebronics Wired Keyboard & Mouse Combo', cost: 450 },
        ups: { item: 'Frontech 600VA UPS', cost: 1950 },
        os: { item: 'Windows 11 Setup + Office Tools', cost: 500 }
      }
    },
    editing: {
      label: 'Mid-Range Gaming & 4K Video Editing (~₹75,000)',
      parts: {
        cpu: { item: 'AMD Ryzen 5 7600 (6 Cores, 12 Threads, 5.1GHz)', cost: 18200 },
        mobo: { item: 'MSI PRO B650M-A Wi-Fi DDR5', cost: 13900 },
        ram: { item: 'G.Skill Ripjaws S5 16GB DDR5 6000MHz', cost: 4800 },
        ssd: { item: 'Kingston KC3000 1TB Gen4 NVMe (7000MB/s)', cost: 7900 },
        hdd: { item: 'Seagate Barracuda 2TB 7200RPM HDD', cost: 5200 },
        gpu: { item: 'Gigabyte GeForce RTX 4060 Windforce OC 8GB', cost: 28900 },
        psu: { item: 'Cooler Master MWE 650 Bronze V2', cost: 5200 },
        cooler: { item: 'DeepCool AG400 Digital ARGB', cost: 2200 },
        case: { item: 'Galax Revolution 05 Mid Tower (4 Fans)', cost: 3800 },
        monitor: { item: 'LG Ultragear 24" IPS 144Hz Gaming Monitor', cost: 10500 },
        kbm: { item: 'Redragon RGB Gaming Keyboard & Mouse', cost: 2200 },
        ups: { item: 'Microtek 1000VA Line Interactive', cost: 4100 },
        os: { item: 'Windows 11 Pro + QuickHeal 1Yr', cost: 1500 }
      }
    }
  },

  render(el) {
    el.innerHTML = `
      <div class="row mb">
        <div>
          <h2>🖥️ Custom PC Builder &amp; Quotation Generator</h2>
          <small class="muted">Assemble custom desktop builds, check margins, and generate instant quotation / specs slip</small>
        </div>
        <span class="spacer"></span>
        <button class="btn" onclick="PCBuilder.loadPreset('office')">📋 Preset: Office PC</button>
        <button class="btn" onclick="PCBuilder.loadPreset('editing')">🎮 Preset: Gaming / Editing</button>
      </div>

      <div class="card mb">
        <div class="card-head"><h3>Customer Information (Optional)</h3></div>
        <div class="grid g2">
          ${field('Customer Name', inp('custName', this.customer.name, 'text', 'placeholder="Customer Name" oninput="PCBuilder.customer.name=this.value"'))}
          ${field('Customer Phone', inp('custPhone', this.customer.phone, 'tel', 'placeholder="10-digit Phone" oninput="PCBuilder.customer.phone=this.value"'))}
        </div>
      </div>

      <div class="grid g-doc">
        <div class="card">
          <div class="card-head">
            <h3>Component Configuration</h3>
            <span class="spacer"></span>
            <button class="btn sm" onclick="PCBuilder.reset()">Reset to Default</button>
          </div>
          <table class="tbl">
            <thead>
              <tr><th>Component</th><th>Selected Item Description</th><th class="num" style="width:120px">Cost (₹)</th></tr>
            </thead>
            <tbody>
              ${Object.entries(this.parts).map(([k, p]) => `
                <tr>
                  <td><b>${p.name}</b></td>
                  <td>
                    <input type="text" style="width:100%" value="${esc(p.item)}" onchange="PCBuilder.updateItem('${k}', this.value)">
                  </td>
                  <td class="num">
                    <input type="number" style="width:100px;text-align:right" value="${p.cost}" min="0" onchange="PCBuilder.updateCost('${k}', this.value)">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div>
          <div class="card" id="pcCalcCard">
            ${this.renderSummary()}
          </div>
        </div>
      </div>
    `;
  },

  renderSummary() {
    const rawCost = sum(Object.values(this.parts), p => p.cost);
    const marginAmt = Math.round(rawCost * (num(this.marginPct) / 100));
    const assemblyCost = num(this.labour);
    const subTotal = rawCost + marginAmt + assemblyCost;
    const gstAmt = Math.round(subTotal * 0.18);
    const grandTotal = subTotal + gstAmt;

    return `
      <div class="card-head"><h3>Pricing Summary</h3></div>
      <table class="noborder" style="width:100%;font-size:13.5px">
        <tr><td>Total Hardware Cost:</td><td class="r"><b>${inr(rawCost)}</b></td></tr>
        <tr>
          <td>Shop Margin (%):</td>
          <td class="r">
            <input type="number" style="width:70px;text-align:right" value="${this.marginPct}" min="0" max="100" onchange="PCBuilder.marginPct=this.value;PCBuilder.redrawSummary()"> %
          </td>
        </tr>
        <tr><td>Margin Profit:</td><td class="r ok" style="color:var(--ok)">+${inr(marginAmt)}</td></tr>
        <tr>
          <td>Assembly &amp; Testing:</td>
          <td class="r">
            <input type="number" style="width:80px;text-align:right" value="${this.labour}" min="0" onchange="PCBuilder.labour=this.value;PCBuilder.redrawSummary()">
          </td>
        </tr>
        <tr style="border-top:1px solid var(--line)"><td><b>Subtotal (Taxable):</b></td><td class="r"><b>${inr(subTotal)}</b></td></tr>
        <tr><td>GST (18%):</td><td class="r">${inr(gstAmt)}</td></tr>
        <tr style="border-top:2px solid var(--ink);font-size:16px">
          <td><b>Customer Price:</b></td>
          <td class="r" style="color:var(--brand)"><b>${inr(grandTotal)}</b></td>
        </tr>
      </table>

      <div class="mt" style="display:flex;flex-direction:column;gap:8px">
        <button class="btn primary" style="width:100%" onclick="PCBuilder.convertToQuote()">📝 Convert to Quotation</button>
        <button class="btn" style="width:100%" onclick="PCBuilder.printSpecSheet()">🖨️ Print Spec Sheet Slip</button>
      </div>
    `;
  },

  redrawSummary() {
    $('#pcCalcCard').innerHTML = this.renderSummary();
  },

  updateItem(k, val) {
    if (this.parts[k]) {
      this.parts[k].item = val.trim();
      this.redrawSummary();
    }
  },

  updateCost(k, val) {
    if (this.parts[k]) {
      this.parts[k].cost = num(val);
      this.redrawSummary();
    }
  },

  loadPreset(key) {
    const pre = this.PRESETS[key];
    if (!pre) return;
    Object.entries(pre.parts).forEach(([k, v]) => {
      if (this.parts[k]) {
        this.parts[k].item = v.item;
        this.parts[k].cost = v.cost;
      }
    });
    this.render($('#view'));
    toast(`Loaded preset: ${pre.label}`);
  },

  reset() {
    this.loadPreset('office');
  },

  async convertToQuote() {
    const lines = [];
    const factor = 1 + (num(this.marginPct) / 100);
    Object.values(this.parts).forEach(p => {
      if (p.cost > 0 && p.item !== 'None') {
        lines.push({
          name: `${p.name}: ${p.item}`,
          hsn: '8471',
          qty: 1,
          unit: 'nos',
          rate: Math.round(p.cost * factor),
          gst: 18
        });
      }
    });
    if (num(this.labour) > 0) {
      lines.push({
        name: 'System Assembly, Cable Management & Stress Testing Labour',
        hsn: '9987',
        qty: 1,
        unit: 'job',
        rate: num(this.labour),
        gst: 18
      });
    }

    // Create quotation object
    const qNo = DB.nextNo('quotes', 'Q-', 'no');
    const newQuote = {
      id: uid('qt_'),
      no: qNo,
      version: 1,
      date: today(),
      validDays: 15,
      customer: {
        name: this.customer.name || 'Walk-in Customer',
        phone: this.customer.phone || '',
        area: ''
      },
      title: 'Custom PC Assembly Quotation',
      category: 'laptop',
      lines,
      discount: 0,
      notes: 'Prices include 18% GST and manufacturer warranty on all components.',
      createdAt: Date.now()
    };
    await DB.put('quotes', newQuote);
    toast('Quotation created successfully!');
    App.go(`quote/${newQuote.id}`);
  },

  printSpecSheet() {
    const s = App.settings;
    const rawCost = sum(Object.values(this.parts), p => p.cost);
    const marginAmt = Math.round(rawCost * (num(this.marginPct) / 100));
    const subTotal = rawCost + marginAmt + num(this.labour);
    const grandTotal = subTotal + Math.round(subTotal * 0.18);

    const activeParts = Object.values(this.parts).filter(p => p.cost > 0 && p.item !== 'None');
    const qrSvg = QRCode.svg(`PC SPEC: Total ₹${grandTotal} | ${s.bizName}`, 100);

    const html = `
      ${Docs.header()}
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px">
        <div>
          <h2 style="margin:0;font-size:18px">CUSTOM PC CONFIGURATION SPECIFICATION</h2>
          <small>Tailored desktop workstation / gaming PC build proposal</small>
        </div>
        <div style="text-align:right">
          <b>Date: ${fmtDate(today())}</b><br>
          <small>Valid for 7 days</small>
        </div>
      </div>

      <table class="noborder" style="margin-bottom:10px">
        <tr>
          <td>
            ${this.customer.name ? `<b>Prepared for:</b> ${esc(this.customer.name)} (${esc(this.customer.phone)})` : '<b>Customer:</b> Valued Client'}
          </td>
          <td style="text-align:right">
            ${qrSvg}
          </td>
        </tr>
      </table>

      <table>
        <thead>
          <tr><th style="width:25%">Component</th><th>Brand &amp; Technical Specifications</th><th style="width:15%">Warranty</th></tr>
        </thead>
        <tbody>
          ${activeParts.map(p => `
            <tr>
              <td><b>${p.name}</b></td>
              <td>${esc(p.item)}</td>
              <td>${p.name.includes('Storage') || p.name.includes('Memory') ? '3-5 Years' : p.name.includes('Processor') || p.name.includes('Motherboard') || p.name.includes('Graphics') || p.name.includes('Power') ? '3 Years' : '1 Year'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top:14px;display:flex;justify-content:flex-end">
        <table class="noborder" style="width:320px;font-size:14px">
          <tr><td>Component Subtotal:</td><td class="r">${inr(subTotal)}</td></tr>
          <tr><td>GST (18% Tax):</td><td class="r">${inr(Math.round(subTotal * 0.18))}</td></tr>
          <tr style="border-top:2px solid #111;font-size:16px"><td><b>Total Price:</b></td><td class="r"><b>${inr(grandTotal)}</b></td></tr>
        </table>
      </div>

      <div style="font-size:11px;margin-top:16px;color:#444">
        <b>Terms &amp; Notes:</b><br>
        1. All components are 100% brand new, sealed pack with authorized Indian manufacturer warranty.<br>
        2. Free professional assembly, clean cable management, BIOS update, and OS installation included.<br>
        3. 50% advance along with order confirmation, balance on delivery.
      </div>

      <div class="sign" style="margin-top:20px">
        <div>Customer Approval</div>
        <div>For ${esc(s.bizName)}<br>Systems Specialist</div>
      </div>
    `;
    printPreview('Custom PC Spec Sheet', html);
  }
};
Pages.pcbuilder = { title: 'Custom PC Builder', render: el => PCBuilder.render(el) };
