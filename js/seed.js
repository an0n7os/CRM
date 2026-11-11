'use strict';
/* ===== Realistic sample data (dates are relative to today, so it always looks current) ===== */
const Seed = {
  defaultSettings() {
    return {
      id: 'settings', bizName: 'CRM', address: '1st Floor, Mather Square, Edappally, Kochi, Kerala 682024',
      phone: '9000000000', email: 'info@example.com', website: '', gstin: '32ABCDE1234F1Z5',
      bank: 'State Bank of India · A/c 00000000000 · IFSC SBIN0000000 · Edappally branch', upi: 'yourshop@upi', reviewLink: 'https://g.page/r/your-review-link',
      kmRate: 4, quotePrefix: 'Q-', demoHint: true, logo: '',
      quoteTerms: '1. Prices are exclusive of GST unless stated; GST extra as shown.\n2. 50% advance with order, balance on completion.\n3. Warranty as per manufacturer. Installation warranty 1 year.\n4. Civil work, scaffolding and extra cable beyond quote will be charged at actuals.\n5. Quote valid for 15 days.',
      invoiceTerms: 'Goods once sold will not be taken back. Warranty claims as per manufacturer terms. Interest @18% p.a. on payments delayed beyond due date. Subject to Ernakulam jurisdiction.',
      jobTerms: 'We are not responsible for data loss — please take a backup. Estimate will be shared after diagnosis; repair starts only after your approval. Devices not collected within 60 days of intimation will be disposed. Diagnosis charge ₹300 if estimate is rejected.',
      wa: { ...DEFAULT_WA },
    };
  },
  async load() {
    const d = this.build();
    for (const [s, arr] of Object.entries(d)) if (arr.length) await DB.bulk(s, arr);
  },
  build() {
    let sd = 20261015; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    const pick = a => a[Math.floor(rnd() * a.length)], ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const NOW = Date.now(), D = n => addDays(today(), n);
    const T = (n, h = 10, m = 0) => { const x = new Date(); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + n); x.setHours(h, m, 0, 0); return Math.min(x.getTime(), NOW - 60000); };
    const p4 = n => String(n).padStart(4, '0');
    const base = { lat: 10.0261, lng: 76.3125 };
    const G = () => ({ lat: +(base.lat + (rnd() - 0.5) * 0.16).toFixed(6), lng: +(base.lng + (rnd() - 0.5) * 0.16).toFixed(6), acc: ri(5, 25) });
    const O = { meta: [this.defaultSettings()], users: [], customers: [], leads: [], jobcards: [], surveys: [], items: [], stockMoves: [], vendors: [], purchases: [], quotes: [], invoices: [], assets: [], amcs: [], tickets: [], fieldJobs: [], attendance: [], packages: [], rma: [], expenses: [], licenses: [] };

    /* ---------- users ---------- */
    O.users = [
      ['u_admin', 'Ajith Kumar', 'admin', '1111', 0], ['u_s1', 'Anjali Nair', 'sales', '2222', 400000], ['u_s2', 'Rahul Menon', 'sales', '2323', 300000],
      ['u_fd', 'Fathima Rasheed', 'frontdesk', '3333', 0], ['u_t1', 'Bijo Thomas', 'technician', '4444', 0], ['u_t2', 'Suresh Babu', 'technician', '4545', 0],
      ['u_t3', 'Nikhil Das', 'technician', '4646', 0], ['u_acc', 'Meera Pillai', 'accounts', '5555', 0],
    ].map(([id, name, role, pin, target], i) => ({ id, name, role, pin, target, phone: '90000001' + String(i + 1).padStart(2, '0'), active: true }));

    /* ---------- items ---------- */
    // id, name, cat, hsn, unit, rate, gst, stock, min, serialPrefix, warrantyMonths, kind
    const IT = [
      ['it_dome', 'Hikvision 2MP HD Dome Camera', 'cctv', '8525', 'nos', 1450, 18, 26, 10, 'HKD24', 24],
      ['it_bullet', 'Hikvision 2MP HD Bullet Camera', 'cctv', '8525', 'nos', 1650, 18, 20, 10, 'HKB24', 24],
      ['it_ipcam', 'CP Plus 4MP IP Bullet Camera (PoE)', 'cctv', '8525', 'nos', 3200, 18, 9, 4, 'CPI4M', 24],
      ['it_dvr4', 'Hikvision 4CH DVR', 'cctv', '8521', 'nos', 3400, 18, 6, 2, 'DV4H', 24],
      ['it_dvr8', 'Hikvision 8CH DVR', 'cctv', '8521', 'nos', 5200, 18, 4, 2, 'DV8H', 24],
      ['it_dvr16', 'Hikvision 16CH DVR', 'cctv', '8521', 'nos', 9800, 18, 1, 2, 'D16H', 24],
      ['it_nvr8', 'CP Plus 8CH NVR', 'cctv', '8521', 'nos', 6800, 18, 3, 1, 'NV8C', 24],
      ['it_hdd1', 'WD Purple 1TB Surveillance HDD', 'cctv', '8471', 'nos', 4200, 18, 7, 3, 'WP1T', 36],
      ['it_hdd2', 'WD Purple 2TB Surveillance HDD', 'cctv', '8471', 'nos', 5900, 18, 3, 2, 'WP2T', 36],
      ['it_poe', 'TP-Link 8-port PoE Switch', 'cctv', '8517', 'nos', 3900, 18, 3, 1, 'POE8', 24],
      ['it_smps', 'CCTV SMPS Power Supply', 'cctv', '8504', 'nos', 950, 18, 8, 3, '', 12],
      ['it_conn', 'BNC & DC Connector set', 'cctv', '8536', 'nos', 15, 18, 300, 100, '', 0],
      ['it_cable', 'CCTV Cable 3+1 copper (per m)', 'cctv', '8544', 'm', 28, 18, 900, 300, '', 0, 'cable'],
      ['it_labcctv', 'CCTV installation labour (per camera)', 'cctv', '9987', 'nos', 500, 18, 0, 0, '', 0, 'labour'],
      ['it_sw4', 'Smart Touch Switch 4-gang Wi-Fi', 'automation', '8536', 'nos', 3800, 18, 14, 5, '', 12],
      ['it_curt', 'Smart Curtain Motor with track', 'automation', '8501', 'nos', 9500, 18, 2, 3, 'SCM', 12],
      ['it_lock', 'Smart Door Lock (fingerprint + app)', 'automation', '8301', 'nos', 14500, 18, 4, 2, 'SDL', 12],
      ['it_ir', 'Smart IR Remote Hub', 'automation', '8517', 'nos', 1800, 18, 9, 3, '', 12],
      ['it_echo', 'Amazon Echo Dot (5th Gen)', 'automation', '8518', 'nos', 4499, 18, 5, 2, 'ECO5', 12],
      ['it_labauto', 'Automation installation & programming', 'automation', '9987', 'job', 2500, 18, 0, 0, '', 0, 'labour'],
      ['it_dell', 'Dell Inspiron 15 (i5 13th Gen, 16GB, 512GB SSD)', 'laptop', '8471', 'nos', 58500, 18, 5, 2, 'DLI15', 12],
      ['it_hp15', 'HP 15s (Ryzen 5, 8GB, 512GB SSD)', 'laptop', '8471', 'nos', 46990, 18, 4, 2, 'HP15S', 12],
      ['it_len', 'Lenovo IdeaPad Slim 3 (i3, 8GB, 512GB SSD)', 'laptop', '8471', 'nos', 38990, 18, 1, 2, 'LNIP3', 12],
      ['it_acer', 'Acer Aspire 7 Gaming (i5, RTX 3050)', 'laptop', '8471', 'nos', 67990, 18, 2, 1, 'ACA7', 12],
      ['it_desk', 'HP Desktop i5 Tower + 22" Monitor', 'laptop', '8471', 'nos', 52000, 18, 3, 1, 'HPDT', 12],
      ['it_kbm', 'Logitech MK270 Wireless Keyboard & Mouse', 'laptop', '8471', 'nos', 1695, 18, 15, 5, '', 12],
      ['it_mon', 'HP 22" FHD Monitor', 'laptop', '8528', 'nos', 9200, 18, 6, 2, 'HPM22', 36],
      ['it_prn', 'Epson EcoTank L3250 Printer', 'laptop', '8443', 'nos', 14999, 18, 3, 1, 'EPL32', 12],
      ['it_rtr', 'TP-Link Archer C6 Wi-Fi Router', 'laptop', '8517', 'nos', 2799, 18, 7, 3, '', 24],
      ['it_ssdx', 'SanDisk 1TB Portable SSD', 'laptop', '8523', 'nos', 7499, 18, 4, 2, 'SDX1T', 36],
      ['it_labsetup', 'Laptop setup, OS & data transfer', 'laptop', '9987', 'job', 800, 18, 0, 0, '', 0, 'labour'],
      ['it_kbd', 'Laptop Keyboard (HP/Dell compatible)', 'chip', '8473', 'nos', 1800, 18, 6, 3, '', 3],
      ['it_bat', 'Laptop Battery (OEM compatible)', 'chip', '8507', 'nos', 3200, 18, 4, 2, '', 6],
      ['it_ic', 'Charging / Power IC', 'chip', '8542', 'nos', 650, 18, 12, 5, '', 0],
      ['it_scr', 'Laptop Screen 15.6" FHD', 'chip', '8473', 'nos', 5200, 18, 2, 3, '', 6],
      ['it_ram', 'DDR4 8GB Laptop RAM', 'chip', '8473', 'nos', 2400, 18, 8, 3, '', 36],
      ['it_nvme', 'NVMe SSD 512GB', 'chip', '8523', 'nos', 3600, 18, 9, 3, '', 36],
      ['it_hinge', 'Laptop Hinge set', 'chip', '8473', 'nos', 900, 18, 5, 2, '', 0],
      ['it_labchip', 'Chip-level service charge', 'chip', '9987', 'job', 1500, 18, 0, 0, '', 0, 'labour'],
      ['it_panel', 'Waaree 540W Mono PERC Solar Panel', 'solar', '8541', 'nos', 15500, 5, 34, 10, 'WR540', 120],
      ['it_inv1', 'Growatt 1kW On-grid Inverter', 'solar', '8504', 'nos', 24000, 5, 2, 1, 'GW1K', 60],
      ['it_inv3', 'Growatt 3kW On-grid Inverter', 'solar', '8504', 'nos', 38000, 5, 3, 1, 'GW3K', 60],
      ['it_inv5', 'Growatt 5kW On-grid Inverter', 'solar', '8504', 'nos', 56000, 5, 1, 1, 'GW5K', 60],
      ['it_hyb', 'Luminous 3kVA Hybrid Inverter + Battery set', 'solar', '8504', 'set', 82000, 5, 1, 1, 'LUMH3', 24],
      ['it_struct', 'Solar mounting structure (per kW)', 'solar', '7308', 'kW', 6500, 18, 20, 5, '', 60],
      ['it_dccable', 'Solar DC Cable 4 sq mm (per m)', 'solar', '8544', 'm', 65, 18, 650, 200, '', 0, 'cable'],
      ['it_acdb', 'ACDB / DCDB set', 'solar', '8537', 'set', 6500, 18, 5, 2, '', 12],
      ['it_earth', 'Earthing kit (chemical)', 'solar', '8538', 'set', 3500, 18, 6, 2, '', 0],
      ['it_labsolar', 'Solar installation & KSEB net-meter work (per kW)', 'solar', '9987', 'kW', 5000, 18, 0, 0, '', 0, 'labour'],
    ];
    const I = {}; const serN = {};
    IT.forEach(([id, name, category, hsn, unit, rate, gst, stock, minStock, sp, warrantyMonths, kind]) => {
      const it = { id, name, category, hsn, unit, rate, gst, stock, minStock, serialized: !!sp, service: kind === 'labour', kind: kind || '', warrantyMonths, purchaseRate: Math.round(rate * 0.78), serials: [], sp };
      if (it.service) { it.stock = 0; it.minStock = 0; }
      serN[id] = 100;
      if (sp) for (let k = 0; k < stock; k++) it.serials.push({ sn: sp + String(++serN[id]).padStart(5, '0'), status: 'in' });
      I[id] = it; O.items.push(it);
    });
    const newSerials = (it, n, invId) => { const out = []; for (let k = 0; k < n; k++) { const sn = it.sp + String(++serN[it.id] + 500).padStart(5, '0'); it.serials.push({ sn, status: 'sold', invoiceId: invId }); out.push(sn); } return out; };
    const L = (id, qty, rate) => ({ itemId: id, name: I[id].name, hsn: I[id].hsn, qty, unit: I[id].unit, rate: rate ?? I[id].rate, gst: I[id].gst, serials: [] });

    /* ---------- packages ---------- */
    const PK = [
      ['pk_c4', 'CCTV 4 Camera HD package', 'cctv', 4, [['it_dome', 2], ['it_bullet', 2], ['it_dvr4', 1], ['it_hdd1', 1], ['it_smps', 1], ['it_cable', 90], ['it_conn', 16], ['it_labcctv', 4]]],
      ['pk_c8', 'CCTV 8 Camera HD package', 'cctv', 8, [['it_dome', 4], ['it_bullet', 4], ['it_dvr8', 1], ['it_hdd1', 1], ['it_smps', 1], ['it_cable', 180], ['it_conn', 32], ['it_labcctv', 8]]],
      ['pk_c16', 'CCTV 16 Camera HD package', 'cctv', 16, [['it_dome', 8], ['it_bullet', 8], ['it_dvr16', 1], ['it_hdd2', 1], ['it_smps', 2], ['it_cable', 350], ['it_conn', 64], ['it_labcctv', 16]]],
      ['pk_s1', 'Solar 1 kW On-grid package', 'solar', 1, [['it_panel', 2], ['it_inv1', 1], ['it_struct', 1], ['it_dccable', 30], ['it_acdb', 1], ['it_earth', 1], ['it_labsolar', 1]]],
      ['pk_s3', 'Solar 3 kW On-grid package', 'solar', 3, [['it_panel', 6], ['it_inv3', 1], ['it_struct', 3], ['it_dccable', 50], ['it_acdb', 1], ['it_earth', 1], ['it_labsolar', 3]]],
      ['pk_s5', 'Solar 5 kW On-grid package', 'solar', 5, [['it_panel', 10], ['it_inv5', 1], ['it_struct', 5], ['it_dccable', 70], ['it_acdb', 1], ['it_earth', 2], ['it_labsolar', 5]]],
      ['pk_a3', 'Smart Home Basic (3 rooms)', 'automation', 3, [['it_sw4', 3], ['it_ir', 1], ['it_echo', 1], ['it_labauto', 1]]],
      ['pk_lap', 'Laptop + essentials bundle', 'laptop', 1, [['it_hp15', 1], ['it_kbm', 1], ['it_labsetup', 1]]],
    ];
    O.packages = PK.map(([id, name, category, size, lines]) => ({ id, name, category, size, lines: lines.map(([itemId, qty]) => ({ itemId, qty })) }));
    const pkLines = id => PK.find(p => p[0] === id)[4].map(([i, q]) => L(i, q));

    /* ---------- vendors & purchases ---------- */
    O.vendors = [
      { id: 've_1', name: 'Kochi CCTV Distributors', phone: '9000020001', gstin: '32AAACK1234L1Z2', supplies: 'CCTV, DVR, HDD, cable', address: 'Kaloor, Kochi' },
      { id: 've_2', name: 'Southern IT Mart', phone: '9000020002', gstin: '32AABCS5678M1Z9', supplies: 'Dell, HP, Lenovo laptops', address: 'Palarivattom, Kochi' },
      { id: 've_3', name: 'Sunpower Solar Wholesale', phone: '9000020003', gstin: '32AADCS9012N1Z4', supplies: 'Panels, inverters, structure', address: 'Kalamassery, Kochi' },
      { id: 've_4', name: 'Malabar Electronics Spares', phone: '9000020004', gstin: '32AAFCM3456P1Z7', supplies: 'Laptop spares, ICs', address: 'Broadway, Kochi' },
    ];
    [['ve_1', 'KCD/2026/1184', -40, true, [['it_dome', 20, 1050], ['it_bullet', 20, 1200], ['it_dvr8', 3, 4000], ['it_hdd1', 6, 3300]]],
    ['ve_3', 'SPW-3381', -25, true, [['it_panel', 30, 11800], ['it_inv3', 2, 30500], ['it_struct', 10, 5000]]],
    ['ve_2', 'SITM/0921', -18, true, [['it_dell', 3, 48500], ['it_hp15', 3, 39000]]],
    ['ve_4', 'MES-552', -7, false, [['it_ic', 10, 320], ['it_kbd', 5, 1100], ['it_bat', 3, 2200]]]].forEach(([v, bill, d, paid, ls], k) => {
      const lines = ls.map(([itemId, qty, rate]) => ({ itemId, qty, rate, gst: I[itemId].gst, serials: [] }));
      const p = { id: 'pu_' + (k + 1), vendorId: v, billNo: bill, date: D(d), paid, lines, total: round2(sum(lines, l => l.qty * l.rate * (1 + l.gst / 100))), createdAt: T(d, 12), by: 'u_acc' };
      O.purchases.push(p);
      lines.forEach(l => O.stockMoves.push({ id: uid('sm_'), itemId: l.itemId, type: 'in', qty: l.qty, serials: [], leadId: '', purchaseId: p.id, note: `Purchase ${bill} · ${O.vendors.find(x => x.id === v).name}`, at: T(d, 12, 30), by: 'u_acc' }));
    });

    /* ---------- customers ---------- */
    const CU = [['Thomas Varghese', 'Edappally'], ['Anitha Suresh', 'Kakkanad'], ["St. Mary's Public School", 'Aluva', 1], ['Rasheed P.K.', 'Perumbavoor'], ['Green Mart Supermarket', 'Kalamassery', 1],
    ['Biju Mathew', 'Vyttila'], ['Kerala Spices Exports', 'Fort Kochi', 1], ['Sreeja Nair', 'Thrippunithura'], ['Dr. Arun Kumar', 'Kakkanad'], ['Joseph Chacko', 'Angamaly'],
    ['Lakshmi Textiles', 'Muvattupuzha', 1], ['Hari Krishnan', 'Palarivattom'], ['Al Ameen Hardware', 'Kothamangalam', 1], ['Gopalakrishnan V.', 'North Paravur'], ['Mini Joseph', 'Kaloor'],
    ['Varghese Kurian', 'Angamaly'], ['Shaji Abraham', 'Aluva'], ['Deepa Menon', 'Edappally'], ['Nisha Thomas', 'Kakkanad'], ['Sunil Kumar', 'Vyttila'],
    ['Ajmal Khan', 'Kalamassery'], ['Priya Raj', 'Palarivattom'], ['Iyer & Associates (CA)', 'Kaloor', 1], ['Fasil Rahman', 'Perumbavoor'], ['Meenakshi Amma', 'Thrippunithura'],
    ['Arjun Das', 'Edappally'], ['Sneha George', 'Kakkanad'], ['Vishnu Prasad', 'Aluva'], ['Rahul Varma', 'Muvattupuzha'], ['Anu Philip', 'Kaloor'],
    ['Shibu K.', 'Kalamassery'], ['Tessy Jose', 'Vyttila'], ['Manoj Pillai', 'Angamaly'], ['Fr. Sebastian (Parish Office)', 'North Paravur', 1]];
    const roads = ['Church Road', 'Market Road', 'NH 66 Bypass', 'Temple Road', 'Main Road', 'Seaport-Airport Road', 'Railway Station Road', 'Bank Junction'];
    O.customers = CU.map(([name, area, biz], i) => ({ id: 'cu_' + (i + 1), name, phone: '90000' + (10001 + i), whatsapp: '90000' + (10001 + i), area, address: `${biz ? 'Bldg' : 'House'} No. ${ri(10, 450)}, ${pick(roads)}`, gstin: biz ? `32AA${'BCDEFGHJK'[i % 9]}F${String(1000 + i * 37).slice(0, 4)}L1Z${i % 9}` : '', createdAt: T(-ri(60, 400), 11) }));
    const C = O.customers;

    /* ---------- leads ---------- */
    const LD = [
      [0, 'cctv', 'Justdial', 'Closed', 'hot', 'u_s1', null, -62, 45000, '8 cameras for house and shop front', { cameras: 8, placement: 'Both', camType: 'HD (Analog)', recDays: 30, mobileView: 'Yes' }],
      [1, 'cctv', 'Referral', 'Installing', 'hot', 'u_s1', 1, -21, 32000, '4 cameras for new house, mobile view needed', { cameras: 4, placement: 'Both', camType: 'HD (Analog)', recDays: 30, mobileView: 'Yes' }],
      [2, 'cctv', 'Website', 'Quoted', 'warm', 'u_s2', 0, -9, 180000, '16 IP cameras for school campus & classrooms', { cameras: 16, placement: 'Both', camType: 'IP', recDays: 30, mobileView: 'Yes' }],
      [4, 'cctv', 'WhatsApp', 'Site survey', 'hot', 'u_s1', 0, -4, 60000, '8 cameras for supermarket incl. billing counters', { cameras: 8, placement: 'Indoor', camType: 'HD (Analog)', recDays: 20, mobileView: 'Yes' }],
      [5, 'cctv', 'Walk-in', 'New', 'warm', 'u_s2', 0, 0, 25000, '4 cameras for small shop', { cameras: 4, placement: 'Indoor', camType: 'HD (Analog)', recDays: 15, mobileView: 'Yes' }],
      [6, 'cctv', 'IndiaMART', 'Qualified', 'cold', 'u_s2', 3, -5, 90000, 'Warehouse — about 12 cameras', { cameras: 12, placement: 'Both', camType: 'IP', recDays: 30, mobileView: 'Yes' }],
      [3, 'cctv', 'Phone', 'Advance paid', 'hot', 'u_s1', 2, -13, 48000, '8 cameras for home + gate', { cameras: 8, placement: 'Both', camType: 'HD (Analog)', recDays: 30, mobileView: 'Yes' }],
      [19, 'cctv', 'Instagram', 'Quoted', 'warm', 'u_s2', null, -26, 30000, '4 cameras for home', { cameras: 4, placement: 'Outdoor', camType: 'HD (Analog)', recDays: 15 }, { lost: 'Price too high', lostNote: 'Got local quote ₹4,000 less' }],
      [8, 'automation', 'Instagram', 'Quoted', 'hot', 'u_s1', -1, -10, 250000, 'Full villa automation — 5 rooms, curtains, gate', { rooms: 5, devices: ['Lights', 'Fans', 'Curtains', 'Locks', 'Gate'], assistant: 'Alexa', wifi: 'Good' }],
      [17, 'automation', 'Referral', 'Handover', 'warm', 'u_s2', 1, -30, 85000, '3 BHK lights & fans with Alexa', { rooms: 3, devices: ['Lights', 'Fans'], assistant: 'Alexa', wifi: 'Good' }],
      [21, 'automation', 'Website', 'New', 'warm', 'u_s1', 0, -1, 60000, 'Smart lock and living room automation', { rooms: 2, devices: ['Lights', 'Locks'], assistant: 'Google', wifi: 'Weak' }],
      [22, 'automation', 'Justdial', 'Site survey', 'warm', 'u_s2', 2, -6, 120000, 'Office automation — lights, AC, door lock', { rooms: 4, devices: ['Lights', 'AC', 'Locks'], assistant: 'Google', wifi: 'Good' }],
      [26, 'automation', 'WhatsApp', 'Qualified', 'cold', 'u_s1', null, -20, 40000, 'Curtain motor for living room', { rooms: 1, devices: ['Curtains'], assistant: 'Alexa', wifi: 'Good' }, { lost: 'Postponed / not now', lostNote: 'Will consider after house painting' }],
      [9, 'solar', 'Referral', 'Closed', 'hot', 'u_s1', null, -80, 200000, '3 kW on-grid for home', { bill: 3200, consumerNo: '1155432100012', load: 5, roof: 'RCC (concrete)', system: 'On-grid', kw: 3 }],
      [15, 'solar', 'Website', 'Installing', 'hot', 'u_s1', 1, -27, 320000, '5 kW on-grid, bill around ₹5,000', { bill: 5200, consumerNo: '1155432100345', load: 8, roof: 'RCC (concrete)', system: 'On-grid', kw: 5 }],
      [13, 'solar', 'Justdial', 'Quoted', 'hot', 'u_s2', 0, -8, 190000, '3 kW for house', { bill: 2800, consumerNo: '1156000123456', load: 5, roof: 'Sheet (metal)', system: 'On-grid', kw: 3 }],
      [24, 'solar', 'Phone', 'Site survey', 'warm', 'u_s2', -2, -7, 120000, 'Small system to reduce bill', { bill: 1600, consumerNo: '1156000765432', load: 3, roof: 'Tile', system: 'On-grid', kw: 2 }],
      [27, 'solar', 'Instagram', 'New', 'cold', 'u_s1', 1, -1, 0, 'Asked about PM Surya Ghar subsidy', { bill: 2200, roof: 'RCC (concrete)', system: 'On-grid', kw: 2 }],
      [32, 'solar', 'WhatsApp', 'Material issued', 'hot', 'u_s1', 3, -18, 195000, '3 kW on-grid', { bill: 3000, consumerNo: '1157000987654', load: 5, roof: 'RCC (concrete)', system: 'On-grid', kw: 3 }],
      [10, 'solar', 'IndiaMART', 'Invoiced', 'hot', 'u_s2', 5, -45, 330000, '5 kW for textile shop', { bill: 6500, consumerNo: '1158000111222', load: 10, roof: 'RCC (concrete)', system: 'On-grid', kw: 5 }],
      [33, 'solar', 'Referral', 'Qualified', 'warm', 'u_s2', 4, -3, 350000, 'Parish hall — 5 kW hybrid with backup', { bill: 5000, roof: 'RCC (concrete)', system: 'Hybrid', kw: 5 }],
      [11, 'laptop', 'Walk-in', 'Closed', 'hot', 'u_s2', null, -48, 60000, 'Laptop for office work', { product: 'Laptop', usage: 'Office / Business', brand: 'Dell', specs: 'i5, 16GB, 512GB' }],
      [14, 'laptop', 'Website', 'Quoted', 'warm', 'u_s2', 0, -2, 45000, 'Laptop for daughter (engineering)', { product: 'Laptop', usage: 'Student', brand: 'HP', specs: 'Ryzen 5, 8GB' }],
      [18, 'laptop', 'Walk-in', 'Delivered', 'hot', 'u_s1', 2, -11, 40000, 'Budget laptop for plus-two student', { product: 'Laptop', usage: 'Student', brand: 'Lenovo', specs: 'i3, 8GB' }],
      [25, 'laptop', 'Instagram', 'New', 'warm', 'u_s2', 1, 0, 75000, 'Gaming laptop', { product: 'Laptop', usage: 'Gaming', brand: 'Any', specs: 'RTX GPU, 16GB' }],
      [20, 'laptop', 'Justdial', 'Paid', 'hot', 'u_s1', 1, -3, 110000, '2 desktops for office', { product: 'Desktop', usage: 'Office / Business', brand: 'HP', specs: 'i5' }],
      [28, 'laptop', 'Phone', 'Quoted', 'warm', 'u_s2', null, -15, 15000, 'Printer for home', { product: 'Printer', usage: 'Home', brand: 'Any', specs: 'Ink tank' }, { lost: 'Bought elsewhere', lostNote: 'Bought online' }],
      [16, 'chip', 'Walk-in', 'Repairing', 'hot', 'u_fd', 2, -6, 0, 'Laptop dead', { device: 'Laptop', brand: 'HP', model: 'Pavilion 15', serial: '5CD1234XYZ', complaint: 'No power, not charging' }, { sub: 'Waiting for part' }],
      [23, 'chip', 'Walk-in', 'Diagnosis', 'hot', 'u_fd', 1, -1, 0, 'Display problem', { device: 'Laptop', brand: 'Dell', model: 'Vostro 3400', serial: 'DL3400AB12', complaint: 'Display flickering, no backlight' }],
      [29, 'chip', 'WhatsApp', 'Estimate sent', 'warm', 'u_fd', 0, -3, 0, 'Keyboard issue', { device: 'Laptop', brand: 'Lenovo', model: 'IdeaPad 330', serial: 'LNPF1X2Y3', complaint: 'Keyboard not working after tea spill' }],
      [30, 'chip', 'Walk-in', 'Ready', 'hot', 'u_fd', 0, -12, 0, 'Motherboard repair', { device: 'Motherboard', brand: 'Asus', model: 'Prime H310M', serial: 'ASMB77881', complaint: 'Desktop motherboard — no display' }],
      [31, 'chip', 'Phone', 'Delivered', 'hot', 'u_fd', null, -20, 0, 'Battery issue', { device: 'Laptop', brand: 'Acer', model: 'Aspire 5', serial: 'ACNX55667', complaint: 'Battery not charging, shuts down' }],
      [7, 'chip', 'Walk-in', 'Testing', 'hot', 'u_fd', 1, -4, 0, 'Water damage', { device: 'Laptop', brand: 'Apple', model: 'MacBook Air A1466', serial: 'C02XK1ABJ1WK', complaint: 'Water damage, not booting' }],
      [12, 'chip', 'Referral', 'Closed', 'hot', 'u_fd', null, -36, 0, 'Printer board', { device: 'Printer', brand: 'Epson', model: 'L3150', serial: 'X5E1234567', complaint: 'Paper jam and board fault' }],
      [3, 'chip', 'Walk-in', 'Ready', 'hot', 'u_fd', 0, -42, 0, 'Hinge broken', { device: 'Laptop', brand: 'HP', model: '250 G7', serial: 'CND9012ABC', complaint: 'Hinge broken, display cable damaged' }],
    ];
    const notes = ['Discussed requirement in detail', 'Asked for revised price', 'Will confirm after family discussion', 'Shared brochure on WhatsApp', 'Site visit fixed', 'Comparing with another vendor', ''];
    LD.forEach((r, idx) => {
      const [ci, cat, source, stage, score, who, fu, cr, budget, requirement, details, ex = {}] = r;
      const c = C[ci], path = CATS[cat].path, st = PATHS[path], k = st.indexOf(stage);
      const created = Math.min(T(cr, 9 + idx % 8, (idx * 7) % 60), NOW - (k + 2) * 3600000);
      const l = { id: 'le_' + (idx + 1), customerId: c.id, name: c.name, phone: c.phone, whatsapp: c.phone, address: c.address, area: c.area, category: cat, source, requirement, budget, assignedTo: who, score, followUp: fu == null ? '' : D(fu), details, stage, status: stage === 'Closed' ? 'closed' : 'open', subStatus: ex.sub || '', history: [], calls: [], advances: [], createdAt: created, createdBy: who === 'u_fd' ? 'u_fd' : pick([who, 'u_fd', 'u_admin']) };
      for (let i = 0; i <= k; i++) {
        const day = cr + Math.floor((-cr) * i / (k + 1) * 0.95);
        l.history.push({ from: i ? st[i - 1] : '', stage: st[i], at: Math.max(created + i * 60000, Math.min(T(day, 10 + i % 7, (i * 13) % 60), NOW - (k - i + 1) * 420000)), by: i === 0 ? l.createdBy : (path === 'service' ? pick(['u_fd', 'u_t1', 'u_t2']) : who), note: i ? '' : 'Lead created' });
      }
      if (ex.lost) { l.status = 'lost'; l.lostReason = ex.lost; l.lostNote = ex.lostNote; l.lostAt = T(cr + 6, 16); l.lostBy = who; l.history.push({ from: stage, stage: 'Lost', at: l.lostAt, by: who, note: ex.lost + ' — ' + ex.lostNote }); l.followUp = ''; }
      if (path !== 'service') {
        const nc = stage === 'New' ? (cr < 0 ? 1 : 0) : ri(1, 4);
        for (let j = 0; j < nc; j++) l.calls.push({ at: Math.min(T(cr + Math.floor((-cr) * (j + 1) / (nc + 1)), 11 + j * 2, 15), NOW - (nc - j) * 3600000), by: who, outcome: pick(['Connected', 'Interested', 'Call back later', 'No answer', 'Connected', 'Interested']), note: pick(notes) });
        l.calls.sort((a, b) => a.at - b.at);
      }
      O.leads.push(l);
    });
    const LEAD = n => O.leads[n - 1];
    const stageDate = (l, s) => { const h = l.history.find(x => x.stage === s); return h ? tsDate(h.at) : tsDate(l.createdAt); };
    C.forEach(c => { const ls = O.leads.filter(l => l.customerId === c.id); if (ls.length) c.createdAt = Math.min(c.createdAt, ...ls.map(l => l.createdAt)); });

    /* ---------- quotations ---------- */
    let qN = 0;
    const quoteLines = (l, n) => {
      const d = l.details;
      if (l.category === 'cctv') {
        if (d.camType === 'IP') return [L('it_ipcam', d.cameras), L('it_nvr8', Math.ceil(d.cameras / 8)), L('it_hdd2', Math.ceil(d.cameras / 8)), L('it_poe', Math.ceil(d.cameras / 8)), L('it_cable', d.cameras * 35), L('it_labcctv', d.cameras, 650)];
        return pkLines(d.cameras <= 4 ? 'pk_c4' : d.cameras <= 8 ? 'pk_c8' : 'pk_c16');
      }
      if (l.category === 'solar') return pkLines(d.kw <= 1 ? 'pk_s1' : d.kw <= 3 ? 'pk_s3' : 'pk_s5');
      if (l.category === 'automation') {
        const ls = [L('it_sw4', d.rooms * 2), L('it_ir', 1), L('it_echo', 1)];
        if (d.devices.includes('Curtains')) ls.push(L('it_curt', 2));
        if (d.devices.includes('Locks')) ls.push(L('it_lock', 1));
        ls.push(L('it_labauto', Math.max(1, Math.ceil(d.rooms / 2))));
        return ls;
      }
      return { 22: [L('it_dell', 1), L('it_kbm', 1)], 23: [L('it_hp15', 1), L('it_labsetup', 1)], 24: [L('it_len', 1), L('it_labsetup', 1)], 26: [L('it_desk', 2), L('it_rtr', 1), L('it_labsetup', 2)], 27: [L('it_prn', 1)] }[n] || [L('it_hp15', 1)];
    };
    const mkQuote = (l, n, version, lines, discount, status, date, no) => {
      const q = { id: 'qt_' + l.id.slice(3) + '_' + version, no: no || 'Q-' + p4(++qN), version, leadId: l.id, customerId: l.customerId, category: l.category, date, validTill: addDays(date, 15), lines, discount, interstate: false, notes: '', terms: O.meta[0].quoteTerms, status, createdAt: new Date(date + 'T15:00').getTime(), createdBy: l.assignedTo };
      O.quotes.push(q); return q;
    };
    const Q = {};
    O.leads.forEach((l, i) => {
      const n = i + 1, path = CATS[l.category].path; if (path === 'service') return;
      const k = PATHS[path].indexOf(l.stage), qk = PATHS[path].indexOf(QUOTE_STAGE[path]);
      if (k < qk) return;
      const won = k >= PATHS[path].indexOf(WON_STAGE[path]);
      const date = stageDate(l, QUOTE_STAGE[path]);
      const status = l.status === 'lost' ? 'Rejected' : won ? 'Accepted' : 'Sent';
      if (n === 3) { const q1 = mkQuote(l, n, 1, quoteLines(l, n), 0, 'Superseded', addDays(date, -2)); Q[n] = mkQuote(l, n, 2, quoteLines(l, n), 8000, 'Sent', date, q1.no); return; }
      if (n === 9) { const q1 = mkQuote(l, n, 1, quoteLines(l, n), 0, 'Superseded', addDays(date, -1)); const ls = quoteLines(l, n); ls.push(L('it_lock', 1)); Q[n] = mkQuote(l, n, 2, ls, 15000, 'Sent', date, q1.no); return; }
      Q[n] = mkQuote(l, n, 1, quoteLines(l, n), n === 14 ? 5000 : 0, status, date);
    });
    const qTotal = q => calcTotals(q.lines, q.discount).total;

    /* ---------- advances ---------- */
    O.leads.forEach((l, i) => {
      const n = i + 1; if (CATS[l.category].path !== 'project' || !Q[n]) return;
      if (PATHS.project.indexOf(l.stage) >= PATHS.project.indexOf('Advance paid')) {
        l.advances.push({ id: 'pa_adv' + n, date: stageDate(l, 'Advance paid'), amount: Math.round(qTotal(Q[n]) * 0.4 / 1000) * 1000, mode: pick(['UPI', 'Bank', 'UPI']), ref: 'UTR' + ri(100000, 999999), by: pick(['u_acc', l.assignedTo]) });
      }
    });

    /* ---------- surveys ---------- */
    O.leads.forEach((l, i) => {
      if (CATS[l.category].path !== 'project' || l.status === 'lost') return;
      const k = PATHS.project.indexOf(l.stage); if (k < 2) return;
      const cl = SURVEY_CHECKLIST[l.category], partial = k === 2;
      const ms = Surveys.defaultMeasurements(l.category).map(m => ({ ...m, value: String(m.unit === 'm' ? ri(20, 90) : m.unit === 'ft' ? ri(8, 14) : m.unit === 'sq ft' ? ri(300, 900) : m.unit === 'hrs' ? ri(5, 7) : ri(2, 8)) }));
      O.surveys.push({ id: 'sv_' + (i + 1), leadId: l.id, customerId: l.customerId, category: l.category, date: stageDate(l, 'Site survey'), by: pick(['u_t1', 'u_t2', l.assignedTo]), checklist: Object.fromEntries(cl.map((c, j) => [c, partial ? j < 3 : true])), measurements: ms, notes: partial ? 'Survey in progress — customer to confirm DVR / inverter location.' : pick(['Roof in good condition. No major shadow after 9 AM.', 'Customer wants cameras covering gate, car porch and backyard.', 'Wi-Fi extender needed for first floor.', 'Cable route through existing conduit — no chipping needed.']), photos: [], createdAt: new Date(stageDate(l, 'Site survey') + 'T11:00').getTime() });
    });

    /* ---------- material issued to running projects ---------- */
    const issue = (l, lines) => lines.forEach(ln => {
      const it = I[ln.itemId]; if (!it || it.service) return;
      const qty = Math.min(ln.qty, it.stock); if (!qty) return;
      const sers = it.serialized ? it.serials.filter(s => s.status === 'in').slice(0, qty) : [];
      sers.forEach(s => { s.status = 'issued'; s.leadId = l.id; });
      it.stock -= qty;
      O.stockMoves.push({ id: uid('sm_'), itemId: it.id, type: 'issue', qty, serials: sers.map(s => s.sn), leadId: l.id, note: 'Issued to ' + l.name, at: new Date(stageDate(l, 'Material issued') + 'T09:30').getTime(), by: 'u_fd' });
    });
    [2, 10, 15, 19].forEach(n => issue(LEAD(n), Q[n].lines));

    /* ---------- invoices ---------- */
    const invs = [];
    const mkInv = ({ c, date, lines, cat, leadId = '', quoteId = '', salesBy, dueDays = 0, discount = 0, notes = '', pays = [] }) => {
      const id = 'in_' + (invs.length + 1);
      lines = JSON.parse(JSON.stringify(lines));
      lines.forEach(ln => { const it = I[ln.itemId]; if (it && it.serialized) ln.serials = newSerials(it, ln.qty, id); });
      const t = calcTotals(lines, discount);
      const inv = { id, no: '', leadId, quoteId, customerId: c, category: cat, date, dueDate: addDays(date, dueDays), lines, discount: t.discount, interstate: false, notes, terms: O.meta[0].invoiceTerms, total: t.total, tax: round2(t.tax), payments: [], salesBy, createdAt: new Date(date + 'T16:00').getTime(), createdBy: pick(['u_acc', 'u_fd']) };
      pays.forEach(([d, amt, mode, adv], k) => { const a = amt === 'bal' ? inv.total - sum(inv.payments, p => p.amount) : amt; if (a > 0) inv.payments.push({ id: id + '_p' + k, date: d, amount: a, mode, ref: mode === 'Cash' ? '' : 'REF' + ri(10000, 99999), by: 'u_acc', advance: !!adv }); });
      invs.push(inv);
      lines.forEach(ln => (ln.serials || []).forEach(sn => O.assets.push({ id: 'as_' + sn, customerId: c, itemId: ln.itemId, itemName: I[ln.itemId].name, serial: sn, invoiceId: id, saleDate: date, warrantyEnd: addMonths(date, I[ln.itemId].warrantyMonths || 12), category: cat })));
      return inv;
    };
    // from leads
    [1, 14, 20].forEach(n => {
      const l = LEAD(n), date = stageDate(l, 'Invoiced'), q = Q[n];
      const pays = l.advances.map(a => [a.date, a.amount, a.mode, true]);
      if (n === 20) pays.push([addDays(date, 3), 60000, 'Bank']); else pays.push([addDays(date, 2), 'bal', 'Bank']);
      const inv = mkInv({ c: l.customerId, date, lines: q.lines, cat: l.category, leadId: l.id, quoteId: q.id, salesBy: l.assignedTo, dueDays: 15, discount: q.discount, pays });
      l.advances.forEach(a => a.invoiceId = inv.id);
    });
    [22, 24, 26].forEach(n => {
      const l = LEAD(n), date = stageDate(l, 'Paid'), q = Q[n];
      mkInv({ c: l.customerId, date, lines: q.lines, cat: 'laptop', leadId: l.id, quoteId: q.id, salesBy: l.assignedTo, pays: [[date, 'bal', pick(['UPI', 'Card', 'EMI'])]] });
    });

    /* ---------- job cards ---------- */
    const JCI = {
      28: { tech: 'u_t1', est: 4500, diag: 'Charging IC failed and MOSFET short on power rail. IC ordered from Malabar Spares.', parts: [], acc: ['Charger / Adapter', 'Bag'], cond: 'Scratches on lid, one rubber foot missing', pw: '1234' },
      29: { tech: 'u_t2', est: 0, diag: '', parts: [], acc: ['Charger / Adapter'], cond: 'Good condition', pw: 'arun@123' },
      30: { tech: 'u_t1', est: 3800, diag: 'Keyboard replacement + board cleaning after liquid spill', parts: [], acc: ['Charger / Adapter'], cond: 'Sticky keys, tea stains', pw: '' },
      31: { tech: 'u_t3', est: 3500, diag: 'BIOS chip corrupted — reflashed, capacitor replaced', parts: [['it_ic', 1, 650]], acc: [], cond: 'Board only, no box', pw: '' },
      32: { tech: 'u_t2', est: 3900, diag: 'Battery worn out (cycle count 1100) — replaced', parts: [['it_bat', 1, 3200]], acc: ['Charger / Adapter'], cond: 'Good', pw: '0000' },
      33: { tech: 'u_t3', est: 9500, diag: 'Liquid damage on logic board — ultrasonic cleaning + power IC', parts: [['it_ic', 2, 650]], acc: ['Charger / Adapter', 'Box'], cond: 'Corrosion near USB port', pw: 'mac2020' },
      34: { tech: 'u_t1', est: 2800, diag: 'Printer board power section repaired, rollers cleaned', parts: [], acc: ['Power cable'], cond: 'Dusty, ink tank half', pw: '' },
      35: { tech: 'u_t2', est: 4300, diag: 'Hinge and display cable replaced', parts: [['it_hinge', 1, 900]], acc: ['Charger / Adapter'], cond: 'Left hinge broken, display wobbling', pw: 'hp250' },
    };
    let jcN = 0;
    Object.entries(JCI).forEach(([n, x]) => {
      const l = LEAD(+n), d = l.details, k = PATHS.service.indexOf(l.stage);
      const jc = { id: 'jc_' + n, no: 'JC-' + p4(++jcN), leadId: l.id, customerId: l.customerId, inwardDate: tsDate(l.createdAt), device: d.device, brand: d.brand, model: d.model, serial: d.serial, complaint: d.complaint, accessories: x.acc, password: x.pw, condition: x.cond, estDelivery: addDays(tsDate(l.createdAt), 4), techId: x.tech, photos: [], diagnosis: x.diag, estimate: x.est, parts: [], approvals: [], createdAt: l.createdAt, createdBy: 'u_fd' };
      if (k >= 3) jc.approvals.push({ at: new Date(stageDate(l, 'Estimate sent') + 'T12:00').getTime(), by: 'u_fd', amount: x.est, status: 'Estimate sent', mode: 'WhatsApp', note: 'Estimate shared with photos' });
      if (k >= 4) jc.approvals.push({ at: new Date(stageDate(l, 'Estimate approved') + 'T15:30').getTime(), by: 'u_fd', amount: x.est, status: 'Approved', mode: 'Phone call', note: 'Customer approved on call' });
      x.parts.forEach(([itemId, qty, price]) => {
        jc.parts.push({ itemId, name: I[itemId].name, qty, price, serial: '', at: jc.createdAt + 86400000, by: x.tech });
        I[itemId].stock -= qty;
        O.stockMoves.push({ id: uid('sm_'), itemId, type: 'issue', qty, serials: [], leadId: l.id, jobcardId: jc.id, note: 'Job card ' + jc.no, at: jc.createdAt + 86400000, by: x.tech });
      });
      if (l.stage === 'Ready') jc.readyAt = new Date(stageDate(l, 'Ready') + 'T17:00').getTime();
      if (k >= 8) jc.deliveredAt = new Date(stageDate(l, 'Delivered') + 'T18:00').getTime();
      O.jobcards.push(jc);
      if (k >= 8) {
        const lines = jc.parts.map(p => ({ itemId: '', name: p.name, hsn: I[p.itemId].hsn, qty: p.qty, unit: 'nos', rate: round2(p.price / 1.18), gst: 18, serials: [] }));
        const rest = x.est - sum(jc.parts, p => p.qty * p.price);
        lines.push({ itemId: 'it_labchip', name: `Chip-level service charge — ${jc.device} ${jc.brand} ${jc.model} (${jc.no})`, hsn: '9987', qty: 1, unit: 'job', rate: round2(rest / 1.18), gst: 18, serials: [] });
        const date = stageDate(l, 'Delivered');
        mkInv({ c: l.customerId, date, lines, cat: 'chip', leadId: l.id, salesBy: 'u_fd', notes: 'Job card ' + jc.no, pays: [[date, 'bal', pick(['Cash', 'UPI'])]] });
      }
    });
    JCI[28] && (LEAD(28).subStatus = 'Waiting for part');

    /* ---------- historical invoices for trend (last 8 months) ---------- */
    const cats = ['cctv', 'cctv', 'laptop', 'laptop', 'laptop', 'chip', 'chip', 'chip', 'solar', 'automation', 'cctv'];
    for (let m = 11; m >= 0; m--) {
      const first = new Date(); first.setDate(1); first.setMonth(first.getMonth() - m);
      const days = m === 0 ? new Date().getDate() - 1 : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      if (days < 1) continue;
      const cnt = m === 0 ? 4 : ri(6, 9);
      for (let k = 0; k < cnt; k++) {
        const date = isoDate(new Date(first.getFullYear(), first.getMonth(), ri(1, days)));
        const cat = pick(cats), c = pick(C).id;
        let lines;
        if (cat === 'cctv') lines = pkLines(pick(['pk_c4', 'pk_c4', 'pk_c8']));
        else if (cat === 'solar') lines = pkLines(pick(['pk_s1', 'pk_s3', 'pk_s3']));
        else if (cat === 'automation') lines = [L('it_sw4', ri(2, 6)), L('it_echo', 1), L('it_labauto', 1)];
        else if (cat === 'laptop') { lines = [L(pick(['it_dell', 'it_hp15', 'it_len', 'it_acer', 'it_mon', 'it_prn', 'it_ssdx']), 1)]; if (rnd() < 0.5) lines.push(L(pick(['it_kbm', 'it_rtr', 'it_labsetup']), 1)); }
        else { lines = [L('it_labchip', 1, ri(8, 25) * 100)]; if (rnd() < 0.6) lines.push(L(pick(['it_ram', 'it_nvme', 'it_kbd', 'it_bat', 'it_scr']), 1)); }
        const credit = (cat === 'solar' || cat === 'cctv' || cat === 'automation') ? 15 : 0;
        const partial = m <= 3 && rnd() < (m === 0 ? 0.5 : 0.22);
        const payDate = addDays(date, ri(0, 6)) > today() ? date : addDays(date, ri(0, 6));
        mkInv({ c, date, lines, cat, salesBy: cat === 'chip' ? 'u_fd' : pick(['u_s1', 'u_s2', 'u_s1']), dueDays: credit, pays: partial ? [[date, Math.round(calcTotals(lines).total * 0.5 / 100) * 100, 'UPI']] : [[payDate, 'bal', pick(['UPI', 'UPI', 'Cash', 'Bank', 'Card', 'EMI'])]] });
      }
    }
    // number invoices in date order per financial year
    invs.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
    const fyCount = {};
    invs.forEach(inv => { const fy = fyLabel(inv.date); fyCount[fy] = (fyCount[fy] || 0) + 1; inv.no = `INV/${fy}/${p4(fyCount[fy])}`; inv.createdAt = new Date(inv.date + 'T16:00').getTime(); });
    O.invoices = invs;
    // a couple of collections received today
    invs.filter(i => i.total - sum(i.payments, p => p.amount) > 0 && i.date < today()).slice(-2).forEach((i, k) => {
      const bal = i.total - sum(i.payments, p => p.amount);
      i.payments.push({ id: i.id + '_today', date: today(), amount: k ? bal : Math.round(bal / 2), mode: k ? 'Cash' : 'UPI', ref: k ? '' : 'UPI' + ri(100000, 999999), by: 'u_acc' });
    });
    O.stockMoves.push(...invs.flatMap(inv => inv.lines.filter(ln => I[ln.itemId] && !I[ln.itemId].service).map(ln => ({ id: uid('sm_'), itemId: ln.itemId, type: 'sale', qty: ln.qty, serials: ln.serials || [], leadId: inv.leadId, invoiceId: inv.id, note: 'Invoice ' + inv.no, at: inv.createdAt, by: inv.createdBy }))));
    C.forEach(c => { const iv = invs.filter(i => i.customerId === c.id); if (iv.length) c.createdAt = Math.min(c.createdAt, ...iv.map(i => i.createdAt)); });

    /* ---------- AMC contracts ---------- */
    let amN = 0;
    const mkAmc = (ci, cat, title, start, months, visitsPerYear, amount, missIdx = -1) => {
      const end = addDays(addMonths(start, months), -1), n = Math.round(visitsPerYear * months / 12), visits = [];
      for (let k = 0; k < n; k++) {
        const date = addDays(start, Math.round((k + 0.5) * daysBetween(start, end) / n)), past = date < today() && k !== missIdx;
        visits.push({ id: `vi_${amN + 1}_${k}`, date, done: past, doneDate: past ? date : '', techId: past ? pick(['u_t1', 'u_t2', 'u_t3']) : '', notes: past ? pick(['Cleaned cameras, checked recording', 'All OK', 'Adjusted camera angle', 'Panel cleaning done', 'Checked earthing & inverter logs']) : '' });
      }
      const a = { id: 'am_' + (++amN), no: 'AMC-' + p4(amN), customerId: C[ci].id, category: cat, title, start, end, amount, visitsPerYear, notes: 'Labour, cleaning and preventive maintenance included. Spare parts extra.', visits, createdAt: new Date(start + 'T11:00').getTime(), createdBy: 'u_admin' };
      O.amcs.push(a); return a;
    };
    mkAmc(0, 'cctv', 'CCTV AMC — 8 cameras', D(-352), 12, 4, 4800);
    const amSolar = mkAmc(9, 'solar', 'Solar AMC — 3 kW plant', D(-60), 12, 4, 6000);
    mkAmc(4, 'cctv', 'CCTV AMC — supermarket 8 cameras', D(-340), 12, 4, 5500);
    mkAmc(22, 'laptop', 'IT AMC — 6 desktops + printer', D(-200), 12, 12, 24000, 4);
    mkAmc(6, 'cctv', 'CCTV AMC — warehouse 12 cameras', D(-380), 12, 4, 7500);
    mkAmc(2, 'cctv', 'CCTV AMC — school 16 cameras', D(-30), 12, 4, 9000);

    /* ---------- field jobs ---------- */
    let fjN = 0;
    const techs = ['u_t1', 'u_t2', 'u_t3'];
    const mkJob = o => { const c = C.find(x => x.id === o.customerId); const j = { id: 'fj_' + (++fjN), no: 'FJ-' + p4(fjN), leadId: '', ticketId: '', amcId: '', visitId: '', address: `${c.address}, ${c.area}`, phone: c.phone, estHours: 3, notes: '', log: [], createdBy: 'u_admin', reworkOf: '', ...o }; O.fieldJobs.push(j); return j; };
    const completeLog = (j, dayOff, h, dur, late) => {
      const sched = T(dayOff, h, 0), trav = sched - 35 * 60000, site = sched + ri(-5, late ? 90 : 15) * 60000, work = site + 8 * 60000, done = work + dur * 60000;
      j.log = [{ status: 'Assigned', at: T(dayOff - 1, 17, 30), by: 'u_admin', gps: null }, { status: 'Travelling', at: trav, by: j.techId, gps: G() }, { status: 'At site', at: site, by: j.techId, gps: G() }, { status: 'Working', at: work, by: j.techId, gps: G() }, { status: 'Completed', at: done, by: j.techId, gps: G() }];
      j.status = 'Completed'; j.startedAt = site; j.completedAt = done;
      const r = j.techId === 'u_t3' ? pick([5, 4, 4, 3, 5]) : pick([5, 5, 4, 5, 4]);
      j.completion = { photos: [], otpVerified: true, signature: '', rating: r, remarks: pick(['Work completed, customer satisfied', 'Explained usage to customer', 'Tested all points OK']), at: done };
    };
    const jobTitles = { Installation: ['CCTV installation — 4 cameras', 'Smart switch installation', 'Solar panel mounting', 'Router & network setup'], 'Service visit': ['DVR not recording', 'Inverter error check', 'Wi-Fi switch reset', 'Printer service at office'], Complaint: ['Camera not showing', 'Smart switch not responding', 'No mobile view'], 'AMC visit': ['Quarterly AMC visit'], 'Delivery / Setup': ['Laptop delivery & setup', 'Desktop installation at office'] };
    for (let d = -27; d <= -1; d++) {
      if (new Date(D(d) + 'T00:00').getDay() === 0) continue;
      techs.forEach(t => {
        if (rnd() < 0.45) return;
        const type = pick(['Installation', 'Service visit', 'Complaint', 'AMC visit', 'Delivery / Setup', 'Service visit']);
        const h = pick([9, 10, 11, 14, 15]);
        const j = mkJob({ type, title: pick(jobTitles[type]), customerId: pick(C).id, date: D(d), time: pad(h) + ':00', techId: t, createdAt: T(d - 1, 17) });
        const dur = ri(50, 200), late = rnd() < (t === 'u_t3' ? 0.3 : 0.12);
        completeLog(j, d, h, late ? dur + 120 : dur, late);
      });
    }
    // repeat visits (rework within 30 days)
    [['u_t3', 'u_t1'], ['u_t3', 'u_t2'], ['u_t1', 'u_t2']].forEach(([orig, fixer]) => {
      const prev = O.fieldJobs.find(j => j.techId === orig && j.status === 'Completed' && j.date < D(-6) && j.date > D(-24) && !O.fieldJobs.some(x => x.reworkOf === j.id));
      if (!prev) return;
      const d = daysBetween(today(), prev.date) + ri(2, 5);
      const j = mkJob({ type: 'Complaint', title: 'Repeat complaint — ' + prev.title, customerId: prev.customerId, date: D(d), time: '11:00', techId: fixer, createdAt: T(d - 1, 16), reworkOf: prev.id });
      completeLog(j, d, 11, ri(40, 90), false);
    });

    /* ---------- tickets ---------- */
    let tkN = 0;
    const mkTk = (ci, subject, priority, status, created, sla, extra = {}) => {
      const t = { id: 'tk_' + (++tkN), no: 'TK-' + p4(tkN), customerId: C[ci].id, assetId: '', amcId: '', subject, desc: '', priority, status, slaDue: D(sla), createdAt: T(created, 10, 20), createdBy: 'u_fd', techId: '', jobId: '', history: [{ status: 'Open', at: T(created, 10, 20), by: 'u_fd', note: 'Customer called' }], ...extra };
      O.tickets.push(t); return t;
    };
    const tk1 = mkTk(0, 'Gate camera (Cam 3) not showing on DVR', 'High', 'In progress', 0, 0, { amcId: 'am_1', desc: 'Customer says video loss on camera 3 since last night rain.' });
    const tk2 = mkTk(12, 'DVR beeping — HDD error', 'Normal', 'Open', -1, 1, { desc: 'DVR shows HDD error, beeping continuously.' });
    const tk3 = mkTk(9, 'Inverter showing grid fault', 'Urgent', 'Resolved', -4, -3, { amcId: 'am_2' });
    const lapAsset = O.assets.find(a => a.itemId === 'it_dell' || a.itemId === 'it_hp15');
    mkTk(lapAsset ? C.findIndex(c => c.id === lapAsset.customerId) : 11, 'Laptop fan noise and heating', 'Normal', 'Open', -2, -1, { assetId: lapAsset ? lapAsset.id : '' });
    const tk5 = mkTk(17, 'Alexa not responding to bedroom fan', 'Low', 'Closed', -9, -7);
    tk5.history.push({ status: 'Resolved', at: T(-8, 15), by: 'u_t2', note: 'Re-paired switch with Alexa' }, { status: 'Closed', at: T(-7, 10), by: 'u_fd', note: 'Customer confirmed' });
    // resolved ticket job (historical)
    const j3 = mkJob({ type: 'Complaint', title: 'TK-0003: Inverter showing grid fault', customerId: C[9].id, ticketId: tk3.id, amcId: '', date: D(-3), time: '10:00', techId: 'u_t3', createdAt: T(-4, 11) });
    completeLog(j3, -3, 10, 75, false); tk3.jobId = j3.id; tk3.techId = 'u_t3';
    tk3.history.push({ status: 'Assigned', at: T(-4, 11), by: 'u_admin', note: 'Assigned to Nikhil Das' }, { status: 'Resolved', at: j3.completedAt, by: 'u_t3', note: 'Loose AC terminal tightened, reset inverter' });

    /* ---------- today's live field jobs ---------- */
    const M = min => NOW - min * 60000;
    const l2 = LEAD(2), l15 = LEAD(15), l26 = LEAD(26), l4 = LEAD(4), l17 = LEAD(17);
    const jA = mkJob({ type: 'Installation', title: 'CCTV installation — 4 cameras + DVR', customerId: l2.customerId, leadId: l2.id, date: today(), time: '09:30', estHours: 5, techId: 'u_t1', status: 'Working', createdAt: T(-1, 17), notes: 'Customer wants DVR inside bedroom cupboard. Configure mobile view on 2 phones.' });
    jA.log = [{ status: 'Assigned', at: T(-1, 17, 10), by: 'u_admin', gps: null }, { status: 'Travelling', at: M(115), by: 'u_t1', gps: G() }, { status: 'At site', at: M(80), by: 'u_t1', gps: G() }, { status: 'Working', at: M(72), by: 'u_t1', gps: G() }];
    jA.startedAt = M(80);
    const jB = mkJob({ type: 'Complaint', title: 'TK-0001: Gate camera not showing', customerId: tk1.customerId, ticketId: tk1.id, amcId: '', date: today(), time: '11:00', techId: 'u_t2', status: 'Travelling', createdAt: M(150) });
    jB.log = [{ status: 'Assigned', at: M(140), by: 'u_admin', gps: null }, { status: 'Travelling', at: M(14), by: 'u_t2', gps: G() }];
    tk1.jobId = jB.id; tk1.techId = 'u_t2';
    tk1.history.push({ status: 'Assigned', at: M(140), by: 'u_admin', note: 'Assigned to Suresh Babu' }, { status: 'In progress', at: M(14), by: 'u_t2', note: 'Travelling' });
    const am1 = O.amcs[0]; const v1 = am1.visits.find(v => !v.done) || am1.visits[am1.visits.length - 1];
    const jC = mkJob({ type: 'AMC visit', title: 'AMC visit — ' + am1.title, customerId: am1.customerId, amcId: am1.id, visitId: v1.id, date: today(), time: '09:00', techId: 'u_t3', createdAt: T(-2, 12) });
    jC.log = [{ status: 'Assigned', at: T(-2, 12), by: 'u_admin', gps: null }, { status: 'Travelling', at: M(200), by: 'u_t3', gps: G() }, { status: 'At site', at: M(170), by: 'u_t3', gps: G() }, { status: 'Working', at: M(165), by: 'u_t3', gps: G() }, { status: 'Completed', at: M(95), by: 'u_t3', gps: G() }];
    Object.assign(jC, { status: 'Completed', startedAt: M(170), completedAt: M(95), completion: { photos: [], otpVerified: true, signature: '', rating: 5, remarks: 'All 8 cameras cleaned, recording checked (28 days).', at: M(95) } });
    Object.assign(v1, { done: true, doneDate: today(), techId: 'u_t3', notes: 'All cameras cleaned', jobId: jC.id });
    mkJob({ type: 'Installation', title: 'Solar — panel mounting & DC wiring (day 2)', customerId: l15.customerId, leadId: l15.id, date: today(), time: '14:00', estHours: 4, techId: 'u_t3', status: 'Assigned', createdAt: T(-1, 18), log: [{ status: 'Assigned', at: T(-1, 18), by: 'u_admin', gps: null }] });
    mkJob({ type: 'Delivery / Setup', title: 'Deliver & set up 2 HP desktops + router', customerId: l26.customerId, leadId: l26.id, date: today(), time: '16:30', estHours: 2, techId: 'u_t1', status: 'Assigned', createdAt: M(300), log: [{ status: 'Assigned', at: M(300), by: 'u_admin', gps: null }] });
    mkJob({ type: 'Site survey', title: 'Supermarket CCTV site survey', customerId: l4.customerId, leadId: l4.id, date: today(), time: '15:00', estHours: 2, techId: '', status: 'Unassigned', createdAt: M(240) });
    const jE = mkJob({ type: 'Complaint', title: 'TK-0002: DVR beeping — HDD error', customerId: tk2.customerId, ticketId: tk2.id, date: D(1), time: '10:30', techId: '', status: 'Unassigned', createdAt: T(-1, 12) });
    tk2.jobId = jE.id;
    const v2 = amSolar.visits.find(v => !v.done);
    if (v2) { const jF = mkJob({ type: 'AMC visit', title: 'AMC visit — ' + amSolar.title, customerId: amSolar.customerId, amcId: amSolar.id, visitId: v2.id, date: v2.date < D(3) ? D(3) : v2.date, time: '10:00', techId: 'u_t2', status: 'Assigned', createdAt: T(-1, 11), log: [{ status: 'Assigned', at: T(-1, 11), by: 'u_admin', gps: null }] }); v2.jobId = jF.id; v2.techId = 'u_t2'; }
    mkJob({ type: 'Site survey', title: 'Solar site survey — roof & shadow check', customerId: l17.customerId, leadId: l17.id, date: D(2), time: '11:00', estHours: 2, techId: 'u_t2', status: 'Assigned', createdAt: T(-1, 15), log: [{ status: 'Assigned', at: T(-1, 15), by: 'u_admin', gps: null }] });

    /* ---------- attendance ---------- */
    const rate = O.meta[0].kmRate;
    ['u_t1', 'u_t2', 'u_t3', 'u_s1', 'u_s2'].forEach(u => {
      for (let d = -12; d <= -1; d++) {
        if (new Date(D(d) + 'T00:00').getDay() === 0 || rnd() < 0.08) continue;
        const km = u.startsWith('u_t') ? ri(18, 58) : ri(12, 42);
        O.attendance.push({ id: `at_${u}_${d}`, userId: u, date: D(d), in: { at: T(d, 9, ri(0, 15)), gps: G() }, out: { at: T(d, 18, ri(0, 40)), gps: G() }, km, kmAuto: km, claim: km * rate, claimStatus: d <= -7 ? 'Paid' : d <= -3 ? 'Approved' : 'Pending' });
      }
    });
    ['u_t1', 'u_t2', 'u_t3', 'u_s1'].forEach((u, k) => O.attendance.push({ id: `at_${u}_0`, userId: u, date: today(), in: { at: Math.min(T(0, 9, 2 + k * 3), M(230 - k * 5)), gps: G() }, out: null, km: null, claim: 0, claimStatus: 'Pending' }));

    /* ---------- rma ---------- */
    O.rma = [
      { id: 'rma_1', no: 'RMA-0001', custName: 'Vipin Das', phone: '9847000001', area: 'Edappally', item: 'B760M DS3H Motherboard', brand: 'Gigabyte', serial: 'SN2309100452', inwardDate: D(-10), fault: 'No power / RAM slot 2 not detecting', serviceCenter: 'Kaizen Infoserve', city: 'Kochi', dispatchDate: D(-8), courierAwb: 'ST66491029', rmaNo: 'GIG-KC-8841', status: 'In Process', createdAt: NOW - 864000000 },
      { id: 'rma_2', no: 'RMA-0002', custName: 'Deepak Mohan', phone: '9847000002', area: 'Kakkanad', item: 'WD Blue 1TB NVMe SSD', brand: 'Western Digital (WD)', serial: 'WDBLUE883190', inwardDate: D(-14), fault: 'Not detecting in BIOS', serviceCenter: 'Digicomp Complete Solutions', city: 'Kochi', dispatchDate: D(-12), courierAwb: 'DTDC99104', rmaNo: 'WD-IN-5521', status: 'Received', newSerial: 'WDBLUE991044', receivedDate: D(-1), createdAt: NOW - 1200000000 },
      { id: 'rma_3', no: 'RMA-0003', custName: 'Anand Kumar', phone: '9847000003', area: 'Aluva', item: 'Prime H610M-E Motherboard', brand: 'Asus', serial: 'ASPRM44910', inwardDate: D(-2), fault: 'Display flickering on HDMI port', serviceCenter: 'RP tech', city: 'Kochi', status: 'Logged', createdAt: NOW - 172800000 },
    ];

    /* ---------- expenses ---------- */
    O.expenses = [
      { id: 'exp_1', date: today(), category: 'Tea & Refreshments', amount: 140, mode: 'Cash', paidTo: 'Hotel Aryas', note: 'Morning tea and snacks for staff', createdAt: NOW - 10000000 },
      { id: 'exp_2', date: today(), category: 'Courier & Transport', amount: 320, mode: 'Cash', paidTo: 'DTDC Courier', note: 'Motherboard RMA dispatch to Bangalore', createdAt: NOW - 8000000 },
      { id: 'exp_3', date: today(), category: 'Technician Petrol / Travel', amount: 250, mode: 'Cash', paidTo: 'Bijo Thomas', note: 'Petrol advance for Kakkanad site visit', createdAt: NOW - 5000000 },
      { id: 'exp_4', date: D(-2), category: 'Electricity & Internet', amount: 2100, mode: 'UPI', paidTo: 'Asianet Broadband', note: 'Monthly shop internet 200Mbps', createdAt: NOW - 172800000 },
      { id: 'exp_5', date: D(-5), category: 'Stationery & Printing', amount: 450, mode: 'Cash', paidTo: 'Ideal Xerox', note: 'A4 paper bundle & receipt books', createdAt: NOW - 432000000 },
    ];

    /* ---------- licenses ---------- */
    O.licenses = [
      { id: 'lic_1', customerName: 'Apex Logistics', phone: '9847111222', software: 'QuickHeal Total Security (3 PC / 3 Years)', key: 'QH3P-8821-9940-KL12', deviceNote: 'Admin & Billing PCs', startDate: D(-340), expiryDate: D(25), price: 2800, createdAt: NOW - 200000000 },
      { id: 'lic_2', customerName: 'Sujith Varghese', phone: '9847222333', software: 'QuickHeal Total Security (1 PC / 1 Year)', key: 'QHTS-1190-4451-BC33', deviceNote: 'Dell Inspiron 15', startDate: D(-360), expiryDate: D(5), price: 950, createdAt: NOW - 300000000 },
      { id: 'lic_3', customerName: 'Karthik Menon', phone: '9847333444', software: 'Microsoft 365 Personal (1 Year)', key: 'M365-XXXX-YYYY-ZZZZ', deviceNote: 'MacBook Air M2', startDate: D(-200), expiryDate: D(165), price: 4200, createdAt: NOW - 150000000 },
      { id: 'lic_4', customerName: 'Delta Traders', phone: '9847444555', software: 'Tally Prime Silver (Single User)', key: 'TLY-7749102-PRIME', deviceNote: 'Accounts Desktop', startDate: D(-400), expiryDate: D(-35), price: 21240, createdAt: NOW - 400000000 },
    ];

    O.items.forEach(it => delete it.sp);
    return O;
  },
};
