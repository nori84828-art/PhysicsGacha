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


    await cdp.evaluate("localStorage.setItem('physics_gacha_inventory',JSON.stringify({'newton-universal-gravitation':1})); localStorage.setItem(HistoryMedals.storageKey,JSON.stringify({medals:0,cards:Object.fromEntries(HISTORY_CARD_CATALOG.map((card,i)=>[card.id,[1,2,3,11,20][i]]))}))");
    for (const width of [1280,375]) {
      await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:width===375?630:900,deviceScaleFactor:1,mobile:width===375});
      await cdp.send('Page.reload');
      await waitFor(()=>cdp.evaluate("document.readyState==='complete' && !!document.querySelector('#btn-to-collection-from-start')"),'collection page');
      await cdp.evaluate("document.querySelector('#btn-to-collection-from-start').click()");
      for (let i=0;i<5;i++) {
        await cdp.evaluate('document.querySelector(\'[data-card-id="\'+HISTORY_CARD_CATALOG['+i+'].id+\'"]\').click()');
        assert.equal(await cdp.evaluate("document.querySelector('#card-detail-status').style.display"),'block');
        assert.equal(await cdp.evaluate("document.querySelector('#btn-card-status').getAttribute('aria-expanded')"),'false');
        await cdp.evaluate("document.querySelector('#btn-card-status').click()");
        assert.equal(await cdp.evaluate("document.querySelector('#btn-card-status').getAttribute('aria-expanded')"),'true');
        assert.equal(await cdp.evaluate("document.querySelector('#card-person-label').textContent"),'CHARACTER');
        assert.equal(await cdp.evaluate('document.querySelector("#card-scientist-full-name").textContent===HISTORY_CARD_CATALOG['+i+'].scientist'),true);
        assert.equal(await cdp.evaluate('document.querySelector("#card-knowledge-value").textContent===HISTORY_CARD_CATALOG['+i+'].cardName'),true);
        assert.equal(await cdp.evaluate('!document.querySelector("#card-biography-section").hidden && document.querySelector("#card-biography").textContent===HISTORY_CARD_CATALOG['+i+'].biography && document.querySelector("#card-biography").textContent.length>60'),true);
        assert.deepEqual(await cdp.evaluate("['atk','hp','time'].map(key=>document.querySelector('#card-status-'+key).textContent)"),['未設定','未設定','未設定']);
        assert.equal(await cdp.evaluate("document.querySelector('#card-status-breakthrough').textContent"),[0,1,2,10,10][i]+' / 10');
        await cdp.evaluate("document.querySelector('#btn-card-status').click()");
        assert.equal(await cdp.evaluate("document.querySelector('#btn-card-status').getAttribute('aria-expanded')"),'false');
        await cdp.evaluate("document.querySelector('#btn-close-gacha-modal').click()");
      }
      await cdp.evaluate("document.querySelector('[data-card-id=\"newton-universal-gravitation\"]').click(); document.querySelector('#btn-card-status').click()");
      assert.equal(await cdp.evaluate("document.querySelector('#card-person-label').textContent"),'SCIENTIST');
      assert.equal(await cdp.evaluate("document.querySelector('#card-biography-section').hidden && document.querySelector('#card-biography').textContent===''"),true);
      assert.equal(await cdp.evaluate("document.querySelector('#card-status-atk').textContent"),'320');
      assert.equal(await cdp.evaluate("document.querySelector('#card-status-hp').textContent"),'350');
      assert.equal(await cdp.evaluate("document.querySelector('#card-status-time').textContent"),'+4秒');
      assert.equal(await cdp.evaluate("document.querySelector('#card-knowledge-label').textContent"),'公式');
    }
    console.log('History CARD STATUS: five cards, open/close, unset stats, breakthrough caps and switching back to Newton passed on PC and phone.');
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
