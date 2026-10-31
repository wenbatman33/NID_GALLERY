// 假資料：28 位虛構人物與 28 件虛構作品，姓名、經歷、作品皆為杜撰。
window.NID_DATA = (function () {
  // [羅馬字, 漢字, 職稱, 分類, 簡介]
  const PEOPLE = [
    ['KENJI TAKAMORI', '高森 健二', 'PROFESSOR, SPACE DESIGN', 'T', '1962 年生。長年研究光線如何改變室內尺度，近年把教室當成實驗場，讓學生以一盞燈重新定義一個房間。'],
    ['MIO SHIRAKAWA', '白川 澪', 'STUDENT, TEXTILE', 'S', '在雪國長大，對白色的層次特別敏感。正在用手織機記錄一整個冬天的積雪高度。'],
    ['RYOTA OGURA', '小倉 亮太', 'ALUMNI, PRODUCT', 'A', '畢業後進入家電廠商，負責操作介面的觸感設計。相信按鈕的手感是一種語言。'],
    ['NATSUKI HAYAMA', '葉山 夏希', 'STUDENT, CRAFT', 'S', '從祖母留下的漆器開始接觸工藝。目前嘗試把修補的痕跡當成新的紋樣。'],
    ['SHUN KITAGAWA', '北川 駿', 'LECTURER, VISUAL', 'T', '設計師兼講師，專長是資訊圖表。課堂上最常說的話是「先把它畫出來」。'],
    ['AYANE MINATO', '湊 彩音', 'ALUMNI, ILLUSTRATION', 'A', '以細線插畫見長，筆下常出現不存在的港口。現居東京，為書籍與雜誌繪製封面。'],
    ['TOMOYA ISHIDA', '石田 智也', 'STUDENT, MEDIA ART', 'S', '對感測器與聲音著迷，作品多半要靠觀眾走動才會發生。夢想是做一座會呼吸的牆。'],
    ['YUKA FUJINO', '藤野 由佳', 'PROFESSOR, CRAFT', 'T', '金工出身，三十年來持續敲打同一種銅板。她說重複本身就是一種思考方式。'],
    ['DAISUKE NONAKA', '野中 大輔', 'ALUMNI, ARCHITECTURE', 'A', '在地方城市經營小型事務所，專門替老倉庫找新用途，也參與社區再生計畫。'],
    ['RINA ASAKURA', '朝倉 里奈', 'STUDENT, GRAPHIC', 'S', '喜歡收集街上的手寫招牌。畢業製作打算把這些字整理成一套字體。'],
    ['HIROSHI KAMIYA', '神谷 博', 'PROFESSOR, PRODUCT', 'T', '曾任職汽車公司設計部門。退休後回到教職，帶學生從一把椅子開始理解結構。'],
    ['SAKI TOYODA', '豊田 咲', 'ALUMNI, JEWELRY', 'A', '以回收塑膠製作首飾而受到注意。她的工作室同時也是鄰里的修理站。'],
    ['KAITO MURAKI', '村木 海斗', 'STUDENT, ANIMATION', 'S', '逐格手繪動畫的信徒。一支三十秒短片花了他整整八個月。'],
    ['EMI NAKAGIRI', '中桐 恵美', 'LECTURER, TEXTILE', 'T', '走訪日本各地染織產地，建立了一份植物染色資料庫，開放給學生使用。'],
    ['SOTA HIRAI', '平井 颯太', 'STUDENT, SOUND', 'S', '用正弦波與環境錄音創作。他認為介面的聲音應該像標點符號一樣安靜而準確。'],
    ['MAI KUBOTA', '久保田 舞', 'ALUMNI, CERAMICS', 'A', '在山間設窯，燒製日常用的器皿。釉色的靈感幾乎都來自窯邊的泥土。'],
    ['TAKUMI OSAWA', '大澤 拓海', 'STUDENT, GRAPHIC', 'S', '海報控，宿舍牆上貼滿自己印的試版。正在研究低成本的孔版印刷。'],
    ['NORIKO TSUJI', '辻 典子', 'PROFESSOR, PRINT', 'T', '版畫家，作品由多家美術館典藏。教學時堅持學生親手調色、親手壓印。'],
    ['YUTO SEKINE', '関根 悠斗', 'ALUMNI, MEDIA ART', 'A', '以大型光影裝置參與多個國際展覽。他的作品經常藉由程式產生不重複的時間。'],
    ['HINA MOCHIZUKI', '望月 陽菜', 'STUDENT, FASHION', 'S', '想做穿得久的衣服。目前正在實驗不需要裁切、可完全拆解回收的版型。'],
    ['MASATO IWASE', '岩瀬 正人', 'LECTURER, PHOTO', 'T', '攝影師，長期拍攝信濃川沿岸的村落。學生暱稱他為「走路的地圖」。'],
    ['KOTONE AOKI', '青木 琴音', 'STUDENT, BOOK DESIGN', 'S', '喜歡紙張翻動的聲音。她的書常常必須慢慢翻，內容才會顯現。'],
    ['TETSU WAKABAYASHI', '若林 徹', 'PROFESSOR, METAL', 'T', '研究傳統鑄造與現代材料的交界，也協助地方工廠開發新的產品線。'],
    ['YUNA SAEKI', '佐伯 優奈', 'ALUMNI, GLASS', 'A', '在小樽學習吹製玻璃後回到故鄉。作品刻意保留氣泡，把偶然留在裡面。'],
    ['RENTARO HOSHI', '星 蓮太郎', 'STUDENT, INTERACTION', 'S', '對滑鼠滾輪這類小動作很著迷，正在研究手指與畫面之間的時間差。'],
    ['CHIHIRO UENO', '上野 千尋', 'ALUMNI, PAINTING', 'A', '繪畫創作者，畫面常由數百層薄塗堆疊而成，遠看安靜，近看喧嘩。'],
    ['GENKI ARAI', '新井 元気', 'STUDENT, WOOD', 'S', '老家是木工所。他想設計一套不用釘子、小孩也能自己組裝的家具。'],
    ['SHIORI KONDO', '近藤 詩織', 'LECTURER, TYPE', 'T', '字體設計師，參與多款日文字型開發。她說字距就是文字之間的呼吸。']
  ];

  // [標題, 分類, 圖像演算法, 說明]
  const WORKS = [
    ['TIDAL LEDGER', 'GRAPHIC DESIGN', 'strata', '把一年的潮汐紀錄轉換成色帶，每一條線都是一天。'],
    ['"LOW" BLUE SCRIPT SERIES', 'PAINTING', 'neon', '在深藍底上以發光顏料書寫，只有在暗處才讀得出來。'],
    ['FIELD OF SALT', 'MEDIA ART', 'scatter', '數千個光點依觀眾的位置聚散，像海風帶走的鹽粒。'],
    ['LINEAR SETS OF BENT SHARDS', 'GRAPHIC DESIGN', 'shard', '以折射的玻璃碎片研究光的邊界，共十二張連作。'],
    ['MOSS PAPER', 'CRAFT OBJECT', 'paper', '在手抄紙中混入苔蘚纖維，紙張會隨濕度慢慢變色。'],
    ['WHITE INTERFERENCE', 'PAINTING', 'splatter', '滴落的墨點由重力決定位置，創作者只決定高度。'],
    ['DRY RIVERBED', 'TEXTILE', 'crackle', '以防染技法重現乾涸河床的裂紋。'],
    ['FROM EACH', 'CRAFT OBJECT', 'stack', '一千個手捏陶片堆疊成塔，每片都來自不同的人。'],
    ['NIGHT WATCHER', 'MEDIA ART', 'eyes', '會回看觀眾的巨大雙眼，由一隻貓頭鷹的影像合成。'],
    ['RED CRANE', 'GRAPHIC DESIGN', 'bird', '以單一紅色塊表現鶴的轉身，是地方祭典的主視覺。'],
    ['INVENTORY OF SMALL THINGS', 'GRAPHIC DESIGN', 'inkgrid', '把工作桌上的物件拍成九宮格，整理成一本目錄。'],
    ['RHO', 'PRODUCT', 'spheres', '三顆拋光金屬球組成的桌上時鐘，以球的距離表示時間。'],
    ['HIDA', 'CRAFT OBJECT', 'bowl', '黑釉茶碗，碗底保留一道火痕。'],
    ['RIBBON CHAIR', 'PRODUCT', 'ribbon', '一片彎曲的成型合板同時是椅面與椅腳。'],
    ['WEFT / DRIFT', 'TEXTILE', 'weave', '經線固定、緯線隨機，每一公尺的花樣都不同。'],
    ['TYPE SPECIMEN A', 'GRAPHIC DESIGN', 'poster', '為一款新字體所做的海報，只放得下一個字母。'],
    ['AFTERGLOW NOTES', 'PAINTING', 'strata', '記錄黃昏天色變化的連續筆記，共三百六十五張。'],
    ['SIGNAL GARDEN', 'MEDIA ART', 'neon', '無線訊號的強度被畫成會生長的藍色藤蔓。'],
    ['SNOW COUNT', 'MEDIA ART', 'scatter', '即時讀取氣象資料，每一片雪都是真實的降雪量。'],
    ['SPLIT LIGHT', 'PRODUCT', 'shard', '一盞利用稜鏡分光的桌燈，光線落在牆上才完成作品。'],
    ['TEA STAIN ARCHIVE', 'CRAFT OBJECT', 'paper', '收集一百杯茶留下的痕跡，裱成紙本檔案。'],
    ['PRESSURE MAP', 'TEXTILE', 'crackle', '織品表面隨坐姿改變顏色，記錄身體的重量。'],
    ['SIXTEEN BOWLS', 'CRAFT OBJECT', 'bowl', '同一塊土分成十六份，燒成十六種不同的黑。'],
    ['THREE STILL OBJECTS', 'PRODUCT', 'spheres', '替三件家電重新設計外殼，只留下必要的曲面。'],
    ['WHITE HERON', 'GRAPHIC DESIGN', 'bird', '為地方濕地保育所做的識別系統。'],
    ['PLAID STUDY 28', 'TEXTILE', 'weave', '第二十八號格紋研究，色彩比例取自校園四季。'],
    ['LOOSE ALPHABET', 'GRAPHIC DESIGN', 'poster', '把字母拆解後重新排列，閱讀變成一種尋找。'],
    ['KILN LOG', 'CRAFT OBJECT', 'stack', '依窯溫紀錄排列的陶片裝置，高度對應當日溫度。']
  ];

  // 固定種子洗牌：讓「人物 ↔ 作品」的對應看起來沒有順序，每次配對都要轉一段距離
  function shuffled(n, seed) {
    const a = Array.from({ length: n }, (_, i) => i);
    let x = seed;
    for (let i = n - 1; i > 0; i--) {
      x = (x * 1664525 + 1013904223) >>> 0;
      const j = x % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const pairOfPerson = shuffled(PEOPLE.length, 20070401);
  const pairOfWork = [];
  pairOfPerson.forEach((w, p) => { pairOfWork[w] = p; });

  return {
    people: PEOPLE.map((r, i) => ({
      id: 'p' + i, name: r[0], kanji: r[1], sub: r[2], group: r[3], text: r[4], pair: pairOfPerson[i], seed: 1000 + i * 37
    })),
    works: WORKS.map((r, i) => ({
      id: 'w' + i, name: r[0], kanji: r[0], sub: r[1], group: r[1], art: r[2], text: r[3], pair: pairOfWork[i], seed: 5000 + i * 53
    })),
    peopleGroups: ['PROFESSOR/TEACHER', 'ALUMNI', 'STUDENT'],
    workGroups: ['GRAPHIC DESIGN', 'CRAFT OBJECT', 'MEDIA ART', 'PRODUCT', 'PAINTING', 'TEXTILE']
  };
})();
