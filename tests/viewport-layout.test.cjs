const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf" };
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
  let tonoFixture = null;
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, "") || "index.html";
    if (relative === "notices.json" && noticeFixture) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      return response.end(JSON.stringify(noticeFixture));
    }
    if (relative === "minigames/tono-history-sample.json" && tonoFixture) {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      return response.end(JSON.stringify(tonoFixture));
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
      if (size.width === 320) {
        tonoFixture = JSON.parse(fs.readFileSync(path.join(root, "minigames", "tono-history-sample.json"), "utf8"));
        tonoFixture.questions.filter(item => item.genre === "戦国時代").forEach(item => {
          item.question = `長い問題文をページごとに読み、すべての選択肢を確認して答えてください。`.repeat(5) + item.id;
          item.explanation = `長い解説文も一文字も欠けずにページを切り替えて読めることを確認します。`.repeat(8);
        });
      } else tonoFixture = null;
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
      const topBackground = await evaluate("({image:getComputedStyle(document.querySelector('.mini-game-page')).backgroundImage,color:getComputedStyle(document.querySelector('.mini-game-page')).backgroundColor,hud:getComputedStyle(document.querySelector('#global-hud')).display})");
      if (!topBackground.image.includes('images/minigame/library.png') || topBackground.hud !== 'none') throw new Error(`Mini-game library background is missing: ${JSON.stringify(topBackground)}`);
      if (size.width === 375 && !await evaluate("(async () => { const assets=['images/minigame/library.png','images/minigame/history-study.png']; return (await Promise.all(assets.map(src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src=src;})))).every(Boolean); })()")) throw new Error('Mini-game background assets did not decode');
      if (size.visible) {
        const topPanelBackground = await evaluate("getComputedStyle(document.querySelector('.mini-game-panel')).backgroundImage");
        for (const expected of ['歴史', '幕末・明治維新', '初級']) {
          await evaluate(`document.querySelector('#mini-game-options .mini-game-option${expected === '幕末・明治維新' ? ':nth-child(2)' : ':first-child'}').click()`);
          if (!await evaluate("document.querySelector('.mini-game-page').classList.contains('is-history')")) throw new Error('History design not applied');
          const historyBackground = await evaluate("getComputedStyle(document.querySelector('.mini-game-page')).backgroundImage");
          if (!historyBackground.includes('images/minigame/history-study.png')) throw new Error('History study background is missing');
          if (await evaluate("getComputedStyle(document.querySelector('.mini-game-panel')).backgroundImage") === topPanelBackground) throw new Error('History panel did not change design');
          if (!await evaluate(`document.querySelector('#mini-game-path').textContent.includes(${JSON.stringify(expected)}) || document.querySelector('#mini-game-section-title').textContent.includes(${JSON.stringify(expected)}) || document.querySelector('#mini-game-coming-soon-level').textContent.includes(${JSON.stringify(expected)})`)) throw new Error(`Mini-game step missing: ${expected}`);
          if (expected === '幕末・明治維新') {
            const levels = await evaluate("[...document.querySelectorAll('#mini-game-options .mini-game-option strong')].map(item => item.textContent)");
            if (levels.join(',') !== '初級,中級,上級') throw new Error(`Mini-game levels: ${levels}`);
          }
        }
        if (!await evaluate("!document.querySelector('#mini-game-coming-soon').hidden && document.querySelector('#mini-game-coming-soon').textContent.includes('準備中')")) throw new Error('Mini-game started without questions');
        for (const [title, optionCount] of [['難易度を選択',3],['シリーズを選択',2],['教科を選択',1]]) {
          await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
          const state = await evaluate("({title:document.querySelector('#mini-game-section-title').textContent,count:document.querySelectorAll('#mini-game-options .mini-game-option').length})");
          if (state.title !== title || state.count !== optionCount) throw new Error(`Mini-game back hierarchy: ${JSON.stringify(state)}`);
        }
        await evaluate("document.querySelector('#mini-game-options .mini-game-option').click(); document.querySelector('#mini-game-options .mini-game-option').click()");
        const genres = await evaluate("[...document.querySelectorAll('#tono-genre-choices button > span:last-child')].map(item => item.textContent)");
        if (genres.join(',') !== '戦国時代,江戸時代,幕末') throw new Error(`Tono genres: ${genres}`);
        const genreLayout = await evaluate("(() => { const game=document.querySelector('.quiz-card').getBoundingClientRect(),device=document.querySelector('#tono-game').getBoundingClientRect(),lcd=document.querySelector('.tono-lcd-screen'),box=lcd.getBoundingClientRect(),choices=[...document.querySelectorAll('#tono-genre-choices button')].map(button=>button.getBoundingClientRect()),page=document.querySelector('.mini-game-page');return {deviceLeft:device.left,deviceRight:device.right,gameLeft:game.left,gameRight:game.right,deviceBottom:device.bottom,gameBottom:game.bottom,lcdOverflow:lcd.scrollHeight-lcd.clientHeight,first:choices[0].top,last:choices[2].bottom,lcdTop:box.top,lcdBottom:box.bottom,background:getComputedStyle(page).backgroundImage,outerBack:getComputedStyle(document.querySelector('#btn-back-from-mini-game')).display,panel:getComputedStyle(document.querySelector('#mini-game-panel')).display,current:document.querySelectorAll('#tono-genre-choices .is-current').length};})()");
        if (genreLayout.deviceLeft < genreLayout.gameLeft - 1 || genreLayout.deviceRight > genreLayout.gameRight + 1 || genreLayout.deviceBottom > genreLayout.gameBottom + 1 || genreLayout.lcdOverflow > 1 || genreLayout.first < genreLayout.lcdTop - 1 || genreLayout.last > genreLayout.lcdBottom + 1 || genreLayout.background !== 'none' || genreLayout.outerBack !== 'none' || genreLayout.panel !== 'none' || genreLayout.current !== 1) throw new Error(`Tono genre device layout: ${JSON.stringify(genreLayout)}`);
        if (!await evaluate("!document.querySelector('#btn-tono-b').disabled && !document.querySelector('#btn-tono-back')")) throw new Error('B should replace the old back button before play');
        await evaluate("document.querySelector('#btn-tono-b').click()");
        if (!await evaluate("document.querySelector('#mini-game-section-title').textContent === 'シリーズを選択'")) throw new Error('B did not return from genre selection');
        await evaluate("document.querySelector('#mini-game-options .mini-game-option').click()");
        await evaluate("document.querySelector('#btn-tono-down').click()");
        if (!await evaluate("document.querySelectorAll('#tono-genre-choices button')[1].classList.contains('is-current')")) throw new Error('Genre D-pad down failed');
        await evaluate("document.querySelector('#btn-tono-up').click()");
        if (!await evaluate("document.querySelectorAll('#tono-genre-choices button')[0].classList.contains('is-current')")) throw new Error('Genre D-pad up failed');
        for (const [genreIndex, expectedCorrect] of [[0,3],[1,5],[2,2],[1,4]]) {
          if (genreIndex === 0) await evaluate("document.querySelector('#btn-tono-a').click()");
          else await evaluate(`document.querySelectorAll('#tono-genre-choices button')[${genreIndex}].click()`);
          if (!await evaluate("!document.querySelector('#tono-intro').hidden && document.querySelector('#tono-speech').textContent.includes('裏切りの疑い') && !!document.querySelector('.tono-lcd-screen #btn-tono-start') && getComputedStyle(document.querySelector('#global-hud')).display === 'none'")) throw new Error('Tono introduction failed');
          if (!await evaluate("!document.querySelector('#btn-tono-b').disabled")) throw new Error('B should be enabled before the challenge');
          if (genreIndex === 0) {
            await evaluate("document.querySelector('#btn-tono-b').click()");
            if (!await evaluate("!document.querySelector('#tono-genre-select').hidden")) throw new Error('B did not return from introduction');
            await evaluate("document.querySelector('#btn-tono-a').click()");
          }
          await until(() => evaluate("(() => { const image=document.querySelector('.tono-portrait-image'); return image.complete && image.getAttribute('src')==='images/minigame/tono/normal.png' && image.naturalWidth===1254 && getComputedStyle(image).imageRendering==='pixelated'; })()"), 'Tono normal portrait');
          if (!await evaluate("getComputedStyle(document.querySelector('.mini-game-page')).backgroundImage === 'none' && getComputedStyle(document.querySelector('.mini-game-page')).backgroundColor === 'rgb(7, 16, 29)'")) throw new Error('Tono play background is not plain dark');
          for (let page = 0; page < 12 && await evaluate("document.querySelector('#btn-tono-start').textContent === '続きを読む'"); page++) {
            if (!await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'); return lcd.scrollHeight-lcd.clientHeight<=1 && document.querySelector('#btn-tono-start').getBoundingClientRect().bottom<=lcd.getBoundingClientRect().bottom+1; })()")) throw new Error('Tono introduction page is clipped');
            await evaluate("document.querySelector('#btn-tono-start').click()");
          }
          await evaluate("document.querySelector('#btn-tono-start').click()");
          await until(() => evaluate("!document.querySelector('#tono-question').hidden && document.querySelectorAll('#tono-choices button').length === 4"), "Tono question");
          if (!await evaluate("document.querySelector('#btn-tono-b').disabled")) throw new Error('B is active after the challenge started');
          if (!await evaluate("document.querySelector('.tono-portrait-image').getAttribute('src')==='images/minigame/tono/normal.png'")) throw new Error('Tono question portrait is not normal');
          const fonts = await evaluate("(async () => { await document.fonts.load('18px x8y12pxDenkiChip', '殿の疑いを晴らせ！'); const selectors=['#tono-question-text','#tono-speech','.tono-choice','.tono-game-heading h3','.tono-portrait-name','#tono-feedback','.tono-question-meta','#tono-trust-value','.tono-action','.tono-intro > p:first-child','#tono-explanation']; return {loaded:[...document.fonts].some(face=>face.family==='x8y12pxDenkiChip' && face.status==='loaded'),lcd:selectors.map(selector=>({selector,family:getComputedStyle(document.querySelector(selector)).fontFamily,size:parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)})),home:getComputedStyle(document.querySelector('.player-name')).fontFamily}; })()");
          if (!fonts.loaded || fonts.lcd.some(item=>!item.family.includes('x8y12pxDenkiChip')) || fonts.home.includes('x8y12pxDenkiChip') || fonts.lcd.find(item=>item.selector==='#tono-question-text').size < 18 || fonts.lcd.find(item=>item.selector==='.tono-choice').size < 18 || fonts.lcd.find(item=>item.selector==='#tono-speech').size < 16) throw new Error(`DenkiChip font was not scoped, loaded, or readable: ${JSON.stringify(fonts)}`);
          const textStyles = await evaluate("['#tono-speech','#tono-question-text','#tono-choices .tono-choice'].map(selector=>{const style=getComputedStyle(document.querySelector(selector));return [style.fontFamily,style.fontSize,style.fontWeight,style.lineHeight].join('|')})");
          if (new Set(textStyles).size !== 1) throw new Error(`Speech, question and answers use different typography: ${JSON.stringify(textStyles)}`);
          const bounds = await evaluate("(() => { const game=document.querySelector('.quiz-card').getBoundingClientRect(), panel=document.querySelector('#tono-game').getBoundingClientRect(), lcd=document.querySelector('.tono-lcd-screen').getBoundingClientRect(), controls=document.querySelector('.tono-device-details').getBoundingClientRect(), b=document.querySelector('#btn-tono-b').getBoundingClientRect(), portrait=document.querySelector('.tono-portrait').getBoundingClientRect(), dpad=document.querySelector('.tono-dpad').getBoundingClientRect(), a=document.querySelector('#btn-tono-a').getBoundingClientRect(); return {gameTop:game.top,gameBottom:game.bottom,gameCenter:(game.left+game.right)/2,panelTop:panel.top,panelBottom:panel.bottom,panelCenter:(panel.left+panel.right)/2,panelRatio:panel.width/panel.height,lcdRatio:lcd.height/panel.height,controlsRatio:controls.height/panel.height,portraitWidth:portrait.width,dpadWidth:dpad.width,aWidth:a.width,bTop:b.top,bBottom:b.bottom,pageScroll:document.documentElement.scrollHeight-innerHeight,innerOverflow:getComputedStyle(document.querySelector('.tono-lcd-screen')).overflowY,choicesInsideLcd:!!document.querySelector('.tono-lcd-screen #tono-choices'),hudHidden:getComputedStyle(document.querySelector('#global-hud')).display==='none',outerBackHidden:getComputedStyle(document.querySelector('#btn-back-from-mini-game')).display==='none',selectedCount:document.querySelectorAll('#tono-choices .is-current').length}; })()");
          if (bounds.panelTop < bounds.gameTop + 4 || bounds.panelBottom > bounds.gameBottom - 4 || Math.abs(bounds.panelCenter - bounds.gameCenter) > 1 || bounds.panelRatio < .55 || bounds.panelRatio > .75 || bounds.lcdRatio < .57 || bounds.lcdRatio > .76 || bounds.controlsRatio < .17 || bounds.controlsRatio > .33 || bounds.portraitWidth < 48 || bounds.dpadWidth < 70 || bounds.aWidth < 38 || bounds.bTop < bounds.panelTop || bounds.bBottom > bounds.panelBottom || bounds.pageScroll > 1 || bounds.innerOverflow !== 'hidden' || !bounds.choicesInsideLcd || !bounds.hudHidden || !bounds.outerBackHidden || bounds.selectedCount !== 1) throw new Error(`Tono viewport overflow: ${JSON.stringify(bounds)}`);
          for (let page = 0; page < 12 && await evaluate("document.querySelector('#tono-question').classList.contains('is-reading')"); page++) await evaluate("document.querySelector('#btn-tono-page-next').click()");
          if (genreIndex === 0) {
            await evaluate("document.querySelector('#tono-game').dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true}))");
            if (!await evaluate("document.querySelectorAll('#tono-choices button')[1].classList.contains('is-current')")) throw new Error('Tono keyboard selection is not visible');
            await evaluate("document.querySelector('#btn-tono-up').click()");
            if (!await evaluate("document.querySelectorAll('#tono-choices button')[0].classList.contains('is-current')")) throw new Error('Physical D-pad up did not move the selection');
          }
          for (let questionIndex = 0; questionIndex < 5; questionIndex++) {
            const questionState = await evaluate("(async () => { const data=await (await fetch('minigames/tono-history-sample.json')).json(); const question=data.questions.find(item=>item.question===document.querySelector('#tono-question-text').dataset.fullText); return {number:document.querySelector('#tono-question-number').textContent,correct:question.correct,choiceCount:document.querySelectorAll('#tono-choices button').length,sample:!document.querySelector('#tono-question-sample').hidden}; })()");
            if (!questionState.number.includes(`第${questionIndex + 1}問 / 5`) || questionState.choiceCount !== 4 || !questionState.sample) throw new Error(`Tono question mismatch: ${JSON.stringify(questionState)}`);
            for (let page = 0; page < 12 && await evaluate("document.querySelector('#tono-question').classList.contains('is-reading')"); page++) await evaluate("document.querySelector('#btn-tono-page-next').click()");
            const visibleChoices = await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'), box=lcd.getBoundingClientRect(), choices=[...document.querySelectorAll('#tono-choices button')].map(button=>button.getBoundingClientRect()); return {count:choices.length,first:choices[0].top,last:choices[3].bottom,top:box.top,bottom:box.bottom,scroll:document.documentElement.scrollHeight-innerHeight,content:Math.round(lcd.scrollHeight-lcd.clientHeight)}; })()");
            if (visibleChoices.count !== 4 || visibleChoices.first < visibleChoices.top - 1 || visibleChoices.last > visibleChoices.bottom + 1 || visibleChoices.scroll > 1 || visibleChoices.content > 1) throw new Error(`Four choices do not fit without scrolling: ${JSON.stringify(visibleChoices)}`);
            const shouldAnswerCorrectly = questionIndex < expectedCorrect;
            const selected = shouldAnswerCorrectly ? questionState.correct : (questionState.correct + 1) % 4;
            if (genreIndex === 0 && questionIndex === 0) {
              let current = await evaluate("[...document.querySelectorAll('#tono-choices button')].findIndex(button=>button.classList.contains('is-current'))");
              while (current !== selected) {
                await evaluate("document.querySelector('#btn-tono-down').click()");
                current = (current + 1) % 4;
              }
              if (!await evaluate(`document.querySelectorAll('#tono-choices button')[${selected}].classList.contains('is-current')`)) throw new Error('Physical D-pad did not move the selection');
              await evaluate("document.querySelector('#btn-tono-a').click()");
            } else {
              await evaluate(`document.querySelectorAll('#tono-choices button')[${selected}].click()`);
            }
            const answerState = await evaluate("({title:document.querySelector('#tono-feedback-title').textContent,trust:document.querySelector('#tono-trust-value').textContent,nextVisible:!document.querySelector('#btn-tono-next').hidden,disabled:[...document.querySelectorAll('#tono-choices button')].every(button=>button.disabled)})");
            const expectedPortrait = shouldAnswerCorrectly ? 'correct.png' : 'wrong.png';
            await until(() => evaluate(`(() => { const image=document.querySelector('.tono-portrait-image'); return image.complete && image.getAttribute('src')==='images/minigame/tono/${expectedPortrait}' && image.naturalWidth===1254; })()`), `Tono answer portrait: ${expectedPortrait}`);
            const trust = 50 + (Math.min(questionIndex + 1, expectedCorrect) - Math.max(0, questionIndex + 1 - expectedCorrect)) * 10;
            if (answerState.title !== (shouldAnswerCorrectly ? '正解' : '不正解') || answerState.trust !== `${trust}%` || !answerState.nextVisible || !answerState.disabled) throw new Error(`Tono answer failed: ${JSON.stringify(answerState)}`);
            const next = await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'),box=lcd.getBoundingClientRect(),button=document.querySelector('#btn-tono-next').getBoundingClientRect(); return {top:button.top,bottom:button.bottom,lcdTop:box.top,lcdBottom:box.bottom,overflow:lcd.scrollHeight-lcd.clientHeight}; })()");
            if (next.top < next.lcdTop - 1 || next.bottom > next.lcdBottom + 1 || next.overflow > 1) throw new Error(`Explanation action is clipped: ${JSON.stringify(next)}`);
            for (let page = 0; page < 12 && await evaluate("document.querySelector('#btn-tono-next').textContent === '続きを読む'"); page++) await evaluate("document.querySelector('#btn-tono-next').click()");
            await evaluate("document.querySelector('#btn-tono-next').click()");
            if (questionIndex < 4 && !await evaluate("document.querySelector('.tono-portrait-image').getAttribute('src')==='images/minigame/tono/normal.png'")) throw new Error('Tono portrait did not reset for the next question');
          }
          const result = await evaluate("({visible:!document.querySelector('#tono-result').hidden,grade:document.querySelector('#tono-result-grade').textContent,score:document.querySelector('#tono-result-score').textContent,trust:document.querySelector('#tono-result-trust').textContent})");
          if (!await evaluate("document.querySelector('#btn-tono-b').disabled")) throw new Error('B is active on the result screen');
          if (!await evaluate(`document.querySelector('.tono-portrait-image').getAttribute('src')==='images/minigame/tono/${expectedCorrect >= 3 ? 'correct' : 'wrong'}.png'`)) throw new Error('Tono result portrait failed');
          const expectedGrade = expectedCorrect === 5 ? '完全勝利' : expectedCorrect === 4 ? '大勝利' : expectedCorrect === 3 ? '勝利' : '失敗';
          if (!result.visible || !result.grade.includes(expectedGrade) || !result.score.includes(`${expectedCorrect} / 5`) || !result.trust.includes(`${50 + (expectedCorrect * 2 - 5) * 10}%`) || !await evaluate("getComputedStyle(document.querySelector('#global-hud')).display === 'none' && !!document.querySelector('.tono-lcd-screen #tono-result-actions')")) throw new Error(`Tono result failed: ${JSON.stringify(result)}`);
          for (let page = 0; page < 12 && await evaluate("!document.querySelector('#btn-tono-result-continue').hidden"); page++) {
            const readingFit = await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'),button=document.querySelector('#btn-tono-result-continue').getBoundingClientRect();return {overflow:lcd.scrollHeight-lcd.clientHeight,button:button.bottom,bottom:lcd.getBoundingClientRect().bottom}; })()");
            if (readingFit.overflow > 1 || readingFit.button > readingFit.bottom + 1) throw new Error(`Tono result reading page is clipped: ${JSON.stringify(readingFit)}`);
            await evaluate("document.querySelector('#btn-tono-result-continue').click()");
          }
          const resultFit = await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'),button=document.querySelector('#btn-tono-genres').getBoundingClientRect(),box=lcd.getBoundingClientRect();return {overflow:lcd.scrollHeight-lcd.clientHeight,button:button.bottom,bottom:box.bottom,dialogue:document.querySelector('.tono-dialogue').getBoundingClientRect().height,result:document.querySelector('#tono-result').getBoundingClientRect().height}; })()");
          if (resultFit.overflow > 1 || resultFit.button > resultFit.bottom + 1) throw new Error(`Tono result page is clipped: ${JSON.stringify(resultFit)}`);
          if (genreIndex === 0) {
            await evaluate("document.querySelector('#btn-tono-retry').click()");
            await until(() => evaluate("!document.querySelector('#tono-question').hidden && document.querySelector('#tono-question-number').textContent.includes('第1問 / 5')"), "Tono retry");
            if (!await evaluate("document.querySelector('#tono-trust-value').textContent === '50%'")) throw new Error('Tono retry trust did not reset');
            await evaluate("document.querySelector('#btn-tono-b').click()");
            if (!await evaluate("!document.querySelector('#tono-question').hidden && document.querySelector('#btn-tono-b').disabled")) throw new Error('B unexpectedly left the active challenge');
            for (let replayIndex = 0; replayIndex < 5; replayIndex++) {
              for (let page = 0; page < 12 && await evaluate("document.querySelector('#tono-question').classList.contains('is-reading')"); page++) await evaluate("document.querySelector('#btn-tono-page-next').click()");
              await evaluate("document.querySelector('#tono-choices button').click()");
              for (let page = 0; page < 12 && await evaluate("document.querySelector('#btn-tono-next').textContent === '続きを読む'"); page++) await evaluate("document.querySelector('#btn-tono-next').click()");
              await evaluate("document.querySelector('#btn-tono-next').click()");
            }
            if (!await evaluate("!document.querySelector('#tono-result').hidden")) throw new Error('Tono replay did not finish');
            await evaluate("document.querySelector('#btn-tono-genres').click()");
          } else {
            await evaluate("document.querySelector('#btn-tono-genres').click()");
          }
          if (!await evaluate("!document.querySelector('#tono-genre-select').hidden && document.querySelector('#tono-game').classList.contains('is-genre-select') && getComputedStyle(document.querySelector('#global-hud')).display === 'none'")) throw new Error('Tono did not return to genres or HUD became visible');
        }
        await evaluate("document.querySelector('#btn-tono-b').click(); document.querySelector('#btn-back-from-mini-game').click()");
        await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
      } else {
        if (size.width <= 390) {
          await evaluate("document.querySelector('#mini-game-options .mini-game-option').click(); document.querySelector('#mini-game-options .mini-game-option').click(); document.querySelector('#tono-genre-choices button').click()");
          for (let page = 0; page < 12 && await evaluate("document.querySelector('#btn-tono-start').textContent === '続きを読む'"); page++) await evaluate("document.querySelector('#btn-tono-start').click()");
          await evaluate("document.querySelector('#btn-tono-start').click()");
          await until(() => evaluate("!document.querySelector('#tono-question').hidden && document.querySelectorAll('#tono-choices button').length === 4"), "small-screen Tono question");
          const fullLongQuestion = await evaluate("document.querySelector('#tono-question-text').dataset.fullText");
          let readQuestion = await evaluate("document.querySelector('#tono-question').classList.contains('is-reading') ? '' : document.querySelector('#tono-question-text').textContent");
          let questionPageCount = 0;
          for (let page = 0; page < 60 && await evaluate("document.querySelector('#tono-question').classList.contains('is-reading')"); page++) {
            const part = await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'); return {text:document.querySelector('#tono-question-text').textContent,overflow:lcd.scrollHeight-lcd.clientHeight,button:document.querySelector('#btn-tono-page-next').getBoundingClientRect().bottom,bottom:lcd.getBoundingClientRect().bottom}; })()");
            if (part.overflow > 1 || part.button > part.bottom + 1) throw new Error(`Long question page is clipped: ${JSON.stringify(part)}`);
            readQuestion += part.text;
            questionPageCount++;
            await evaluate("document.querySelector('#btn-tono-page-next').click()");
          }
          if (readQuestion !== fullLongQuestion || (size.width === 320 && questionPageCount < 2)) throw new Error(`Long question paging lost text: ${readQuestion.length}/${fullLongQuestion.length}, pages ${questionPageCount}`);
          const choiceFit = await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'),box=lcd.getBoundingClientRect(),last=document.querySelector('#tono-choices button:last-child').getBoundingClientRect(); return {overflow:lcd.scrollHeight-lcd.clientHeight,last:last.bottom,bottom:box.bottom}; })()");
          if (choiceFit.overflow > 1 || choiceFit.last > choiceFit.bottom + 1) throw new Error(`Long question choices are clipped: ${JSON.stringify(choiceFit)}`);
          const compact = await evaluate("(() => { const device=document.querySelector('#tono-game').getBoundingClientRect(), lcd=document.querySelector('.tono-lcd-screen').getBoundingClientRect(), choices=[...document.querySelectorAll('#tono-choices button')].map(button=>button.getBoundingClientRect()), page=document.querySelector('.mini-game-page').getBoundingClientRect(); return {deviceLeft:device.left,deviceRight:device.right,deviceBottom:device.bottom,lcdLeft:lcd.left,lcdRight:lcd.right,choiceLeft:Math.min(...choices.map(item=>item.left)),choiceRight:Math.max(...choices.map(item=>item.right)),pageLeft:page.left,pageRight:page.right,pageBottom:page.bottom,scroll:document.documentElement.scrollHeight-innerHeight,choicesInsideLcd:!!document.querySelector('.tono-lcd-screen #tono-choices'),hudHidden:getComputedStyle(document.querySelector('#global-hud')).display==='none'}; })()");
          if (compact.deviceLeft < compact.pageLeft - 1 || compact.deviceRight > compact.pageRight + 1 || compact.deviceBottom > compact.pageBottom + 1 || compact.choiceLeft < compact.lcdLeft - 1 || compact.choiceRight > compact.lcdRight + 1 || compact.scroll > 1 || !compact.choicesInsideLcd || !compact.hudHidden) throw new Error(`Compact Tono layout: ${JSON.stringify(compact)}`);
          await evaluate("document.querySelector('#btn-tono-a').click()");
          const longExplanation = await evaluate("(async () => { const data=await (await fetch('minigames/tono-history-sample.json')).json(); return data.questions.find(item=>item.question===document.querySelector('#tono-question-text').dataset.fullText).explanation; })()");
          let readExplanation = "";
          let explanationPageCount = 0;
          for (let page = 0; page < 60; page++) {
            const part = await evaluate("(() => { const lcd=document.querySelector('.tono-lcd-screen'),button=document.querySelector('#btn-tono-next').getBoundingClientRect(),box=lcd.getBoundingClientRect(); return {text:document.querySelector('#tono-explanation').textContent,overflow:lcd.scrollHeight-lcd.clientHeight,button:button.bottom,bottom:box.bottom,more:document.querySelector('#btn-tono-next').textContent==='続きを読む'}; })()");
            if (part.overflow > 1 || part.button > part.bottom + 1) throw new Error(`Long explanation page is clipped: ${JSON.stringify(part)}`);
            readExplanation += part.text;
            explanationPageCount++;
            if (!part.more) break;
            await evaluate("document.querySelector('#btn-tono-next').click()");
          }
          if (readExplanation !== longExplanation || (size.width === 320 && explanationPageCount < 2)) throw new Error(`Long explanation paging lost text: ${readExplanation.length}/${longExplanation.length}, pages ${explanationPageCount}`);
          await evaluate("document.querySelector('#btn-tono-b').click()");
          if (!await evaluate("!document.querySelector('#tono-question').hidden && document.querySelector('#btn-tono-b').disabled")) throw new Error('B unexpectedly left the small-screen challenge');
          await send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
          await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('#btn-to-battle-select')"), "return from long Tono fixture");
          await evaluate("document.querySelector('#btn-to-battle-select').click()");
        } else {
          await evaluate("document.querySelector('#btn-back-from-mini-game').click()");
        }
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
