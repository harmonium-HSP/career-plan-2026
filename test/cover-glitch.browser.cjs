// Real Edge; set SWEEP_PREVIEW to a local static server as for title-sweep.browser.cjs.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright-core');

test('cover cadence, transition boundaries, independent viewport pixels and re-entry', {skip:!process.env.SWEEP_PREVIEW}, async t => {
  const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
  t.after(() => browser.close());
  const page = await browser.newPage({viewport:{width:800,height:600}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    sessionStorage.setItem('career-plan-2026-state',JSON.stringify({index:0}));
    window.events=[];
    new MutationObserver(records=>{for(const rec of records){
      for(const node of rec.addedNodes){ if(node.className!=='cover-glitch') continue;
        const rect=node.getBoundingClientRect(); events.push({kind:'start',time:performance.now(),viewport:rect.width===document.documentElement.clientWidth && rect.height===innerHeight});
        if(window.action) {const fn=window.action; window.action=null; fn();}
      }
      for(const node of rec.removedNodes) if(node.className==='cover-glitch')events.push({kind:'end',time:performance.now()});
    }}).observe(document,{childList:true,subtree:true});
  });
  await page.coverage.startJSCoverage();
  await page.goto(process.env.SWEEP_PREVIEW);
  const waitStarts=n=>page.waitForFunction(n=>events.filter(x=>x.kind==='start').length>=n,n,{timeout:12000});
  const starts=()=>page.evaluate(()=>events.filter(x=>x.kind==='start'));
  const waitTurn=()=>page.waitForFunction(()=>!document.querySelector('.chapter-turn') && document.querySelector('.opener h1').textContent===PLAN.chapters[1].name);
  await page.waitForFunction(()=>document.querySelector('#startup-wall').hidden);
  await page.waitForTimeout(3100); await page.keyboard.press('ArrowRight'); await waitTurn();
  await page.waitForTimeout(3100); assert.equal((await starts()).length,0);
  await page.mouse.wheel(0,320); await page.waitForFunction(()=>scrollY>10);
  await page.waitForTimeout(4200); assert.equal((await starts()).length,0);
  await page.keyboard.press('Escape'); await page.waitForFunction(()=>scrollY===0 && document.querySelector('#curtain').hidden);
  const returned=await page.evaluate(()=>performance.now());
  await waitStarts(1); assert.ok((await starts())[0].time-returned>3400);
  await page.evaluate(()=>window.action=()=>{
    const rect=document.querySelector('#prev').getBoundingClientRect();
    document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2).click();
  });
  await waitStarts(2);
  await page.waitForFunction(()=>document.querySelector('.chapter-turn') && document.querySelector('body > .cover-glitch'));
  const s=await starts(); assert.ok(s[1].time-s[0].time>3750 && s[1].time-s[0].time<4250,JSON.stringify(s));
  await page.waitForFunction(()=>!document.querySelector('.chapter-turn') && document.querySelector('.opener h1').textContent===PLAN.chapters[0].name);
  const settled=await page.evaluate(()=>performance.now());
  await page.evaluate(()=>window.action=()=>window.scrollTo(0,240));
  await waitStarts(3); assert.ok((await starts())[2].time-settled>3750);
  await page.waitForFunction(()=>scrollY>10 && document.querySelector('body > .cover-glitch'));
  await page.waitForFunction(()=>!document.querySelector('.cover-glitch'));
  const events=await page.evaluate(()=>window.events);
  assert.ok(s.every(e=>e.viewport));
  for(const [i,end] of events.filter(e=>e.kind==='end').entries()) {
    const duration=end.time-events.filter(e=>e.kind==='start')[i].time;
    assert.ok(duration>=300 && duration<=600,`burst lasted ${duration}ms`);
  }
  t.diagnostic('Start intervals (ms): '+(s[1].time-s[0].time).toFixed(1));
  await page.emulateMedia({reducedMotion:'reduce'}); await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForTimeout(4200); assert.equal((await starts()).length,3);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForTimeout(4100); assert.equal((await starts()).length,3);
  await page.evaluate(()=>{delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));});
  const foreground=await page.evaluate(()=>performance.now());
  await waitStarts(4); assert.ok((await starts())[3].time-foreground>3800);
  const coverage=(await page.coverage.stopJSCoverage()).find(entry=>entry.url.endsWith('/cover-glitch.js'));
  const hit=new Uint8Array(coverage.source.length);
  const ranges=coverage.functions.flatMap(fn=>fn.ranges).sort((a,b)=>(b.endOffset-b.startOffset)-(a.endOffset-a.startOffset));
  for(const r of ranges) hit.fill(Number(r.count>0),r.startOffset,r.endOffset);
  const percent=100*hit.reduce((sum,n)=>sum+n,0)/hit.length;
  t.diagnostic(`Edge executed ${percent.toFixed(1)}% of cover-glitch.js source bytes`);
  assert.ok(percent>=80);
  assert.deepEqual(errors,[]);
});

// Compare final composited screenshots, not the contents of an effect canvas.
// Locate the source of each green-channel output row on the photo first, then
// independently require that same translation on the foreground shape's edges.
test('same viewport slices move real text, controls and photo', {skip:!process.env.SWEEP_PREVIEW}, async t => {
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1000,height:700}});
  await page.addInitScript(()=>{sessionStorage.setItem('career-plan-2026-state',JSON.stringify({index:1}));});
  await page.goto(process.env.SWEEP_PREVIEW);
  await page.waitForFunction(()=>document.querySelector('#startup-wall').hidden && getComputedStyle(document.querySelector('.opener-reveal')).opacity==='1' && !document.querySelector('.cover-glitch'));
  await page.waitForTimeout(400);
  const selectors=['.opener h1','.opener-index','.opener .opener-reveal > p:last-child','#prev','#next','#dock .dock-card'];
  const areas=await page.evaluate(sels=>sels.map((sel,i)=>{
    const el=document.querySelector(sel); const range=document.createRange(); range.selectNodeContents(el);
    const b=i<3?range.getBoundingClientRect():el.getBoundingClientRect();
    return [Math.floor(b.left),Math.floor(b.top),Math.ceil(b.right),Math.ceil(b.bottom)];
  }),selectors);
  await page.evaluate(()=>{
    const next=requestAnimationFrame;
    window.requestAnimationFrame=cb=>next.call(window,ts=>{if(cb.name!=='draw' || !document.querySelector('body > .cover-glitch'))cb(ts);});
  });
  await page.waitForSelector('body > .cover-glitch',{state:'attached'});
  const after=(await page.screenshot()).toString('base64');
  // Neutral offsets preserve the same compositor and text-antialiasing path.
  // Subtract an independently painted controls-hidden frame to isolate glyph edges.
  await page.evaluate(()=>document.querySelectorAll('.cover-glitch feOffset').forEach(node=>node.setAttribute('dx',0)));
  const before=(await page.screenshot()).toString('base64');
  await page.addStyleTag({content:selectors.join(',')+'{visibility:hidden !important}'});
  await page.evaluate(()=>{document.querySelector('#bend-host')?.requestPaint(); window.dispatchEvent(new Event('scroll'));});
  await page.waitForTimeout(150);
  const bare=(await page.screenshot()).toString('base64');
  const scores=await page.evaluate(async ([before,after,bare,areas])=>{
    async function decode(data){const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;}
    const [a,b,background]=await Promise.all([before,after,bare].map(decode));
    function error(y,xs,d,ch){let err=0;for(const x of xs)err+=Math.abs(a[(1000*y+x)*4+ch]-b[(1000*y+x+d)*4+ch]);return err/xs.length;}
    const dx=Array.from({length:81},(_,i)=>i-40);
    let whiteEdgeHoles=0;
    for(let y=0;y<700;y++){
      for(const x of [0,999]){
        const k=(1000*y+x)*4;
        const wasDark=Math.max(a[k],a[k+1],a[k+2])<180;
        const nowWhite=b[k]===255 && b[k+1]===255 && b[k+2]===255;
        if(wasDark && nowWhite) whiteEdgeHoles++;
      }
    }
    const regions=areas.map(([l,top,r,bottom])=>{
      let rows=0,edges=0,rgbRows=0; const shifts=new Set();
      for(let y=top;y<bottom;y++){
        const bg=Array.from({length:110},(_,i)=>52+i);
        const shift=ch=>dx.reduce((best,v)=>error(y,bg,v,ch)<error(y,bg,best,ch)?v:best,0);
        const [red,green,blue]=[0,1,2].map(shift);
        const ch=Math.abs(green)>=3?1:(Math.abs(red)>=3?0:2);
        const d=[red,green,blue][ch];
        if(Math.abs(d)<3 || error(y,bg,d,ch)>2)continue;
        const fg=[];for(let x=l;x<r;x++){const j=(1000*y+x)*4+ch;if(Math.abs(a[j]-background[j])>12 && (Math.abs(a[j]-a[j-4])>6 || Math.abs(a[j]-a[j+4])>6))fg.push(x);}
        if(fg.length<1 || error(y,fg,d,ch)>3 || error(y,fg,0,ch)<8)continue;
        rows++;edges+=fg.length;shifts.add(d);
        if(new Set([red,green,blue]).size>=2 && error(y,fg,red,0)<4 && error(y,fg,green,1)<4 && error(y,fg,blue,2)<4)rgbRows++;
      }return {rows,edges,rgbRows,shifts:[...shifts]};
    });
    return {regions,whiteEdgeHoles};
  },[before,after,bare,areas]);
  t.diagnostic(JSON.stringify({whiteEdgeHoles:scores.whiteEdgeHoles,regions:Object.fromEntries(selectors.map((s,i)=>[s,scores.regions[i]]))}));
  assert.equal(scores.whiteEdgeHoles,0,`unexpected white edge cutouts: ${scores.whiteEdgeHoles}`);
  assert.ok(scores.regions.every(s=>s.rows>=1 && s.rgbRows>=1),JSON.stringify(scores.regions));
});

test('consecutive bursts randomize slice geometry, RGB/color grading, and 2D corrupted blocks', {skip:!process.env.SWEEP_PREVIEW}, async t => {
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--enable-unsafe-swiftshader']});
  t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1000,height:700}});
  await page.addInitScript(()=>{
    sessionStorage.setItem('career-plan-2026-state',JSON.stringify({index:1}));
    window.bursts=[];
    new MutationObserver(records=>{
      for(const rec of records){
        for(const node of rec.addedNodes){
          if(node.className!=='cover-glitch') continue;
          const record={initial:null,mid:null};
          window.bursts.push(record);
          const snap=()=>{
            const bands=[...document.querySelectorAll('.cover-glitch [data-glitch-role="band"]')].filter(n=>Number(n.getAttribute('height'))>0).map(n=>`${n.getAttribute('y')}:${n.getAttribute('height')}:${n.getAttribute('dx')}`);
            const rgb=[...document.querySelectorAll('.cover-glitch [data-glitch-role="rgb"]')].map(n=>`${n.getAttribute('dx')},${n.getAttribute('dy')||0}`);
            const grade=document.querySelector('.cover-glitch [data-glitch-role="grade"]')?.getAttribute('values')||'';
            const blocks=[...document.querySelectorAll('.cover-glitch [data-glitch-role="block"]')].filter(n=>Number(n.getAttribute('width'))>0 && Number(n.getAttribute('height'))>0).map(n=>`${n.getAttribute('x')},${n.getAttribute('y')},${n.getAttribute('width')},${n.getAttribute('height')},${n.getAttribute('dx')},${n.getAttribute('dy')||0}`);
            return {bands,rgb,grade,blocks};
          };
          requestAnimationFrame(()=>{ record.initial=snap(); });
          setTimeout(()=>{ if(document.querySelector('body > .cover-glitch')) record.mid=snap(); },120);
        }
      }
    }).observe(document,{childList:true,subtree:true});
  });
  await page.goto(process.env.SWEEP_PREVIEW);
  await page.waitForFunction(()=>document.querySelector('#startup-wall').hidden && getComputedStyle(document.querySelector('.opener-reveal')).opacity==='1');
  await page.waitForFunction(()=>window.bursts.length>=3 && window.bursts[2].mid!==null,{timeout:20000});
  const captured=await page.evaluate(()=>window.bursts.slice(0,3));
  const geometries=new Set(captured.map(b=>b.initial.bands.map(s=>s.split(':').slice(0,2).join(':')).join('|')));
  const chromatic=new Set(captured.map(b=>`${b.initial.rgb.join('|')}#${b.initial.grade}`));
  const midBlocks=captured.filter(b=>b.mid && b.mid.blocks.length>=1);
  t.diagnostic(JSON.stringify({uniqueGeometries:geometries.size,uniqueChromatic:chromatic.size,midBlocksCounts:captured.map(b=>b.mid?.blocks.length||0)}));
  assert.ok(geometries.size>=2,'consecutive bursts should not reuse identical slice geometry');
  assert.ok(chromatic.size>=2,'consecutive bursts should not reuse identical RGB/color grading');
  assert.ok(midBlocks.length>=2,'mid-burst frames should show localized 2D corrupted blocks');
});

