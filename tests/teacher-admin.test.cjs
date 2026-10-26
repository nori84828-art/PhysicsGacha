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


    // Dedicated test profile: changes here never touch the user's browser save.
    await cdp.evaluate("localStorage.setItem('physics_gacha_inventory', JSON.stringify({'newton-universal-gravitation':1})); localStorage.setItem(HistoryMedals.storageKey, JSON.stringify({medals:120,cards:{'history-oda-nobunaga':2}}))");
    await cdp.send('Page.reload');
    await waitFor(() => cdp.evaluate("document.readyState==='complete' && !!document.querySelector('#btn-home-settings')"), 'test save');
    const openAdmin = async () => {
      await cdp.evaluate("document.querySelector('#btn-home-settings').click(); document.querySelector('#btn-settings-code').click(); document.querySelector('#home-settings-password').value='jog9900'; document.querySelector('#home-settings-password-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
      assert.equal(await cdp.evaluate("document.querySelector('#teacher-admin-modal').hidden"),false);
    };
    const submit = () => cdp.evaluate("document.querySelector('#teacher-admin-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
    await openAdmin();
    assert.equal(await cdp.evaluate("document.querySelectorAll('.teacher-admin-card-count').length"),30);
    assert.equal(await cdp.evaluate("document.querySelector('#teacher-admin-history-medals').value"),'120');
    assert.equal(await cdp.evaluate("document.querySelector('#teacher-admin-card-history-oda-nobunaga').value"),'2');
    await cdp.evaluate("document.querySelector('#teacher-admin-search').value='お市'; document.querySelector('#teacher-admin-search').dispatchEvent(new Event('input',{bubbles:true}))");
    assert.equal(await cdp.evaluate("[...document.querySelectorAll('.teacher-admin-card-row')].filter(row=>!row.hidden).length"),1);
    await cdp.evaluate("document.querySelector('#teacher-admin-history-medals').value='700'; document.querySelector('#teacher-admin-card-history-oda-nobunaga').value='0'; document.querySelector('#teacher-admin-card-history-date-masamune').value='3'; document.querySelector('#teacher-admin-card-history-oichi').value='1'; document.querySelector('#teacher-admin-card-newton-universal-gravitation').value='4'");
    await submit();
    assert.equal(await cdp.evaluate("document.querySelector('#teacher-admin-confirm').hidden"),false);
    await cdp.evaluate("document.querySelector('#btn-cancel-teacher-admin').click()");
    assert.equal(await cdp.evaluate('HistoryMedals.read().medals'),120);
    for (const invalid of ['-1','1.5','']) {
      await cdp.evaluate('document.querySelector("#teacher-admin-history-medals").value='+JSON.stringify(invalid));
      await submit();
      assert.equal(await cdp.evaluate("document.querySelector('#teacher-admin-confirm').hidden"),true);
      assert.equal(await cdp.evaluate('HistoryMedals.read().medals'),120);
    }
    await cdp.evaluate("document.querySelector('#teacher-admin-history-medals').value='700'");
    // The history save is part of the same rollback as the existing currencies/cards.
    await cdp.evaluate("window.originalAdminSetItem=Storage.prototype.setItem; window.failHistoryOnce=true; Storage.prototype.setItem=function(key,value){if(key===HistoryMedals.storageKey&&window.failHistoryOnce){window.failHistoryOnce=false;throw new Error('Test quota failure');}return window.originalAdminSetItem.call(this,key,value);}");
    await submit();
    await cdp.evaluate("document.querySelector('#btn-apply-teacher-admin').click()");
    assert.equal(await cdp.evaluate('HistoryMedals.read().medals'),120);
    assert.equal(await cdp.evaluate("JSON.parse(localStorage.getItem('physics_gacha_inventory'))['newton-universal-gravitation']"),1);
    assert.equal(await cdp.evaluate("HistoryMedals.read().cards['history-oda-nobunaga']"),2);
    await cdp.evaluate("Storage.prototype.setItem=window.originalAdminSetItem; delete window.originalAdminSetItem; delete window.failHistoryOnce");
    await submit();
    await cdp.evaluate("document.querySelector('#btn-apply-teacher-admin').click()");
    assert.deepEqual(await cdp.evaluate('HistoryMedals.read()'),{medals:700,cards:{'history-date-masamune':3,'history-oichi':1}});
    assert.deepEqual(await cdp.evaluate("Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('physics_gacha_inventory'))).filter(([,count])=>count>0))"),{'newton-universal-gravitation':4});
    assert.equal(await cdp.evaluate("Object.keys(JSON.parse(localStorage.getItem('physics_gacha_inventory'))).some(id=>id.startsWith('history-'))"),false);
    await cdp.send('Page.reload');
    await waitFor(() => cdp.evaluate("document.readyState==='complete' && !!document.querySelector('#btn-home-settings')"), 'admin changes persist');
    await cdp.evaluate("document.querySelector('#btn-to-collection-from-start').click()");
    assert.equal(await cdp.evaluate("document.querySelectorAll('#collection-grid [data-card-id^=\"history-\"]').length"),2);
    assert.equal(await cdp.evaluate("!!document.querySelector('[data-card-id=\"history-oda-nobunaga\"]')"),false);
    await cdp.evaluate("document.querySelector('#btn-close-collection').click(); document.querySelector('#btn-home-settings').click(); document.querySelector('#btn-settings-items').click()");
    assert.equal(await cdp.evaluate("document.querySelector('#items-history-medals').textContent"),'700');
    await waitFor(() => cdp.evaluate("document.querySelector('#items-history-medal-image').complete && document.querySelector('#items-history-medal-image').naturalWidth>0"), 'medal inventory image');
    assert.equal(await cdp.evaluate("document.querySelectorAll('#home-settings-items-view .holdings-item').length"),1);
    assert.equal(await cdp.evaluate("document.querySelector('#home-settings-items-view').textContent.includes('POINT') || document.querySelector('#home-settings-items-view').textContent.includes('時の結晶')"),false);
    for (const size of [{width:1920,height:1080,touch:false},{width:375,height:630,touch:true},{width:820,height:980,touch:true},{width:844,height:390,touch:true}]) {
      await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:size.touch});
      await cdp.send('Emulation.setDeviceMetricsOverride',{width:size.width,height:size.height,deviceScaleFactor:1,mobile:size.touch});
      await new Promise(resolve=>setTimeout(resolve,150));
      const fit=await cdp.evaluate("(() => {const panel=document.querySelector('.home-settings-panel'),p=panel.getBoundingClientRect(),g=document.querySelector('.quiz-card').getBoundingClientRect(),list=document.querySelector('.holdings-grid');return {width:p.width/g.width,height:p.height/g.height,outer:panel.scrollHeight-panel.clientHeight,side:list.scrollWidth-list.clientWidth,scroll:list.scrollHeight-list.clientHeight};})()");
      assert.ok(fit.width>.8 && fit.height>.8 && fit.outer<=1 && fit.side<=1 && fit.scroll<=1,JSON.stringify(fit));
      const future=await cdp.evaluate("(() => {const list=document.querySelector('.holdings-grid'),first=list.firstElementChild;for(let i=0;i<30;i++)list.appendChild(first.cloneNode(true));list.scrollTop=list.scrollHeight;const result={scrolled:list.scrollTop,outer:document.querySelector('.home-settings-panel').scrollHeight-document.querySelector('.home-settings-panel').clientHeight};while(list.children.length>1)list.lastElementChild.remove();list.scrollTop=0;return result;})()");
      assert.ok(future.scrolled>0 && future.outer<=1,JSON.stringify(future));
    }
    await cdp.evaluate("document.querySelector('#btn-back-from-settings-items').click(); document.querySelector('#btn-settings-exchange').click(); document.querySelector('[data-exchange-id=\"history-date-masamune\"]').click(); document.querySelector('#btn-exchange-confirm').click()");
    assert.equal(await cdp.evaluate('HistoryMedals.read().medals'),0);
    assert.equal(await cdp.evaluate("HistoryMedals.read().cards['history-date-masamune']"),4);
    await cdp.evaluate("document.querySelector('#btn-back-from-exchange').click()");
    await openAdmin();
    assert.equal(await cdp.evaluate("document.querySelector('#teacher-admin-history-medals').value"),'0');
    assert.equal(await cdp.evaluate("document.querySelector('#teacher-admin-card-history-date-masamune').value"),'4');
    await cdp.evaluate("document.querySelector('#teacher-admin-card-history-date-masamune').value='0'; document.querySelector('#teacher-admin-card-history-oichi').value='0'");
    await submit();
    await cdp.evaluate("document.querySelector('#btn-apply-teacher-admin').click()");
    assert.deepEqual(await cdp.evaluate('HistoryMedals.read().cards'),{});
    console.log('Teacher admin: 30 cards, medal editing, validation, cancellation, persistence, collection visibility and exchanges passed.');
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
