const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(fn, label) {
  for (let i = 0; i < 120; i += 1) {
    const value = await fn();
    if (value) return value;
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function main() {
  let noticeFixture = null;
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, "") || "index.html";
    if (relative === "notices.json" && noticeFixture) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      return response.end(JSON.stringify(noticeFixture));
    }
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
    response.setHeader("Content-Type", `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`);
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "physics-viewport-"));
  const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-allow-origins=*", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    const port = await until(() => {
      const file = path.join(profile, "DevToolsActivePort");
      return fs.existsSync(file) ? Number(fs.readFileSync(file, "utf8").split("\n")[0]) : null;
    }, "debugging port");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(item => item.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
      return response.result.value;
    };
    await send("Page.enable");
    for (const size of [{ width: 820, height: 980, visible: 780 }, { width: 1024, height: 768, visible: 600 }, { width: 1180, height: 720 }, { width: 390, height: 730 }, { width: 375, height: 630, visible: 540 }, { width: 320, height: 568 }]) {
      await send("Emulation.setDeviceMetricsOverride", { ...size, deviceScaleFactor: 2, mobile: true });
      await send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
      await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('#btn-to-battle-select')"), "game load");
      if (size.visible) await evaluate(`document.documentElement.style.setProperty('--game-viewport-height', '${size.visible}px')`);
      const measure = async (name, selector) => {
        await delay(650);
        const metric = await evaluate(`(() => {
          const game = document.querySelector('.quiz-card').getBoundingClientRect();
          const target = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
          const content = document.querySelector({home:'.social-home',gacha:'.gacha-page',play:'.battle-select-page',mini:'.mini-game-page',normal:'.normal-battle-select-page',boss:'.boss-select-layout'}[${JSON.stringify(name)}]);
          const essential = ({home:['.home-main-menu','#global-tagline'],gacha:['.gacha-draw-buttons','.gacha-collection-button','#btn-open-gacha-rates'],play:['.battle-select-modes','#btn-back-from-battle-select','#btn-to-mini-game','#global-tagline'],mini:['.mini-game-panel','#btn-back-from-mini-game'],normal:['.normal-battle-select-content'],boss:['.boss-select-content']}[${JSON.stringify(name)}]).map(selector => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return {selector,top:Math.round(rect.top),bottom:Math.round(rect.bottom)};
          });
          return {screen:${JSON.stringify(name)}, viewport:visualViewport.height, available:parseInt(getComputedStyle(document.documentElement).getPropertyValue('--game-viewport-height')), gameTop:Math.round(game.top), gameBottom:Math.round(game.bottom), gameWidth:Math.round(game.width), gameHeight:Math.round(game.height), lastBottom:Math.round(target.bottom), pageScroll:document.documentElement.scrollHeight-innerHeight, gameScroll:document.querySelector('.quiz-card').scrollHeight-document.querySelector('.quiz-card').clientHeight, gameSideScroll:document.querySelector('.quiz-card').scrollWidth-document.querySelector('.quiz-card').clientWidth, contentScroll:content.scrollHeight-content.clientHeight, contentSideScroll:content.scrollWidth-content.clientWidth, essential};
        })()`);
        console.log(`${size.width}x${size.height}${size.visible ? ` visible ${size.visible}` : ''} ${name}: ${metric.gameWidth}x${metric.gameHeight}, bottom ${metric.gameBottom}/${metric.available}, page scroll ${metric.pageScroll}`);
        const menusOverlap = name === 'play' && metric.essential[0].bottom > metric.essential[1].top - 2;
        if (metric.gameTop < -1 || metric.gameBottom > metric.available + 1 || metric.lastBottom > metric.gameBottom + 1 || metric.pageScroll > 1 || Math.abs(metric.gameWidth / metric.gameHeight - 9 / 16) > 0.004 || menusOverlap || ((name === 'home' || name === 'gacha' || name === 'play') && (metric.contentScroll > 1 || metric.essential.some(item => item.top < metric.gameTop - 1 || item.bottom > metric.gameBottom + 1)))) {
          throw new Error(`Viewport overflow: ${JSON.stringify(metric)}`);
        }
      };
      await measure("home", "#global-tagline");
      if (size.visible) {
        await evaluate("document.querySelector('#btn-home-settings').click()");
        const order = await evaluate("[...document.querySelectorAll('#home-settings-menu .home-settings-option')].map(button => button.textContent.trim())");
        if (order.join(',') !== '名前設定,コード入力,おしらせ,ゲーム情報') throw new Error(`Settings order: ${order}`);
        for (const [button, view] of [['#btn-settings-name','#home-settings-name-view'],['#btn-settings-code','#home-settings-code-view'],['#btn-settings-info','#home-settings-info-view']]) {
          await evaluate(`document.querySelector(${JSON.stringify(button)}).click()`);
          if (!await evaluate(`!document.querySelector(${JSON.stringify(view)}).hidden`)) throw new Error(`Settings view did not open: ${view}`);
          await evaluate(`document.querySelector(${JSON.stringify(view)} + ' .home-settings-nav-button').click()`);
        }
        await evaluate("document.querySelector('#btn-settings-notices').click()");
        await until(() => evaluate("document.querySelectorAll('.home-settings-notice-item').length === 2"), "sample notices");
        const samples = await evaluate("[...document.querySelectorAll('.home-settings-notice-item')].map(item => ({date:item.querySelector('time').textContent,title:item.querySelector('h3').textContent,body:item.querySelector('p').textContent,sample:item.querySelector('.home-settings-notice-sample')?.textContent}))");
        if (JSON.stringify(samples) !== JSON.stringify([
          {date:'2026.10.22',title:'歴史ミニゲームが登場！',body:'幕末・明治維新をテーマにしたミニゲームが追加されました。',sample:'サンプル'},
          {date:'2026.10.21',title:'βテスト版公開のお知らせ',body:'ゲームのテストプレイを開始しました。',sample:'サンプル'}
        ])) throw new Error(`Sample notices incorrect: ${JSON.stringify(samples)}`);
        if (!await evaluate("document.querySelector('#home-settings-title').textContent === 'おしらせ' && !document.querySelector('#home-settings-notices-view > h3')")) throw new Error('Notice heading is duplicated');
        const noticeBounds = await evaluate("(() => { const game=document.querySelector('.quiz-card').getBoundingClientRect(), panel=document.querySelector('.home-settings-panel').getBoundingClientRect(); return {gameLeft:game.left,gameRight:game.right,panelLeft:panel.left,panelRight:panel.right,panelTop:panel.top,panelBottom:panel.bottom,viewport:parseInt(getComputedStyle(document.documentElement).getPropertyValue('--game-viewport-height'))}; })()");
        if (noticeBounds.panelLeft < noticeBounds.gameLeft - 1 || noticeBounds.panelRight > noticeBounds.gameRight + 1 || noticeBounds.panelTop < -1 || noticeBounds.panelBottom > noticeBounds.viewport + 1) throw new Error(`Notice panel outside game area: ${JSON.stringify(noticeBounds)}`);
        await evaluate("document.querySelector('#btn-close-home-settings').click()");
        if (!await evaluate("!document.querySelector('#home-settings-menu').hidden && document.querySelector('#home-settings-title').textContent === '設定' && document.querySelector('#home-settings-modal').style.display === 'flex'")) throw new Error('Notice close did not return to settings');
        noticeFixture = { notices: [] };
        await evaluate("document.querySelector('#btn-settings-notices').click()");
        await until(() => evaluate("document.querySelector('#home-settings-notices-list').textContent.includes('現在、おしらせはありません。')"), "empty notice list");
        await evaluate("document.querySelector('#btn-close-home-settings').click()");
        noticeFixture = { notices: [
          { date: "2026-01-01", title: "古いテスト", body: "一覧の確認用" },
          { date: "2026-10-25", title: "新しいテスト", body: "本文の確認用" },
          ...Array.from({length: 8}, (_, index) => ({date:`2026-09-${String(index + 1).padStart(2, '0')}`,title:`追加記事 ${index + 1}`,body:'増えた記事もパネル内で読めることを確認します。'.repeat(5)}))
        ] };
        await evaluate("document.querySelector('#btn-settings-notices').click()");
        await until(() => evaluate("document.querySelectorAll('.home-settings-notice-item').length === 10"), "long notice list");
        if (!await evaluate("document.querySelector('.home-settings-notice-item h3').textContent === '新しいテスト' && document.querySelector('.home-settings-notice-item p').textContent === '本文の確認用'")) throw new Error('Newest notice is not first or its body is hidden');
        const noticeScroll = await evaluate("(() => { const list=document.querySelector('#home-settings-notices-list'); list.scrollTop=list.scrollHeight; return {overflow:getComputedStyle(list).overflowY,scrolled:list.scrollTop,page:document.documentElement.scrollTop}; })()");
        if (noticeScroll.overflow !== 'auto' || noticeScroll.scrolled <= 0 || noticeScroll.page !== 0) throw new Error(`Long notices do not scroll internally: ${JSON.stringify(noticeScroll)}`);
        await evaluate("document.querySelector('#btn-close-home-settings').click()");
        noticeFixture = null;
        await evaluate("document.querySelector('#btn-close-home-settings').click()");
      }
      await evaluate("document.querySelector('#btn-to-gacha-from-start').click()");
      await measure("gacha", "#btn-open-gacha-rates");
      await evaluate("document.querySelector('#btn-back-from-gacha').click(); document.querySelector('#btn-to-battle-select').click()");
      await measure("play", "#btn-back-from-battle-select");
      await evaluate("document.querySelector('#btn-to-mini-game').click()");
      await measure("mini", "#btn-back-from-mini-game");
      const topBackground = await evaluate("getComputedStyle(document.querySelector('.mini-game-page')).backgroundImage");
      if (!topBackground.includes('images/minigame/library.png') || topBackground.includes('repeating-linear-gradient')) throw new Error('Mini-game TOP background is incorrect');
      if (!await evaluate("new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth === 941 && image.naturalHeight === 1672); image.onerror = () => resolve(false); image.src = 'images/minigame/library.png'; })")) throw new Error('Mini-game TOP image did not load');
      if (size.visible) {
        const topPanelBackground = await evaluate("getComputedStyle(document.querySelector('.mini-game-panel')).backgroundImage");
        for (const expected of ['歴史', '幕末・明治維新', '初級']) {
          await evaluate(`document.querySelector('#mini-game-options .mini-game-option${expected === '幕末・明治維新' ? ':nth-child(2)' : ':first-child'}').click()`);
          if (!await evaluate("document.querySelector('.mini-game-page').classList.contains('is-history')")) throw new Error('History design not applied');
          const historyBackground = await evaluate("getComputedStyle(document.querySelector('.mini-game-page')).backgroundImage");
          if (!historyBackground.includes('images/minigame/history-study.png') || historyBackground.includes('repeating-linear-gradient')) throw new Error('History background is incorrect');
          if (await evaluate("getComputedStyle(document.querySelector('.mini-game-panel')).backgroundImage") === topPanelBackground) throw new Error('History panel did not change design');
          if (!await evaluate(`document.querySelector('#mini-game-path').textContent.includes(${JSON.stringify(expected)}) || document.querySelector('#mini-game-section-title').textContent.includes(${JSON.stringify(expected)}) || document.querySelector('#mini-game-coming-soon-level').textContent.includes(${JSON.stringify(expected)})`)) throw new Error(`Mini-game step missing: ${expected}`);
          if (expected === '幕末・明治維新') {
            const levels = await evaluate("[...document.querySelectorAll('#mini-game-options .mini-game-option strong')].map(item => item.textContent)");
            if (levels.join(',') !== '初級,中級,上級') throw new Error(`Mini-game levels: ${levels}`);
          }
        }
        if (!await evaluate("new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth === 941 && image.naturalHeight === 1672); image.onerror = () => resolve(false); image.src = 'images/minigame/history-study.png'; })")) throw new Error('History image did not load');
        if (!await evaluate("!document.querySelector('#mini-game-coming-soon').hidden && document.querySelector('#mini-game-coming-soon').textContent.includes('準備中')")) throw new Error('Mini-game started without questions');
        for (const [title, optionCount] of [['難易度を選択',3],['シリーズを選択',2],['教科を選択',1]]) {
          await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
          const state = await evaluate("({title:document.querySelector('#mini-game-section-title').textContent,count:document.querySelectorAll('#mini-game-options .mini-game-option').length})");
          if (state.title !== title || state.count !== optionCount) throw new Error(`Mini-game back hierarchy: ${JSON.stringify(state)}`);
        }
        await evaluate("document.querySelector('#mini-game-options .mini-game-option').click(); document.querySelector('#mini-game-options .mini-game-option').click()");
        const genres = await evaluate("[...document.querySelectorAll('#mini-game-options .mini-game-option strong')].map(item => item.textContent)");
        if (genres.join(',') !== '戦国時代,江戸時代,幕末') throw new Error(`Tono genres: ${genres}`);
        for (const [genreIndex, expectedCorrect] of [[0,3],[1,5],[2,2],[1,4]]) {
          await evaluate(`document.querySelectorAll('#mini-game-options .mini-game-option')[${genreIndex}].click()`);
          if (!await evaluate("!document.querySelector('#tono-intro').hidden && document.querySelector('#tono-speech').textContent.includes('裏切りの疑い')")) throw new Error('Tono introduction failed');
          await evaluate("document.querySelector('#btn-tono-start').click()");
          await until(() => evaluate("!document.querySelector('#tono-question').hidden && document.querySelectorAll('#tono-choices button').length === 4"), "Tono question");
          const bounds = await evaluate("(() => { const game=document.querySelector('.quiz-card').getBoundingClientRect(), panel=document.querySelector('#tono-game').getBoundingClientRect(), back=document.querySelector('#btn-back-from-mini-game').getBoundingClientRect(); return {gameTop:game.top,gameBottom:game.bottom,panelTop:panel.top,panelBottom:panel.bottom,backBottom:back.bottom,pageScroll:document.documentElement.scrollHeight-innerHeight,innerOverflow:getComputedStyle(document.querySelector('#tono-game')).overflowY}; })()");
          if (bounds.panelTop < bounds.gameTop - 1 || bounds.panelBottom > bounds.gameBottom + 1 || bounds.backBottom > bounds.gameBottom + 1 || bounds.pageScroll > 1 || bounds.innerOverflow !== 'auto') throw new Error(`Tono viewport overflow: ${JSON.stringify(bounds)}`);
          for (let questionIndex = 0; questionIndex < 5; questionIndex++) {
            const questionState = await evaluate("(async () => { const data=await (await fetch('minigames/tono-history-sample.json')).json(); const question=data.questions.find(item=>item.question===document.querySelector('#tono-question-text').textContent); return {number:document.querySelector('#tono-question-number').textContent,correct:question.correct,choiceCount:document.querySelectorAll('#tono-choices button').length,sample:!document.querySelector('#tono-question-sample').hidden}; })()");
            if (!questionState.number.includes(`${questionIndex + 1} / 5`) || questionState.choiceCount !== 4 || !questionState.sample) throw new Error(`Tono question mismatch: ${JSON.stringify(questionState)}`);
            const shouldAnswerCorrectly = questionIndex < expectedCorrect;
            const selected = shouldAnswerCorrectly ? questionState.correct : (questionState.correct + 1) % 4;
            await evaluate(`document.querySelectorAll('#tono-choices button')[${selected}].click()`);
            const answerState = await evaluate("({title:document.querySelector('#tono-feedback-title').textContent,trust:document.querySelector('#tono-trust-value').textContent,nextVisible:!document.querySelector('#btn-tono-next').hidden,disabled:[...document.querySelectorAll('#tono-choices button')].every(button=>button.disabled)})");
            const trust = 50 + (Math.min(questionIndex + 1, expectedCorrect) - Math.max(0, questionIndex + 1 - expectedCorrect)) * 10;
            if (answerState.title !== (shouldAnswerCorrectly ? '正解' : '不正解') || answerState.trust !== `${trust}%` || !answerState.nextVisible || !answerState.disabled) throw new Error(`Tono answer failed: ${JSON.stringify(answerState)}`);
            await evaluate("document.querySelector('#btn-tono-next').click()");
          }
          const result = await evaluate("({visible:!document.querySelector('#tono-result').hidden,grade:document.querySelector('#tono-result-grade').textContent,score:document.querySelector('#tono-result-score').textContent,trust:document.querySelector('#tono-result-trust').textContent})");
          const expectedGrade = expectedCorrect === 5 ? '完全勝利' : expectedCorrect === 4 ? '大勝利' : expectedCorrect === 3 ? '勝利' : '失敗';
          if (!result.visible || !result.grade.includes(expectedGrade) || !result.score.includes(`${expectedCorrect} / 5`) || !result.trust.includes(`${50 + (expectedCorrect * 2 - 5) * 10}%`)) throw new Error(`Tono result failed: ${JSON.stringify(result)}`);
          if (genreIndex === 0) {
            await evaluate("document.querySelector('#btn-tono-retry').click()");
            await until(() => evaluate("!document.querySelector('#tono-question').hidden && document.querySelector('#tono-question-number').textContent.includes('1 / 5')"), "Tono retry");
            if (!await evaluate("document.querySelector('#tono-trust-value').textContent === '50%'")) throw new Error('Tono retry trust did not reset');
            await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
            if (!await evaluate("!document.querySelector('#tono-intro').hidden")) throw new Error('Tono back from question failed');
            await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
          } else {
            await evaluate("document.querySelector('#btn-tono-genres').click()");
          }
          if (!await evaluate("document.querySelector('#mini-game-section-title').textContent === 'ジャンルを選択'")) throw new Error('Tono did not return to genres');
        }
        await evaluate("document.querySelector('#btn-back-from-mini-game').click(); document.querySelector('#btn-back-from-mini-game').click()");
        await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
      } else {
        await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
      }
      if (!await evaluate("document.querySelector('#battle-select-screen').classList.contains('active')")) throw new Error('Mini-game did not return to play');
      await evaluate("document.querySelector('#btn-start-from-battle-select').click()");
      await measure("normal", "#btn-back-from-normal-battle-select");
      if (size.visible) {
        await until(() => evaluate("[...document.querySelectorAll('.normal-battle-field-button')].some(button => button.textContent.includes('力学'))"), "mechanics field");
        await evaluate("[...document.querySelectorAll('.normal-battle-field-button')].find(button => button.textContent.includes('力学')).click()");
        await until(() => evaluate("document.querySelectorAll('.normal-battle-unit-button').length === 10"), "mechanics units");
        const listScroll = await evaluate("(() => { const list = document.querySelector('.normal-battle-select-content'); list.scrollTop = list.scrollHeight; return {overflow: getComputedStyle(list).overflowY, scrolled: list.scrollTop, page: document.documentElement.scrollTop}; })()");
        if (listScroll.overflow !== "auto" || listScroll.scrolled <= 0 || listScroll.page !== 0) throw new Error(`Unit list does not scroll internally: ${JSON.stringify(listScroll)}`);
        await evaluate("document.querySelector('#btn-back-from-normal-battle-select').click()");
      }
      await evaluate("document.querySelector('#btn-back-from-normal-battle-select').click(); document.querySelector('#btn-to-boss-from-battle-select').click()");
      await until(() => evaluate("document.querySelector('#boss-select-screen').classList.contains('active')"), "boss select");
      await measure("boss", "#btn-back-from-boss-select");
      if (size.visible) {
        await until(() => evaluate("document.querySelector('#btn-boss-by-level').offsetParent !== null"), "boss modes");
        await evaluate("document.querySelector('#btn-boss-by-level').click()");
        await until(() => evaluate("document.querySelectorAll('#boss-select-list .boss-select-card').length === 4"), "boss levels");
        const bossScroll = await evaluate("(() => { const content = document.querySelector('.boss-select-content'); const item = document.createElement('div'); item.style.height = '900px'; document.querySelector('#boss-select-list').append(item); content.scrollTop = content.scrollHeight; return {overflow: getComputedStyle(content).overflowY, scrolled: content.scrollTop, page: document.documentElement.scrollTop}; })()");
        if (bossScroll.overflow !== "auto" || bossScroll.scrolled <= 0 || bossScroll.page !== 0) throw new Error(`BOSS list does not scroll internally: ${JSON.stringify(bossScroll)}`);
      }
      if (size.width === 320) {
        await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 520, deviceScaleFactor: 2, mobile: true });
        await evaluate("window.dispatchEvent(new Event('resize'))");
        await until(() => evaluate("parseInt(getComputedStyle(document.documentElement).getPropertyValue('--game-viewport-height')) === 520"), "dynamic viewport resize");
        const resized = await evaluate("(() => { const game = document.querySelector('.quiz-card').getBoundingClientRect(); return {bottom:game.bottom,ratio:game.width/game.height,scroll:document.documentElement.scrollHeight-innerHeight}; })()");
        if (resized.bottom > 521 || resized.scroll > 1 || Math.abs(resized.ratio - 9 / 16) > 0.004) throw new Error(`Resize failed: ${JSON.stringify(resized)}`);
      }
    }
  } finally {
    socket?.close();
    browser.kill();
    await new Promise(resolve => server.close(resolve));
    if (profile.startsWith(path.join(os.tmpdir(), "physics-viewport-"))) {
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Browser may still be shutting down. */ }
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
