const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(check, description, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await check();
    if (value) return value;
    await pause(100);
  }
  throw new Error(`Timed out: ${description}`);
}

async function openCdp(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(item => item.type === "page");
  assert.ok(target, "Edge page target was not available");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };
  return { socket, send, evaluate };
}

async function main() {
  assert.ok(fs.existsSync(edge), "Microsoft Edge is required for the UI test");
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`);
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const gameUrl = `http://127.0.0.1:${server.address().port}/`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "physics-gacha-ui-"));
  const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--no-first-run", "--window-size=1920,1080", "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let cdp;
  try {
    const activePort = await waitFor(() => {
      const file = path.join(profile, "DevToolsActivePort");
      return fs.existsSync(file) ? Number(fs.readFileSync(file, "utf8").split("\n")[0]) : null;
    }, "Edge debugging port");
    cdp = await openCdp(activePort);
    await cdp.send("Page.enable");
    await cdp.send("Page.navigate", { url: gameUrl });
    await waitFor(() => cdp.evaluate("document.readyState === 'complete' && !!document.querySelector('#btn-draw-gacha')"), "game page");

    // This dedicated browser profile contains only test data; no user's save is changed.
    await cdp.evaluate(`localStorage.setItem('physics_quiz_total_points', '30000'); localStorage.setItem('physics_gacha_boss_coins', '5'); localStorage.setItem('physics_gacha_inventory', JSON.stringify({'einstein-special-relativity':2,'newton-universal-gravitation':1})); localStorage.setItem('physics_gacha_home_character', 'einstein-special-relativity');`);
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(() => cdp.evaluate("document.readyState === 'complete' && document.querySelector('#start-total-points')?.textContent.includes('30,000')"), "test save reloaded");
    assert.equal(await cdp.evaluate("document.querySelector('#home-character-portrait')?.getAttribute('src')"), "images/scientists/einstein_relativity.png");
    if (process.env.CAPTURE_GACHA_HUD === "1") {
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(os.tmpdir(), "physics-gacha-hud-home.png"), Buffer.from(data, "base64"));
    }
    const homeHud = await cdp.evaluate("(() => { const hud = document.querySelector('#global-hud .currency-stack').getBoundingClientRect(); const game = document.querySelector('.quiz-card').getBoundingClientRect(); return {top:hud.top,width:hud.width,height:hud.height,rightInset:game.right-hud.right}; })()");
    assert.equal(await cdp.evaluate("document.querySelector('#start-boss-coins').textContent"), "5");
    await cdp.evaluate("document.querySelector('#btn-to-gacha-from-start').click()");
    const gachaHud = await cdp.evaluate("(() => { const hud = document.querySelector('#global-hud .currency-stack').getBoundingClientRect(); const game = document.querySelector('.quiz-card').getBoundingClientRect(); return {top:hud.top,width:hud.width,height:hud.height,rightInset:game.right-hud.right}; })()");
    assert.deepEqual(gachaHud, homeHud, "The identical currency HUD should remain at the home position");
    const desktopTitleClearance = await cdp.evaluate("(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('.gacha-title')); return range.getBoundingClientRect().top - document.querySelector('#global-hud .currency-stack').getBoundingClientRect().bottom; })()");
    assert.ok(desktopTitleClearance >= 8, `Gacha heading overlaps the currency HUD on desktop: ${desktopTitleClearance}px`);
    assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('#global-hud')).display"), "grid");
    assert.equal(await cdp.evaluate("getComputedStyle(document.querySelector('#global-hud .home-left-hud')).visibility"), "hidden");
    assert.equal(await cdp.evaluate("document.querySelector('#gacha-points-panel, .gacha-points-panel, #gacha-total-points') === null"), true);
    assert.equal(await cdp.evaluate("document.querySelector('#start-total-points').textContent"), "30,000");
    assert.equal(await cdp.evaluate("document.querySelector('#start-boss-coins').textContent"), "5");
    if (process.env.CAPTURE_GACHA_HUD === "1") {
      await pause(900);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(os.tmpdir(), "physics-gacha-hud-desktop.png"), Buffer.from(data, "base64"));
    }
    await cdp.evaluate("document.querySelector('#btn-open-gacha-rates').click()");
    assert.equal(await cdp.evaluate("document.querySelectorAll('#gacha-card-rates-list tr').length"), 20);
    await cdp.evaluate("document.querySelector('#btn-close-gacha-rates').click()");

    await cdp.evaluate("Math.random = () => 0; document.querySelector('#btn-draw-gacha').click()");
    assert.equal(await cdp.evaluate("document.querySelector('#card-image').getAttribute('src')"), "images/card/1.png");
    assert.equal(await cdp.evaluate("document.querySelector('#gacha-modal').classList.contains('is-awaiting-flip')"), true);
    assert.equal(await cdp.evaluate("localStorage.getItem('physics_quiz_total_points')"), "29000");
    assert.equal(await cdp.evaluate("document.querySelector('#start-total-points').textContent"), "29,000");
    assert.equal(await cdp.evaluate("document.querySelector('#start-boss-coins').textContent"), "5");
    await cdp.evaluate("document.querySelector('#gacha-card-scene').click()");
    await waitFor(() => cdp.evaluate("document.querySelector('#gacha-modal').classList.contains('is-rare-flip')"), "UR reveal effect");
    await waitFor(() => cdp.evaluate("document.querySelector('#gacha-card-flipper').classList.contains('is-flipped') && !document.querySelector('#gacha-modal').classList.contains('is-flipping')"), "single-card reveal", 5000);
    assert.equal(await cdp.evaluate("document.querySelector('#card-image').naturalWidth > 0"), true);
    await cdp.evaluate("document.querySelector('#btn-close-gacha-modal').click()");

    // Force all five newly registered cards into this ten-pull, alongside existing rarities.
    const rolls = [0.90, 0.92, 0.40, 0.1, 0.20, 0.9, 0.04, 0.1, 0.65, 0.42, 0.02, 0.5, 0.75, 0.58, 0.35, 0.7, 0.90, 0.75, 0.00, 0.0];
    await cdp.evaluate(`window.__gachaTestRolls = ${JSON.stringify(rolls)}; Math.random = () => window.__gachaTestRolls.shift() ?? 0; document.querySelector('#btn-draw-gacha-ten').click()`);
    assert.equal(await cdp.evaluate("document.querySelector('#card-image').getAttribute('src')"), "images/card/1.png");
    assert.equal(await cdp.evaluate("localStorage.getItem('physics_quiz_total_points')"), "19000");
    await cdp.evaluate("document.querySelector('#gacha-card-scene').click()");
    await waitFor(() => cdp.evaluate("document.querySelector('#btn-ten-gacha-next').textContent === '次へ' && !document.querySelector('#gacha-modal').classList.contains('is-flipping') && !document.querySelector('#gacha-modal').classList.contains('is-awaiting-flip')"), "first ten-pull card flipped", 5000);
    for (let index = 0; index < 9; index += 1) {
      await cdp.evaluate("document.querySelector('#btn-ten-gacha-next').click()");
      await waitFor(() => cdp.evaluate("!document.querySelector('#btn-ten-gacha-next').disabled"), `slide ${index + 1}`, 3000);
    }
    await cdp.evaluate("document.querySelector('#btn-ten-gacha-next').click()");
    await waitFor(() => cdp.evaluate("document.querySelector('#gacha-modal').classList.contains('is-ten-summary')"), "ten-pull summary");
    await waitFor(() => cdp.evaluate("Array.from(document.querySelectorAll('#ten-gacha-summary-grid img')).length === 10 && Array.from(document.querySelectorAll('#ten-gacha-summary-grid img')).every(image => image.naturalWidth > 0)"), "all ten card images loaded", 8000);
    const summary = await cdp.evaluate("Array.from(document.querySelectorAll('#ten-gacha-summary-grid figure'), item => ({image:item.querySelector('img').getAttribute('src'), rarity:item.querySelector('figcaption').textContent, loaded:item.querySelector('img').naturalWidth > 0}))");
    assert.equal(summary.length, 10);
    assert.ok(summary.every(item => item.loaded), "All ten card images must load");
    assert.deepEqual(summary.map(item => item.rarity), ["UR", "SSR", "SSR", "SR", "R", "R", "N", "N", "N", "N"]);
    // Balmer was drawn before the other N cards, so its relative order is preserved.
    assert.deepEqual(summary.map(item => item.image), ["images/card/1.png", "images/card/2.jpg", "images/card/3.jpg", "images/card/9.jpg", "images/card/10.jpg", "images/card/13.jpg", "images/card/20.jpg", "images/card/17.jpg", "images/card/18.jpg", "images/card/19.png"]);
    const inventory = await cdp.evaluate("JSON.parse(localStorage.getItem('physics_gacha_inventory'))");
    assert.equal(inventory["einstein-special-relativity"], 2);
    assert.equal(inventory["newton-universal-gravitation"], 3);
    assert.equal(Object.values(inventory).reduce((sum, count) => sum + count, 0), 14);

    await cdp.evaluate("document.querySelector('#btn-close-gacha-modal').click(); window.__ssrRolls = [0.03, 0.1]; Math.random = () => window.__ssrRolls.shift() ?? 0; document.querySelector('#btn-draw-gacha').click()");
    assert.equal(await cdp.evaluate("document.querySelector('#card-image').getAttribute('src')"), "images/card/2.jpg");
    await cdp.evaluate("document.querySelector('#gacha-card-scene').click()");
    await waitFor(() => cdp.evaluate("document.querySelector('#gacha-modal').classList.contains('is-rare-flip')"), "SSR reveal effect", 12000);
    await waitFor(() => cdp.evaluate("document.querySelector('#gacha-card-flipper').classList.contains('is-flipped') && !document.querySelector('#gacha-modal').classList.contains('is-flipping')"), "SSR card reveal", 12000);
    assert.equal(await cdp.evaluate("localStorage.getItem('physics_quiz_total_points')"), "18000");
    assert.equal(await cdp.evaluate("JSON.parse(localStorage.getItem('physics_gacha_inventory'))['faraday-electromagnetic-induction']"), 2);

    await cdp.evaluate("localStorage.setItem('physics_gacha_home_character', 'de-broglie-matter-wave')");
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(() => cdp.evaluate("document.readyState === 'complete' && document.querySelector('#home-character-portrait')?.getAttribute('src') === 'images/scientists/de Broglie.png'"), "new standing portrait on home");
    await cdp.evaluate("document.querySelector('#btn-to-gacha-from-start').click(); document.querySelector('#btn-open-collection').click()");
    assert.equal(await cdp.evaluate("document.querySelectorAll('#collection-grid .collection-card').length"), 25);
    assert.equal(await cdp.evaluate("!!document.querySelector('#collection-grid img.col-card-thumb[src=\"images/card/21.png\"]')"), true);
    await cdp.evaluate("document.querySelector('#btn-close-collection').click(); document.querySelector('#btn-back-from-gacha').click()");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(() => cdp.evaluate("document.readyState === 'complete' && document.querySelector('#start-total-points')?.textContent === '18,000'"), "mobile home");
    const mobileHomeHud = await cdp.evaluate("(() => { const hud = document.querySelector('#global-hud .currency-stack').getBoundingClientRect(); const game = document.querySelector('.quiz-card').getBoundingClientRect(); return {top:hud.top,width:hud.width,height:hud.height,rightInset:game.right-hud.right}; })()");
    await cdp.evaluate("document.querySelector('#btn-to-gacha-from-start').click()");
    const mobileGachaHud = await cdp.evaluate("(() => { const hud = document.querySelector('#global-hud .currency-stack').getBoundingClientRect(); const game = document.querySelector('.quiz-card').getBoundingClientRect(); return {top:hud.top,width:hud.width,height:hud.height,rightInset:game.right-hud.right}; })()");
    assert.deepEqual(mobileGachaHud, mobileHomeHud, "Mobile currency HUD should retain its home placement");
    const mobileTitleClearance = await cdp.evaluate("(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('.gacha-title')); return range.getBoundingClientRect().top - document.querySelector('#global-hud .currency-stack').getBoundingClientRect().bottom; })()");
    assert.ok(mobileTitleClearance >= 8, `Gacha heading overlaps the currency HUD on mobile: ${mobileTitleClearance}px`);
    assert.equal(await cdp.evaluate("document.querySelector('#start-boss-coins').textContent"), "5");
    if (process.env.CAPTURE_GACHA_HUD === "1") {
      await pause(900);
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(os.tmpdir(), "physics-gacha-hud-mobile.png"), Buffer.from(data, "base64"));
    }
    console.log("Browser UI: old save and excluded card, 25-card collection, new home portrait, 20 rates, SSR/UR flips, ten-pull including all five new cards, images, costs and inventory passed.");
  } finally {
    cdp?.socket.close();
    browser.kill();
    await new Promise(resolve => server.close(resolve));
    const safePrefix = path.join(os.tmpdir(), "physics-gacha-ui-");
    if (profile.startsWith(safePrefix)) {
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Edge may still be releasing files. */ }
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
