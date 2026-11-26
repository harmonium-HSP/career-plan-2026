// Run with playwright-core on NODE_PATH and Edge installed (or set BROWSER_PATH).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');

async function fixture(t) {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.setContent('<style>body{background:#345;color:white}</style><div class="opener-copy"><div class="opener-reveal"><p class="opener-index">01 — 05</p><h1>职业认知</h1><p>从拆解好奇到软硬协同造物</p></div></div>');
  await page.addStyleTag({ path: path.join(root, 'styles.css') });
  await page.addScriptTag({ path: path.join(root, 'ascii-title-sweep.js') });
  await page.evaluate(() => {
    let next;
    window.requestAnimationFrame = cb => { next = cb; return 1; };
    const copy = document.querySelector('.opener-copy');
    const sweep = AsciiTitleSweep.attach({ to: copy });
    if (!sweep) throw Error('WebGL sweep did not start');
    window.advance = ms => next(100 + ms);
    advance(0);
  });
  return page;
}

test('sweep paints visible pure black and #4ade80 glyph cores', async t => {
  const page = await fixture(t);
  const colors = await page.evaluate(() => {
    const gl = document.querySelector('.ascii-title-sweep').getContext('webgl2');
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    let black = 0;
    let green = 0;
    for (const ms of [600, 800, 1000, 1200, 1400]) {
      advance(ms);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        // Opaque pixels cannot be empty canvas or faint green haze.
        if (pixels[i + 3] !== 255) continue;
        if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0) black++;
        if (pixels[i] === 74 && pixels[i + 1] === 222 && pixels[i + 2] === 128) green++;
      }
    }
    return { black, green };
  });
  assert.ok(colors.black > 0, `missing opaque black glyph cores: ${JSON.stringify(colors)}`);
  assert.ok(colors.green > 0, `missing opaque green glyph cores: ${JSON.stringify(colors)}`);
});


test('chapter name leads both supporting rows from left to right', async t => {
  const page = await fixture(t);
  const result = await page.evaluate(() => {
    function cuts(time) {
      advance(time);
      return [...document.querySelector('.opener-reveal').children].map(row => {
        const box = row.getBoundingClientRect();
        const parentClip = getComputedStyle(row.parentNode).clipPath;
        const clip = parentClip === 'none' ? getComputedStyle(row).clipPath : parentClip;
        return clip === 'none' ? box.right : box.right - Number.parseFloat(clip.split(' ')[1]);
      });
    }
    return [cuts(800), cuts(1000)];
  });
  for (const [index, title, desc] of result) assert.ok(title > index + 10 && title > desc + 10, JSON.stringify(result));
  assert.ok(result[1].every((cut, i) => cut > result[0][i]));
});

test('last sweep frame has the same painted text and shadows as settled DOM', async t => {
  const page = await fixture(t);
  const clip = { x: 290, y: 245, width: 420, height: 200 };
  await page.evaluate(() => advance(1999));
  const before = await page.screenshot({ clip });
  await page.evaluate(() => advance(2000));
  assert.ok(before.equals(await page.screenshot({ clip })), 'cover text changed at canvas teardown');
});

// Optional full application run against an existing local static server.
test('real cover switches forward and back, including the layer handoff', { skip: !process.env.SWEEP_PREVIEW }, async t => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: ['--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.goto(process.env.SWEEP_PREVIEW);
  await page.waitForFunction(() => document.querySelector('#startup-wall').hidden && !document.querySelector('#chapter').hidden);
  const title = page.locator('.opener h1');
  const original = await title.innerText();
  const first = original === await page.evaluate(() => PLAN.chapters.at(-1).name) ? 'ArrowLeft' : 'ArrowRight';
  for (const key of [first, first === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight']) {
    const old = await title.innerText();
    await page.keyboard.press(key);
    await page.waitForFunction(() => document.querySelector('.ascii-title-sweep')?.style.visibility === 'visible');
    await page.waitForFunction(prev => document.querySelector('.opener h1').innerText !== prev && !document.querySelector('.chapter-turn') && document.querySelector('.ascii-title-sweep')?.style.visibility !== 'visible', old);
    assert.equal(await page.locator('.opener .opener-reveal').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.deepEqual(await title.evaluate(el => [...el.parentNode.children].map(row => getComputedStyle(row).clipPath)), ['none', 'none', 'none']);
  }
  assert.equal(await title.innerText(), original);
});

test('right-to-left sweep reveals the right side first, with delayed details', async t => {
  const page = await fixture(t);
  const cuts = await page.evaluate(() => {
    const copy = document.querySelector('.opener-copy');
    AsciiTitleSweep.attach({to:copy, direction:-1});
    advance(0); advance(900);
    return [...copy.firstChild.children].map(row => {
      const inset = getComputedStyle(row).clipPath.slice(6,-1).split(' ').map(parseFloat);
      return row.getBoundingClientRect().left + (inset[3] ?? inset[1]);
    });
  });
  assert.ok(cuts[1] > 240 && cuts[1] < cuts[0] && cuts[1] < cuts[2], JSON.stringify(cuts));
});

test('outgoing-only sweep finishes blank, without restoring the old text', async t => {
  const page = await fixture(t);
  const state = await page.evaluate(() => {
    const copy = document.querySelector('.opener-copy');
    const exit = AsciiTitleSweep.attach({from:copy});
    if (!exit) return null;
    advance(0); advance(2000);
    return [getComputedStyle(copy.firstChild).opacity, document.querySelector('.ascii-title-sweep').style.visibility];
  });
  assert.deepEqual(state, ['0','hidden']);
});

test('startup, scroll reversal and a delayed cover decode use the actual title layers', {skip: !process.env.SWEEP_PREVIEW}, async t => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args:['--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1000,height:700}});
  await page.goto(process.env.SWEEP_PREVIEW);
  const canvas = page.locator('.ascii-title-sweep');
  await page.waitForFunction(() => document.querySelector('#startup-wall').hidden && !document.querySelector('#chapter').hidden);
  await canvas.waitFor({state:'visible',timeout:2000});
  const opacity = () => page.locator('.opener .opener-reveal').evaluate(el=>getComputedStyle(el).opacity);
  await page.evaluate(()=>scrollTo(0,150));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.opener .opener-reveal')).opacity==='0');
  await page.evaluate(()=>scrollTo(0,0));
  await canvas.waitFor({state:'hidden'});
  assert.equal(await opacity(),'1');
  const key = await page.evaluate(()=> document.querySelector('.opener h1').textContent===PLAN.chapters.at(-1).name?'ArrowLeft':'ArrowRight');
  await page.evaluate(()=>{const decode=HTMLImageElement.prototype.decode; const gate=new Promise(r=>window.releaseDecode=r); HTMLImageElement.prototype.decode=function(){return gate.then(()=>decode.call(this));};});
  await page.keyboard.press(key);
  await canvas.waitFor({state:'visible',timeout:1500});
  await canvas.waitFor({state:'hidden',timeout:2500});
  assert.equal(await page.locator('.chapter-turn').count(),1);
  const name=await page.locator('.chapter-turn h1').innerText();
  await page.evaluate(()=>releaseDecode());
  await page.locator('.chapter-turn').waitFor({state:'detached'});
  assert.equal(await page.locator('.opener h1').innerText(),name);
  assert.equal(await opacity(),'1');
});

for (const input of ['wheel', 'click']) {
  test(`chapter end ${input}: erase once before advancing to the first sheet`, {skip: !process.env.SWEEP_PREVIEW}, async t => {
    const browser = await chromium.launch({executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args:['--enable-unsafe-swiftshader']});
    t.after(() => browser.close());
    const page = await browser.newPage({viewport:{width:1000,height:700}});
    await page.addInitScript(() => sessionStorage.setItem('career-plan-2026-state', JSON.stringify({index:0})));
    // Exercise native pointer hit-testing without the experimental DOM-in-canvas compositor.
    if (input === 'click') await page.addInitScript(() => { HTMLCanvasElement.prototype.requestPaint = undefined; });
    await page.goto(process.env.SWEEP_PREVIEW);
    await page.waitForFunction(() => document.querySelector('#startup-wall').hidden && document.querySelector('#go-next'));
    await page.locator('#next-project').evaluate(section => scrollBy(0,section.getBoundingClientRect().top));
    await page.waitForFunction(() => Math.abs(document.querySelector('#next-project').getBoundingClientRect().top)<2);
    await page.evaluate(() => {
      const heading = document.querySelector('.next-copy h1').textContent;
      const state = window.handoff = {calls:[], errors:[], heading};
      const attach = AsciiTitleSweep.attach;
      AsciiTitleSweep.attach = options => {
        state.calls.push([!!options.from, !!options.to, options.direction ?? 1]);
        const node = options.from || options.to;
        if (!node.matches('.next-copy') || getComputedStyle(node.firstElementChild).opacity !== '1') state.errors.push('missing visible source');
        const original = document.querySelector('#go-next .next-copy');
        if (node !== original && original?.checkVisibility({opacityProperty:true,visibilityProperty:true})) state.errors.push('duplicate card title');
        const handle = attach(options);
        if (!handle) state.errors.push('missing WebGL sweep');
        requestAnimationFrame(function sample() {
          if (handle && !handle.finished()) {
            if (!node.isConnected || !node.getClientRects().length) state.errors.push('source retired before completion');
            requestAnimationFrame(sample);
          }
        });
        if (handle) {
          const done = handle.whenDone;
          handle.whenDone = callback => done(() => {state.blank = true; callback();});
        }
        return handle;
      };
      requestAnimationFrame(function sample() {
        const live = document.querySelector('.opener h1');
        if (live?.textContent === heading) {
          if (scrollY > 2 && !state.blank) state.errors.push('scroll before completion');
          if (getComputedStyle(live.parentNode).opacity !== '0') state.errors.push('live title flashed');
        }
        requestAnimationFrame(sample);
      });
    });
    if (input === 'click') await page.locator('#go-next').click();
    else await page.mouse.wheel(0, await page.locator('#next-project').evaluate(el => el.offsetHeight));
    await page.waitForFunction(() => document.querySelector('.opener h1').textContent === handoff.heading && Math.abs(document.querySelector('#beats .sheet').getBoundingClientRect().top)<2, null, {timeout:15000});
    const trace = await page.evaluate(() => window.handoff);
    assert.deepEqual(trace.calls, [[true,false,1]]);
    assert.equal(trace.blank,true);
    assert.deepEqual(trace.errors, []);
    if (input === 'wheel') {
      await page.waitForFunction(() => !document.documentElement.classList.contains('lenis-stopped'));
      await page.mouse.wheel(0, -10000);
      await page.waitForFunction(() => scrollY === 0 && getComputedStyle(document.querySelector('.opener-reveal')).opacity === '1' && document.querySelector('.ascii-title-sweep')?.style.visibility !== 'visible');
    }

  });
}

for (const fallback of ['reduced', 'no-webgl']) {
  test(`chapter end ${fallback}: reach the first sheet without a sweep`, {skip: !process.env.SWEEP_PREVIEW}, async t => {
    const browser = await chromium.launch({executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args: fallback === 'no-webgl' ? ['--disable-webgl'] : []});
    t.after(() => browser.close());
    const page = await browser.newPage({reducedMotion: fallback === 'reduced' ? 'reduce' : 'no-preference'});
    await page.addInitScript(() => sessionStorage.setItem('career-plan-2026-state', JSON.stringify({index:0})));
    await page.goto(process.env.SWEEP_PREVIEW);
    await page.waitForFunction(() => document.querySelector('#startup-wall').hidden && document.querySelector('#go-next'));
    const name = await page.locator('#go-next h1').innerText();
    await page.locator('#go-next').click();
    await page.waitForFunction(name => document.querySelector('.opener h1').textContent === name && Math.abs(document.querySelector('#beats .sheet').getBoundingClientRect().top)<2, name);
    assert.equal(await page.locator('.ascii-title-sweep:visible').count(), 0);
  });
}

test('reduced motion switches chapters with settled DOM text and no sweep canvas', {skip: !process.env.SWEEP_PREVIEW}, async t=>{
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  t.after(()=>browser.close());
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto(process.env.SWEEP_PREVIEW);
  await page.waitForFunction(()=>document.querySelector('#startup-wall').hidden && !document.querySelector('#chapter').hidden);
  const original=await page.locator('.opener h1').innerText();
  const key=await page.evaluate(()=>document.querySelector('.opener h1').textContent===PLAN.chapters.at(-1).name?'ArrowLeft':'ArrowRight');
  await page.keyboard.press(key);
  await page.waitForFunction(old=>document.querySelector('.opener h1').textContent!==old && !document.querySelector('.chapter-turn'),original);
  assert.equal(await page.locator('.ascii-title-sweep').count(),0);
  assert.equal(await page.locator('.opener .opener-reveal').evaluate(el=>getComputedStyle(el).opacity),'1');
});

test('interruption captures the displayed shader frame without advancing its flicker clock', async t=>{
  const page=await fixture(t);
  const times=await page.evaluate(()=>{
    const handle=AsciiTitleSweep.attach({to:document.querySelector('.opener-copy')});
    advance(0); advance(850);
    const gl=document.querySelector('.ascii-title-sweep').getContext('webgl2');
    const program=gl.getParameter(gl.CURRENT_PROGRAM);
    const time=()=>gl.getUniform(program,gl.getUniformLocation(program,'uTime'));
    const before=time(); handle.snapshot(); return [before,time()];
  });
  assert.equal(times[0],times[1]);
});

for (const wait of ['slots', 'live photo']) {
  test(`Escape restores reading during stalled ${wait} decode`, {skip: !process.env.SWEEP_PREVIEW}, async t => {
    const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
    t.after(()=>browser.close());
    const page=await browser.newPage();
    await page.goto(process.env.SWEEP_PREVIEW);
    await page.waitForFunction(()=>document.querySelector('#startup-wall').hidden && !document.querySelector('#chapter').hidden);
    const original=await page.locator('.opener h1').innerText();
    await page.evaluate(phase=>{
      const decode=HTMLImageElement.prototype.decode;
      const gate=new Promise(resolve=>window.releaseHeldImages=resolve);
      HTMLImageElement.prototype.decode=function(){
        if (this.matches('.opener-photo') === (phase==='live photo')) { window.heldImage=true; return gate.then(()=>decode.call(this)); }
        return decode.call(this);
      };
    },wait);
    await page.keyboard.press(await page.evaluate(()=>document.querySelector('.opener h1').textContent===PLAN.chapters.at(-1).name?'ArrowLeft':'ArrowRight'));
    await page.waitForFunction(()=>window.heldImage && document.querySelector('.chapter-turn'));
    await page.keyboard.press('Escape');
    await page.locator('.chapter-turn').waitFor({state:'detached',timeout:1000});
    assert.equal(await page.locator('.opener h1').innerText(),original);
    assert.equal(await page.locator('#beats').evaluate(el=>el.inert),false);
    assert.equal(await page.locator('.opener .opener-reveal').evaluate(el=>getComputedStyle(el).opacity),'1');
    await page.evaluate(()=>releaseHeldImages());
    await page.mouse.wheel(0,450);
    await page.waitForFunction(()=>scrollY>80);
    assert.equal(await page.locator('.opener h1').innerText(),original);
  });
}

// Sample the painted title as well as the last frame with both covers mounted.
// A compositor may coalesce screenshots, so the overlap check runs every RAF.
test('settled title stays painted across chapter layer removal', {skip: !process.env.SWEEP_PREVIEW}, async t => {
  const fs = require('node:fs');
  const {PNG} = require('playwright-core/lib/utilsBundle');
  const browser = await chromium.launch({executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args:['--enable-unsafe-swiftshader']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:1000,height:700}});
  await page.addInitScript(() => sessionStorage.setItem('career-plan-2026-state', JSON.stringify({index:0})));
  await page.goto(process.env.SWEEP_PREVIEW);
  await page.waitForFunction(() => document.querySelector('#startup-wall').hidden && document.querySelector('.opener h1')?.textContent === PLAN.chapters[0].name && getComputedStyle(document.querySelector('.opener .opener-reveal')).opacity === '1' && document.querySelector('.ascii-title-sweep')?.style.visibility !== 'visible');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.chapter-turn') && document.querySelector('.ascii-title-sweep')?.style.visibility === 'hidden');
  await page.evaluate(() => {
    window.overlap = false;
    requestAnimationFrame(function sample() {
      if (!document.querySelector('.chapter-turn')) return;
      const live = document.querySelector('.opener h1');
      if (live.textContent === PLAN.chapters[1].name && getComputedStyle(live.parentElement).opacity === '1') window.overlap = true;
      requestAnimationFrame(sample);
    });
  });
  const counts = [], files = process.env.SWEEP_ARTIFACTS;
  if (files) fs.mkdirSync(files, {recursive:true});
  for (let settled = 0; settled < 3;) {
    const present = await page.locator('.chapter-turn').count();
    const bytes = await page.screenshot({clip:{x:400,y:320,width:200,height:60}});
    if (files) fs.writeFileSync(path.join(files, `${counts.length}-${present ? 'turn' : 'live'}.png`), bytes);
    const {data} = PNG.sync.read(bytes);
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) if (Math.min(data[i],data[i+1],data[i+2]) > 235) bright++;
    counts.push(bright);
    if (!present) settled++;
    assert.ok(counts.length < 200, 'turn layer did not retire');
  }
  t.diagnostic(`Edge title pixels: ${counts.join(', ')}`);
  assert.ok(counts.every(count => count >= counts.at(-1) * .85 && count > 200), 'painted title vanished during handoff');
  assert.equal(await page.evaluate(() => window.overlap), true, 'live title was never ready beneath the completed cover');
});

test('rapid next, next, previous: independent painted bands retire on their own clocks', {skip: !process.env.SWEEP_PREVIEW}, async t => {
  const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', args:['--enable-unsafe-swiftshader']});
  t.after(()=>browser.close());
  const page = await browser.newPage({viewport:{width:1000,height:700}});
  await page.addInitScript(()=>sessionStorage.setItem('career-plan-2026-state','{"index":0}'));
  await page.goto(process.env.SWEEP_PREVIEW);
  await page.waitForFunction(()=>document.querySelector('#startup-wall').hidden && document.querySelector('.ascii-title-sweep')?.style.visibility==='hidden');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now()+1000));
  await page.evaluate(()=>{
    const attach = AsciiTitleSweep.attach;
    window.bands=[];
    const gl=document.querySelector('.ascii-title-sweep').getContext('webgl2');
    const create=gl.createTexture.bind(gl), remove=gl.deleteTexture.bind(gl);
    const live=new Set(); window.textureCount=()=>live.size;
    gl.createTexture=()=>{const texture=create(); live.add(texture); return texture;};
    gl.deleteTexture=texture=>{live.delete(texture); remove(texture);};
    AsciiTitleSweep.attach = options => { const handle=attach(options); bands.push({handle, target:options.to}); return handle; };
  });
  const states=()=>page.evaluate(()=>bands.map(b=>[b.handle.progress(),b.handle.finished(),b.target.isConnected]));
  await page.keyboard.down('ArrowRight'); await page.clock.runFor(176);
  await page.keyboard.down('ArrowRight');
  assert.equal((await states()).length,1,'holding Right must not create another sweep');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowRight'); await page.clock.runFor(112);
  await page.keyboard.down('ArrowLeft'); await page.clock.runFor(112);
  await page.keyboard.down('ArrowLeft');
  assert.equal((await states()).length,3,'holding Left must not create another sweep');
  const first=await states();
  assert.equal(await page.evaluate(()=>textureCount()),6);
  assert.deepEqual(first.map(s=>s.slice(1)),[[false,false],[false,false],[false,true]]);
  await page.evaluate(()=>{
    const gl=document.querySelector('.ascii-title-sweep').getContext('webgl2');
    const original=gl.drawArrays.bind(gl); window.drawDeltas=[];
    function pixels(){const p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;}
    gl.drawArrays=(...args)=>{const before=pixels();original(...args); const after=pixels();drawDeltas.push(after.some((v,i)=>v!==before[i]));};
    window.stopSampling=()=>{gl.drawArrays=original;};
  });
  await page.clock.runFor(16);
  const deltas=await page.evaluate(()=>{stopSampling();return drawDeltas;});
  assert.deepEqual(deltas,[true,true,true],'each band must change the visible framebuffer in the same frame');
  const later=await states();
  assert.ok(later.every(([p],i)=>p>first[i][0]));
  await page.clock.runFor(400);
  assert.deepEqual((await states()).map(s=>s[1]),[true,false,false]);
  assert.equal(await page.evaluate(()=>textureCount()),4);
  await page.clock.runFor(1600);
  assert.equal(await page.evaluate(()=>textureCount()),0);
  assert.ok((await states()).every(s=>s[1]));
  assert.equal(await page.locator('.ascii-title-sweep:visible').count(),0);
  await page.clock.resume();
  await page.locator('.chapter-turn').waitFor({state:'detached'});
  assert.equal(await page.locator('.opener h1').innerText(),await page.evaluate(()=>PLAN.chapters[1].name));
  await page.keyboard.down('ArrowLeft');
  assert.equal((await states()).length,3,'held key must stay ignored after the turn settles');
  await page.keyboard.up('ArrowLeft');
  await page.mouse.wheel(0,450);
  await page.waitForFunction(()=>scrollY>80);
});
