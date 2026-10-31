#!/usr/bin/env node
/**
 * 批次生成人物肖像（透過 codex exec 內建 image_gen 工具）
 *
 * 用法：
 *   node scripts/gen_portraits.mjs              # 全跑，已存在的原圖會跳過
 *   node scripts/gen_portraits.mjs --only p3 p7 # 只跑指定人物（原圖存在一樣跳過，要重產請先搬走原圖）
 *
 * 輸出：
 *   assets/portraits/src/<id>.png  1024×1024 原圖
 *   assets/portraits/<id>.jpg      512×512 網頁用圖
 *
 * 環境變數：
 *   GEN_MODEL       Codex 模型（預設 gpt-5.6-terra）
 *   GEN_TIMEOUT_MS  單張逾時（預設 240000）
 *   GEN_ATTEMPTS    單張嘗試次數（預設 2）
 */
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets/portraits");
const SRC = path.join(OUT, "src");
const LOG = path.join(ROOT, "scripts/gen_portraits.log");

const MODEL = process.env.GEN_MODEL || "gpt-5.6-terra";
const TIMEOUT = Number(process.env.GEN_TIMEOUT_MS || 240_000);
const ATTEMPTS = Number(process.env.GEN_ATTEMPTS || 2);
const MAX_CODEX = 2; // 整台電腦同時跑的 codex exec 上限

const STYLE_HEAD = "A candid mid-2000s digital snapshot portrait of a fictional Japanese person, not based on any real person. Tight head-and-shoulders crop, face fills most of the frame, slightly off-center.";
const STYLE_TAIL = "Soft focus, slight compact-camera noise, gentle contrast, realistic skin texture and pores, natural imperfect look. Looks like a real photograph on a Japanese art university website from 2007. No text, no watermark, no logo.";

const manifest = JSON.parse(readFileSync(path.join(ROOT, "scripts/portrait_manifest.json"), "utf-8"));
const args = process.argv.slice(2);
const only = args[0] === "--only" ? new Set(args.slice(1)) : null;
const items = manifest.items.filter((it) => !only || only.has(it.id));

const log = (msg) => { console.log(msg); appendFileSync(LOG, msg + "\n"); };
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// 所有存活中的 codex 程序群組；任何結束路徑都要清掉
const running = new Set();
function killAll() {
  for (const pid of running) {
    try { process.kill(-pid, "SIGKILL"); } catch { /* 程序已結束 */ }
  }
  running.clear();
}
function bail(reason, code) {
  log(`!! ${reason}，結束所有 codex 程序`);
  killAll();
  process.exit(code);
}
process.on("SIGINT", () => bail("收到 SIGINT", 130));
process.on("SIGTERM", () => bail("收到 SIGTERM", 143));
process.on("SIGHUP", () => bail("收到 SIGHUP", 129));
process.on("uncaughtException", (e) => bail(`未捕捉的例外 ${e.message}`, 1));
process.on("unhandledRejection", (e) => bail(`未處理的 rejection ${e}`, 1));
process.on("exit", killAll);

function codexCount() {
  try {
    // 每個工作有 node 外殼與原生執行檔兩個程序，只數外殼
    return execFileSync("pgrep", ["-f", "^node .*codex exec"], { encoding: "utf-8" }).trim().split("\n").length;
  } catch {
    return 0; // pgrep 找不到時回傳非 0
  }
}

function runCodex(item, out) {
  const prompt = `請用內建 image_gen 工具產一張 1024x1024 PNG。主題：${STYLE_HEAD} ${item.prompt} ${STYLE_TAIL} 完成後把產出複製到目前工作目錄並命名為 ${item.id}.png，再用 sips 縮放到 1024x1024。回報 OK 即可。`;
  return new Promise((resolve) => {
    // detached 讓 codex 自成程序群組，才能連同它的子程序一起關掉
    const child = spawn(
      "codex",
      ["exec", "--skip-git-repo-check", "-m", MODEL, "-s", "workspace-write", "-C", SRC, prompt],
      { stdio: "ignore", detached: true }
    );
    running.add(child.pid);
    const timer = setTimeout(() => {
      log(`   ${item.id} 逾時 ${TIMEOUT}ms，關閉程序`);
      try { process.kill(-child.pid, "SIGKILL"); } catch { /* 程序已結束 */ }
    }, TIMEOUT);
    const finish = () => {
      clearTimeout(timer);
      running.delete(child.pid);
      resolve(existsSync(out) && statSync(out).size > 1000);
    };
    child.on("error", finish);
    child.on("close", finish);
  });
}

function toJpeg(src, dst) {
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "85", "-z", "512", "512", src, "--out", dst], { stdio: "ignore" });
}

mkdirSync(SRC, { recursive: true });
log(`\n=== ${new Date().toISOString()} 開始 ${items.length} 張，模型 ${MODEL} ===`);

let ok = 0, skipped = 0, failed = 0, cursor = 0;

async function worker() {
  while (cursor < items.length) {
    const item = items[cursor++];
    const src = path.join(SRC, `${item.id}.png`);
    const jpg = path.join(OUT, `${item.id}.jpg`);
    if (existsSync(src)) {
      if (!existsSync(jpg)) toJpeg(src, jpg);
      log(`⏭  ${item.id} 已存在`);
      skipped++;
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= ATTEMPTS && !done; attempt++) {
      while (codexCount() >= MAX_CODEX) await sleep(3000);
      const t0 = Date.now();
      log(`▶ ${item.id} ${item.name}（第 ${attempt} 次）`);
      done = await runCodex(item, src);
      log(`${done ? "✓" : "✗"} ${item.id} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    if (done) {
      toJpeg(src, jpg);
      ok++;
    } else {
      failed++;
    }
  }
}

await Promise.all([worker(), sleep(1500).then(worker)]);
log(`=== 完成 ok=${ok} skipped=${skipped} failed=${failed} ===`);
process.exit(failed ? 1 : 0);
