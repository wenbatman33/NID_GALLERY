// NID GALLERY 動態復刻：Canvas 2D 主引擎。
// 流程：loading（環狀載入）→ intro（線框彈出、照片閃白載入）→ browse（雙環瀏覽）⇄ detail（雙面板詳情）
(function () {
  'use strict';

  const CFG = window.NID_CONFIG, T = CFG.TUNING, DATA = window.NID_DATA;
  const IMG = window.NID_IMAGERY, SFX = window.NID_SFX;
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const DEG = Math.PI / 180;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
  const wrap = (i, n) => ((i % n) + n) % n;
  const wrapD = (d, n) => { const w = wrap(d, n); return w > n / 2 ? w - n : w; };
  const EASE = {
    linear: (t) => t,
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    quintOut: (t) => 1 - Math.pow(1 - t, 5),
    expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    backOut: (t) => { const c = 1.70158; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  };

  // ───────── 全域狀態 ─────────
  const S = {
    phase: 'loading', phaseTime: 0, time: 0,
    W: 0, H: 0, s: 1, dpr: 1, cx: 0, cy: 0, L: CFG.LAYOUT.PC, layoutName: 'PC', forced: null,
    dir: { x: 1, y: 0 },
    mouse: { x: -1, y: -1, inside: false, type: 'mouse' },
    bal: 0, balTarget: 0, balMoving: false,
    aligned: false, xShow: 0, xWhite: 0, pairFlash: 0, pairArrow: 1, pairId: 0,
    hover: null, groupHover: 0, closeHover: 0,
    detail: 0, panel: 0, content: 0, textOn: 0, view: 0, viewMix: 0, viewTimer: 0,
    spinner: 0, labelsOut: 1, titleMix: 0, loaderA: 1, frameKeep: 0,
    progress: 0, genIndex: 0, ready: false, loadedCount: 0, clickedAt: -1,
    lastRing: null, touch: null
  };

  const rings = [
    { idx: 0, key: 'PEOPLE', code: 'PEO', records: DATA.people, groups: DATA.peopleGroups, sgn: 1, axis: 0, items: [] },
    { idx: 1, key: 'WORKS', code: 'WRK', records: DATA.works, groups: DATA.workGroups, sgn: -1, axis: 180, items: [] }
  ];
  rings[0].partner = rings[1];
  rings[1].partner = rings[0];

  function resetRings() {
    rings.forEach((ring) => {
      ring.N = ring.records.length;
      ring.rot = 0; ring.target = 0; ring.vel = 0;
      ring.sel = -1; ring.selAmt = 0; ring.dragging = false; ring.lastInput = 0;
      ring.slot = 0; ring.homeSlot = 0; ring.homeSel = -1;
      ring.items.forEach((it) => Object.assign(it, itemDefaults()));
    });
  }
  function itemDefaults() {
    return { c: 0, cT: 0, delay: 0, flash: 0, flashAmt: 0.9, appear: 0, appearDelay: 1e9, load: 0, loadDelay: -1, loading: false, g: {} };
  }
  rings.forEach((ring) => {
    ring.items = ring.records.map((rec) => Object.assign({ rec, full: null, thumb: null, capW: null }, itemDefaults()));
  });
  resetRings();
  const genQueue = [];
  rings[0].items.forEach((it, i) => { genQueue.push(it); genQueue.push(rings[1].items[i]); });
  IMG.loadPhotos(DATA.people);

  // ───────── 時間軸工具 ─────────
  let tweens = [], timers = [];
  function tween(key, to, dur, ease, delay) {
    tweens = tweens.filter((tw) => tw.key !== key);
    if (dur <= 0 && !delay) { S[key] = to; return; }
    tweens.push({ key, from: S[key], to, dur, ease: EASE[ease] || EASE.cubicOut, t: -(delay || 0) });
  }
  function after(sec, fn) { timers.push({ left: sec, fn }); }
  function clearTimers() { timers = []; }
  function stepTime(dt) {
    tweens = tweens.filter((tw) => {
      tw.t += dt;
      if (tw.t < 0) return true;
      if (!tw.started) { tw.from = S[tw.key]; tw.started = true; }
      const p = tw.dur > 0 ? clamp(tw.t / tw.dur) : 1;
      S[tw.key] = lerp(tw.from, tw.to, tw.ease(p));
      return p < 1;
    });
    const due = [];
    timers = timers.filter((tm) => { tm.left -= dt; if (tm.left <= 0) { due.push(tm); return false; } return true; });
    due.forEach((tm) => tm.fn());
  }
  function setPhase(p) { S.phase = p; S.phaseTime = 0; }

  // ───────── 版面 ─────────
  function chooseLayout(W, H) {
    if (S.forced) return S.forced;
    if (W < H * 0.9 && W <= 820) return 'MOBILE';
    if (W < 1024) return 'TABLET';
    return 'PC';
  }
  const PREVIEW = { PC: [1280, 800], TABLET: [1024, 768], MOBILE: [390, 844] };

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    let W = vw, H = vh, scale = 1;
    if (S.forced) {
      [W, H] = PREVIEW[S.forced];
      scale = Math.min(vw / W, vh / H, 1);
    }
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = W; S.H = H;
    canvas.width = Math.round(W * S.dpr);
    canvas.height = Math.round(H * S.dpr);
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    S.layoutName = chooseLayout(W, H);
    S.L = CFG.LAYOUT[S.layoutName];
    refresh();
  }
  function refresh() {
    const L = S.L;
    S.s = Math.min(S.W / L.stageW, S.H / L.stageH);
    S.cx = S.W / 2; S.cy = S.H / 2;
    S.dir = L.axis === 'y' ? { x: 0, y: 1 } : { x: 1, y: 0 };
    rings[0].axis = L.axis === 'y' ? 90 : 0;
    rings[1].axis = L.axis === 'y' ? -90 : 180;
  }
  function ringCenter(ring) {
    const L = S.L, s = S.s, d = S.dir, sign = ring.idx ? 1 : -1;
    return {
      x: S.cx + d.x * sign * L.ringDist * s + d.y * L.ringCross * s,
      y: S.cy + d.y * sign * L.ringDist * s + d.x * L.ringCross * s
    };
  }
  function browseRadius(ring) {
    const L = S.L;
    return (L.ringR + (ring.idx ? -1 : 1) * S.bal * L.ringDelta) * S.s;
  }
  // 選定項目位於軸線上時的位置與尺寸（面板由此長出去）
  function axisRect(ring) {
    const C = ringCenter(ring), R = browseRadius(ring), a = ring.axis * DEG;
    const size = R * S.L.thumbRatio * S.L.selectedMag;
    return { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R, size };
  }
  function panelRect(ring) {
    const L = S.L, s = S.s, d = S.dir, sign = ring.idx ? 1 : -1;
    const from = axisRect(ring), t = S.panel;
    const px = S.cx + d.x * sign * L.panelOffset * s + d.y * L.ringCross * s;
    const py = S.cy + d.y * sign * L.panelOffset * s + d.x * L.ringCross * s;
    return { x: lerp(from.x, px, t), y: lerp(from.y, py, t), size: lerp(from.size, L.panelSize * s, t) };
  }
  function crossPoint() {
    const a = axisRect(rings[0]), b = axisRect(rings[1]), d = S.dir;
    const mid = {
      x: (a.x + d.x * a.size / 2 + b.x - d.x * b.size / 2) / 2,
      y: (a.y + d.y * a.size / 2 + b.y - d.y * b.size / 2) / 2
    };
    const cross = S.L.ringCross * S.s;
    return { x: lerp(mid.x, S.cx + d.y * cross, S.panel), y: lerp(mid.y, S.cy + d.x * cross, S.panel) };
  }

  // 環上每個項目的幾何：瀏覽時為等距＋魚眼，詳情時擠到軸線之外的 270° 弧上
  function computeRing(ring) {
    const L = S.L, N = ring.N, step = 360 / N;
    const C = ringCenter(ring);
    const Rb = browseRadius(ring), R = lerp(Rb, L.detailR * S.s, S.detail);
    const k = Rb / (L.ringR * S.s);
    const baseSize = Rb * L.thumbRatio, detailSize = L.detailThumb * S.s;
    const gap = L.detailGap, spacing = (360 - 2 * gap) / (N - 2);
    ring.k = k; ring.C = C; ring.R = R;
    for (let i = 0; i < N; i++) {
      const it = ring.items[i], g = it.g;
      const d = wrapD(i - ring.rot, N), base = d * step, ad = Math.abs(d);
      const fish = ring.selAmt * L.fisheyeAmp * Math.tanh(base / L.fisheyeSoft) * Math.exp(-Math.abs(base) / L.fisheyeDecay);
      const phiDetail = Math.sign(d) * (gap * Math.min(ad, 1) + Math.max(ad - 1, 0) * spacing);
      const phi = lerp(base + fish, phiDetail, S.detail);
      const focus = ring.selAmt * Math.exp(-(base * base) / (L.magSigma * L.magSigma));
      const size = lerp(baseSize * (1 + (L.selectedMag - 1) * focus), detailSize, S.detail);
      const a = (ring.axis + ring.sgn * phi) * DEG;
      g.x = C.x + Math.cos(a) * R;
      g.y = C.y + Math.sin(a) * R;
      g.a = a; g.rot = ring.sgn * phi * DEG; g.size = size; g.phi = phi; g.focus = focus;
    }
  }

  // ───────── 選取邏輯 ─────────
  const nearest = (ring, i) => ring.target + wrapD(i - ring.target, ring.N);
  const activeRing = () => {
    if (S.balTarget > 0) return rings[0];
    if (S.balTarget < 0) return rings[1];
    if (!S.mouse.inside) return rings[0];
    return (S.mouse.x - S.cx) * S.dir.x + (S.mouse.y - S.cy) * S.dir.y < 0 ? rings[0] : rings[1];
  };
  function dropAligned() {
    if (S.aligned) { S.aligned = false; cancelPair(); tween('xShow', 0, 0.12); }
  }
  // 配對完成（量測自原作，選定的兩張）：全白＋線框變白 → 一對白三角縮小靠攏併成白點
  // → 白點長成白 X（同時響完成雙響）→ X 由白轉紅
  function pairDone() {
    const id = ++S.pairId;
    S.aligned = true;
    S.xShow = 0;
    S.xWhite = 1;
    S.pairFlash = 1;
    S.pairArrow = 0;
    tween('pairFlash', 0, T.pairFade, 'linear', T.pairHold);
    tween('pairArrow', 1, T.pairArrowTime, 'linear');
    tween('xShow', 1, 0.14, 'backOut', T.pairArrowTime);
    tween('xWhite', 0, T.xRedTime, 'linear', T.pairArrowTime + T.xWhiteHold);
    after(T.pairArrowTime, () => { if (id === S.pairId && S.aligned) SFX.ready(); });
  }
  function cancelPair() {
    S.pairId++;
    tween('pairFlash', 0, 0);
    tween('pairArrow', 1, 0);
  }
  function linkPartner(ring) {
    const p = ring.partner;
    p.sel = ring.records[ring.sel].pair;
    p.target = nearest(p, p.sel);
    S.lastRing = ring;
  }
  function commitSnap(ring) {
    ring.dragging = false;
    ring.target = Math.round(ring.target);
    // 沒轉過一格：環彈回原位，不出聲也不重新配對
    if (ring.target === ring.homeSlot && ring.sel === ring.homeSel) return;
    dropAligned();
    ring.sel = wrap(ring.target, ring.N);
    linkPartner(ring);
    SFX.triad('down');
  }
  function selectItem(ring, i) {
    if (i === ring.sel && !ring.dragging) return;
    dropAligned();
    ring.dragging = false;
    ring.partner.dragging = false;
    ring.sel = i;
    ring.target = nearest(ring, i);
    linkPartner(ring);
    SFX.triad('down');
  }
  function nudge(ring, slots) {
    if (S.phase !== 'browse') return;
    if (!ring.dragging) { ring.homeSlot = Math.round(ring.target); ring.homeSel = ring.sel; }
    ring.target += slots;
    ring.dragging = true;
    ring.lastInput = S.time;
  }

  // ───────── 縮圖收合 ─────────
  function collapseThumbs(keepSelected) {
    rings.forEach((ring) => ring.items.forEach((it, i) => {
      it.delay = Math.random() * 0.04;
      it.cT = keepSelected && i === ring.sel ? 0 : 1;
    }));
  }
  function expandThumbs(flash, stagger) {
    rings.forEach((ring) => ring.items.forEach((it) => {
      it.delay = Math.random() * (stagger === undefined ? T.expandStagger : stagger);
      it.cT = 0;
      it.flashAmt = flash;
    }));
  }

  // ───────── 進場 ─────────
  function startIntro() {
    setPhase('intro');
    SFX.open();
    tween('loaderA', 0, 0.2);
    tween('titleMix', 1, 0.7, 'expoOut', 0.3);
    tween('labelsOut', 0, 0.6, 'expoOut', 0.3);
    rings.forEach((ring) => ring.items.forEach((it) => { it.appearDelay = 0.3 + Math.random() * T.introAppear; }));
    after(2.4, () => { setPhase('browse'); });
    after(2.6, startThumbLoad);
  }
  function startThumbLoad() {
    const order = rings.map((ring) => {
      const list = ring.items.slice();
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    });
    // 一響載入一組（一人＋一作）；原作間隔落在約 46 ms 的格點上（46 / 92 / 139 ms）
    const beats = [0.5, 1, 1, 1, 1, 1.5];
    let t = 0;
    order[0].forEach((it, i) => {
      it.loadDelay = t;
      order[1][i].loadDelay = t;
      t += T.loadInterval * beats[Math.floor(Math.random() * beats.length)];
    });
  }
  function replayIntro() {
    clearTimers(); tweens = [];
    resetRings();
    Object.assign(S, { bal: 0, balTarget: 0, balMoving: false, aligned: false, xShow: 0, xWhite: 0, pairFlash: 0, pairArrow: 1, detail: 0, panel: 0, content: 0, textOn: 0, view: 0, viewMix: 0, spinner: 0, labelsOut: 1, titleMix: 0, loaderA: 1, frameKeep: 0, loadedCount: 0, hover: null });
    setPhase('loading');
  }
  function forceLoadAll() {
    rings.forEach((ring) => ring.items.forEach((it) => { it.appear = 1; it.appearDelay = 0; it.load = 1; it.loadDelay = -1; it.loading = false; }));
    S.loadedCount = genQueue.length;
  }

  // ───────── 詳情 ─────────
  function openDetail() {
    if (S.phase !== 'browse' || !S.aligned) return;
    clearTimers();
    cancelPair();
    setPhase('toDetail');
    SFX.open();
    S.balTarget = 0;
    collapseThumbs(false);
    tween('labelsOut', 1, 0.3);
    tween('content', 0, 0.15);
    tween('xShow', 0, 0.1);
    tween('panel', 1, T.panelTime, T.panelEase);
    tween('detail', 1, T.detailMoveTime, 'inOutCubic', 0.12);
    tween('bal', 0, T.detailMoveTime + 0.12, 'cubicOut');
    tween('spinner', 1, 0.2, 'linear', 0.3);
    after(0.5, () => expandThumbs(1));
    S.view = S.lastRing === rings[1] ? 0 : 1;
    S.viewMix = S.view;
    S.textOn = 1;
    after(T.detailLoad, contentReady);
  }
  function contentReady() {
    setPhase('detail');
    tween('spinner', 0, 0.15);
    tween('content', 1, 0.5);
    tween('xShow', 1, 0.2);
    S.xWhite = 0;
    S.viewTimer = T.viewCycle + 0.2;
    SFX.ready();
  }
  function setView(v) {
    if (S.view === v) return;
    S.view = v;
    tween('viewMix', v, T.crossfade, 'inOutCubic');
    S.viewTimer = T.viewCycle;
    SFX.triad(v === 1 ? 'up' : 'down');
  }
  function closeDetail() {
    if (S.phase !== 'detail') return;
    clearTimers();
    setPhase('fromDetail');
    SFX.open();
    S.frameKeep = 1;
    collapseThumbs(false);
    S.aligned = false;
    tween('xShow', 0, 0.1);
    tween('content', 0, 0.12);
    tween('panel', 0, T.exitTime, 'cubicOut', 0.05);
    tween('detail', 0, T.exitTime, 'inOutCubic', 0.05);
    tween('labelsOut', 0, T.exitTime, 'cubicOut', 0.1);
    after(0.16, () => { S.textOn = 0; });
    after(T.exitTime + 0.08, () => { tween('content', 1, 0.25); });
    after(T.exitTime + 0.1, () => { expandThumbs(1, 0.2); });
    after(T.exitTime + 0.5, () => { tween('frameKeep', 0, 0.2); });
    after(T.exitReady, () => {
      setPhase('browse');
      S.content = 0;
      S.frameKeep = 0;
      pairDone();
    });
  }
  function switchDetail(ring, i) {
    if (S.phase !== 'detail') return;
    clearTimers();
    setPhase('toDetail');
    SFX.open();
    ring.sel = i;
    ring.target = nearest(ring, i);
    linkPartner(ring);
    tween('content', 0, 0.12);
    tween('spinner', 1, 0.15, 'linear', 0.1);
    tween('xShow', 0, 0.1);
    S.view = ring === rings[1] ? 0 : 1;
    S.viewMix = S.view;
    rings.forEach((r) => r.items.forEach((it) => { it.flash = 1; }));
    after(T.detailLoad, contentReady);
  }

  // ───────── 更新 ─────────
  function updateBalance() {
    if (S.phase !== 'browse') return;
    if (S.mouse.type !== 'mouse') return;
    if (!S.mouse.inside) { S.balTarget = 0; return; }
    if (S.hover && S.hover.type === 'group') return;
    const p = ((S.mouse.x - S.cx) * S.dir.x + (S.mouse.y - S.cy) * S.dir.y) / S.s;
    const rel = p - S.L.ringDelta * S.bal;
    const t = T.balThreshold;
    S.balTarget = rel < -t ? 1 : rel > t ? -1 : 0;
  }
  function updateRings(dt) {
    rings.forEach((ring) => {
      const prev = ring.rot;
      ring.rot = damp(ring.rot, ring.target, T.ringEase, dt);
      if (Math.abs(ring.target - ring.rot) < 0.0008) ring.rot = ring.target;
      ring.vel = dt > 0 ? (ring.rot - prev) / dt : 0;
      // 環實際轉過一格才算轉動成功：這時才換選定、拆配對、出聲
      const slot = Math.round(ring.rot);
      if (slot !== ring.slot) {
        ring.slot = slot;
        if (ring.dragging) {
          ring.sel = wrap(slot, ring.N);
          dropAligned();
          SFX.step();
        }
      }
      ring.selAmt = damp(ring.selAmt, ring.sel >= 0 ? 1 : 0, T.selEase, dt);
      if (ring.dragging && S.time - ring.lastInput > T.snapDelay && !(S.touch && S.touch.ring === ring)) commitSnap(ring);
    });
    // 兩環都停在配對位置 → 配對完成
    if (S.phase === 'browse' && !S.aligned && rings[0].sel >= 0 && rings[1].sel >= 0 &&
        !rings[0].dragging && !rings[1].dragging &&
        Math.abs(rings[0].rot - rings[0].target) < 0.03 && Math.abs(rings[1].rot - rings[1].target) < 0.03) {
      pairDone();
    }
  }
  function updateItems(dt) {
    rings.forEach((ring) => ring.items.forEach((it) => {
      if (it.flash > 0) it.flash = Math.max(0, it.flash - dt / T.flashTime);
      if (it.delay > 0) { it.delay -= dt; } else if (it.c < it.cT) {
        it.c = Math.min(it.cT, it.c + dt / T.collapseTime);
      } else if (it.c > it.cT) {
        if (it.c >= 1) it.flash = it.flashAmt;
        it.c = Math.max(it.cT, it.c - dt / T.expandTime);
      }
      if (S.phase !== 'loading') {
        if (it.appearDelay > 0) it.appearDelay -= dt;
        else if (it.appear < 1) it.appear = Math.min(1, it.appear + dt / T.appearTime);
      }
      if (it.loadDelay >= 0) {
        it.loadDelay -= dt;
        if (it.loadDelay < 0) {
          it.loading = true;
          S.loadedCount++;
          if (ring.idx === 0) SFX.tick();
        }
      }
      if (it.loading && it.load < 1) it.load = Math.min(1, it.load + dt / T.loadTime);
    }));
  }
  function updateMorph() {
    // 主動環切換時：先把縮圖收成白點、等半徑穩定才展開
    if (S.phase !== 'browse') { S.balMoving = false; return; }
    const moving = Math.abs(S.balTarget - S.bal) > T.balSettle;
    if (moving && !S.balMoving) { S.balMoving = true; collapseThumbs(true); }
    if (!moving && S.balMoving) { S.balMoving = false; expandThumbs(0.55); }
  }
  function updateLoading() {
    const start = performance.now();
    while (IMG.photosReady() && S.genIndex < genQueue.length && performance.now() - start < 12) {
      const it = genQueue[S.genIndex++];
      if (!it.full) Object.assign(it, IMG.make(it.rec));
    }
    S.progress = S.genIndex / genQueue.length;
    S.ready = S.progress >= 1 && S.phaseTime > T.loaderMin;
    // 瀏覽器要求使用者操作後才能出聲；點擊後 0.4 秒仍無法發聲就直接進場（無聲環境）
    const noAudio = S.clickedAt >= 0 && S.time - S.clickedAt > 0.4;
    if (S.ready && (SFX.isRunning() || noAudio)) startIntro();
  }

  function update(dt) {
    S.time += dt; S.phaseTime += dt;
    stepTime(dt);
    if (S.phase === 'loading') {
      updateLoading();
      if (S.phase === 'loading') return;
    }
    if (S.phase === 'browse') S.bal = damp(S.bal, S.balTarget, T.radiusEase, dt);
    updateRings(dt);
    rings.forEach(computeRing);
    S.hover = pick(S.mouse.x, S.mouse.y);
    updateBalance();
    updateMorph();
    updateItems(dt);
    const groupOn = S.hover && S.hover.type === 'group';
    S.groupHover = damp(S.groupHover, groupOn ? 1 : 0, 16, dt);
    S.closeHover = damp(S.closeHover, S.hover && S.hover.type === 'x' ? 1 : 0, 16, dt);
    if (S.phase === 'detail') {
      const held = S.hover && S.hover.type === 'panel';
      if (!held) S.viewTimer -= dt;
      if (S.viewTimer <= 0) setView(S.view ? 0 : 1);
    }
    let cursor = 'default';
    if (S.hover) cursor = 'pointer';
    if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }

  // ───────── 命中測試 ─────────
  function inRect(mx, my, x, y, size, rot) {
    const dx = mx - x, dy = my - y, c = Math.cos(-(rot || 0)), sn = Math.sin(-(rot || 0));
    const lx = dx * c - dy * sn, ly = dx * sn + dy * c, h = size / 2;
    return Math.abs(lx) <= h && Math.abs(ly) <= h;
  }
  function pick(mx, my) {
    if (!S.mouse.inside) return null;
    if (S.phase === 'detail') {
      const c = crossPoint();
      if (Math.hypot(mx - c.x, my - c.y) < S.L.xSize * S.s * 1.7) return { type: 'x' };
      for (const ring of rings) {
        const p = panelRect(ring);
        if (inRect(mx, my, p.x, p.y, p.size, 0)) return { type: 'panel', ring };
        for (let i = 0; i < ring.N; i++) {
          if (i === ring.sel) continue;
          const g = ring.items[i].g;
          if (inRect(mx, my, g.x, g.y, g.size, g.rot)) return { type: 'item', ring, i };
        }
      }
      return null;
    }
    if (S.phase !== 'browse') return null;
    if (S.aligned) {
      const c = crossPoint();
      if (Math.hypot(mx - c.x, my - c.y) < S.L.xSize * S.s * 1.7) return { type: 'group' };
      for (const ring of rings) {
        const g = ring.items[ring.sel].g;
        if (inRect(mx, my, g.x, g.y, g.size, g.rot)) return { type: 'group' };
      }
    }
    for (const ring of rings) {
      for (let i = 0; i < ring.N; i++) {
        const it = ring.items[i], g = it.g;
        if (it.appear < 0.5) continue;
        if (inRect(mx, my, g.x, g.y, g.size, g.rot)) return { type: 'item', ring, i };
      }
    }
    return null;
  }

  // ───────── 繪製：項目 ─────────
  const red = () => T.colorRed;
  // w = 1 全白、w = 0 紅色
  function redToWhite(w) {
    const n = parseInt(T.colorRed.slice(1), 16);
    const mix = (v) => Math.round(lerp(v, 255, clamp(w)));
    return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  }
  function font(weight, size) { return `${weight} ${size}px ${T.fontFamily}`; }
  function spacing(px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

  function wireX(half, alpha) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-half, -half); ctx.lineTo(half, half);
    ctx.moveTo(half, -half); ctx.lineTo(-half, half);
    ctx.stroke();
  }

  function drawThumb(ring, it, i, hovered) {
    const g = it.g, app = it.appear;
    if (app <= 0) return;
    const margin = g.size;
    if (g.x < -margin || g.x > S.W + margin || g.y < -margin || g.y > S.H + margin) return;
    const pop = EASE.backOut(app), flick = app < 1 && Math.random() < 0.3 ? 0.25 : 1;
    const vis = 1 - it.c;
    const pair = i === ring.sel ? S.pairFlash : 0;
    const size = g.size * (0.15 + 0.85 * pop), half = size / 2;
    const lw = Math.max(1, S.s * 0.7);

    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot + (1 - EASE.cubicOut(app)) * Math.PI * 0.5);
    ctx.lineWidth = lw;

    const frameA = Math.max(vis, S.frameKeep) * flick;
    if (frameA > 0.01) {
      ctx.fillStyle = `rgba(6,6,7,${0.9 * frameA})`;
      ctx.fillRect(-half, -half, size, size);
      const bright = Math.max(hovered ? 1 : T.frameAlpha, pair);
      const hot = S.groupHover > 0.5 && i === ring.sel && pair <= 0;
      ctx.strokeStyle = hot ? red() : `rgba(255,255,255,${bright * frameA})`;
      ctx.strokeRect(-half, -half, size, size);
    }
    const inner = size * (1 - T_framePad() * 2);
    const dotSize = Math.max(3, 5.5 * S.s);
    if (it.load > 0 && it.c < 1) {
      const p = EASE.cubicOut(it.load);
      const grow = lerp(0.14, 1, p);
      const shrink = lerp(dotSize / inner, 1, EASE.cubicOut(vis));
      const w = inner * grow * shrink;
      ctx.rotate(it.c * Math.PI / 4);
      ctx.globalAlpha = flick;
      const src = (S.dpr * w > 200 && it.full) ? it.full : it.thumb;
      if (src) ctx.drawImage(src, -w / 2, -w / 2, w, w);
      const white = Math.max(1 - p, it.c, it.flash, pair);
      if (white > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${white})`;
        ctx.fillRect(-w / 2, -w / 2, w, w);
      }
      ctx.globalAlpha = 1;
    } else if (it.c >= 1 || it.load > 0) {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-dotSize / 2, -dotSize / 2, dotSize, dotSize);
    } else {
      wireX(half, 0.36 * flick * vis);
      if (it.c > 0.1) {
        ctx.fillStyle = `rgba(255,255,255,${it.c})`;
        ctx.fillRect(-dotSize / 2, -dotSize / 2, dotSize, dotSize);
      }
    }
    ctx.restore();
  }

  function T_framePad() { return S.L.framePad; }

  function drawMarker(ring, it, i) {
    const L = S.L, s = S.s, g = it.g;
    if (it.appear < 1) return;
    const alpha = (1 - S.detail * 0.55) * clamp(1 - it.c * 0.7);
    const dist = g.size / 2 + L.markerGap * s * Math.max(ring.k, 0.75);
    const mx = g.x + Math.cos(g.a) * dist, my = g.y + Math.sin(g.a) * dist;
    if (mx < -8 || mx > S.W + 8 || my < -8 || my > S.H + 8) return;
    ctx.fillStyle = red();
    ctx.globalAlpha = alpha;
    const isSel = i === ring.sel && S.detail < 0.5;
    if (isSel) {
      if (S.xShow > 0.5 || S.pairArrow < 1) { ctx.globalAlpha = 1; return; }
      // 配對完成前：選定項目的記號變成指向自身的小三角
      const t = 4.2 * s;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(g.a + Math.PI);
      ctx.beginPath(); ctx.moveTo(t, 0); ctx.lineTo(-t * 0.6, t * 0.75); ctx.lineTo(-t * 0.6, -t * 0.75); ctx.fill();
      ctx.restore();
    } else {
      const m = L.markerSize * s;
      ctx.fillRect(mx - m / 2, my - m / 2, m, m);
    }
    ctx.globalAlpha = 1;
  }

  function drawCaption(ring, it, i, hovered) {
    const L = S.L, s = S.s, g = it.g;
    if (!L.capShow || it.appear < 0.6) return;
    const k = ring.k;
    const kA = clamp((k - 0.72) / 0.14);
    if (kA <= 0) return;
    const hide = 1 - clamp(S.detail * 4);
    if (hide <= 0) return;
    const distA = lerp(1, T.capFar, clamp(Math.abs(g.phi) / 75));
    let alpha = kA * hide * Math.max(distA, g.focus) * T.capAlpha;
    if (hovered) alpha = hide * kA;
    if (i === ring.sel) alpha *= 1 - S.panel;

    const inward = g.a + Math.PI;
    let textA = g.a;
    const c = Math.cos(textA);
    if (c < 0) textA += Math.PI;
    alpha *= clamp(Math.abs(c) / 0.12);
    if (alpha < 0.02) return;

    const anchor = g.size / 2 + L.capGap * s * Math.max(k, 0.8) * 0.8;
    const ax = g.x + Math.cos(inward) * anchor, ay = g.y + Math.sin(inward) * anchor;
    if (ax < -320 * s || ax > S.W + 320 * s || ay < -320 * s || ay > S.H + 320 * s) return;
    const runsForward = Math.cos(inward - textA) > 0;
    const nameSize = lerp(L.capName, L.capSelName, g.focus) * k * s;
    const subSize = lerp(L.capSub, L.capSelSub, g.focus) * k * s;

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(textA);
    ctx.textAlign = runsForward ? 'left' : 'right';
    ctx.textBaseline = 'alphabetic';
    if (it.capW === null) {
      ctx.font = font(700, 100);
      it.capW = ctx.measureText(it.rec.name).width / 100;
    }
    if (it.c > 0.35) {
      // 收合時文字退化成一條細線
      const len = it.capW * nameSize * (runsForward ? 1 : -1);
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
      ctx.lineWidth = Math.max(0.6, s * 0.5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    } else {
      ctx.fillStyle = T.colorText;
      ctx.globalAlpha = alpha;
      ctx.font = font(700, nameSize);
      spacing(g.focus > 0.5 ? 0.02 * nameSize : 0);
      ctx.fillText(it.rec.name, 0, -subSize * 0.15);
      ctx.font = font(400, subSize);
      ctx.fillText(it.rec.sub, 0, subSize * 1.15);
      spacing(0);
    }
    ctx.restore();
  }

  function drawRing(ring) {
    const list = ring.items;
    // 高速旋轉時疊上殘影
    const speed = Math.abs(ring.vel);
    if (T.motionBlur > 0 && speed > 1.2 && S.detail < 0.5) {
      const n = 4, step = 360 / ring.N;
      for (let j = 1; j <= n; j++) {
        const off = ring.vel * 0.028 * T.motionBlur * j;
        const alpha = 0.3 * (1 - j / (n + 1));
        ctx.save();
        ctx.translate(ring.C.x, ring.C.y);
        ctx.rotate(ring.sgn * off * step * DEG);
        ctx.translate(-ring.C.x, -ring.C.y);
        ctx.globalAlpha = alpha;
        for (let i = 0; i < ring.N; i++) {
          const it = list[i], g = it.g;
          if (!it.thumb || it.load < 1 || it.c > 0.5 || i === ring.sel) continue;
          if (g.x < -g.size || g.x > S.W + g.size || g.y < -g.size || g.y > S.H + g.size) continue;
          ctx.save();
          ctx.translate(g.x, g.y); ctx.rotate(g.rot);
          ctx.drawImage(it.thumb, -g.size / 2, -g.size / 2, g.size, g.size);
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    const order = list.map((it, i) => i).sort((a, b) => list[a].g.focus - list[b].g.focus);
    const showPanel = S.panel > 0.001;
    for (const i of order) {
      const it = list[i];
      const hovered = S.hover && S.hover.type === 'item' && S.hover.ring === ring && S.hover.i === i;
      drawCaption(ring, it, i, hovered);
      drawMarker(ring, it, i);
      if (showPanel && i === ring.sel) continue;
      drawThumb(ring, it, i, hovered);
    }
  }

  // ───────── 繪製：面板與叉號 ─────────
  function wrapLines(text, maxW) {
    const lines = [];
    let line = '';
    for (const ch of text) {
      const next = line + ch;
      if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = ch; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawPanelText(rect, rec, alpha, title) {
    if (alpha < 0.02) return;
    const L = S.L, s = S.s, pad = L.panelPad * s * (rect.size / (L.panelSize * s));
    const left = rect.x - rect.size / 2 + pad, top = rect.y - rect.size / 2 + pad;
    const maxW = rect.size - pad * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = T.colorText;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const head = L.panelHead * s, body = L.panelText * s;
    ctx.font = font(700, head);
    ctx.fillText(title, left, top, maxW);
    ctx.font = font(400, body * 0.8);
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.fillText(rec.sub, left, top + head * 1.5, maxW);
    ctx.fillStyle = T.colorText;
    ctx.font = font(400, body);
    const lh = body * 1.85;
    wrapLines(rec.text, maxW).forEach((ln, i) => ctx.fillText(ln, left, top + head * 3.6 + i * lh));
    ctx.restore();
  }

  function drawPanel(ring) {
    if (S.panel <= 0.001 || ring.sel < 0) return;
    const r = panelRect(ring), it = ring.items[ring.sel];
    const half = r.size / 2, x = r.x - half, y = r.y - half;
    const inset = Math.max(3, r.size * 0.02);
    ctx.fillStyle = '#080808';
    ctx.fillRect(x, y, r.size, r.size);
    const hotColor = S.groupHover > 0.5 || S.closeHover > 0.5;
    ctx.lineWidth = Math.max(1, S.s * 0.8);
    ctx.strokeStyle = hotColor && S.phase !== 'detail' ? red() : `rgba(255,255,255,${0.42 + 0.2 * S.panel})`;
    ctx.strokeRect(x, y, r.size, r.size);

    const isPerson = ring.idx === 0;
    let photoAlpha = S.content;
    let textAlpha = 0;
    if (S.textOn) {
      const showing = isPerson ? 1 - S.viewMix : S.viewMix;
      photoAlpha = S.content * lerp(T.ghost, 1, showing);
      textAlpha = S.content * clamp((1 - showing) * 1.6 - 0.6);
    }
    const wire = 1 - S.content;
    if (wire > 0.01) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.lineWidth = Math.max(1, S.s * 0.7);
      wireX(half, 0.4 * wire * S.panel);
      ctx.restore();
    }
    if (photoAlpha > 0.01 && it.full) {
      ctx.globalAlpha = photoAlpha;
      ctx.drawImage(it.full, x + inset, y + inset, r.size - inset * 2, r.size - inset * 2);
      ctx.globalAlpha = 1;
    }
    if (textAlpha > 0.01) {
      // 文字面板：人物面板顯示作品介紹，作品面板顯示人物介紹
      const other = ring.partner.items[ring.partner.sel].rec;
      const title = other.group.length === 1 ? `${other.kanji} | ${other.name}` : other.name;
      drawPanelText(r, other, textAlpha, title);
    }
  }

  // 配對完成的一對白三角：從兩張圖內緣指向中點，先縮小、再靠攏併成白點
  function drawPairArrows() {
    if (S.pairArrow >= 1) return;
    const c = crossPoint(), d = S.dir, s = S.s;
    const len = S.L.arrowSize * s * lerp(1, 0.25, clamp(S.pairArrow / 0.45));
    const wide = len * 0.85, gap = 7 * s;
    const closing = clamp((S.pairArrow - 0.45) / 0.55);
    ctx.fillStyle = '#fff';
    [[axisRect(rings[0]), 1], [axisRect(rings[1]), -1]].forEach(([r, sign]) => {
      const nx = d.x * sign, ny = d.y * sign;
      const edge = r.size / 2 + gap;
      const bx = lerp(r.x + nx * edge, c.x - nx * len, closing);
      const by = lerp(r.y + ny * edge, c.y - ny * len, closing);
      ctx.beginPath();
      ctx.moveTo(bx + nx * len, by + ny * len);
      ctx.lineTo(bx - ny * wide, by + nx * wide);
      ctx.lineTo(bx + ny * wide, by - nx * wide);
      ctx.fill();
    });
  }

  function drawCross() {
    if (S.xShow <= 0.01) return;
    const c = crossPoint(), L = S.L, s = S.s;
    const hot = Math.max(S.groupHover, S.closeHover);
    const size = L.xSize * s * EASE.backOut(clamp(S.xShow));
    const white = S.phase === 'detail' ? S.closeHover : S.xWhite;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.strokeStyle = redToWhite(white);
    ctx.lineWidth = Math.max(2, 2.7 * s);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(-size, -size); ctx.lineTo(size, size);
    ctx.moveTo(size, -size); ctx.lineTo(-size, size);
    ctx.stroke();
    if (hot > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${hot})`;
      ctx.font = font(700, 5.8 * s);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(S.phase === 'detail' ? 'CLOSE' : 'OPEN', 0, size + 5 * s);
    }
    ctx.restore();
  }

  function drawSpinner() {
    if (S.spinner <= 0.01) return;
    const s = S.s, R = 8.5 * s;
    ctx.save();
    ctx.translate(S.cx, S.cy);
    ctx.globalAlpha = S.spinner;
    ctx.strokeStyle = red();
    ctx.lineWidth = 3.4 * s;
    const a = S.time * 7;
    ctx.beginPath(); ctx.arc(0, 0, R, a, a + Math.PI * 1.05); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R, a + Math.PI * 1.25, a + Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-11 * s, 15 * s, 22 * s * (0.3 + 0.7 * clamp(S.phaseTime / T.detailLoad)), 2.4 * s);
    ctx.restore();
  }

  // ───────── 繪製：文字介面 ─────────
  function drawTitle() {
    const L = S.L, s = S.s;
    const yStart = S.cy - L.loaderTitle * s, yEnd = L.titleY * s;
    const y = lerp(yStart, yEnd, S.titleMix);
    const x = S.cx + S.bal * L.titleDrift * s * S.titleMix;
    const size = L.titleSize * s;
    const parts = [['NID GALLERY', 800], [' // ', 300], ['COLLECTION ', 400], ['2007', 800]];
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = T.colorText;
    spacing(0.02 * size);
    let total = 0;
    parts.forEach(([t, w]) => { ctx.font = font(w, size); total += ctx.measureText(t).width; });
    let px = x - total / 2;
    parts.forEach(([t, w]) => {
      ctx.font = font(w, size);
      ctx.fillText(t, px, y);
      px += ctx.measureText(t).width;
    });
    spacing(0);
    ctx.textAlign = 'center';
    ctx.font = font(500, size * 0.62);
    ctx.fillText('PEOPLE & WORKS FROM NAGAOKA INSTITUTE OF DESIGN', x, y + size * 1.2);
    if (S.titleMix > 0.5) {
      ctx.globalAlpha = clamp((S.titleMix - 0.5) * 2);
      ctx.fillStyle = red();
      ctx.fillRect(x - 1, y + size * 2.25, 2.2 * s, 2.2 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = font(500, size * 0.5);
      ctx.fillText('A MOTION STUDY — FICTIONAL DATA', x, y + size * 2.85);
      ctx.globalAlpha = 1;
    }
  }

  function drawLabel(ring) {
    const L = S.L, s = S.s;
    const alpha = 1 - S.labelsOut;
    if (alpha <= 0.01) return;
    const C = ringCenter(ring), left = ring.idx === 0;
    const portrait = L.axis === 'y';
    const slide = S.labelsOut * 130 * s * (left ? -1 : 1);
    const x = C.x + (portrait ? 0 : (left ? 1 : -1) * L.labelOffset * s + slide);
    const y = C.y + L.labelY * s + (portrait ? slide * 0.2 : 0);
    const big = L.labelSize * s, small = big * 0.26;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = portrait ? 'center' : left ? 'left' : 'right';
    ctx.textBaseline = 'alphabetic';
    const counted = ring.sel >= 0 ? ring.sel + 1 : Math.round(S.loadedCount / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = font(600, small * 0.95);
    ctx.fillText(`NID-${ring.code} -${counted} / ${ring.N}`, x, y - big * 1.02);
    ctx.fillStyle = T.colorText;
    ctx.font = font(900, big);
    spacing(-0.03 * big);
    ctx.fillText(ring.key, x, y);
    spacing(0);
    ctx.font = font(700, small);
    ctx.fillStyle = red();
    ctx.fillText('CATEGORY INDEX', x, y + small * 1.55);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = font(500, small);
    ring.groups.forEach((g, i) => ctx.fillText(g, x, y + small * (3.15 + i * 1.5)));
    ctx.restore();
  }

  function drawFooter() {
    const L = S.L, s = S.s;
    const x = S.cx + S.bal * L.titleDrift * s;
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = font(400, 5 * s);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = S.titleMix;
    ctx.fillText("AFTER YUGOP'S NID GALLERY (2007) — ALL NAMES, IMAGES AND TEXTS ARE FICTIONAL", x, S.H - L.footerY * s);
    ctx.globalAlpha = 1;
  }

  function drawLoader() {
    if (S.loaderA <= 0.01) return;
    const L = S.L, s = S.s, N = 28, R = L.loaderR * s;
    const done = S.progress * N;
    const head = S.time * 11;
    ctx.save();
    ctx.globalAlpha = S.loaderA;
    ctx.translate(S.cx, S.cy);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const lit = i < done;
      const dist = wrap(i - head, N);
      const glow = lit ? Math.max(0, 1 - dist / 5) : 0;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(R, 0);
      const w = lerp(lit ? 15 : 11, 18, glow) * s, h = lerp(11, 16, glow) * s;
      ctx.fillStyle = `rgba(255,255,255,${(lit ? 0.32 : 0.1) + glow * 0.68})`;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    // 中央滑鼠圖示與提示
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1, s);
    const mw = 7.5 * s, mh = 12 * s, my = -12 * s;
    ctx.strokeRect(-mw, my - mh, mw * 2, mh * 2);
    const wheel = Math.sin(S.time * 5) * 3 * s;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-1.2 * s, my - 6 * s + wheel, 2.4 * s, 6 * s);
    ctx.font = font(700, 5.4 * s);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('USE YOUR SCROLL WHEEL', 0, 10 * s);
    ctx.fillStyle = red();
    ctx.font = font(700, 6 * s);
    const gate = S.progress >= 1 && S.phaseTime > T.loaderMin && !SFX.isRunning();
    const msg = gate ? 'CLICK ANYWHERE TO START — SOUND ON' : `NOW LOADING PEOPLE & WORKS ${S.genIndex} / ${genQueue.length}`;
    if (!gate || Math.sin(S.time * 7) > -0.5) ctx.fillText(msg, 0, R + 34 * s);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.fillStyle = T.colorBg;
    ctx.fillRect(0, 0, S.W, S.H);
    if (S.phase !== 'loading') {
      rings.forEach(drawRing);
      rings.forEach(drawLabel);
      rings.forEach(drawPanel);
      drawPairArrows();
      drawCross();
      drawSpinner();
      drawFooter();
    }
    drawTitle();
    drawLoader();
    if (window.NID_DEV) window.NID_DEV.drawOverlay(ctx);
  }

  // ───────── 輸入 ─────────
  function toStage(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (S.W / r.width), y: (e.clientY - r.top) * (S.H / r.height) };
  }
  function activate() {
    SFX.unlock();
    if (S.clickedAt < 0) S.clickedAt = S.time;
  }
  function clickAt(x, y) {
    if (S.phase === 'loading') return;
    S.mouse.x = x; S.mouse.y = y; S.mouse.inside = true;
    const hit = pick(x, y);
    if (!hit) return;
    if (hit.type === 'group') openDetail();
    else if (hit.type === 'x') closeDetail();
    else if (hit.type === 'panel') setView(S.view ? 0 : 1);
    else if (hit.type === 'item') {
      if (S.phase === 'browse') selectItem(hit.ring, hit.i);
      else if (S.phase === 'detail') switchDetail(hit.ring, hit.i);
    }
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = toStage(e);
    S.mouse.x = p.x; S.mouse.y = p.y; S.mouse.inside = true; S.mouse.type = e.pointerType;
    const t = S.touch;
    if (t && e.pointerId === t.id) {
      const delta = S.dir.x ? p.y - t.y : p.x - t.x;
      t.y = p.y; t.x = p.x;
      t.total += Math.abs(delta);
      if (t.total > 6 && S.phase === 'browse') {
        const slot = S.L.ringR * S.s * (360 / t.ring.N) * DEG;
        const sign = S.dir.x ? -1 : 1;
        nudge(t.ring, sign * delta / slot);
      }
    }
  });
  canvas.addEventListener('pointerleave', () => { S.mouse.inside = false; });
  canvas.addEventListener('pointerdown', (e) => {
    activate();
    const p = toStage(e);
    S.mouse.type = e.pointerType;
    if (e.pointerType !== 'mouse') {
      const axisPos = (p.x - S.cx) * S.dir.x + (p.y - S.cy) * S.dir.y;
      const ring = axisPos < 0 ? rings[0] : rings[1];
      S.touch = { id: e.pointerId, x: p.x, y: p.y, total: 0, ring };
      if (S.phase === 'browse') S.balTarget = ring.idx ? -1 : 1;
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    const p = toStage(e);
    const t = S.touch;
    if (t && e.pointerId === t.id) {
      S.touch = null;
      if (t.total <= 6) clickAt(p.x, p.y);
      else t.ring.lastInput = S.time;
      S.mouse.inside = false;
      return;
    }
    clickAt(p.x, p.y);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 33;
    if (e.deltaMode === 2) dy *= 300;
    if (Math.abs(dy) < 0.5) dy = e.deltaX;
    // 一次滾輪事件最多走一格，避免加速滾動時整圈亂跳
    nudge(activeRing(), clamp((dy / 100) * T.wheelStep, -1, 1));
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    activate();
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { nudge(activeRing(), 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { nudge(activeRing(), -1); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { openDetail(); e.preventDefault(); }
    else if (e.key === 'Escape') closeDetail();
    else if (e.key === 'm' || e.key === 'M') toggleSound();
  });
  window.addEventListener('resize', resize);

  const soundBtn = document.getElementById('sound-toggle');
  function paintSound() { soundBtn.textContent = SFX.enabled ? 'SOUND ON' : 'SOUND OFF'; }
  function toggleSound() { activate(); SFX.setEnabled(!SFX.enabled); paintSound(); }
  soundBtn.addEventListener('click', toggleSound);
  paintSound();

  // ───────── 主迴圈 ─────────
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  resize();
  requestAnimationFrame(frame);

  // 供 DEV 工具與測試使用
  window.NID = {
    S, rings, CFG, EASE,
    refresh,
    setLayout(name) { S.forced = name; resize(); },
    replayIntro, forceLoadAll, openDetail, closeDetail, selectItem, nudge,
    replayPair: () => { if (S.phase === 'browse' && S.aligned) pairDone(); },
    toggleView: () => { if (S.phase === 'detail') setView(S.view ? 0 : 1); },
    selectRandom() {
      if (S.phase !== 'browse') return;
      const ring = rings[Math.floor(Math.random() * 2)];
      selectItem(ring, Math.floor(Math.random() * ring.N));
    },
    setBalance(v) { S.mouse.inside = false; S.balTarget = v; },
    ringCenter, panelRect, crossPoint
  };
})();
