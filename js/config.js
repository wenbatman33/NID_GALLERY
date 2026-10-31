// 所有可調數值集中於此。LAYOUT 的座標單位是「設計稿單位」，由 stageW / stageH 決定縮放。
// 數值來自逐幀量測原作影片（800×600 畫面）：
//   圓心距中線 370、中性半徑 298、主動 408、被動 188（兩環半徑和恆為 596）
window.NID_CONFIG = {
  LAYOUT: {
    PC: {
      axis: 'x',
      stageW: 800, stageH: 600,
      ringDist: 370, ringCross: 0, ringR: 298, ringDelta: 110,
      thumbRatio: 0.155, framePad: 0.07, selectedMag: 1.9,
      fisheyeAmp: 6.5, fisheyeDecay: 40, fisheyeSoft: 4, magSigma: 8,
      capShow: 1, capGap: 11, capName: 7, capSub: 4.6, capSelName: 12, capSelSub: 6.5,
      markerGap: 9, markerSize: 2.2,
      panelSize: 265, panelOffset: 160, panelPad: 26, panelText: 8.6, panelHead: 9.5,
      detailR: 284, detailThumb: 33, detailGap: 45,
      xSize: 9, arrowSize: 16,
      titleY: 12, titleSize: 11.5, titleDrift: 210,
      labelOffset: -30, labelY: -18, labelSize: 24,
      footerY: 8, loaderR: 72, loaderTitle: 148
    },
    TABLET: {
      axis: 'x',
      stageW: 800, stageH: 600,
      ringDist: 362, ringCross: 0, ringR: 292, ringDelta: 100,
      thumbRatio: 0.165, framePad: 0.07, selectedMag: 1.85,
      fisheyeAmp: 6.5, fisheyeDecay: 40, fisheyeSoft: 4, magSigma: 8,
      capShow: 1, capGap: 11, capName: 7.4, capSub: 4.8, capSelName: 12.5, capSelSub: 6.8,
      markerGap: 9, markerSize: 2.4,
      panelSize: 260, panelOffset: 156, panelPad: 24, panelText: 9, panelHead: 10,
      detailR: 282, detailThumb: 34, detailGap: 46,
      xSize: 10, arrowSize: 16,
      titleY: 12, titleSize: 11.5, titleDrift: 190,
      labelOffset: -30, labelY: -18, labelSize: 22,
      footerY: 8, loaderR: 72, loaderTitle: 148
    },
    MOBILE: {
      axis: 'y',
      stageW: 400, stageH: 800,
      ringDist: 305, ringCross: 0, ringR: 232, ringDelta: 72,
      thumbRatio: 0.165, framePad: 0.07, selectedMag: 1.85,
      fisheyeAmp: 7, fisheyeDecay: 40, fisheyeSoft: 4, magSigma: 9,
      capShow: 0, capGap: 11, capName: 7, capSub: 4.6, capSelName: 12, capSelSub: 7,
      markerGap: 8, markerSize: 2.2,
      panelSize: 206, panelOffset: 112, panelPad: 18, panelText: 9.4, panelHead: 10.5,
      detailR: 158, detailThumb: 25, detailGap: 72,
      xSize: 10, arrowSize: 12,
      titleY: 12, titleSize: 11, titleDrift: 0,
      labelOffset: 0, labelY: -14, labelSize: 22,
      footerY: 6, loaderR: 62, loaderTitle: 130
    }
  },

  TUNING: {
    // 旋轉與收斂（數字越大越快，單位 1/秒）
    ringEase: 7.5, radiusEase: 7, selEase: 10, balSettle: 0.06,
    wheelStep: 1, snapDelay: 0.14, balThreshold: 46,
    // 縮圖收成白點／展開
    collapseTime: 0.12, expandTime: 0.22, expandStagger: 0.3, flashTime: 0.55,
    // 進場
    loaderMin: 2.2, introAppear: 1.7, appearTime: 0.45, loadInterval: 0.092, loadTime: 0.35,
    // 詳情
    panelTime: 0.55, panelEase: 'expoOut', detailMoveTime: 0.38, detailLoad: 1.27,
    exitTime: 0.45, exitReady: 0.95, viewCycle: 3.0, crossfade: 0.8, ghost: 0.13,
    // 配對完成（量測自原作）：全白維持→淡出；三角靠攏成白點→長出白 X→轉紅
    pairHold: 0.2, pairFade: 0.1, pairArrowTime: 0.3, xWhiteHold: 0.2, xRedTime: 0.18,
    // 動態模糊與透明度
    motionBlur: 1, frameAlpha: 0.42, capAlpha: 1, capFar: 0.22,
    // 音效
    volume: 0.7,
    // 色彩
    colorBg: '#0b0a0a', colorRed: '#ff2b24', colorText: '#ffffff',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif'
  }
};
