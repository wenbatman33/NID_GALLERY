// 假圖：人物讀取 assets/portraits/<id>.jpg，缺檔時退回程序化肖像；作品是 16 種生成圖樣。
// 程序化圖在瀏覽器當場算出，相同種子永遠得到相同的圖。
// 注意：file:// 下照片會污染 canvas，只能 drawImage，不可對照片做 getImageData。
window.NID_IMAGERY = (function () {
  const SIZE = 512;
  const TAU = Math.PI * 2;
  const PHOTO_DIR = 'assets/portraits/';
  const photos = {};
  let photoPending = 0;

  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
  const pick = (r, list) => list[Math.floor(r() * list.length)];
  const range = (r, a, b) => a + (b - a) * r();
  const lerpTo = (a, b, t) => a + (b - a) * Math.min(1, t);

  // 後製：對比、去飽和／單色調、顆粒、暗角，模擬 2007 年的數位照片質感
  function finish(c, opt) {
    const o = Object.assign({ contrast: 1.15, grain: 8, vignette: 0.28, tint: null, bright: 0 }, opt);
    const x = c.getContext('2d');
    const img = x.getImageData(0, 0, c.width, c.height);
    const d = img.data, W = c.width, H = c.height;
    const r = makeRng(o.seed || 1);
    for (let y = 0, i = 0; y < H; y++) {
      const dy = y / H - 0.5;
      for (let px = 0; px < W; px++, i += 4) {
        const dx = px / W - 0.5;
        const v = 1 - o.vignette * (dx * dx + dy * dy) * 2;
        const n = (r() - 0.5) * o.grain;
        let R = d[i], G = d[i + 1], B = d[i + 2];
        if (o.tint) {
          const l = (R * 0.3 + G * 0.59 + B * 0.11) / 255;
          R = o.tint[0] * l; G = o.tint[1] * l; B = o.tint[2] * l;
        }
        d[i] = ((R - 128) * o.contrast + 128 + o.bright) * v + n;
        d[i + 1] = ((G - 128) * o.contrast + 128 + o.bright) * v + n;
        d[i + 2] = ((B - 128) * o.contrast + 128 + o.bright) * v + n;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // 兩段式放大，得到柔和但不糊成一片的畫面
  function upscale(src) {
    const mid = canvasOf(SIZE >> 1);
    const m = mid.getContext('2d');
    m.imageSmoothingEnabled = true; m.imageSmoothingQuality = 'high';
    m.drawImage(src, 0, 0, mid.width, mid.height);
    const out = canvasOf(SIZE);
    const o = out.getContext('2d');
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    o.drawImage(mid, 0, 0, SIZE, SIZE);
    return out;
  }

  // ───────── 肖像 ─────────
  const SKIN = ['#f3cdb0', '#eab890', '#deA87c', '#cf9468', '#f7dcc6', '#b87f54'];
  const HAIR = ['#141010', '#201513', '#2f2019', '#4a2f20', '#0d0d12', '#6e4426', '#a79f92'];
  const CLOTH = ['#16161c', '#1d2436', '#2a2a2a', '#f0efe9', '#7a1f1f', '#2f5d4a', '#c9b48a', '#32486b'];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }
  function ellipse(x, cx, cy, rx, ry, rot) {
    x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); x.fill();
  }

  function paintBackdrop(x, r, n) {
    const kind = pick(r, ['white', 'white', 'white', 'wall', 'dark', 'color', 'leaf', 'split', 'warm']);
    if (kind === 'white') {
      x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, n, n);
    } else if (kind === 'wall') {
      x.fillStyle = '#6f6a63'; x.fillRect(0, 0, n, n);
      for (let row = 0; row < 16; row++) {
        const off = row % 2 ? 6 : 0;
        for (let col = -1; col < 10; col++) {
          x.fillStyle = shade('#6f6a63', range(r, -0.1, 0.1));
          x.fillRect(col * 13 + off, row * 8, 12, 7);
        }
      }
    } else if (kind === 'dark') {
      const g = x.createRadialGradient(n * 0.3, n * 0.3, 2, n * 0.4, n * 0.4, n * 0.9);
      g.addColorStop(0, pick(r, ['#233a66', '#3a2340', '#1e3f3a']));
      g.addColorStop(1, '#050507');
      x.fillStyle = g; x.fillRect(0, 0, n, n);
    } else if (kind === 'color') {
      const g = x.createLinearGradient(0, 0, n, n);
      const pair = pick(r, [['#ff7a1a', '#ffd84a'], ['#1f7fe0', '#74d8ff'], ['#e23a3a', '#ff9a6a'], ['#f2c84b', '#f7f0c2']]);
      g.addColorStop(0, pair[0]); g.addColorStop(1, pair[1]);
      x.fillStyle = g; x.fillRect(0, 0, n, n);
    } else if (kind === 'leaf') {
      x.fillStyle = '#3f5f2c'; x.fillRect(0, 0, n, n);
      for (let i = 0; i < 90; i++) {
        x.fillStyle = pick(r, ['#8fb45a', '#c9dc8e', '#2f4a22', '#eaf2c8']);
        ellipse(x, r() * n, r() * n, range(r, 2, 7), range(r, 1.5, 5), r() * 3);
      }
    } else if (kind === 'split') {
      x.fillStyle = '#f8f7f3'; x.fillRect(0, 0, n, n);
      x.fillStyle = '#1b1a1d';
      x.beginPath();
      const edge = range(r, 0.15, 0.4) * n;
      x.moveTo(0, 0); x.lineTo(edge, 0); x.lineTo(edge * range(r, 0.6, 1.3), n); x.lineTo(0, n); x.fill();
    } else {
      const g = x.createLinearGradient(0, 0, 0, n);
      g.addColorStop(0, '#f6e2c0'); g.addColorStop(1, '#c98a4a');
      x.fillStyle = g; x.fillRect(0, 0, n, n);
    }
  }

  const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const bump = (u, v, cu, cv, su, sv, a) => {
    const du = (u - cu) / su, dv = (v - cv) / sv;
    return a * Math.exp(-(du * du + dv * dv));
  };

  // 臉部高度場：u、v 為 -1～1 的頭部座標，f 是隨轉頭位移後的五官橫座標
  function faceHeight(u, v, yaw) {
    const r2 = u * u + v * v;
    if (r2 >= 1) return 0;
    const f = u - yaw * 0.34;
    let z = Math.sqrt(1 - r2);
    z += bump(f, v, 0, 0.16, 0.085, 0.3, 0.17);      // 鼻樑
    z += bump(f, v, 0, 0.36, 0.13, 0.085, 0.11);     // 鼻頭
    z -= bump(f, v, -0.38, -0.03, 0.2, 0.1, 0.13);   // 眼窩
    z -= bump(f, v, 0.38, -0.03, 0.2, 0.1, 0.13);
    z += bump(f, v, -0.36, -0.24, 0.27, 0.07, 0.06); // 眉骨
    z += bump(f, v, 0.36, -0.24, 0.27, 0.07, 0.06);
    z += bump(f, v, -0.52, 0.3, 0.25, 0.22, 0.05);   // 顴骨
    z += bump(f, v, 0.52, 0.3, 0.25, 0.22, 0.05);
    z += bump(f, v, 0, 0.63, 0.22, 0.06, 0.05);      // 嘴唇
    z -= bump(f, v, 0, 0.52, 0.11, 0.03, 0.03);      // 人中
    z += bump(f, v, 0, 0.87, 0.24, 0.12, 0.06);      // 下巴
    return z;
  }

  const HAIRLINE = {
    short: (u) => -0.52 + 0.25 * u * u,
    parted: (u) => -0.62 + 0.75 * (u - 0.22) * (u - 0.22),
    fringe: (u, p) => -0.17 + 0.035 * Math.sin(u * 14 + p),
    spiky: (u, p) => -0.55 + 0.08 * Math.sin(u * 22 + p),
    long: (u) => -0.6 + 0.55 * u * u,
    bob: (u, p) => -0.2 + 0.03 * Math.sin(u * 10 + p),
    tied: (u) => -0.6 + 0.3 * u * u
  };

  function portrait(seed) {
    const r = makeRng(seed);
    const n = 150, unit = n / 128;
    const c = canvasOf(n), x = c.getContext('2d');
    x.save(); x.scale(unit, unit); paintBackdrop(x, r, 128); x.restore();

    const skinHex = pick(r, SKIN), hairHex = pick(r, HAIR), cloth = pick(r, CLOTH);
    const skin = hexRgb(skinHex), hair = hexRgb(hairHex);
    const style = pick(r, ['short', 'short', 'parted', 'spiky', 'long', 'bob', 'fringe', 'tied', 'bald']);
    const zoom = range(r, 1.3, 2.2) * unit;
    const rx = 23 * zoom, ry = 29 * zoom;
    const hx = n / 2 + range(r, -26, 26), hy = n * 0.46 + range(r, -8, 14);
    const tilt = range(r, -0.15, 0.15), yaw = range(r, -0.55, 0.55);
    const phase = r() * 6;
    const lightLen = 1;
    const light = (() => {
      const a = [range(r, -0.8, 0.8), range(r, -0.6, -0.12), 0.68];
      const l = Math.hypot(a[0], a[1], a[2]) / lightLen;
      return [a[0] / l, a[1] / l, a[2] / l];
    })();

    // 身體與後髮：平塗即可，最後柔焦會把邊緣吃掉
    x.save();
    x.translate(hx, hy); x.rotate(tilt * 0.4); x.scale(zoom, zoom);
    x.fillStyle = hairHex;
    if (style === 'long') ellipse(x, 0, 14, 31, 48);
    if (style === 'bob') ellipse(x, 0, 3, 29.5, 33);
    if (style === 'tied') ellipse(x, 0, -31, 11, 10);
    const g = x.createLinearGradient(-50, 0, 50, 0);
    g.addColorStop(light[0] > 0 ? 0 : 1, shade(cloth, -0.12));
    g.addColorStop(light[0] > 0 ? 1 : 0, shade(cloth, 0.08));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(-58, 90); x.quadraticCurveTo(-54, 36, -15, 31); x.lineTo(15, 31); x.quadraticCurveTo(54, 36, 58, 90); x.fill();
    if (r() > 0.45) {
      x.fillStyle = '#ecebe5';
      x.beginPath(); x.moveTo(-10, 29); x.lineTo(0, 48); x.lineTo(10, 29); x.fill();
      if (r() > 0.5) {
        x.fillStyle = pick(r, ['#b58a2c', '#7a1f1f', '#23324f']);
        x.beginPath(); x.moveTo(-2.4, 33); x.lineTo(2.4, 33); x.lineTo(4, 66); x.lineTo(-4, 66); x.fill();
      }
    }
    x.fillStyle = shade(skinHex, -0.16);
    x.fillRect(-9.5, 18, 19, 15);
    x.restore();

    // 頭部逐像素打光
    const img = x.getImageData(0, 0, n, n), d = img.data;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const line = HAIRLINE[style];
    const sides = style === 'long' || style === 'bob';
    const e = 0.025;
    const flush = range(r, 0, 0.12);
    const half = [(light[0]), (light[1]), (light[2] + 1)];
    const hl = Math.hypot(half[0], half[1], half[2]);
    for (let py = 0; py < n; py++) {
      for (let px = 0; px < n; px++) {
        const dx = px - hx, dy = py - hy;
        const u = (dx * ct + dy * st) / rx, v = (-dx * st + dy * ct) / ry;
        const head = Math.hypot(u, v);
        const outer = line && v < 0.2 ? Math.hypot(u / 1.14, (v + 0.05) / 1.17) : 9;
        if (head >= 1.03 && outer >= 1) continue;

        const onHair = line && (head >= 1 || v < line(u, phase) || (sides && Math.abs(u) > 0.84 && v < 0.75));
        let nx, ny, nz, cr, cg, cb, gloss;
        if (onHair) {
          const q = Math.min(0.995, outer < 9 ? outer : head);
          nz = Math.sqrt(1 - q * q); nx = u * 0.86; ny = (v + 0.05) * 0.84;
          const strand = 1 + 0.2 * Math.sin(u * 46 + Math.sin(v * 8 + phase) * 3);
          cr = hair[0] * strand + 8; cg = hair[1] * strand + 7; cb = hair[2] * strand + 7;
          gloss = 0.55;
        } else {
          const z0 = faceHeight(u, v, yaw);
          const zu = (faceHeight(u + e, v, yaw) - faceHeight(u - e, v, yaw)) / (2 * e);
          const zv = (faceHeight(u, v + e, yaw) - faceHeight(u, v - e, yaw)) / (2 * e);
          const limb = z0 <= 0 ? 0.2 : 1;
          nx = -zu * limb; ny = -zv * limb; nz = 1;
          cr = skin[0]; cg = skin[1]; cb = skin[2];
          const f = u - yaw * 0.34;
          const eyeL = bump(f, v, -0.38, -0.03, 0.15, 0.05, 1), eyeR = bump(f, v, 0.38, -0.03, 0.15, 0.05, 1);
          const irisL = bump(f, v, -0.38, -0.03, 0.07, 0.05, 1), irisR = bump(f, v, 0.38, -0.03, 0.07, 0.05, 1);
          const lash = bump(f, v, -0.38, -0.085, 0.17, 0.022, 0.8) + bump(f, v, 0.38, -0.085, 0.17, 0.022, 0.8);
          const brow = bump(f, v, -0.38, -0.27, 0.22, 0.032, 0.9) + bump(f, v, 0.38, -0.27, 0.22, 0.032, 0.9);
          const lip = bump(f, v, 0, 0.63, 0.2, 0.05, 0.8);
          const nostril = bump(f, v, -0.09, 0.44, 0.045, 0.025, 0.5) + bump(f, v, 0.09, 0.44, 0.045, 0.025, 0.5);
          const cheek = bump(f, v, -0.5, 0.3, 0.24, 0.2, flush) + bump(f, v, 0.5, 0.3, 0.24, 0.2, flush);
          const white = (eyeL + eyeR) * 0.3;
          cr = lerpTo(cr, 225, white); cg = lerpTo(cg, 215, white); cb = lerpTo(cb, 205, white);
          const dark = Math.min(1, irisL + irisR + lash + brow + nostril);
          cr = lerpTo(cr, 28, dark); cg = lerpTo(cg, 20, dark); cb = lerpTo(cb, 18, dark);
          cr = lerpTo(cr, 150, lip); cg = lerpTo(cg, 62, lip); cb = lerpTo(cb, 58, lip);
          cr = lerpTo(cr, 214, cheek); cg = lerpTo(cg, 118, cheek); cb = lerpTo(cb, 108, cheek);
          gloss = 0.3;
        }
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;
        const diff = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
        const spec = Math.pow(Math.max(0, (nx * half[0] + ny * half[1] + nz * half[2]) / hl), 22) * gloss * 255;
        const lit = 0.34 + diff * 0.92;
        const alpha = onHair ? Math.min(1, (1 - Math.min(outer, head)) / 0.05 + 0.4) : Math.min(1, (1.02 - head) / 0.05);
        if (alpha <= 0) continue;
        const i = (py * n + px) * 4;
        d[i] = lerpTo(d[i], cr * lit + spec, alpha);
        d[i + 1] = lerpTo(d[i + 1], cg * lit + spec, alpha);
        d[i + 2] = lerpTo(d[i + 2], cb * lit + spec, alpha);
      }
    }
    x.putImageData(img, 0, 0);

    // 柔焦＋暈光：疊一層極低解析度的版本，讓畫面像失焦的舊照片
    const out = upscale(c), o = out.getContext('2d');
    const tiny = canvasOf(34), t = tiny.getContext('2d');
    t.imageSmoothingQuality = 'high';
    t.drawImage(c, 0, 0, 34, 34);
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    o.globalAlpha = 0.6;
    o.drawImage(tiny, 0, 0, SIZE, SIZE);
    o.globalCompositeOperation = 'screen';
    o.globalAlpha = 0.28;
    o.drawImage(tiny, 0, 0, SIZE, SIZE);
    o.globalAlpha = 1;
    o.globalCompositeOperation = 'source-over';

    const mood = r();
    const tint = mood < 0.16 ? [245, 245, 240] : mood < 0.26 ? [96, 172, 255] : mood < 0.34 ? [255, 202, 124] : null;
    return finish(out, { seed, contrast: 1.42, grain: 17, vignette: 0.3, tint, bright: 6 });
  }

  // ───────── 作品 ─────────
  const ART = {
    neon(x, r) {
      const g = x.createRadialGradient(256, 240, 30, 256, 256, 400);
      g.addColorStop(0, '#0a2e9e'); g.addColorStop(1, '#010418');
      x.fillStyle = g; x.fillRect(0, 0, SIZE, SIZE);
      x.globalCompositeOperation = 'lighter';
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (let line = 0; line < 7; line++) {
        const y = 110 + line * 48 + range(r, -14, 14);
        const pts = [];
        let px = 60 + r() * 60;
        while (px < 460) { pts.push([px, y + range(r, -26, 26)]); px += range(r, 10, 34); }
        for (const [w, a] of [[16, 0.05], [8, 0.1], [3, 0.5], [1.4, 0.95]]) {
          x.strokeStyle = `rgba(90,190,255,${a})`;
          x.lineWidth = w;
          x.beginPath();
          pts.forEach(([a1, b1], i) => (i ? x.lineTo(a1, b1) : x.moveTo(a1, b1)));
          x.stroke();
        }
      }
      x.globalCompositeOperation = 'source-over';
    },
    scatter(x, r) {
      x.fillStyle = '#04030a'; x.fillRect(0, 0, SIZE, SIZE);
      x.globalCompositeOperation = 'lighter';
      const cols = pick(r, [['#ff3fb4', '#ffffff', '#b04dff'], ['#7fd6ff', '#ffffff', '#3a7bff'], ['#ffd34d', '#ffffff', '#ff6a3d']]);
      const seeds = Array.from({ length: 11 }, () => [r() * SIZE, r() * SIZE]);
      for (let i = 0; i < 2600; i++) {
        const c = pick(r, seeds);
        const rad = Math.pow(r(), 2) * 120, a = r() * TAU;
        const s = range(r, 1.5, 7);
        x.globalAlpha = range(r, 0.25, 0.95);
        x.fillStyle = pick(r, cols);
        x.fillRect(c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad, s, s);
      }
      x.globalAlpha = 1;
      x.globalCompositeOperation = 'source-over';
    },
    shard(x, r) {
      const g = x.createLinearGradient(0, 0, SIZE, SIZE);
      g.addColorStop(0, '#111114'); g.addColorStop(1, '#2c2d33');
      x.fillStyle = g; x.fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 5; i++) {
        const ax = range(r, 40, 470), ay = range(r, 20, 480);
        const f = x.createLinearGradient(ax, ay, ax + range(r, -300, 300), ay + 300);
        f.addColorStop(0, `rgba(255,255,255,${range(r, 0.6, 1)})`);
        f.addColorStop(1, 'rgba(120,125,140,0.05)');
        x.fillStyle = f;
        x.beginPath();
        x.moveTo(ax, ay);
        x.lineTo(ax + range(r, -260, 260), ay + range(r, 60, 420));
        x.lineTo(ax + range(r, -200, 200), ay + range(r, 120, 460));
        x.fill();
      }
    },
    paper(x, r) {
      const base = pick(r, ['#c6d774', '#d8c98a', '#e6e2c8', '#b9cf9a']);
      x.fillStyle = base; x.fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 3200; i++) {
        x.strokeStyle = r() > 0.5 ? 'rgba(255,255,230,0.3)' : 'rgba(60,90,30,0.2)';
        x.lineWidth = range(r, 0.5, 2);
        const px = r() * SIZE, py = r() * SIZE, a = r() * TAU, l = range(r, 8, 44);
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
      }
    },
    splatter(x, r) {
      x.fillStyle = '#f7f5ef'; x.fillRect(0, 0, SIZE, SIZE);
      x.fillStyle = '#0c0c0e';
      for (let c = 0; c < 9; c++) {
        const cx = r() * SIZE, cy = r() * SIZE, big = range(r, 18, 70);
        ellipse(x, cx, cy, big, big * range(r, 0.6, 1.1), r() * 3);
        for (let i = 0; i < 70; i++) {
          const a = r() * TAU, d = big + Math.pow(r(), 2) * 170, s = range(r, 1, 9) * (1 - d / 300);
          if (s > 0) ellipse(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, s);
        }
      }
    },
    crackle(x, r) {
      // 低解析度 Voronoi：取最近與次近距離差作為裂紋
      const n = 170, c = canvasOf(n), m = c.getContext('2d');
      const img = m.createImageData(n, n);
      const pts = Array.from({ length: 46 }, () => [r() * n, r() * n, r()]);
      const tone = pick(r, [[120, 215, 230], [240, 225, 190], [210, 170, 200]]);
      for (let py = 0, i = 0; py < n; py++) {
        for (let px = 0; px < n; px++, i += 4) {
          let a = 1e9, b = 1e9, id = 0;
          for (let k = 0; k < pts.length; k++) {
            const dx = pts[k][0] - px, dy = pts[k][1] - py, d = dx * dx + dy * dy;
            if (d < a) { b = a; a = d; id = k; } else if (d < b) { b = d; }
          }
          const edge = Math.min(1, (Math.sqrt(b) - Math.sqrt(a)) / 2.2);
          const l = (0.72 + pts[id][2] * 0.4) * edge;
          img.data[i] = tone[0] * l; img.data[i + 1] = tone[1] * l; img.data[i + 2] = tone[2] * l; img.data[i + 3] = 255;
        }
      }
      m.putImageData(img, 0, 0);
      x.imageSmoothingQuality = 'high';
      x.drawImage(c, 0, 0, SIZE, SIZE);
    },
    strata(x, r) {
      const palette = pick(r, [
        ['#14233f', '#e8503a', '#f6b24a', '#f7e8c9', '#4fa7c9', '#2a3f73', '#d94f7b'],
        ['#10241d', '#7fbf6a', '#f0e68c', '#ef7f4f', '#a33b5a', '#f6f1dd', '#2f6f8f'],
        ['#2b1a3f', '#ff7ab8', '#ffd86b', '#82e0d6', '#f4f2ea', '#3d62d6', '#e0483e']
      ]);
      const a1 = r() * 6, f = range(r, 0.006, 0.014), lean = range(r, -0.5, 0.5);
      for (let band = -2; band < 24; band++) {
        x.fillStyle = palette[(band + 40) % palette.length];
        x.beginPath();
        x.moveTo(0, SIZE + 40);
        for (let px = 0; px <= SIZE; px += 8) {
          const y = band * 26 + px * lean + Math.sin(px * f + a1 + band * 0.2) * 36 + Math.sin(px * f * 3.1 + band) * 8;
          x.lineTo(px, y);
        }
        x.lineTo(SIZE, SIZE + 40);
        x.fill();
      }
    },
    stack(x, r) {
      const g = x.createLinearGradient(0, 0, 0, SIZE);
      g.addColorStop(0, '#c98c3e'); g.addColorStop(0.42, '#6e4a26'); g.addColorStop(1, '#23170f');
      x.fillStyle = g; x.fillRect(0, 0, SIZE, SIZE);
      // 透視地磚
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2;
      for (let i = -10; i < 20; i++) { x.beginPath(); x.moveTo(256, 190); x.lineTo(i * 70 - 200, SIZE); x.stroke(); }
      for (let i = 0; i < 9; i++) { const y = 210 + i * i * 4.4; x.beginPath(); x.moveTo(0, y); x.lineTo(SIZE, y); x.stroke(); }
      // 陶片堆成的圓塔
      const cx = 256 + range(r, -30, 30), rows = 14;
      for (let row = 0; row < rows; row++) {
        const y = 400 - row * 14, rx = 118 - row * 2.2;
        for (let i = 0; i < 40; i++) {
          const a = i / 40 * Math.PI + (row % 2) * 0.04;
          x.fillStyle = `hsl(36,48%,${54 + Math.sin(a) * 24 + r() * 10}%)`;
          ellipse(x, cx + Math.cos(a) * rx, y + Math.sin(a) * rx * 0.3, 7, 5.5);
        }
      }
      x.fillStyle = '#d9b985'; ellipse(x, cx, 400 - rows * 14, 92, 27);
      x.strokeStyle = 'rgba(235,220,190,0.9)'; x.lineWidth = 7; x.setLineDash([3, 13]);
      x.beginPath(); x.ellipse(cx + 10, 410, 190, 62, 0, 0, TAU); x.stroke();
      x.setLineDash([]);
    },
    eyes(x, r) {
      x.fillStyle = '#b8b4ae'; x.fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 4200; i++) {
        const px = r() * SIZE, py = r() * SIZE, a = Math.atan2(py - 256, px - 256) + range(r, -0.4, 0.4), l = range(r, 8, 32);
        x.strokeStyle = pick(r, ['rgba(255,255,255,0.4)', 'rgba(50,50,55,0.32)', 'rgba(220,170,160,0.3)']);
        x.lineWidth = 1.4;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
      }
      const eye = (cx, cy, rad, c1) => {
        x.fillStyle = 'rgba(20,14,12,0.6)'; ellipse(x, cx, cy, rad * 1.18, rad * 1.18);
        const g = x.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
        g.addColorStop(0, '#2b1c12'); g.addColorStop(0.25, '#4a3524'); g.addColorStop(0.32, c1); g.addColorStop(1, '#e4d7c2');
        x.fillStyle = g; ellipse(x, cx, cy, rad, rad);
        x.fillStyle = 'rgba(255,255,255,0.75)'; ellipse(x, cx - rad * 0.3, cy - rad * 0.32, rad * 0.14, rad * 0.1);
      };
      eye(160, 250, 92, pick(r, ['#c88a3a', '#9a6a3a', '#b8a24a']));
      eye(358, 236, 92, pick(r, ['#c0522c', '#b8742a', '#9e3f2c']));
      x.fillStyle = '#e39a8e'; x.beginPath(); x.moveTo(250, 250); x.lineTo(290, 250); x.lineTo(312, 390); x.lineTo(232, 390); x.fill();
      x.fillStyle = '#3a2422'; ellipse(x, 272, 396, 50, 13);
    },
    bird(x, r) {
      const dark = r() > 0.5;
      x.fillStyle = dark ? '#121214' : '#f5f4f0'; x.fillRect(0, 0, SIZE, SIZE);
      x.fillStyle = dark ? '#f5f4f0' : '#e8e4da';
      for (let i = 0; i < 26; i++) {
        x.save(); x.translate(r() * SIZE, r() * SIZE); x.rotate(range(r, -0.5, 0.5));
        x.fillRect(0, 0, range(r, 30, 200), range(r, 6, 42)); x.restore();
      }
      x.fillStyle = '#d6201f';
      x.beginPath();
      x.moveTo(190, 470);
      x.bezierCurveTo(150, 330, 250, 300, 240, 210);
      x.bezierCurveTo(232, 120, 330, 80, 372, 148);
      x.bezierCurveTo(412, 210, 340, 250, 330, 330);
      x.bezierCurveTo(322, 400, 300, 450, 290, 490);
      x.fill();
      x.fillStyle = dark ? '#f5f4f0' : '#141414';
      ellipse(x, 322, 150, 9, 9);
      x.beginPath(); x.moveTo(372, 150); x.lineTo(480, 186); x.lineTo(370, 182); x.fill();
    },
    inkgrid(x, r) {
      x.fillStyle = '#070708'; x.fillRect(0, 0, SIZE, SIZE);
      const cell = 150;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const ox = 26 + col * 156, oy = 26 + row * 156;
          x.save();
          x.beginPath(); x.rect(ox, oy, cell, cell); x.clip();
          x.fillStyle = r() > 0.5 ? '#141416' : '#e9e7e1'; x.fillRect(ox, oy, cell, cell);
          x.fillStyle = x.fillStyle === '#141416' ? '#f4f2ec' : '#111113';
          for (let i = 0; i < 4; i++) {
            x.save();
            x.translate(ox + r() * cell, oy + r() * cell); x.rotate(r() * 3);
            x.fillRect(-range(r, 8, 44), -range(r, 4, 16), range(r, 20, 90), range(r, 8, 30));
            x.restore();
          }
          x.restore();
        }
      }
    },
    spheres(x, r) {
      const g = x.createLinearGradient(0, 0, 0, SIZE);
      g.addColorStop(0, '#6e6a70'); g.addColorStop(1, '#2c2a30');
      x.fillStyle = g; x.fillRect(0, 0, SIZE, SIZE);
      const list = [[176, 170, 104], [360, 250, 92], [190, 372, 112]];
      list.forEach(([cx, cy, rad]) => {
        const j = range(r, -12, 12);
        x.fillStyle = 'rgba(0,0,0,0.4)'; ellipse(x, cx + 14, cy + rad * 0.96, rad * 0.9, rad * 0.22);
        const s = x.createRadialGradient(cx - rad * 0.4, cy - rad * 0.45, rad * 0.06, cx + j, cy, rad);
        s.addColorStop(0, '#ffffff'); s.addColorStop(0.22, '#d8cfc4'); s.addColorStop(0.5, '#6d5f58');
        s.addColorStop(0.78, '#1d1a1c'); s.addColorStop(0.92, '#7a6a5e'); s.addColorStop(1, '#cdbba6');
        x.fillStyle = s; ellipse(x, cx + j, cy, rad, rad);
      });
    },
    bowl(x, r) {
      const warm = pick(r, ['#b08a5e', '#8c6a4a', '#c8a27a']);
      x.fillStyle = warm; x.fillRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < 1300; i++) {
        x.fillStyle = r() > 0.5 ? 'rgba(255,240,215,0.1)' : 'rgba(40,24,14,0.13)';
        ellipse(x, r() * SIZE, r() * SIZE, range(r, 3, 26), range(r, 2, 12), r() * 3);
      }
      const cx = 256 + range(r, -40, 40), cy = 240 + range(r, -30, 30), rad = range(r, 130, 180);
      const g = x.createRadialGradient(cx - 50, cy - 60, 10, cx, cy, rad);
      g.addColorStop(0, '#39425a'); g.addColorStop(0.55, '#0b0c12'); g.addColorStop(0.95, '#050507'); g.addColorStop(1, '#6a7180');
      x.fillStyle = g; ellipse(x, cx, cy, rad, rad);
      x.strokeStyle = 'rgba(245,245,255,0.8)'; x.lineWidth = 6;
      x.beginPath(); x.arc(cx, cy, rad - 7, -2.5, -1.3); x.stroke();
      x.fillStyle = '#f2efe6'; ellipse(x, cx - 130, cy + 110, 70, 40, -0.5);
    },
    ribbon(x, r) {
      x.fillStyle = '#f4f2ed'; x.fillRect(0, 0, SIZE, SIZE);
      const col = pick(r, [['#7a3320', '#c9683f'], ['#23324f', '#6f8fc0'], ['#2c2c2c', '#9a9a9a']]);
      for (let w = 90; w > 8; w -= 10) {
        x.strokeStyle = w % 20 ? col[0] : col[1];
        x.lineWidth = w;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(90, 470);
        x.bezierCurveTo(90, 170, 180 + r() * 3, 70, 300, 90);
        x.bezierCurveTo(430, 110, 450, 300, 390, 420);
        x.stroke();
      }
    },
    weave(x, r) {
      const a = pick(r, ['#1d2a5a', '#6a1e2c', '#1e4a3a', '#f1eadb']);
      const b = pick(r, ['#e8c35a', '#e4e0d6', '#d9694a', '#7fb6c9']);
      const c = pick(r, ['#0e0e12', '#fafafa']);
      x.fillStyle = a; x.fillRect(0, 0, SIZE, SIZE);
      const u = 20;
      for (let py = 0; py < SIZE; py += u) {
        for (let px = 0; px < SIZE; px += u) {
          const over = ((px / u) + (py / u)) % 2 === 0;
          x.fillStyle = over ? b : a;
          x.fillRect(px + (over ? 2 : 0), py + (over ? 0 : 2), u - (over ? 4 : 0), u - (over ? 0 : 4));
        }
      }
      x.globalAlpha = 0.75; x.fillStyle = c;
      for (let i = 0; i < 6; i++) x.fillRect(0, r() * SIZE, SIZE, range(r, 6, 34));
      for (let i = 0; i < 4; i++) x.fillRect(r() * SIZE, 0, range(r, 6, 26), SIZE);
      x.globalAlpha = 1;
    },
    poster(x, r) {
      const pal = pick(r, [['#f0ead6', '#121212', '#e03a2c'], ['#1742c9', '#f5f2e8', '#ffcf3f'], ['#111', '#f5f2e8', '#ff4d6d'], ['#e8542a', '#111', '#f7f0d8']]);
      x.fillStyle = pal[0]; x.fillRect(0, 0, SIZE, SIZE);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '900 560px "Helvetica Neue", Arial, sans-serif';
      x.fillStyle = pal[1];
      x.fillText(pick(r, ['A', 'R', 'G', 'S', 'K', 'N']), 256 + range(r, -40, 40), 276);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = pal[2];
      x.save(); x.translate(256, 256); x.rotate(range(r, -0.6, 0.6)); x.fillRect(-300, -50, 600, range(r, 50, 130)); x.restore();
      x.globalCompositeOperation = 'source-over';
    }
  };

  function artwork(rec) {
    const c = canvasOf(SIZE), x = c.getContext('2d');
    const r = makeRng(rec.seed);
    (ART[rec.art] || ART.strata)(x, r);
    return finish(c, { seed: rec.seed, contrast: 1.06, grain: 7, vignette: 0.16 });
  }

  // 先載入人物照片；載入失敗的人物由 make() 退回程序化肖像
  function loadPhotos(records) {
    records.forEach((rec) => {
      const img = new Image();
      photoPending++;
      img.onload = () => { photos[rec.id] = img; photoPending--; };
      img.onerror = () => { photoPending--; };
      img.src = PHOTO_DIR + rec.id + '.jpg';
    });
  }
  const photosReady = () => photoPending === 0;

  function photoCanvas(img) {
    const c = canvasOf(SIZE), x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, SIZE, SIZE);
    return c;
  }

  // 依紀錄產生大圖＋縮圖（縮圖用於環上繪製，避免大圖直接縮小產生鋸齒）
  function make(rec) {
    const photo = photos[rec.id];
    const full = rec.art ? artwork(rec) : photo ? photoCanvas(photo) : portrait(rec.seed);
    const thumb = canvasOf(192);
    const t = thumb.getContext('2d');
    t.imageSmoothingEnabled = true; t.imageSmoothingQuality = 'high';
    t.drawImage(full, 0, 0, 192, 192);
    return { full, thumb };
  }

  return { make, loadPhotos, photosReady };
})();
