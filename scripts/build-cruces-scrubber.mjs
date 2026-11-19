import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ESPN_TO_DB = { RSA: 'ZAF', HAI: 'HTI', URY: 'URU' };

const wc = JSON.parse(readFileSync(new URL('../data/world-cup-2026.json', import.meta.url)));
const meta = new Map(wc.groups.flatMap(g => g.teams).map(t => [t.code, t]));
const flagOf = (code) => meta.get(ESPN_TO_DB[code] ?? code)?.flag ?? null;

const { data: teams } = await sb.from('teams').select('name, fifa_code');
const nameByCode = new Map(teams.map(t => [t.fifa_code, t.name]));
const espName = (ab) => nameByCode.get(ESPN_TO_DB[ab] ?? ab) ?? null;
const getJson = async (u) => (await fetch(u, { cache: 'no-store' })).json();

const st = await getJson('https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026');
const sv = (e, n) => e.stats.find(s => s.name === n)?.value ?? 0;
const groups = st.children.map(g => ({
  label: g.name.replace('Group', 'Grupo'),
  complete: g.standings.entries.every(e => sv(e, 'gamesPlayed') >= 3),
  rows: g.standings.entries.map(e => ({
    rank: sv(e, 'rank'),
    name: espName(e.team.abbreviation) ?? e.team.displayName,
    flag: flagOf(e.team.abbreviation) ?? '',
    pj: sv(e, 'gamesPlayed'), dg: sv(e, 'pointDifferential'), pts: sv(e, 'points'), adv: sv(e, 'advanced') === 1,
  })).sort((a, b) => a.rank - b.rank),
}));

const slot = (c) => {
  const ab = c.team?.abbreviation ?? '', dn = c.team?.displayName ?? '';
  const r = espName(ab);
  if (r) return { t: r, flag: flagOf(ab) ?? '', res: true };
  let m = ab.match(/^1([A-L])$/); if (m) return { t: `Ganador Grupo ${m[1]}`, res: false };
  m = ab.match(/^2([A-L])$/); if (m) return { t: `2º Grupo ${m[1]}`, res: false };
  if (ab === '3RD' || /3rd place/i.test(dn)) { const gm = dn.match(/Group ([A-L/]+)/); return { t: `3º (${gm ? gm[1] : '?'})`, res: false }; }
  return { t: 'Por definir', res: false };
};
const sbd = await getJson('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260628-20260720&limit=80');
const ROUNDS = [['16vos', ['round-of-32']], ['8vos', ['round-of-16']], ['4tos', ['quarterfinals']], ['Semis', ['semifinals']], ['Final', ['final', '3rd-place-match']]];
const rounds = ROUNDS.map(([label, slugs]) => ({
  label,
  matches: sbd.events.filter(e => slugs.includes(e.season?.slug || '')).sort((a, b) => a.date.localeCompare(b.date)).map(e => {
    const cc = e.competitions[0].competitors;
    const h = slot(cc.find(x => x.homeAway === 'home')), a = slot(cc.find(x => x.homeAway === 'away'));
    const third = (e.season?.slug || '') === '3rd-place-match';
    return { date: e.date, title: third ? '3er puesto' : null, third, h, a };
  }),
}));

const DATA = { groups, rounds };

const html = `<title>Cruces · scrubber</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#05070b;--surface:#0f151d;--surface2:#151d28;--text:#f8fbff;--text2:#b7c0cf;--text3:#7f8999;
  --gold:#d8ff56;--gold-dk:#0d1117;--amber:#f5c542;--live:#ff5547;
  --line:rgba(255,255,255,.09);--line2:rgba(255,255,255,.16);
  --font-body:"Inter",-apple-system,system-ui,sans-serif;--font-accent:"Barlow Condensed","Arial Narrow",sans-serif;
  color-scheme:dark;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);overscroll-behavior:none;-webkit-user-select:none;user-select:none;}
.shell{max-width:480px;margin:0 auto;height:100%;display:flex;flex-direction:column;}
.hdr{padding:12px 16px 6px;flex:0 0 auto;}
.hdr-top{display:flex;align-items:center;height:40px;margin-bottom:8px;}
.closeb{width:40px;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:1px solid var(--line);color:var(--text);cursor:pointer;flex:0 0 auto;transition:background .15s;}
.closeb:hover{background:rgba(255,255,255,.12);}
.closeb svg{width:17px;height:17px;}
.eyebrow{margin:0;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:var(--text3);font-weight:600;}
.h1{margin:1px 0 0;font-family:var(--font-accent);font-size:2.1rem;font-weight:800;letter-spacing:-.01em;}
.sel{padding:6px 16px 8px;flex:0 0 auto;}
.sel-labels{display:flex;}
.sel-labels span{flex:1;text-align:center;font-size:.64rem;font-weight:700;letter-spacing:.03em;color:var(--text3);text-transform:uppercase;transition:color .25s;}
.sel-labels span.on{color:var(--text);}
.sel-track{position:relative;display:flex;margin-top:6px;height:44px;background:var(--surface);border-radius:13px;border:1px solid var(--line);}
.lens{position:absolute;top:-1px;left:0;height:calc(100% + 2px);border-radius:13px;background:rgba(255,255,255,.11);border:1px solid var(--line2);box-shadow:0 4px 14px rgba(0,0,0,.32);will-change:transform;touch-action:none;cursor:grab;}
.lens:active{cursor:grabbing;}
.lens .chev{position:absolute;top:50%;transform:translateY(-50%);color:var(--text2);font-size:.9rem;font-weight:700;width:22px;height:100%;display:flex;align-items:center;justify-content:center;}
.lens .chev.l{left:0;}.lens .chev.r{right:0;}
.glyph{flex:1;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;cursor:pointer;}
.bars{display:flex;flex-direction:column;gap:2.5px;align-items:center;}
.bars i{display:block;height:2.5px;border-radius:2px;background:var(--text3);transition:background .25s;}
.glyph.on .bars i{background:var(--text);}
.trophy{font-size:1.05rem;filter:grayscale(1) opacity(.55);transition:filter .25s;}
.glyph.on .trophy{filter:none;}
.vp{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;position:relative;touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.vp::-webkit-scrollbar{display:none;width:0;height:0;}
.strip{position:relative;will-change:transform;}
.svg-conn{position:absolute;top:0;left:0;pointer-events:none;z-index:0;transition:opacity .2s ease;}
.col{position:absolute;top:0;z-index:1;overflow:hidden;}
.strip.ready .col.knock .mc{transition:top .34s cubic-bezier(.22,1,.36,1);}
.col.grp{padding:8px 7px 90px;}
.col.knock{padding:0;}
.gt{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:11px 11px 5px;margin-bottom:9px;}
.gt-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.gt-h b{font-family:var(--font-accent);font-size:.98rem;font-weight:700;}
.gt-h s{font-size:.56rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);text-decoration:none;font-weight:600;}
.gt-h s.live{color:var(--gold);}
table{width:100%;border-collapse:collapse;font-size:.76rem;}
td{padding:5px 3px;border-top:1px solid var(--line);color:var(--text2);text-align:center;}
td.n{width:16px;color:var(--text3);font-weight:700;font-family:var(--font-accent);}
td.fl{width:18px;font-size:.95rem;}
td.t{text-align:left;color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:74px;}
td.p{color:var(--text);font-weight:700;width:20px;font-family:var(--font-accent);font-size:.9rem;}
tr.q td.n{color:var(--gold);position:relative;}
tr.q td.n::before,tr.m td.n::before{content:"";position:absolute;left:-4px;top:50%;transform:translateY(-50%);width:3px;height:13px;border-radius:2px;}
tr.q td.n::before{background:var(--gold);}
tr.m td.n::before{background:var(--amber);}
tr.o td{color:var(--text3);}tr.o td.t{color:var(--text3);font-weight:500;}
.adv{display:inline-block;width:5px;height:5px;border-radius:9px;background:var(--gold);margin-left:5px;vertical-align:middle;}
.mc{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:9px 11px;display:flex;flex-direction:column;justify-content:center;}
.col.knock .mc{position:absolute;left:7px;right:7px;margin:0;}
.mc.set{border-color:rgba(216,255,86,.20);background:color-mix(in srgb,var(--surface) 92%,var(--gold) 8%);}
.mc-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;}
.mc-d{font-size:.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:600;}
.mc-t{font-size:.58rem;color:var(--gold);text-transform:uppercase;letter-spacing:.04em;font-weight:700;}
.s{display:flex;align-items:center;gap:8px;padding:2px 0;}
.s .av{width:19px;height:19px;border-radius:10px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:1rem;}
.s .av.empty{border:1px solid var(--line2);background:var(--surface2);}
.s .nm{font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.s.team .nm{color:var(--text);}.s.pend .nm{color:var(--text3);font-weight:500;}
</style>
<div class="shell">
  <div class="hdr">
    <div class="hdr-top"><button class="closeb" aria-label="Cerrar" onclick="history.length>1?history.back():null"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <p class="eyebrow">Camino al título</p><h1 class="h1">Cruces</h1>
  </div>
  <div class="sel">
    <div class="sel-labels" id="labels"></div>
    <div class="sel-track" id="track"><div class="lens" id="lens"><span class="chev l">‹</span><span class="chev r">›</span></div></div>
  </div>
  <div class="vp" id="vp"><div class="strip" id="strip"></div></div>
</div>
<script>
const DATA=${JSON.stringify(DATA)};
const STAGES=["Grupos","16vos","8vos","4tos","Semis","Final"];
const BARS=[5,4,3,2,1];
const DF=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'});
const fmt=iso=>DF.format(new Date(iso)).replace(/\\./g,'');
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const posCls=r=>r<=2?'q':r===3?'m':'o';

function groupsCol(){
  return DATA.groups.map(g=>\`<div class="gt"><div class="gt-h"><b>\${esc(g.label)}</b><s class="\${g.complete?'':'live'}">\${g.complete?'cerrado':'en curso'}</s></div><table>\${g.rows.map(r=>\`<tr class="\${posCls(r.rank)}"><td class="n">\${r.rank}</td><td class="fl">\${r.flag||''}</td><td class="t">\${esc(r.name)}\${r.adv?'<span class=adv></span>':''}</td><td>\${r.dg>0?'+'+r.dg:r.dg}</td><td class="p">\${r.pts}</td></tr>\`).join('')}</table></div>\`).join('');
}
function slotHtml(s){const av=s.res&&s.flag?\`<span class="av">\${s.flag}</span>\`:'<span class="av empty"></span>';return \`<div class="s \${s.res?'team':'pend'}">\${av}<span class="nm">\${esc(s.t)}</span></div>\`;}
function roundCol(r){return r.matches.map(m=>\`<div class="mc \${m.h.res&&m.a.res?'set':''}" data-third="\${m.third?1:0}"><div class="mc-h"><span class="mc-d">\${esc(fmt(m.date))}</span>\${m.title?\`<span class="mc-t">\${esc(m.title)}</span>\`:''}</div>\${slotHtml(m.h)}\${slotHtml(m.a)}</div>\`).join('');}

const labels=document.getElementById('labels'),track=document.getElementById('track'),lens=document.getElementById('lens'),strip=document.getElementById('strip'),vp=document.getElementById('vp');
STAGES.forEach((s,i)=>{
  const sp=document.createElement('span');sp.textContent=s;labels.appendChild(sp);
  const g=document.createElement('div');g.className='glyph';g.dataset.i=i;
  if(i<5){const b=document.createElement('div');b.className='bars';for(let k=0;k<BARS[i];k++){const li=document.createElement('i');li.style.width=(15-k*1.4)+'px';b.appendChild(li);}g.appendChild(b);}
  else{const t=document.createElement('div');t.className='trophy';t.textContent='🏆';g.appendChild(t);}
  track.appendChild(g);
});
const SVGNS='http://www.w3.org/2000/svg';
const svg=document.createElementNS(SVGNS,'svg');svg.setAttribute('class','svg-conn');strip.appendChild(svg);
STAGES.forEach((s,i)=>{const col=document.createElement('div');col.className='col '+(i===0?'grp':'knock');col.dataset.ri=i-1;col.innerHTML=(i===0?groupsCol():roundCol(DATA.rounds[i-1]));strip.appendChild(col);});

const NPAIRS=STAGES.length-1;
let pair=0,x=0,vx=0,target=0,raf=null,colW=0,step=0,slot=0;const gap=10;
const CARD_H=82,VGAP=16,UNIT=CARD_H+VGAP,TOP_PAD=10;
const cl=(i)=>TOP_PAD+i*UNIT+CARD_H/2;
const colLeft=(i)=>i*step;
const colAt=(ci)=>strip.children[ci+1];

function layoutCols(){
  [...strip.querySelectorAll('.col.knock')].forEach(col=>{
    const ri=+col.dataset.ri;
    [...col.querySelectorAll('.mc')].forEach((card,k)=>{
      card.style.height=CARD_H+'px';
      let yy;
      if(ri===4){yy=card.dataset.third==='1'?cl(0)+3*UNIT:cl(0);}
      else yy=cl(k);
      card.style.top=(yy-CARD_H/2)+'px';card.dataset.cy=yy;
    });
  });
}
function bottomOf(ci){
  const col=colAt(ci);if(!col)return 0;
  if(col.classList.contains('grp'))return col.scrollHeight;
  let mx=0;[...col.querySelectorAll('.mc')].forEach(c=>{mx=Math.max(mx,parseFloat(c.dataset.cy||0)+CARD_H/2);});
  return mx;
}
function relayout(p){
  layoutCols();
  const rc=colAt(p+1),lcCol=colAt(p);
  if(rc&&rc.classList.contains('knock')&&lcCol&&lcCol.classList.contains('knock')){
    const ri=+rc.dataset.ri;
    [...rc.querySelectorAll('.mc')].forEach((card,k)=>{
      let yy;
      if(ri===4){yy=card.dataset.third==='1'?cl(0)+3*UNIT:(cl(0)+cl(1))/2;}
      else yy=(cl(2*k)+cl(2*k+1))/2;
      card.style.top=(yy-CARD_H/2)+'px';card.dataset.cy=yy;
    });
  }
  const h=Math.max(bottomOf(p),bottomOf(p+1))+40;
  strip.style.height=h+'px';
  [...strip.querySelectorAll('.col')].forEach(c=>{c.style.height=h+'px';});
  svg.style.opacity='0';
  drawConn(p,h);
  requestAnimationFrame(()=>{svg.style.opacity='1';});
  vp.scrollTop=0;
}
function drawConn(p,h){
  svg.setAttribute('width',6*step);svg.setAttribute('height',h);
  let d='';
  const lc=colAt(p),rc=colAt(p+1);
  if(lc&&rc&&lc.classList.contains('knock')&&rc.classList.contains('knock')){
    const lcards=[...lc.querySelectorAll('.mc')],rcards=[...rc.querySelectorAll('.mc')];
    const leftRight=colLeft(p)+colW-7,rightLeft=colLeft(p+1)+7,midX=(leftRight+rightLeft)/2;
    rcards.forEach((card,k)=>{
      if(card.dataset.third==='1')return;
      const a=lcards[2*k],b=lcards[2*k+1];if(!a||!b)return;
      const fa=parseFloat(a.dataset.cy),fb=parseFloat(b.dataset.cy),pc=parseFloat(card.dataset.cy);
      d+=\`M\${leftRight} \${fa}H\${midX}M\${leftRight} \${fb}H\${midX}M\${midX} \${fa}V\${fb}M\${midX} \${pc}H\${rightLeft}\`;
    });
  }
  svg.innerHTML='<path d="'+d+'" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>';
}

function measure(){
  const w=vp.clientWidth;colW=Math.floor((w-gap)/2);step=colW+gap;slot=track.clientWidth/STAGES.length;
  strip.style.width=(6*step)+'px';
  lens.style.width=(slot*2)+'px';
  [...strip.querySelectorAll('.col')].forEach((c,i)=>{c.style.left=colLeft(i)+'px';c.style.width=colW+'px';});
  relayout(pair);
  target=-pair*step;x=target;render();updateLabels();
}
function clampPair(p){return Math.max(0,Math.min(NPAIRS-1,p));}
function setPair(p,vel){pair=clampPair(p);relayout(pair);target=-pair*step;if(vel!==undefined)vx=vel;start();updateLabels();}
function updateLabels(){[...labels.children].forEach((l,i)=>l.classList.toggle('on',i===pair||i===pair+1));[...track.querySelectorAll('.glyph')].forEach(g=>{const i=+g.dataset.i;g.classList.toggle('on',i===pair||i===pair+1);});}

const STIFF=300,DAMP=34;
function tick(){
  const dt=1/60,f=-STIFF*(x-target)-DAMP*vx;vx+=f*dt;x+=vx*dt;render();
  if(Math.abs(x-target)<0.3&&Math.abs(vx)<0.3){x=target;vx=0;render();raf=null;return;}
  raf=requestAnimationFrame(tick);
}
function start(){if(!raf)raf=requestAnimationFrame(tick);}
function setX(nx){const min=-(NPAIRS-1)*step;if(nx>0)nx*=0.4;else if(nx<min)nx=min+(nx-min)*0.4;x=nx;render();}
function render(){strip.style.transform='translate3d('+x+'px,0,0)';const frac=step?(-x/step):0;lens.style.transform='translate3d('+(frac*slot)+'px,0,0)';}
function snap(vel){const proj=x+vel*0.12;setPair(clampPair(Math.round(-proj/step)),vel);}

[...track.querySelectorAll('.glyph')].forEach(g=>g.addEventListener('click',()=>setPair(+g.dataset.i)));

let ds=null;
function dragStart(e,fromLens){ds={x0:x,px:e.clientX,py:e.clientY,h:fromLens?true:null,lastX:e.clientX,lastT:performance.now(),v:0,fromLens,moved:false};if(raf){cancelAnimationFrame(raf);raf=null;}}
function dragMove(e){
  if(!ds)return;const dx=e.clientX-ds.px,dy=e.clientY-ds.py;
  if(ds.h===null){if(Math.abs(dx)>7||Math.abs(dy)>7){ds.h=Math.abs(dx)>Math.abs(dy);if(ds.h){try{vp.setPointerCapture(e.pointerId);}catch(_){}}}}
  if(!ds.h)return;
  e.preventDefault();if(Math.abs(dx)>4)ds.moved=true;
  setX(ds.x0+(ds.fromLens?-(dx/slot)*step:dx));
  const now=performance.now(),dt=now-ds.lastT;if(dt>0){const inst=(e.clientX-ds.lastX)/dt*1000;ds.v=ds.v*0.6+inst*0.4;}ds.lastX=e.clientX;ds.lastT=now;
}
function dragEnd(){if(!ds)return;const wasH=ds.h,v=ds.fromLens?-ds.v:ds.v,moved=ds.moved;ds=null;if(wasH&&moved)snap(v);else if(wasH)start();}

vp.addEventListener('pointerdown',e=>dragStart(e,false));
vp.addEventListener('pointermove',dragMove);
vp.addEventListener('pointerup',dragEnd);
vp.addEventListener('pointercancel',dragEnd);

lens.addEventListener('pointerdown',e=>{e.stopPropagation();try{lens.setPointerCapture(e.pointerId);}catch(_){}dragStart(e,true);});
lens.addEventListener('pointermove',e=>{if(ds&&ds.fromLens)dragMove(e);});
lens.addEventListener('pointerup',e=>{const tap=ds&&!ds.moved,t=e.target.classList;if(tap&&t.contains('chev')){setPair(t.contains('l')?pair-1:pair+1);ds=null;return;}dragEnd();});
lens.addEventListener('pointercancel',dragEnd);

window.addEventListener('resize',measure);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
measure();
requestAnimationFrame(()=>strip.classList.add('ready'));
</script>`;

const out = process.argv[2] || 'previews/cruces-scrubber.html';
writeFileSync(out, html);
console.log('Escrito:', out, '| grupos:', groups.length, '| rondas:', rounds.map(r => r.label + '(' + r.matches.length + ')').join(' '));
