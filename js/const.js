'use strict';
/* Page registry: each screen file adds Pages.<route> = { title, render(el, args) } */
const Pages = {};

/* ===== Business constants ===== */
const CATS = {
  cctv: { label: 'CCTV', path: 'project', color: '#2563eb', icon: '📹' },
  automation: { label: 'Automation', path: 'project', color: '#7c3aed', icon: '🏡' },
  solar: { label: 'Solar', path: 'project', color: '#d97706', icon: '☀️' },
  laptop: { label: 'Laptop / IT Sales', path: 'sales', color: '#059669', icon: '💻' },
  chip: { label: 'Chip-level Service', path: 'service', color: '#dc2626', icon: '🔬' },
};
const CAT_LIST = Object.entries(CATS).map(([k, v]) => [k, v.label]);
const PATHS = {
  project: ['New', 'Qualified', 'Site survey', 'Quoted', 'Advance paid', 'Material issued', 'Installing', 'Handover', 'Invoiced', 'Closed'],
  service: ['New', 'Job card', 'Diagnosis', 'Estimate sent', 'Estimate approved', 'Repairing', 'Testing', 'Ready', 'Delivered', 'Closed'],
  sales: ['New', 'Quoted', 'Paid', 'Setup', 'Delivered', 'Closed'],
};
const PATH_LABEL = { project: 'Projects — CCTV, Automation, Solar', service: 'Service — Chip-level', sales: 'Sales — Laptop & Peripherals' };
const WON_STAGE = { project: 'Advance paid', service: 'Estimate approved', sales: 'Paid' };
const QUOTE_STAGE = { project: 'Quoted', service: 'Estimate sent', sales: 'Quoted' };
const SOURCES = ['Walk-in', 'Phone', 'WhatsApp', 'Website', 'Justdial', 'IndiaMART', 'Referral', 'Instagram'];
const ROLES = { admin: 'Owner / Admin', sales: 'Sales', frontdesk: 'Front desk', technician: 'Technician', accounts: 'Accounts' };
const PAY_MODES = ['UPI', 'Cash', 'Bank', 'EMI', 'Card', 'Cheque'];
const FIELD_STATUS = ['Assigned', 'Travelling', 'At site', 'Working', 'Completed'];
const JOB_TYPES = ['Installation', 'Site survey', 'Service visit', 'AMC visit', 'Complaint', 'Delivery / Setup'];
const TICKET_STATUS = ['Open', 'Assigned', 'In progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const LOST_REASONS = ['Price too high', 'Bought elsewhere', 'No response', 'Postponed / not now', 'Budget issue', 'Not feasible at site', 'Wrong / duplicate enquiry', 'Other'];
const AREAS = ['Edappally', 'Kakkanad', 'Aluva', 'Vyttila', 'Kalamassery', 'Thrippunithura', 'Perumbavoor', 'Angamaly', 'Palarivattom', 'Kaloor', 'Fort Kochi', 'Muvattupuzha', 'Kothamangalam', 'North Paravur'];
const ACCESSORIES = ['Charger / Adapter', 'Power cable', 'Battery', 'Bag', 'Mouse', 'Keyboard', 'HDD / SSD', 'RAM', 'Pen drive', 'Box'];
const ITEM_CATS = [['cctv', 'CCTV'], ['automation', 'Automation'], ['laptop', 'IT / Laptop'], ['chip', 'Service spares'], ['solar', 'Solar'], ['service', 'Service / Labour']];

const SURVEY_CHECKLIST = {
  cctv: ['Camera positions marked', 'Cable route checked', 'DVR/NVR location fixed', 'Power point near DVR', 'Internet available for mobile view', 'Ladder / height requirement noted', 'Night lighting checked'],
  automation: ['Switchboard depth checked', 'Neutral wire available', 'Wi-Fi coverage checked in all rooms', 'Curtain track measured', 'Door type checked for smart lock', 'Main panel / MCB checked'],
  solar: ['Roof type & strength checked', 'Shadow analysis done', 'Roof area measured', 'Inverter location fixed', 'Earthing pit location fixed', 'KSEB meter location checked', 'Consumer number & load verified', 'Cable route to DB checked'],
};

/* Category-specific lead fields: k=key, l=label, t=type, o=options */
const CAT_FIELDS = {
  cctv: [
    { k: 'cameras', l: 'No. of cameras', t: 'number' },
    { k: 'placement', l: 'Indoor / Outdoor', t: 'select', o: ['Indoor', 'Outdoor', 'Both'] },
    { k: 'camType', l: 'IP or HD', t: 'select', o: ['HD (Analog)', 'IP'] },
    { k: 'recDays', l: 'Recording days', t: 'number' },
    { k: 'mobileView', l: 'Mobile view', t: 'select', o: ['Yes', 'No'] },
  ],
  automation: [
    { k: 'rooms', l: 'No. of rooms', t: 'number' },
    { k: 'devices', l: 'Devices to automate', t: 'multi', o: ['Lights', 'Fans', 'Curtains', 'Locks', 'AC', 'Geyser', 'Gate'] },
    { k: 'assistant', l: 'Alexa / Google', t: 'select', o: ['Alexa', 'Google', 'Both', 'None'] },
    { k: 'wifi', l: 'Wi-Fi status', t: 'select', o: ['Good', 'Weak', 'Not available'] },
  ],
  laptop: [
    { k: 'product', l: 'Product type', t: 'select', o: ['Laptop', 'Desktop', 'Printer', 'Monitor', 'Peripherals', 'Networking'] },
    { k: 'usage', l: 'Usage', t: 'select', o: ['Office / Business', 'Student', 'Gaming', 'Design / Editing', 'Home'] },
    { k: 'brand', l: 'Preferred brand', t: 'select', o: ['Any', 'Dell', 'HP', 'Lenovo', 'Acer', 'Asus', 'Apple'] },
    { k: 'specs', l: 'Specs (CPU / RAM / SSD)', t: 'text' },
  ],
  chip: [
    { k: 'device', l: 'Device', t: 'select', o: ['Laptop', 'Desktop', 'Motherboard', 'Printer', 'Monitor'] },
    { k: 'brand', l: 'Brand', t: 'text' },
    { k: 'model', l: 'Model', t: 'text' },
    { k: 'serial', l: 'Serial no.', t: 'text' },
    { k: 'complaint', l: 'Complaint', t: 'textarea' },
  ],
  solar: [
    { k: 'bill', l: 'Monthly KSEB bill (₹)', t: 'number' },
    { k: 'consumerNo', l: 'KSEB consumer number', t: 'text' },
    { k: 'load', l: 'Sanctioned load (kW)', t: 'number' },
    { k: 'roof', l: 'Roof type', t: 'select', o: ['RCC (concrete)', 'Sheet (metal)', 'Tile', 'Ground mount'] },
    { k: 'system', l: 'System type', t: 'select', o: ['On-grid', 'Off-grid', 'Hybrid'] },
    { k: 'kw', l: 'kW needed', t: 'number' },
  ],
};

const DEFAULT_WA = {
  quotation: 'Hello {name},\nThank you for your enquiry with {business}.\nYour quotation {no} for {item} is ready.\nTotal: {amount} (incl. GST)\nValid till: {date}\n\nPlease reply to confirm or call {phoneBiz}.',
  jobstatus: 'Hello {name},\nUpdate from {business}: your {device} (Job {no}) is now at stage: *{status}*.\n{note}\nFor help call {phoneBiz}.',
  ready: 'Hello {name},\nGood news! Your {device} (Job {no}) is *ready for delivery*.\nAmount payable: {amount}\nPlease collect it from our shop. Thank you - {business}',
  payment: 'Hello {name},\nGentle reminder from {business}: Invoice {no} dated {date} has a pending balance of *{amount}*.\nYou can pay by UPI to {upi}.\nPlease ignore if already paid. Thank you!',
  amc: 'Hello {name},\nYour {item} AMC with {business} expires on {date}.\nRenew now to continue free service visits and priority support. Reply YES to renew.\n- {business}',
  review: 'Hello {name},\nThank you for choosing {business}! 🙏\nWe would love your feedback. Please rate us here: {review}',
  otp: 'Hello {name},\nYour work completion OTP for job {no} is *{otp}*.\nShare it with our technician only after the work is completed. - {business}',
  assign: 'New job assigned: {no}\n{item}\nCustomer: {name} ({phone})\nAddress: {address}\nWhen: {date}',
};
const WA_LABELS = { quotation: 'Quotation', jobstatus: 'Job status', ready: 'Delivery ready', payment: 'Payment reminder', amc: 'AMC / renewal reminder', review: 'Review request', otp: 'Completion OTP', assign: 'Job alert to technician' };

/* Menus and which roles see them */
const MENUS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', roles: ['admin', 'sales', 'frontdesk', 'accounts'] },
  { id: 'myjobs', label: 'My Jobs Today', icon: '🧰', roles: ['technician'] },
  { id: 'leads', label: 'Leads', icon: '📇', roles: ['admin', 'sales', 'frontdesk'] },
  { id: 'pipeline', label: 'Pipeline Board', icon: '📊', roles: ['admin', 'sales', 'frontdesk'] },
  { id: 'customers', label: 'Customers', icon: '👥', roles: ['admin', 'sales', 'frontdesk', 'accounts'] },
  { id: 'jobcards', label: 'Job Cards', icon: '🔧', roles: ['admin', 'frontdesk', 'technician'] },
  { id: 'rma', label: 'RMA & Warranty', icon: '🔁', roles: ['admin', 'frontdesk', 'technician'] },
  { id: 'surveys', label: 'Site Surveys', icon: '📐', roles: ['admin', 'sales', 'technician'] },
  { id: 'pcbuilder', label: 'PC Builder', icon: '🖥️', roles: ['admin', 'sales', 'frontdesk'] },
  { id: 'quotes', label: 'Quotations', icon: '📝', roles: ['admin', 'sales', 'frontdesk'] },
  { id: 'inventory', label: 'Inventory', icon: '📦', roles: ['admin', 'frontdesk', 'accounts'] },
  { id: 'billing', label: 'Billing & Dues', icon: '🧾', roles: ['admin', 'frontdesk', 'accounts'] },
  { id: 'expenses', label: 'Daybook & Expenses', icon: '📒', roles: ['admin', 'frontdesk', 'accounts'] },
  { id: 'amc', label: 'Warranty & AMC', icon: '🛡️', roles: ['admin', 'frontdesk', 'accounts'] },
  { id: 'licenses', label: 'Software Licenses', icon: '🔑', roles: ['admin', 'sales', 'frontdesk'] },
  { id: 'field', label: 'Field Tracking', icon: '📍', roles: ['admin'] },
  { id: 'attendance', label: 'Attendance', icon: '🕘', roles: ['admin', 'sales', 'frontdesk', 'technician', 'accounts'] },
  { id: 'performance', label: 'Performance', icon: '🏆', roles: ['admin', 'sales', 'technician'] },
  { id: 'reports', label: 'Reports', icon: '📈', roles: ['admin', 'accounts'] },
  { id: 'settings', label: 'Settings', icon: '⚙️', roles: ['admin'] },
];
/* detail routes inherit permission from a menu */
const ROUTE_PARENT = { lead: ['leads', 'pipeline'], customer: ['customers'], jobcard: ['jobcards'], quote: ['quotes'], invoice: ['billing'], survey: ['surveys'], rma_detail: ['rma'] };

/* ===== Small lookup helpers ===== */
const user = id => DB.get('users', id);
const userName = id => (user(id) || {}).name || '—';
const cust = id => DB.get('customers', id) || {};
const catLabel = k => (CATS[k] || {}).label || (ITEM_CATS.find(x => x[0] === k) || [])[1] || k || '—';
const catChip = k => CATS[k] ? `<span class="chip" style="background:${CATS[k].color}">${CATS[k].icon} ${esc(CATS[k].label)}</span>` : `<span class="badge">${esc(catLabel(k))}</span>`;
const scoreChip = s => s ? `<span class="score ${s}">${s}</span>` : '';
const badge = (t, c = 'grey') => `<span class="badge ${c}">${esc(t)}</span>`;
const users = role => DB.all('users').filter(u => u.active !== false && (!role || u.role === role || (Array.isArray(role) && role.includes(u.role))));
const userOpts = role => users(role).map(u => [u.id, u.name]);
const settings = () => App.settings;
