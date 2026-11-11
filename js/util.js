'use strict';
/* ===== Generic helpers used by every screen ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDate(new Date());
const addDays = (iso, n) => { const d = iso ? new Date(iso + 'T00:00:00') : new Date(); d.setDate(d.getDate() + n); return isoDate(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const tsDate = ts => isoDate(new Date(ts));
const fmtDate = iso => { if (!iso) return '—'; const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso); if (isNaN(d)) return '—'; return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDT = ts => ts ? `${fmtDate(tsDate(ts))}, ${fmtTime(ts)}` : '—';
const ago = ts => { if (!ts) return '—'; const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' h ago'; return Math.round(h / 24) + ' d ago'; };
const monthKey = iso => String(iso).slice(0, 7);
const monthLabel = key => { const [y, m] = key.split('-'); return MONTHS[+m - 1] + ' ' + y.slice(2); };

const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const round2 = n => Math.round(n * 100) / 100;
const inr = (n, dec = 0) => (n < 0 ? '-₹' : '₹') + Math.abs(Number(n || 0)).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const short = n => { n = Number(n) || 0; const a = Math.abs(n); return a >= 1e7 ? (n / 1e7).toFixed(1) + 'Cr' : a >= 1e5 ? (n / 1e5).toFixed(1) + 'L' : a >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(Math.round(n)); };
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const validPhone = p => /^[6-9]\d{9}$/.test(String(p || '').trim());
const cleanPhone = p => String(p || '').replace(/\D/g, '').slice(-10);
const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const sum = (arr, f = x => x) => arr.reduce((s, x) => s + num(f(x)), 0);
const groupBy = (arr, f) => arr.reduce((o, x) => { const k = f(x); (o[k] = o[k] || []).push(x); return o; }, {});
const stripTags = s => String(s).replace(/<[^>]*>/g, '');

const opts = (list, sel, blank) => (blank != null ? `<option value="">${esc(blank)}</option>` : '') + list.map(o => {
  const [v, l] = Array.isArray(o) ? o : (typeof o === 'object' ? [o.value, o.label] : [o, o]);
  return `<option value="${esc(v)}" ${String(v) === String(sel ?? '') ? 'selected' : ''}>${esc(l)}</option>`;
}).join('');

/* safe localStorage (per-browser convenience only) */
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};

/* ===== Toast & modal ===== */
function toast(msg, type = 'ok') {
  const t = $('#toast');
  const ic = type === 'err' ? '⚠️' : '✓';
  t.innerHTML = `<span style="font-size:14px">${ic}</span> <span>${esc(msg)}</span>`;
  t.className = 'show ' + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.className = '', 3000);
}
function modal(title, body, o = {}) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal ${o.wide ? 'wide' : ''}"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" onclick="closeModal()" aria-label="Close">✕</button></div><div class="modal-body">${body}</div></div></div>`;
  const m = root.querySelector('.modal');
  const first = m.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea');
  if (first && !o.noFocus) setTimeout(() => first.focus(), 30);
  if (o.onOpen) o.onOpen(m);
  return m;
}
function closeModal() { $('#modalRoot').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modalRoot').innerHTML) closeModal(); });
function confirmBox(msg) { return window.confirm(msg); }
function promptModal(title, msg, defaultVal = '', onConfirm, o = {}) {
  return new Promise(resolve => {
    const isTextarea = o.textarea;
    const inputHtml = isTextarea 
      ? `<textarea id="pmInput" class="full" style="min-height:80px">${esc(defaultVal)}</textarea>`
      : `<input id="pmInput" type="${o.type || 'text'}" value="${esc(defaultVal)}" ${o.step ? `step="${o.step}"` : ''} ${o.min ? `min="${o.min}"` : ''}>`;
    
    const m = modal(title, `<form id="pmForm">
      <div style="margin-bottom:12px;font-size:13.5px;color:#334155">${esc(msg)}</div>
      <div style="margin-bottom:16px">${inputHtml}</div>
      <div class="row" style="justify-content:flex-end;gap:8px">
        <button type="button" class="btn" id="pmCancel">Cancel</button>
        <button type="submit" class="btn primary">Confirm</button>
      </div>
    </form>`);
    
    const cancelBtn = m.querySelector('#pmCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      closeModal();
      if (onConfirm) onConfirm(null);
      resolve(null);
    };
    m.querySelector('#pmForm').onsubmit = e => {
      e.preventDefault();
      const val = m.querySelector('#pmInput').value;
      closeModal();
      if (onConfirm) onConfirm(val);
      resolve(val);
    };
    const inp = m.querySelector('#pmInput');
    if (inp) { inp.focus(); if (inp.select) inp.select(); }
  });
}
function viewImage(src) {
  const w = window.open('', '_blank');
  if (w) { w.document.write(`<title>Photo</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${src}" style="max-width:100%;max-height:100vh">`); }
}

/* ===== Forms ===== */
function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  $$('input[type=checkbox][name]', form).forEach(c => {
    if (c.dataset.multi !== undefined) o[c.name] = $$(`input[type=checkbox][name="${c.name}"]:checked`, form).map(x => x.value);
    else o[c.name] = c.checked;
  });
  return o;
}
function field(label, inner, cls = '') { return `<div class="fld ${cls}"><label>${label}</label>${inner}</div>`; }
function inp(name, val = '', type = 'text', extra = '') { return `<input name="${name}" type="${type}" value="${esc(val)}" ${extra}>`; }
function sel(name, list, val, blank, extra = '') { return `<select name="${name}" ${extra}>${opts(list, val, blank)}</select>`; }
function txt(name, val = '', extra = '') { return `<textarea name="${name}" ${extra}>${esc(val)}</textarea>`; }
function checks(name, list, vals = []) { return `<div class="checks">${list.map(v => `<label><input type="checkbox" name="${name}" value="${esc(v)}" data-multi ${vals.includes(v) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div>`; }

/* ===== Images ===== */
function readImage(file, max = 1000, q = 0.7) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej; img.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
async function readImages(input) { const out = []; for (const f of input.files) { try { out.push(await readImage(f)); } catch (e) { toast('Could not read ' + f.name, 'err'); } } return out; }
function photoGrid(photos = [], removeFn) {
  return `<div class="photos">${photos.map((p, i) => `<div class="photo"><img src="${p}" onclick="viewImage(this.src)" alt="photo">${removeFn ? `<button type="button" onclick="${removeFn}(${i})" title="Remove">✕</button>` : ''}</div>`).join('')}</div>`;
}
function photoAdd(onchange, label = 'Add photo') {
  return `<label class="photo-add">📷<span>${label}</span><input type="file" accept="image/*" capture="environment" multiple onchange="${onchange}"></label>`;
}

/* ===== GPS ===== */
function getGPS() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) }),
      () => res(null), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
}
function haversine(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const mapLink = g => g ? `<a href="https://maps.google.com/?q=${g.lat},${g.lng}" target="_blank" rel="noopener">📍 ${(+g.lat).toFixed(4)}, ${(+g.lng).toFixed(4)}</a>` : '<span class="muted">No GPS</span>';
const mapSearch = addr => `https://maps.google.com/?q=${encodeURIComponent(addr || '')}`;

/* ===== WhatsApp (wa.me links) ===== */
function waURL(phone, text) { return `https://wa.me/91${cleanPhone(phone)}?text=${encodeURIComponent(text)}`; }
function openWA(phone, text) {
  if (!validPhone(cleanPhone(phone))) return toast('WhatsApp number is not a valid 10-digit number', 'err');
  window.open(waURL(phone, text), '_blank');
}
function fillTpl(tpl, data) { return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => data[k] != null ? data[k] : m); }
function waText(key, data) {
  const s = App.settings;
  return fillTpl(s.wa[key] || DEFAULT_WA[key], { business: s.bizName, phoneBiz: s.phone, review: s.reviewLink, upi: s.upi, ...data });
}
/* Shows a picker of WhatsApp messages; each item {key,label,data}. User can edit before sending. */
function waPicker(phone, name, items) {
  if (!items.length) return toast('No WhatsApp messages available here', 'err');
  window._waItems = items;
  modal('Send on WhatsApp — ' + name, `
    <div class="row mb">${items.map((it, i) => `<button class="btn sm ${i === 0 ? 'primary' : ''}" data-wa="${i}" onclick="waPick(${i})">${esc(it.label)}</button>`).join('')}</div>
    ${field('To (WhatsApp number)', `<input id="waTo" value="${esc(cleanPhone(phone))}" maxlength="10" inputmode="numeric">`)}
    <div class="mt">${field('Message (you can edit)', `<textarea id="waMsg" style="min-height:150px"></textarea>`)}</div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn wa" onclick="openWA($('#waTo').value,$('#waMsg').value);closeModal()">Open WhatsApp</button></div>`,
    { onOpen: () => waPick(0), noFocus: true });
}
function waPick(i) {
  const it = window._waItems[i];
  $$('[data-wa]').forEach(b => b.classList.toggle('primary', +b.dataset.wa === i));
  $('#waMsg').value = waText(it.key, it.data || {});
}

/* ===== Files / CSV ===== */
function toCSV(rows) { return rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n'); }
function downloadFile(name, content, mime = 'text/plain') {
  const b = new Blob([content], { type: mime }); const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
function downloadCSV(name, rows) { downloadFile(name.endsWith('.csv') ? name : name + '.csv', '﻿' + toCSV(rows), 'text/csv;charset=utf-8'); toast('Exported ' + (rows.length - 1) + ' rows'); }

/* ===== Money in words (Indian system) ===== */
function inWords(n) {
  n = Math.round(Math.abs(n));
  if (n === 0) return 'Rupees Zero Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
  const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const parts = [];
  const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (n) parts.push(three(n));
  return 'Rupees ' + parts.join(' ') + ' Only';
}

/* ===== GST totals ===== */
function calcTotals(lines, discount = 0, interstate = false) {
  const sub = sum(lines, l => num(l.qty) * num(l.rate));
  const disc = Math.min(num(discount), sub);
  const f = sub > 0 ? 1 - disc / sub : 1;
  const byHsn = {}; let tax = 0;
  lines.forEach(l => {
    const taxable = num(l.qty) * num(l.rate) * f; const r = num(l.gst); const t = taxable * r / 100; tax += t;
    const k = (l.hsn || '-') + '|' + r; byHsn[k] = byHsn[k] || { hsn: l.hsn || '-', rate: r, taxable: 0, tax: 0 };
    byHsn[k].taxable += taxable; byHsn[k].tax += t;
  });
  const taxable = sub - disc; const exact = taxable + tax; const total = Math.round(exact);
  return { sub, discount: disc, taxable, tax, cgst: interstate ? 0 : tax / 2, sgst: interstate ? 0 : tax / 2, igst: interstate ? tax : 0, roundOff: total - exact, total, byHsn: Object.values(byHsn) };
}

/* ===== Printing ===== */
function printPreview(title, html) {
  window._printHTML = html;
  modal(title, `<div class="doc-preview"><div class="doc">${html}</div></div><div class="modal-foot"><button class="btn" onclick="closeModal()">Close</button><button class="btn primary" onclick="printNow()">🖨️ Print / Save as PDF</button></div>`, { wide: true, noFocus: true });
}
function printNow() {
  $('#print-area').innerHTML = `<div class="doc">${window._printHTML}</div>`;
  document.body.classList.add('printing');
  setTimeout(() => window.print(), 150);
}
window.addEventListener('afterprint', () => { document.body.classList.remove('printing'); $('#print-area').innerHTML = ''; });

/* ===== Signature pad ===== */
function sigPad(canvas) {
  const r = canvas.getBoundingClientRect(); canvas.width = r.width * 2 || 600; canvas.height = r.height * 2 || 320;
  const ctx = canvas.getContext('2d'); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  let down = false, dirty = false;
  const pos = e => { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left) * canvas.width / b.width, (e.clientY - b.top) * canvas.height / b.height]; };
  canvas.addEventListener('pointerdown', e => { down = true; dirty = true; canvas.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); });
  canvas.addEventListener('pointermove', e => { if (!down) return; ctx.lineTo(...pos(e)); ctx.stroke(); });
  canvas.addEventListener('pointerup', () => down = false);
  return { clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; }, isEmpty: () => !dirty, data: () => canvas.toDataURL('image/png') };
}

/* ===== Tables & charts ===== */
function table(headers, rows, o = {}) {
  if (!rows.length) return `<div class="empty">${o.empty || 'No records found'}</div>`;
  const hs = headers.map(h => typeof h === 'string' ? { t: h } : h);
  return `<div class="table-wrap"><table class="tbl ${o.cards === false ? '' : 'cards'}"><thead><tr>${hs.map(h => `<th class="${h.num ? 'num' : ''}">${h.t}</th>`).join('')}</tr></thead><tbody>${rows.map(r => {
    const cells = Array.isArray(r) ? r : r.cells;
    return `<tr ${r.attrs || ''}>${cells.map((c, i) => `<td class="${hs[i] && hs[i].num ? 'num' : ''}" data-label="${esc(stripTags(hs[i] ? hs[i].t : ''))}">${c ?? ''}</td>`).join('')}</tr>`;
  }).join('')}</tbody>${o.foot ? `<tfoot><tr>${o.foot.map((c, i) => `<td class="${hs[i] && hs[i].num ? 'num' : ''}" data-label="${esc(stripTags(hs[i] ? hs[i].t : ''))}">${c ?? ''}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}
function hbars(rows, fmt = v => v) {
  if (!rows.length) return '<div class="empty">No data</div>';
  const max = Math.max(1, ...rows.map(r => r.value));
  return `<div class="hbars">${rows.map(r => `<div class="hbar"><span class="hb-label" title="${esc(r.label)}">${esc(r.label)}</span><span class="hb-track"><span class="hb-fill" style="width:${(r.value / max * 100).toFixed(1)}%;${r.color ? 'background:' + r.color : ''}"></span></span><span class="hb-val">${fmt(r.value)}${r.extra ? ` <small class="muted">${r.extra}</small>` : ''}</span></div>`).join('')}</div>`;
}
function columns(rows, fmt = short) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return `<div class="cols">${rows.map(r => `<div class="col" title="${esc(r.label)}: ${esc(fmt(r.value))}"><span class="col-val">${short(r.value)}</span><span class="col-bar" style="height:${(r.value / max * 85).toFixed(1)}%"></span><span class="col-label">${esc(r.label)}</span></div>`).join('')}</div>`;
}
function kpi(label, val, sub = '', cls = '', onclick = '') {
  return `<div class="kpi ${cls}" ${onclick ? `onclick="${onclick}"` : ''}><div class="k-label">${label}</div><div class="k-val">${val}</div>${sub ? `<div class="k-sub">${sub}</div>` : ''}</div>`;
}
function tabs(list, cur, fn) { return `<div class="tabs">${list.map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`; }

/* ===== Date range presets (reports / performance) ===== */
function fyStart(d = new Date()) { const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-04-01`; }
function rangePreset(k) {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  const first = (yy, mm) => isoDate(new Date(yy, mm, 1)); const last = (yy, mm) => isoDate(new Date(yy, mm + 1, 0));
  switch (k) {
    case 'today': return [today(), today()];
    case 'month': return [first(y, m), today()];
    case 'lastmonth': return [first(y, m - 1), last(y, m - 1)];
    case 'quarter': { const qs = Math.floor(m / 3) * 3; return [first(y, qs), today()]; }
    case 'fy': return [fyStart(d), today()];
    case '12m': return [first(y, m - 11), today()];
    default: return [first(y, m), today()];
  }
}
const RANGE_PRESETS = [['today', 'Today'], ['month', 'This month'], ['lastmonth', 'Last month'], ['quarter', 'This quarter'], ['fy', 'This financial year'], ['12m', 'Last 12 months'], ['custom', 'Custom']];
const inRange = (iso, from, to) => iso && iso >= from && iso <= to;
