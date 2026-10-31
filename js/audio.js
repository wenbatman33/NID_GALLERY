// 音效：完全用 Web Audio 即時合成，不使用任何音檔。
// 規格全部量測自原作影片音軌（單聲道、無背景音樂、全為正弦純音）：
//   open  1 kHz 105 ms，起音後 140 ms 接 500 Hz 305 ms    → 進場、開啟、關閉
//   tick  500 Hz 約 20 ms 的快速衰減 click                 → 縮圖載入
//   step  單顆 55 ms，500 / 1k / 2k 擇一                   → 環實際轉過一格
//   triad 三顆 55 ms、間隔 90 ms，下行 2k→1k→500          → 選定（詳情中切回人物）
//         上行 500→1k→2k                                   → 詳情中切到作品
//   ready 4 kHz 45 ms 兩聲、間隔 70 ms                     → X 長出時、內容載入完成
// 包絡線格式：[相對秒數, 相對音量]。
window.NID_SFX = (function () {
  const ENV = {
    tone: [[0.001, 0.4], [0.005, 0.73], [0.012, 0.94], [0.022, 1], [0.032, 1], [0.042, 0.88], [0.047, 0.5], [0.05, 0]],
    beep: [[0.001, 0.4], [0.003, 0.65], [0.006, 0.85], [0.013, 0.96], [0.023, 1], [0.033, 0.87], [0.038, 0.6], [0.041, 0]],
    openHigh: [[0.001, 1], [0.043, 0.99], [0.063, 0.91], [0.083, 0.74], [0.093, 0.46], [0.1, 0]],
    openLow: [[0.001, 0.45], [0.006, 0.73], [0.013, 0.86], [0.023, 0.92], [0.043, 0.99], [0.063, 1], [0.143, 0.98], [0.203, 0.92], [0.243, 0.83], [0.273, 0.65], [0.293, 0.5], [0.3, 0]],
    click: [[0.001, 0.6], [0.002, 1], [0.003, 0.85], [0.004, 0.6], [0.005, 0.31], [0.007, 0.21], [0.01, 0.14], [0.014, 0.1], [0.018, 0.05], [0.021, 0]]
  };
  const STEP_FREQS = [500, 1000, 2000];
  const BASE_PEAK = 0.3;   // 原作音軌峰值約 0.3
  const TONE_GAP = 0.09;   // 三連音間隔

  let ac = null, master = null;
  let enabled = true;
  let stepFreq = 1000, lastStep = 0, lastTick = 0;

  function ensure() {
    if (ac) return ac;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = enabled ? (window.NID_CONFIG.TUNING.volume) : 0;
    master.connect(ac.destination);
    return ac;
  }

  function unlock() {
    if (!ensure()) return false;
    if (ac.state === 'suspended') ac.resume();
    return true;
  }

  function isRunning() { return !!ac && ac.state === 'running'; }

  function play(freq, envelope, delay, peak) {
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime + 0.004 + (delay || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    envelope.forEach(([dt, v]) => gain.gain.linearRampToValueAtTime(v * BASE_PEAK * (peak || 1), t + dt));
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + envelope[envelope.length - 1][0] + 0.01);
  }

  const SFX = {
    unlock,
    isRunning,
    get enabled() { return enabled; },
    setEnabled(v) {
      enabled = v;
      if (master) master.gain.value = v ? window.NID_CONFIG.TUNING.volume : 0;
    },
    setVolume(v) {
      window.NID_CONFIG.TUNING.volume = v;
      if (master && enabled) master.gain.value = v;
    },
    open() {
      play(1000, ENV.openHigh, 0);
      play(500, ENV.openLow, 0.14);
    },
    tick() {
      const now = performance.now();
      if (now - lastTick < 30) return;
      lastTick = now;
      play(500, ENV.click, 0, 1.1);
    },
    step() {
      const now = performance.now();
      if (now - lastStep < 55) return;
      // 同一段連續滾動維持同一個音高（原作連續滾動時音高常相同）
      if (now - lastStep > 500) stepFreq = STEP_FREQS[Math.floor(Math.random() * STEP_FREQS.length)];
      lastStep = now;
      play(stepFreq, ENV.tone, 0);
    },
    triad(direction) {
      const seq = direction === 'up' ? [500, 1000, 2000] : [2000, 1000, 500];
      seq.forEach((f, i) => play(f, ENV.tone, i * TONE_GAP));
    },
    ready() {
      play(4000, ENV.beep, 0);
      play(4000, ENV.beep, 0.07);
    }
  };
  return SFX;
})();
