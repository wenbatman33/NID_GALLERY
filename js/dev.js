// DEV 微調工具：按 D 或右下角齒輪開關。滑桿即時生效，也可直接在畫面上拖曳元件。
// 調好後按「💾 匯出 / 鎖定」取得 JSON，把它貼給 Claude 寫回 config.js。
window.NID_DEV = (function () {
  const G = window.NID, S = G.S, CFG = G.CFG, T = CFG.TUNING;
  const STORAGE_KEY = 'nid-gallery-dev-v1';
  const DEFAULTS = JSON.parse(JSON.stringify({ LAYOUT: CFG.LAYOUT, TUNING: CFG.TUNING }));

  // [群組, [[鍵, 標籤, 最小, 最大, 步進], ...]]
  const LAYOUT_SCHEMA = [
    ['圓環', [
      ['ringDist', '圓心距中線', 150, 700, 1], ['ringCross', '圓心橫向偏移', -200, 200, 1],
      ['ringR', '中性半徑', 100, 500, 1], ['ringDelta', '主被動半徑差', 0, 240, 1],
      ['thumbRatio', '縮圖／半徑比', 0.05, 0.3, 0.001], ['framePad', '邊框留白', 0, 0.2, 0.005]
    ]],
    ['選定與魚眼', [
      ['selectedMag', '選定放大倍率', 1, 3, 0.01], ['magSigma', '放大影響角度', 2, 30, 0.1],
      ['fisheyeAmp', '魚眼推開量', 0, 20, 0.1], ['fisheyeDecay', '魚眼衰減', 10, 120, 1], ['fisheyeSoft', '魚眼中心柔度', 1, 12, 0.1]
    ]],
    ['標題文字', [
      ['capGap', '說明距離', 0, 30, 0.5], ['capName', '名稱字級', 3, 14, 0.1], ['capSub', '副標字級', 3, 10, 0.1],
      ['capSelName', '選定名稱字級', 6, 24, 0.1], ['capSelSub', '選定副標字級', 4, 14, 0.1],
      ['titleY', '主標題 Y', 0, 80, 1], ['titleSize', '主標題字級', 6, 24, 0.1], ['titleDrift', '主標題漂移', 0, 320, 1],
      ['labelOffset', '側標 X 偏移', -120, 120, 1], ['labelY', '側標 Y', -120, 120, 1], ['labelSize', '側標字級', 10, 48, 0.5],
      ['footerY', '頁尾 Y', 0, 40, 1]
    ]],
    ['記號與叉號', [['markerGap', '紅點距離', 0, 24, 0.5], ['markerSize', '紅點大小', 0.5, 6, 0.1], ['xSize', '叉號大小', 3, 24, 0.5], ['arrowSize', '配對三角大小', 4, 40, 0.5]]],
    ['詳情面板', [
      ['panelSize', '面板尺寸', 100, 400, 1], ['panelOffset', '面板距中線', 60, 300, 1],
      ['panelPad', '面板內距', 0, 60, 1], ['panelText', '內文字級', 5, 16, 0.1], ['panelHead', '標題字級', 5, 18, 0.1],
      ['detailR', '詳情圓半徑', 100, 460, 1], ['detailThumb', '詳情縮圖', 10, 70, 1], ['detailGap', '軸線留空角度', 15, 90, 1]
    ]],
    ['載入畫面', [['loaderR', '載入環半徑', 30, 140, 1], ['loaderTitle', '載入時標題高度', 60, 240, 1]]]
  ];
  const TUNING_SCHEMA = [
    ['旋轉', [
      ['ringEase', '環旋轉速度', 1, 20, 0.1], ['radiusEase', '半徑變化速度', 1, 20, 0.1], ['selEase', '選定放大速度', 1, 30, 0.1],
      ['wheelStep', '滾輪靈敏度', 0.1, 3, 0.05], ['snapDelay', '停手後吸附(秒)', 0.03, 0.6, 0.01], ['balThreshold', '主動切換門檻', 0, 120, 1],
      ['motionBlur', '動態模糊', 0, 3, 0.05]
    ]],
    ['白點收合', [
      ['collapseTime', '收合時間', 0.02, 0.6, 0.01], ['expandTime', '展開時間', 0.02, 0.8, 0.01],
      ['expandStagger', '展開錯開', 0, 1, 0.01], ['flashTime', '閃白時間', 0.05, 1.5, 0.01]
    ]],
    ['配對閃白', [
      ['pairHold', '全白維持', 0, 1, 0.01], ['pairFade', '全白淡出', 0.02, 1, 0.01], ['pairArrowTime', '三角靠攏時間', 0.05, 1, 0.01],
      ['xWhiteHold', 'X 白色維持', 0, 1, 0.01], ['xRedTime', 'X 轉紅時間', 0.02, 1, 0.01]
    ]],
    ['進場', [
      ['loaderMin', '最短載入', 0, 6, 0.1], ['introAppear', '線框彈出總長', 0.2, 4, 0.1],
      ['appearTime', '單格彈出', 0.1, 1.5, 0.01], ['loadInterval', '照片載入間隔', 0.02, 0.3, 0.002], ['loadTime', '單張載入', 0.05, 1.2, 0.01]
    ]],
    ['詳情', [
      ['panelTime', '面板展開', 0.1, 1.5, 0.01], ['detailMoveTime', '環位移時間', 0.1, 1.2, 0.01], ['detailLoad', '假載入時間', 0.2, 3, 0.01],
      ['exitTime', '關閉時間', 0.1, 1.5, 0.01], ['exitReady', '關閉到完成', 0.3, 3, 0.01],
      ['viewCycle', '自動切換(秒)', 1, 10, 0.1], ['crossfade', '切換溶接', 0.1, 2, 0.01], ['ghost', '殘影亮度', 0, 0.5, 0.01]
    ]],
    ['透明度', [['frameAlpha', '邊框亮度', 0, 1, 0.01], ['capAlpha', '說明亮度', 0, 1, 0.01], ['capFar', '遠端說明亮度', 0, 1, 0.01]]]
  ];

  let open = false, panel, layoutHost, dragging = null;

  // ───── 儲存 ─────
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ LAYOUT: CFG.LAYOUT, TUNING: T })); } catch (e) { /* 無痕模式略過 */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.keys(CFG.LAYOUT).forEach((k) => Object.assign(CFG.LAYOUT[k], data.LAYOUT[k]));
      const font = T.fontFamily;
      Object.assign(T, data.TUNING);
      T.fontFamily = font;
    } catch (e) { /* 資料毀損就用預設值 */ }
  }

  // ───── 面板 ─────
  function row(obj, [key, label, min, max, step], onChange) {
    const el = document.createElement('div');
    el.className = 'dev-row';
    el.innerHTML = `<label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}"><input type="number" step="${step}">`;
    const [range, num] = el.querySelectorAll('input');
    range.value = num.value = obj[key];
    const set = (v) => {
      obj[key] = parseFloat(v);
      range.value = num.value = obj[key];
      G.refresh();
      if (onChange) onChange();
      save();
    };
    range.addEventListener('input', () => set(range.value));
    num.addEventListener('input', () => { if (num.value !== '') set(num.value); });
    return el;
  }
  function section(host, title, obj, list) {
    const h = document.createElement('h3');
    h.textContent = title;
    host.appendChild(h);
    list.forEach((def) => host.appendChild(row(obj, def)));
  }
  function buttons(host, list) {
    const box = document.createElement('div');
    box.className = 'dev-buttons';
    list.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.addEventListener('click', fn);
      box.appendChild(b);
    });
    host.appendChild(box);
    return box;
  }
  function paintLayout() {
    layoutHost.innerHTML = '';
    LAYOUT_SCHEMA.forEach(([title, list]) => section(layoutHost, `${title}（${S.layoutName}）`, S.L, list));
    panel.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === S.layoutName));
  }
  function build() {
    panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.hidden = true;
    panel.innerHTML = '<h2>DEV 微調（D 關閉）</h2><div class="dev-hint">畫面上的虛線框可直接拖曳。數值會自動保留到下次開啟。</div>';
    document.body.appendChild(panel);

    const layoutButtons = buttons(panel, ['PC', 'TABLET', 'MOBILE'].map((name) => [name, () => { G.setLayout(name); paintLayout(); }]));
    layoutButtons.querySelectorAll('button').forEach((b) => { b.dataset.layout = b.textContent; });
    buttons(panel, [['自動版面', () => { G.setLayout(null); paintLayout(); }]]);

    const h = document.createElement('h3'); h.textContent = '狀態切換'; panel.appendChild(h);
    buttons(panel, [
      ['重播進場', G.replayIntro], ['照片全載入', G.forceLoadAll], ['隨機配對', () => { G.forceLoadAll(); G.selectRandom(); }],
      ['配對閃白', G.replayPair], ['開詳情', G.openDetail], ['關詳情', G.closeDetail], ['切換檢視', G.toggleView],
      ['左環主動', () => G.setBalance(1)], ['中性', () => G.setBalance(0)], ['右環主動', () => G.setBalance(-1)]
    ]);

    const snd = document.createElement('h3'); snd.textContent = '音效試聽'; panel.appendChild(snd);
    const SFX = window.NID_SFX;
    panel.appendChild(row(T, ['volume', '音量', 0, 1, 0.01], () => SFX.setVolume(T.volume)));
    const play = (fn) => () => { SFX.unlock(); fn(); };
    buttons(panel, [
      ['開啟', play(() => SFX.open())], ['載入 click', play(() => SFX.tick())], ['滾輪', play(() => SFX.step())],
      ['下行三連', play(() => SFX.triad('down'))], ['上行三連', play(() => SFX.triad('up'))], ['完成雙響', play(() => SFX.ready())]
    ]);

    layoutHost = document.createElement('div');
    panel.appendChild(layoutHost);

    TUNING_SCHEMA.forEach(([title, list]) => section(panel, title, T, list));

    const easeRow = document.createElement('div');
    easeRow.className = 'dev-row wide';
    easeRow.innerHTML = '<label>面板緩動</label><select></select>';
    const sel = easeRow.querySelector('select');
    Object.keys(G.EASE).forEach((k) => { const o = document.createElement('option'); o.value = o.textContent = k; sel.appendChild(o); });
    sel.value = T.panelEase;
    sel.addEventListener('change', () => { T.panelEase = sel.value; save(); });
    panel.appendChild(easeRow);

    const c = document.createElement('h3'); c.textContent = '色彩'; panel.appendChild(c);
    [['colorBg', '背景'], ['colorRed', '紅色'], ['colorText', '文字']].forEach(([key, label]) => {
      const el = document.createElement('div');
      el.className = 'dev-row wide';
      el.innerHTML = `<label>${label}</label><input type="color" value="${T[key]}">`;
      el.querySelector('input').addEventListener('input', (e) => { T[key] = e.target.value; save(); });
      panel.appendChild(el);
    });

    const ex = document.createElement('h3'); ex.textContent = '匯出'; panel.appendChild(ex);
    buttons(panel, [['💾 匯出 / 鎖定', exportValues], ['還原預設', resetValues]]);
    const out = document.createElement('textarea');
    out.id = 'dev-export'; out.readOnly = true;
    out.placeholder = '匯出的 JSON 會出現在這裡，並複製到剪貼簿';
    panel.appendChild(out);

    paintLayout();
  }
  function exportValues() {
    const json = JSON.stringify({ LAYOUT: CFG.LAYOUT, TUNING: T }, null, 2);
    document.getElementById('dev-export').value = json;
    console.log('[NID DEV 匯出]\n' + json);
    if (navigator.clipboard) navigator.clipboard.writeText(json).catch(() => {});
  }
  function resetValues() {
    Object.keys(CFG.LAYOUT).forEach((k) => Object.assign(CFG.LAYOUT[k], DEFAULTS.LAYOUT[k]));
    Object.assign(T, DEFAULTS.TUNING);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 無痕模式略過 */ }
    G.refresh();
    rebuild();
  }
  function rebuild() {
    const wasOpen = open;
    panel.remove();
    build();
    panel.hidden = !wasOpen;
  }
  function toggle() {
    open = !open;
    panel.hidden = !open;
    if (open) paintLayout();
  }

  // ───── 畫面直接拖曳 ─────
  function handles() {
    const L = S.L, s = S.s, list = [];
    if (S.phase === 'loading') return list;
    G.rings.forEach((ring) => {
      const C = G.ringCenter(ring), sign = ring.idx ? -1 : 1;
      // 把手放在圓心上方，避免和側標的拖曳框重疊
      list.push({
        id: 'ring' + ring.idx, label: ring.key + ' 圓環位置', x: C.x, y: C.y - 62 * s, w: 26 * s, h: 26 * s,
        drag(dx, dy) {
          if (L.axis === 'x') { L.ringDist -= sign * dx; L.ringCross += dy; } else { L.ringDist -= sign * dy; L.ringCross += dx; }
        }
      });
      const portrait = L.axis === 'y';
      const lx = C.x + (portrait ? 0 : (ring.idx ? -1 : 1) * L.labelOffset * s) + (portrait ? 0 : sign * 40 * s);
      list.push({
        id: 'label' + ring.idx, label: ring.key + ' 側標', x: lx, y: C.y + (L.labelY + 8) * s, w: 96 * s, h: 58 * s,
        drag(dx, dy) { L.labelOffset += (ring.idx ? -1 : 1) * dx; L.labelY += dy; }
      });
    });
    list.push({
      id: 'title', label: '主標題', x: S.cx + S.bal * L.titleDrift * s, y: (L.titleY + 12) * s, w: 220 * s, h: 34 * s,
      drag(dx, dy) { L.titleY += dy; L.titleDrift += dx; }
    });
    if (S.panel > 0.5) {
      G.rings.forEach((ring) => {
        const p = G.panelRect(ring);
        list.push({
          id: 'panel' + ring.idx, label: '面板', x: p.x, y: p.y, w: p.size, h: p.size,
          drag(dx, dy) { L.panelOffset += (ring.idx ? 1 : -1) * (L.axis === 'x' ? dx : dy); }
        });
      });
    }
    return list;
  }
  function drawOverlay(ctx) {
    if (!open) return;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    handles().forEach((h) => {
      const active = dragging && dragging.id === h.id;
      ctx.strokeStyle = active ? '#ff4a42' : 'rgba(120,220,255,0.8)';
      ctx.strokeRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
      ctx.fillStyle = 'rgba(120,220,255,0.95)';
      ctx.fillText(h.label, h.x - h.w / 2, h.y - h.h / 2 - 2);
    });
    ctx.restore();
  }
  function stagePoint(e) {
    const c = document.getElementById('stage'), r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (S.W / r.width), y: (e.clientY - r.top) * (S.H / r.height) };
  }
  function bindDrag() {
    const c = document.getElementById('stage');
    c.addEventListener('pointerdown', (e) => {
      if (!open) return;
      const p = stagePoint(e);
      const hit = handles().find((h) => Math.abs(p.x - h.x) <= h.w / 2 && Math.abs(p.y - h.y) <= h.h / 2);
      if (!hit) return;
      dragging = { id: hit.id, x: p.x, y: p.y };
      e.stopImmediatePropagation();
      c.setPointerCapture(e.pointerId);
    }, true);
    c.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const p = stagePoint(e);
      const h = handles().find((item) => item.id === dragging.id);
      if (h) h.drag((p.x - dragging.x) / S.s, (p.y - dragging.y) / S.s);
      dragging.x = p.x; dragging.y = p.y;
      e.stopImmediatePropagation();
    }, true);
    c.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = null;
      paintLayout();
      save();
      e.stopImmediatePropagation();
    }, true);
  }

  load();
  G.refresh();
  build();
  bindDrag();
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'd' || e.key === 'D') toggle();
  });
  document.getElementById('dev-toggle').addEventListener('click', toggle);

  return { drawOverlay, toggle };
})();
