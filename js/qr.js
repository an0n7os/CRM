'use strict';
/* ===== Pure JS Offline QR Code SVG Generator =====
   Encodes alphanumeric/byte data and generates crisp, vector SVGs without external libraries. */
const QRCode = (() => {
  const PAD0 = 0xec, PAD1 = 0x11;
  const EXP_TABLE = new Uint8Array(512), LOG_TABLE = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) {
    EXP_TABLE[i] = x; EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  function gfMul(x, y) { return (x === 0 || y === 0) ? 0 : EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]; }
  function gfPolyMul(p, q) {
    const r = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++) {
      for (let j = 0; j < q.length; j++) {
        r[i + j] ^= gfMul(p[i], q[j]);
      }
    }
    return r;
  }
  function rsGenPoly(num) {
    let p = new Uint8Array([1]);
    for (let i = 0; i < num; i++) p = gfPolyMul(p, new Uint8Array([1, EXP_TABLE[i]]));
    return p;
  }
  function rsCompute(data, numEc) {
    const gen = rsGenPoly(numEc);
    const msg = new Uint8Array(data.length + numEc);
    msg.set(data);
    for (let i = 0; i < data.length; i++) {
      const coef = msg[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
    return msg.slice(data.length);
  }

  const VERSIONS = [
    null,
    { ver: 1, cap: 14, ec: 10, size: 21 },
    { ver: 2, cap: 26, ec: 16, size: 25 },
    { ver: 3, cap: 42, ec: 26, size: 29 },
    { ver: 4, cap: 62, ec: 36, size: 33 },
    { ver: 5, cap: 84, ec: 48, size: 37 },
    { ver: 6, cap: 106, ec: 64, size: 41 },
    { ver: 7, cap: 122, ec: 72, size: 45 },
    { ver: 8, cap: 152, ec: 88, size: 49 },
    { ver: 9, cap: 180, ec: 110, size: 53 },
    { ver: 10, cap: 213, ec: 130, size: 57 },
  ];

  function getAlignmentPatternPositions(ver) {
    if (ver === 1) return [];
    const interval = Math.floor((ver * 4 + 4) / (Math.floor(ver / 7) + 1));
    const pos = [6];
    let cur = ver * 4 + 17 - 3;
    const temp = [];
    while (cur > 6) { temp.unshift(cur); cur -= interval; }
    return pos.concat(temp);
  }

  function encodeData(str) {
    const utf8 = unescape(encodeURIComponent(str));
    const bytes = [];
    for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    let vSpec = VERSIONS.find(v => v && v.cap >= bytes.length + 3);
    if (!vSpec) vSpec = VERSIONS[VERSIONS.length - 1];

    const bits = [];
    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    }
    pushBits(4, 4);
    pushBits(bytes.length, vSpec.ver >= 10 ? 16 : 8);
    bytes.forEach(b => pushBits(b, 8));

    const padLen = vSpec.cap * 8;
    for (let i = 0; i < 4 && bits.length < padLen; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataWords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      dataWords.push(b);
    }
    let padByte = false;
    while (dataWords.length < vSpec.cap) {
      dataWords.push(padByte ? PAD1 : PAD0);
      padByte = !padByte;
    }

    const ecWords = Array.from(rsCompute(new Uint8Array(dataWords), vSpec.ec));
    return { ver: vSpec.ver, size: vSpec.size, words: dataWords.concat(ecWords) };
  }

  function makeMatrix(enc) {
    const size = enc.size;
    const m = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const res = Array.from({ length: size }, () => new Uint8Array(size));

    function setMod(r, c, v) { if (r >= 0 && r < size && c >= 0 && c < size) { m[r][c] = v; res[r][c] = 1; } }

    function finder(row, col) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setMod(row + r, col + c, isBlack ? 1 : 0);
        }
      }
    }
    finder(0, 0);
    finder(0, size - 7);
    finder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      if (!res[6][i]) setMod(6, i, i % 2 === 0 ? 1 : 0);
      if (!res[i][6]) setMod(i, 6, i % 2 === 0 ? 1 : 0);
    }

    const alignPos = getAlignmentPatternPositions(enc.ver);
    for (const r of alignPos) {
      for (const c of alignPos) {
        if (res[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setMod(r + dr, c + dc, isBlack ? 1 : 0);
          }
        }
      }
    }

    for (let i = 0; i < 9; i++) {
      if (!res[8][i]) setMod(8, i, 0);
      if (!res[i][8]) setMod(i, 8, 0);
      if (!res[8][size - 1 - i]) setMod(8, size - 1 - i, 0);
      if (!res[size - 1 - i][8]) setMod(size - 1 - i, 8, 0);
    }
    setMod(size - 8, 8, 1);

    let bitIdx = 0;
    const allBits = [];
    enc.words.forEach(w => {
      for (let i = 7; i >= 0; i--) allBits.push((w >>> i) & 1);
    });

    let inc = -1;
    let row = size - 1;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--;
      for (let vert = 0; vert < size; vert++) {
        const r = row;
        for (let c = right; c > right - 2; c--) {
          if (!res[r][c]) {
            const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
            const mask = ((r + c) % 2 === 0);
            m[r][c] = mask ? (bit ^ 1) : bit;
          }
        }
        row += inc;
      }
      row -= inc;
      inc = -inc;
    }

    const fmt = 0x5412;
    for (let i = 0; i < 15; i++) {
      const bit = (fmt >>> i) & 1;
      if (i < 6) m[8][i] = bit;
      else if (i < 8) m[8][i + 1] = bit;
      else m[8 - (i - 8) - 1][8] = bit;

      if (i < 8) m[size - 1 - i][8] = bit;
      else m[8][size - 15 + i] = bit;
    }

    return m;
  }

  return {
    svg(text, size = 120, margin = 2) {
      if (!text) return '';
      try {
        const enc = encodeData(String(text));
        const matrix = makeMatrix(enc);
        const n = matrix.length;
        const total = n + margin * 2;
        let paths = '';
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (matrix[r][c] === 1) {
              paths += `M${c + margin},${r + margin}h1v1h-1z `;
            }
          }
        }
        return `<svg viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges" style="display:inline-block;vertical-align:middle;background:#fff;border-radius:4px;padding:2px"><path fill="#000" d="${paths}"/></svg>`;
      } catch (e) {
        console.warn('QR error:', e);
        return `<div style="width:${size}px;height:${size}px;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;color:#888">QR</div>`;
      }
    },
    upiUri(upi, name, amount, note = '') {
      let u = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}`;
      if (amount && num(amount) > 0) u += `&am=${num(amount).toFixed(2)}&cu=INR`;
      if (note) u += `&tn=${encodeURIComponent(note.slice(0, 50))}`;
      return u;
    }
  };
})();
