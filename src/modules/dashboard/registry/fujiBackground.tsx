// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- untyped canvas-art module; full typing is out of scope
// @ts-nocheck
import { useEffect, useRef } from "react";
import { dynamicBackgroundDevicePixelRatio } from "./dynamicBackgroundCanvas";
import { useDashboardAnimationActive } from "../view/animationGating";

function useCanvasAnim(draw) {
  const active = useDashboardAnimationActive();
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const ref = useRef(null);
  const activeRef = useRef(active);
  const runtimeRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let elapsed = 0;
    let lastNow = 0;
    const dpr = dynamicBackgroundDevicePixelRatio(window.devicePixelRatio);
    const state = {};

    function resize() {
      const r = parent.getBoundingClientRect();
      w = Math.max(2, Math.floor(r.width));
      h = Math.max(2, Math.floor(r.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (state.onResize) state.onResize(w, h, ctx);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    drawRef.current(ctx, 0, 0, 0, state);
    resize();

    function frame(now) {
      const dt = lastNow ? (now - lastNow) / 1000 : 0;
      lastNow = now;
      elapsed += Math.min(dt, 0.05);
      try { drawRef.current(ctx, w, h, elapsed, state); }
      catch (e) { if (!state.__warned) { console.warn("bg draw error (loop kept alive):", e); state.__warned = true; } }
      raf = activeRef.current ? requestAnimationFrame(frame) : 0;
    }

    function start() {
      if (raf || !activeRef.current) return;
      lastNow = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      lastNow = 0;
    }

    runtimeRef.current = { start, stop };
    if (activeRef.current) start();

    return () => {
      stop();
      ro.disconnect();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    if (active) runtime.start();
    else runtime.stop();
  }, [active]);

  return ref;
}

// ───────── 26. MT. FUJI — calm, photographic, four seasons ─────────
// A realistic Mt. Fuji landscape: graded sky with drifting cumulus + a banner
// cloud raking the peak, the iconic snow-capped concave cone, a forested far
// shore, and a lake that mirrors the whole scene with rippling reflection.
// Soft out-of-focus foliage frames the top corners. The entire palette — sky,
// snow line, slope colour, forest, water, framing foliage and falling
// particles (petals / pollen / leaves / snow) — cross-fades through Spring →
// Summer → Autumn → Winter, holding each season ~60s. (Override the cadence
// with window.__fujiSeasonSeconds for previewing.)

// hex → "r,g,b"; mix two hexes → "r,g,b" so every colour drops into rgb()/rgba()
function _fHx(h){ h = h.replace("#",""); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
function _fLerp(a,b,k){ return a + (b - a) * k; }
function _fMixT(c1,c2,k){ const a=_fHx(c1), b=_fHx(c2); return `${Math.round(_fLerp(a[0],b[0],k))},${Math.round(_fLerp(a[1],b[1],k))},${Math.round(_fLerp(a[2],b[2],k))}`; }
function _fSmooth(x){ x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); }

const FUJI_SEASONS = [
  { // ── Spring: clear blue sky, deep snow cap, fresh green shore, sakura ──
    name:"Spring",
    sky0:"#2f6fb8", sky1:"#6ba6dd", sky2:"#cfe3ef",
    sunHex:"#fff6e2", sunA:0.50,
    rock:"#828ea3", rockLo:"#5d6880", snowShadow:"#dde7f1", snow:0.46,
    forest:"#3e6a30", forestLo:"#274a1f",
    lake0:"#6ba6cf", lake1:"#3f6e96", lake2:"#26506f",
    cloud:"#ffffff", cloudA:0.90,
    pColHex:"#f7c8d8", pDensity:0.60, sunDisc:0.12, ice:0.0, wind:0.5,
  },
  { // ── Summer: hazy violet-blue sky, near-bare dark cone, lush forest ──
    name:"Summer",
    sky0:"#4a5f88", sky1:"#8a9bb6", sky2:"#cdcdbf",
    sunHex:"#fff0d0", sunA:0.35,
    rock:"#6e5d4c", rockLo:"#3c5733", snowShadow:"#d6dde2", snow:0.13,
    forest:"#2c6330", forestLo:"#173b1d",
    lake0:"#5b86a0", lake1:"#3a5e74", lake2:"#26485c",
    cloud:"#f6f2e6", cloudA:0.85,
    pColHex:"#e8e2b8", pDensity:0.0, sunDisc:1.0, ice:0.0, wind:0.22,
  },
  { // ── Autumn: vivid blue sky + clouds, light snow dust, maple framing ──
    name:"Autumn",
    sky0:"#2c74bf", sky1:"#79b3e2", sky2:"#d4e6f1",
    sunHex:"#fff4dd", sunA:0.42,
    rock:"#6b768e", rockLo:"#49546e", snowShadow:"#dde8f1", snow:0.30,
    forest:"#42594a", forestLo:"#293a30",
    lake0:"#5f93c4", lake1:"#3c6c96", lake2:"#244e6e",
    cloud:"#ffffff", cloudA:0.92,
    pColHex:"#e05a28", pDensity:0.50, sunDisc:0.30, ice:0.06, wind:1.0,
  },
  { // ── Winter: crisp sky, fully snow-clad cone, frosted shore, snowfall ──
    name:"Winter",
    sky0:"#2b6fb5", sky1:"#7fb2dd", sky2:"#e3eef5",
    sunHex:"#ffffff", sunA:0.40,
    rock:"#8893a1", rockLo:"#646f7c", snowShadow:"#eef4fa", snow:0.84,
    forest:"#9aaaa3", forestLo:"#6a8077",
    lake0:"#6f9bbf", lake1:"#3f6788", lake2:"#274a63",
    cloud:"#eef4fb", cloudA:0.90,
    pColHex:"#f5faff", pDensity:1.00, sunDisc:0.08, ice:1.0, wind:0.72,
  },
];

function _fMixSeason(A, B, k){
  const C = c => _fMixT(A[c], B[c], k);
  return {
    sky0:C("sky0"), sky1:C("sky1"), sky2:C("sky2"),
    sun:C("sunHex"), sunA:_fLerp(A.sunA,B.sunA,k),
    rock:C("rock"), rockLo:C("rockLo"), snowShadow:C("snowShadow"),
    snow:_fLerp(A.snow,B.snow,k),
    forest:C("forest"), forestLo:C("forestLo"),
    lake0:C("lake0"), lake1:C("lake1"), lake2:C("lake2"),
    cloud:C("cloud"), cloudA:_fLerp(A.cloudA,B.cloudA,k),
    pCol:C("pColHex"), pDensity:_fLerp(A.pDensity,B.pDensity,k),
    sunDisc:_fLerp(A.sunDisc,B.sunDisc,k), ice:_fLerp(A.ice,B.ice,k),
    wind:_fLerp(A.wind,B.wind,k),
  };
}

export function FujiBg() {
  // ── particle styling (0 petals · 1 pollen · 2 leaves · 3 snow) ──
  const configP = (p, style) => {
    p.style = style;
    if (style === 3)      { p.vy=22+Math.random()*30; p.sway=18+Math.random()*16; p.swaySp=0.5+Math.random()*0.7; p.size=1.4+Math.random()*2.4; p.vrot=0; }
    else if (style === 0) { p.vy=26+Math.random()*26; p.sway=22+Math.random()*18; p.swaySp=0.5+Math.random()*0.7; p.size=3.6+Math.random()*4;  p.vrot=(Math.random()-0.5)*2.2; }
    else if (style === 2) { p.vy=34+Math.random()*32; p.sway=26+Math.random()*22; p.swaySp=0.7+Math.random()*0.8; p.size=5.5+Math.random()*5;  p.vrot=(Math.random()-0.5)*3.2; }
    else                  { p.vy=10+Math.random()*14; p.sway=10+Math.random()*10; p.swaySp=0.3+Math.random()*0.4; p.size=1+Math.random()*1.6;  p.vrot=0; }
    p.drift = (Math.random()-0.5) * 9;
  };

  const renderParticle = (ctx, p, P) => {
    const { x, y, size:r, rot, style } = p;
    if (style === 3) {                                   // snow
      ctx.fillStyle = "rgba(248,252,255,0.92)";
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    } else if (style === 0) {                            // sakura petal
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = `rgba(${P.pCol},0.92)`;
      ctx.beginPath(); ctx.ellipse(0, 0, r*0.55, r, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
    } else if (style === 2) {                            // autumn leaf
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, "#f0772a"); g.addColorStop(1, "#bf2e16");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, r*0.5, r, 0, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = "rgba(120,30,10,0.45)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      ctx.restore();
    } else {                                             // pollen mote
      ctx.fillStyle = "rgba(240,236,190,0.7)";
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
  };

  // ── pre-render the soft framing foliage for a season into a blurred layer ──
  const buildFoliage = (idx, W, HY) => {
    const c = document.createElement("canvas"); c.width = W; c.height = HY;
    const g = c.getContext("2d");
    const blossom = (x,y,r) => {
      for (let k=0;k<5;k++){ const a=k/5*6.2832; g.fillStyle="rgba(248,206,222,0.96)";
        g.beginPath(); g.ellipse(x+Math.cos(a)*r*0.7, y+Math.sin(a)*r*0.7, r*0.62, r*0.42, a, 0, 6.2832); g.fill(); }
      g.fillStyle="#ffe08a"; g.beginPath(); g.arc(x,y,r*0.3,0,6.2832); g.fill();
    };
    const gleaf = (x,y,r) => { g.save(); g.translate(x,y); g.rotate(Math.random()*6.2832);
      const grd=g.createLinearGradient(0,-r,0,r); grd.addColorStop(0,"#4f9a45"); grd.addColorStop(1,"#2f6b30");
      g.fillStyle=grd; g.beginPath(); g.ellipse(0,0,r*0.5,r,0,0,6.2832); g.fill(); g.restore(); };
    const mleaf = (x,y,r,c1) => { g.save(); g.translate(x,y); g.rotate(Math.random()*6.2832);
      const grd=g.createLinearGradient(0,-r,0,r); grd.addColorStop(0,c1); grd.addColorStop(1,"#9a2410");
      g.fillStyle=grd; g.beginPath(); const pts=5;
      for(let i=0;i<pts*2;i++){ const ang=i/(pts*2)*6.2832-1.5708; const rad=i%2?r*0.42:r;
        const px=Math.cos(ang)*rad, py=Math.sin(ang)*rad; if(i){g.lineTo(px,py);}else{g.moveTo(px,py);} }
      g.closePath(); g.fill(); g.restore(); };
    const cluster = (bx,by,sc) => {
      const n = 2 + Math.floor(Math.random()*4);
      for (let i=0;i<n;i++){
        const x=bx+(Math.random()-0.5)*26*sc, y=by+(Math.random()-0.5)*26*sc;
        const r=(idx===0?6:idx===2?9:7)*sc*(0.7+Math.random()*0.6);
        if (idx===0) blossom(x,y,r);
        else if (idx===1) gleaf(x,y,r);
        else if (idx===2) mleaf(x,y,r, ["#e0451f","#f08020","#c9301a"][i%3]);
        else { g.fillStyle="rgba(244,250,255,0.92)"; g.beginPath(); g.arc(x,y,r*0.85,0,6.2832); g.fill(); }
      }
    };
    const bez = (p0,p1,p2,p3,u) => { const m=1-u;
      return m*m*m*p0 + 3*m*m*u*p1 + 3*m*u*u*p2 + u*u*u*p3; };
    const branch = (ox, oy, dir) => {
      const ex=ox+dir*W*0.44, ey=oy+HY*0.34;
      const c1x=ox+dir*W*0.12, c1y=oy+HY*0.02, c2x=ox+dir*W*0.24, c2y=oy+HY*0.24;
      g.strokeStyle="#3a2a1e"; g.lineCap="round"; g.lineWidth=11;
      g.beginPath(); g.moveTo(ox,oy); g.bezierCurveTo(c1x,c1y,c2x,c2y,ex,ey); g.stroke();
      g.lineWidth=5;
      const N=16;
      for (let i=1;i<=N;i++){
        const u=i/N;
        const bx=bez(ox,c1x,c2x,ex,u), by=bez(oy,c1y,c2y,ey,u);
        // a couple of twigs
        if (i%3===0){ g.lineWidth=3; g.beginPath(); g.moveTo(bx,by);
          g.lineTo(bx-dir*22*(0.5+Math.random()), by+18*(0.4+Math.random())); g.stroke(); }
        cluster(bx,by, 0.75+0.5*(1-u));
        cluster(bx-dir*18, by+16, 0.6);
      }
    };
    branch(-W*0.015, -HY*0.02, 1);
    branch(W*1.015, -HY*0.02, -1);
    const out = document.createElement("canvas"); out.width=W; out.height=HY;
    const og = out.getContext("2d"); og.filter = "blur(2.4px)"; og.drawImage(c,0,0);
    return out;
  };

  // ── paint the full above-water scene into an offscreen context ──
  const paintScene = (g, W, HY, P, t, s) => {
    // sky
    const sky = g.createLinearGradient(0,0,0,HY);
    sky.addColorStop(0,`rgb(${P.sky0})`); sky.addColorStop(0.55,`rgb(${P.sky1})`); sky.addColorStop(1,`rgb(${P.sky2})`);
    g.fillStyle = sky; g.fillRect(0,0,W,HY);
    // sun glow, upper right
    const sx=W*0.72, sy=HY*0.24;
    const sg=g.createRadialGradient(sx,sy,0,sx,sy,W*0.55);
    sg.addColorStop(0,`rgba(${P.sun},${P.sunA})`); sg.addColorStop(0.5,`rgba(${P.sun},${P.sunA*0.25})`); sg.addColorStop(1,`rgba(${P.sun},0)`);
    g.fillStyle=sg; g.fillRect(0,0,W,HY);
    // bright sun — a defined disc with a radiant corona, strong in summer
    if (P.sunDisc>0.02){
      g.save(); g.globalCompositeOperation="lighter";
      const r=Math.min(W,HY)*0.05;
      const corona=g.createRadialGradient(sx,sy,0,sx,sy,r*6);
      corona.addColorStop(0,`rgba(255,250,235,${0.9*P.sunDisc})`);
      corona.addColorStop(0.14,`rgba(255,244,214,${0.5*P.sunDisc})`);
      corona.addColorStop(0.4,`rgba(255,240,200,${0.16*P.sunDisc})`);
      corona.addColorStop(1,"rgba(255,240,200,0)");
      g.fillStyle=corona; g.beginPath(); g.arc(sx,sy,r*6,0,6.2832); g.fill();
      const disc=g.createRadialGradient(sx,sy,0,sx,sy,r);
      disc.addColorStop(0,`rgba(255,255,252,${P.sunDisc})`);
      disc.addColorStop(0.7,`rgba(255,251,236,${P.sunDisc})`);
      disc.addColorStop(1,`rgba(255,243,210,${0.5*P.sunDisc})`);
      g.fillStyle=disc; g.beginPath(); g.arc(sx,sy,r,0,6.2832); g.fill();
      g.restore();
    }
    // drifting cumulus (behind the peak)
    const cloudPuff = (x,y,scale,a,puffs) => {
      for (let i=0;i<puffs;i++){
        const px=x+Math.cos(i*1.3)*42*scale, py=y+Math.sin(i*2.1)*13*scale;
        const pr=(34+(i%3)*16)*scale;
        const grd=g.createRadialGradient(px,py-pr*0.2,0,px,py,pr);
        grd.addColorStop(0,`rgba(${P.cloud},${a})`); grd.addColorStop(0.6,`rgba(${P.cloud},${a*0.4})`); grd.addColorStop(1,`rgba(${P.cloud},0)`);
        g.fillStyle=grd; g.beginPath(); g.arc(px,py,pr,0,6.2832); g.fill();
      }
    };
    for (const c of s.clouds){
      const span=W+400; let x=((c.x0 + t*c.speed) % span); if (x<0) x+=span; x-=200;
      cloudPuff(x, c.y, c.scale, c.a*P.cloudA, c.puffs);
    }

    // ── Mt. Fuji cone ──
    const cx=W*0.5, peakY=HY*0.12, baseY=HY, half=W*0.46;
    const traceMtn = () => {
      g.beginPath();
      g.moveTo(cx-half, baseY);
      g.bezierCurveTo(cx-half*0.58, baseY-(baseY-peakY)*0.16, cx-W*0.11, peakY+(baseY-peakY)*0.06, cx-W*0.032, peakY);
      g.lineTo(cx+W*0.032, peakY);
      g.bezierCurveTo(cx+W*0.11, peakY+(baseY-peakY)*0.06, cx+half*0.58, baseY-(baseY-peakY)*0.16, cx+half, baseY);
      g.closePath();
    };
    // exposed slope (volcanic rock); erosion gullies etch the bare rock
    traceMtn();
    const rg=g.createLinearGradient(0,peakY,0,baseY);
    rg.addColorStop(0,`rgb(${P.rock})`); rg.addColorStop(0.6,`rgb(${P.rockLo})`); rg.addColorStop(1,`rgb(${P.rockLo})`);
    g.fillStyle=rg; g.fill();
    // faint near-vertical erosion striations on the bare rock (subtle, organic —
    // not a radiating fan). Each follows the slope straight down and fades out.
    g.save(); traceMtn(); g.clip();
    for (let i=0;i<14;i++){
      const fx=(i/13-0.5);                                  // -0.5..0.5 across the cone
      const topX=cx+fx*W*0.04, botX=cx+fx*half*1.7;
      const wob=Math.sin(i*2.3)*W*0.004;
      g.strokeStyle=`rgba(56,70,92,${0.05+0.04*Math.abs(fx)})`;
      g.lineWidth=1+ (i%3===0?1:0);
      g.beginPath(); g.moveTo(topX, peakY+(baseY-peakY)*0.22);
      g.quadraticCurveTo((topX+botX)/2+wob, peakY+(baseY-peakY)*0.6, botX, baseY);
      g.stroke();
    }
    g.restore();

    // ── snow: threshold the snow field by coverage → soft feathered powder that
    //    morphs in place as the season changes (no sliding snowline) ──
    {
      const lw=s.snowLW, lh=s.snowLH, fld=s.field, pwd=s.powder, img=s.snowImg, d=img.data;
      const thr=1.20 - P.snow*1.25, fw=0.05;            // crisp edge, driven by coherent noise
      for (let i=0;i<fld.length;i++){
        const v=fld[i];
        let a=(v-(thr-fw))/(2*fw); a=a<0?0:a>1?1:a; a=a*a*(3-2*a);  // smoothstep edge
        // powder sparkle: a touch of fine texture variation INSIDE the snow body
        // (never punches holes — only modulates near-full alpha slightly)
        if (a>0.85){ a -= (pwd[i]-0.5)*0.18; if(a>1)a=1; if(a<0)a=0; }
        const o=i*4; d[o]=255; d[o+1]=255; d[o+2]=255; d[o+3]=(a*255)|0;
      }
      s.snowLoCtx.putImageData(img,0,0);
      const sc=s.snowSurfCtx;
      sc.clearRect(0,0,W,HY); sc.imageSmoothingEnabled=true;
      sc.globalCompositeOperation="source-over";
      sc.drawImage(s.snowLo, 0,0,lw,lh, 0,0,W,HY);      // light smoothing → crisp clumps, no static
      sc.globalCompositeOperation="source-atop";         // tint/shade the snow only
      const sgr=sc.createLinearGradient(0,peakY,0,baseY);
      sgr.addColorStop(0,"rgb(255,255,255)"); sgr.addColorStop(0.65,`rgb(${P.snowShadow})`); sgr.addColorStop(1,`rgb(${P.snowShadow})`);
      sc.fillStyle=sgr; sc.fillRect(0,0,W,HY);
      const ls=sc.createLinearGradient(cx-half,0,cx+half,0);
      ls.addColorStop(0,"rgba(64,84,116,0.42)"); ls.addColorStop(0.5,"rgba(64,84,116,0)"); ls.addColorStop(1,"rgba(255,250,235,0.14)");
      sc.fillStyle=ls; sc.fillRect(cx-half,peakY,half*2,baseY-peakY);
      sc.globalCompositeOperation="source-over";
      g.save(); traceMtn(); g.clip(); g.drawImage(s.snowSurf, 0, 0); g.restore();
    }

    // atmospheric haze pushing the cone base into the distance
    const hz=g.createLinearGradient(0,HY-HY*0.36,0,HY);
    hz.addColorStop(0,`rgba(${P.sky2},0)`); hz.addColorStop(1,`rgba(${P.sky2},0.66)`);
    g.fillStyle=hz; g.fillRect(0,HY-HY*0.36,W,HY*0.36);

    // forested far shore along the waterline
    const fy = HY - HY*0.05;
    g.beginPath(); g.moveTo(0,HY); g.lineTo(0,fy);
    for (let x=0;x<=W;x+=12){ const yy=fy - (Math.sin(x*0.05)*4 + Math.sin(x*0.13+2)*5 + Math.sin(x*0.31)*2); g.lineTo(x,yy); }
    g.lineTo(W,HY); g.closePath();
    const fgr=g.createLinearGradient(0,fy-22,0,HY);
    fgr.addColorStop(0,`rgb(${P.forest})`); fgr.addColorStop(1,`rgb(${P.forestLo})`);
    g.fillStyle=fgr; g.fill();
  };

  // ── lake: base water + flipped, rippled, fading reflection + sparkle ──
  const paintLake = (ctx, W, H, HY, P, t, s) => {
    const frozen=P.ice;                                   // 0 open water → 1 solid ice
    const lg=ctx.createLinearGradient(0,HY,0,H);
    lg.addColorStop(0,`rgb(${P.lake0})`); lg.addColorStop(0.5,`rgb(${P.lake1})`); lg.addColorStop(1,`rgb(${P.lake2})`);
    ctx.fillStyle=lg; ctx.fillRect(0,HY,W,H-HY);
    const lakeH=H-HY, comp=0.92, SLICE=2;
    const rippleMul=1-0.75*frozen;                        // ice barely ripples
    for (let y=HY; y<H; y+=SLICE){
      const depth=(y-HY)/lakeH;
      const fade=0.62*(1-depth*1.15)*(1-0.7*frozen);      // ice reflects far less
      if (fade<=0.01) break;
      const yp=HY-(y-HY)/comp; if (yp<0) break;
      const fr=HY-1-yp;
      const amp=(1.5 + depth*depth*16)*rippleMul;
      const dx=Math.sin(y*0.05+t*1.3)*amp + Math.sin(y*0.11-t*0.8)*amp*0.4;
      ctx.globalAlpha=fade;
      ctx.drawImage(s.skyFlip, 0, Math.max(0,fr), W, SLICE, dx, y, W, SLICE);
    }
    ctx.globalAlpha=1;
    // shimmering specular ripples (open water only)
    if (frozen<0.95){
      ctx.globalCompositeOperation="lighter";
      for (const rp of s.ripples){
        const y=HY + rp.d*lakeH;
        let x=((rp.x + t*rp.sp) % 1.2); if (x<0) x+=1.2; x=(x-0.1)*W;
        const tw=Math.sin(t*rp.tw+rp.ph); const a=rp.a*(0.35+0.65*tw*tw)*(0.3+0.7*rp.d)*(1-frozen);
        ctx.strokeStyle=`rgba(255,255,255,${a*0.5})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+rp.len*(0.5+rp.d), y); ctx.stroke();
      }
      ctx.globalCompositeOperation="source-over";
    }
    // ── winter: lay the frozen ice sheet over the water ──
    if (frozen>0.01 && s.iceLayer){
      ctx.globalAlpha=frozen;
      ctx.drawImage(s.iceLayer, 0, 0, W, s.iceLakeH, 0, HY, W, lakeH);
      ctx.globalAlpha=1;
      // a cold sheen sweeping the ice + twinkling frost sparkles
      const sheen=ctx.createLinearGradient(0,HY,W,H);
      sheen.addColorStop(0,"rgba(255,255,255,0)"); sheen.addColorStop(0.5,`rgba(255,255,255,${0.10*frozen})`); sheen.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle=sheen; ctx.fillRect(0,HY,W,lakeH);
      ctx.globalCompositeOperation="lighter";
      for (const sp of s.iceSparks){
        const tw=Math.sin(t*sp.sp+sp.ph); if (tw<=0) continue;
        ctx.globalAlpha=tw*tw*frozen;
        ctx.fillStyle="rgba(245,251,255,0.9)";
        ctx.beginPath(); ctx.arc(sp.x, HY+sp.y, sp.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
    }
    // soft waterline / ice edge
    const wl=ctx.createLinearGradient(0,HY-2,0,HY+4);
    wl.addColorStop(0,"rgba(255,255,255,0)"); wl.addColorStop(0.5,`rgba(255,255,255,${0.18+0.3*frozen})`); wl.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=wl; ctx.fillRect(0,HY-2,W,6);
  };

  const paintFoliage = (ctx, W, HY, s, cur, nxt, mixk, t, wind) => {
    // gusty breeze: layered sines give an organic swell-and-lull, never steady.
    const gust = 0.55 + 0.45*Math.sin(t*0.55) + 0.22*Math.sin(t*1.7+1.3) + 0.12*Math.sin(t*3.1+0.6);
    const w = wind * Math.max(0, gust);
    const sway = (Math.sin(t*0.9) + 0.35*Math.sin(t*2.2+0.8)) * 7 * w;   // horizontal swing
    const bob  = Math.cos(t*0.8) * 2.2 * w;                              // slight vertical bob
    const shear= (Math.sin(t*0.9) + 0.3*Math.sin(t*2.2+0.8)) * 0.022 * w; // tips move more than base
    const drawLayer = (canvas, a) => {
      ctx.save();
      ctx.globalAlpha = a;
      // shear pivots at the top edge (the branch anchor): x += shear*y, so the
      // hanging leaf tips sway further than the rooted base — like a real branch.
      // transform() composes onto the existing dpr matrix (don't use setTransform).
      ctx.translate(sway, bob);
      ctx.transform(1, 0, shear, 1, 0, 0);
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    };
    drawLayer(s.foliage[cur], 1-mixk);
    if (mixk>0) drawLayer(s.foliage[nxt], mixk);
  };

  // ── summer sunlight: soft volumetric ray cone from the sun down onto the lake ──
  const paintSunRays = (ctx, W, H, HY, P, t) => {
    const amt = P.sunDisc;
    if (amt < 0.06) return;
    const sx = W*0.72, sy = HY*0.24;          // sun position (matches paintScene)
    const reach = (H - sy) * 1.2;
    const base = Math.PI*0.6;                  // fan downward, slightly toward the lake centre
    const beams = 7;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(3px)";                  // soften the cone edges into haze
    for (let i=0;i<beams;i++){
      const f = i/(beams-1) - 0.5;             // -0.5 .. 0.5
      const ang = base + f*0.52 + Math.sin(t*0.25 + i)*0.008;     // slow drift
      const halfW = 0.026 + 0.018*Math.abs(f);
      const flick = 0.55 + 0.45*Math.sin(t*0.6 + i*1.7);          // gentle shimmer
      const a = amt * 0.05 * flick * (1 - Math.abs(f)*0.45);
      const a1 = ang - halfW, a2 = ang + halfW;
      const grad = ctx.createLinearGradient(sx, sy, sx+Math.cos(ang)*reach, sy+Math.sin(ang)*reach);
      grad.addColorStop(0, `rgba(255,248,222,${a})`);
      grad.addColorStop(0.45, `rgba(255,246,216,${a*0.5})`);
      grad.addColorStop(1, "rgba(255,246,216,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx+Math.cos(a1)*reach, sy+Math.sin(a1)*reach);
      ctx.lineTo(sx+Math.cos(a2)*reach, sy+Math.sin(a2)*reach);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  const updateParticles = (ctx, W, H, HY, P, target, t, dt, s, wind) => {
    const dens=P.pDensity;
    // same gusty breeze as the foliage, pushing petals/leaves/snow downwind
    const gust = 0.55 + 0.45*Math.sin(t*0.55) + 0.22*Math.sin(t*1.7+1.3) + 0.12*Math.sin(t*3.1+0.6);
    const windPush = wind * Math.max(0, gust) * 46;
    for (const p of s.parts){
      const active = p.rank < dens;
      if (active && !p.wasActive){ p.y=-12-Math.random()*HY*0.5; p.x=Math.random()*W; configP(p, target); }
      p.wasActive=active;
      if (!active) continue;
      p.y += p.vy*dt;
      p.x += (Math.sin(t*p.swaySp+p.ph)*p.sway + p.drift + windPush)*dt;
      p.rot += (p.vrot + windPush*0.01)*dt;
      if (p.y>H+14 || p.x>W+20){ p.y=-12; p.x=Math.random()*W - windPush*0.3; configP(p, target); }
      renderParticle(ctx, p, P);
    }
  };

  const draw = (ctx, w, h, t, s) => {
    s.onResize = (nw, nh) => {
      if (nw<2 || nh<2) return;
      s.W=nw; s.H=nh; s.waterY=Math.round(nh*0.62);
      const HY=s.waterY;
      s.sky=document.createElement("canvas"); s.sky.width=nw; s.sky.height=HY; s.skyCtx=s.sky.getContext("2d");
      s.skyFlip=document.createElement("canvas"); s.skyFlip.width=nw; s.skyFlip.height=HY; s.flipCtx=s.skyFlip.getContext("2d");
      s.clouds=Array.from({length:Math.max(6,Math.floor(nw/180))},()=>({
        x0:Math.random()*(nw+400)-200, y:HY*(0.08+Math.random()*0.42),
        scale:0.6+Math.random()*1.1, speed:4+Math.random()*8, a:0.5+Math.random()*0.4,
        puffs:3+Math.floor(Math.random()*3),
      }));
      s.ridges=Array.from({length:6},()=>({ x:Math.random(), w:nw*(0.01+Math.random()*0.02), depth:0.04+Math.random()*0.10 }));
      // snow field for the cone — a low-res grayscale "snowiness" potential
      // (elevation + soft noise + gully fingers). Each frame it's thresholded by
      // the season's coverage, so snow edges feather into powder and the cap
      // MORPHS in place between seasons instead of a snowline sliding downhill.
      {
        const cx=nw*0.5, peakY=HY*0.12, baseY=HY, half=nw*0.46;
        const SCALE=2;
        const lw=Math.max(2,Math.ceil(nw/SCALE)), lh=Math.max(2,Math.ceil(HY/SCALE));
        s.snowLW=lw; s.snowLH=lh;
        s.snowLo=document.createElement("canvas"); s.snowLo.width=lw; s.snowLo.height=lh; s.snowLoCtx=s.snowLo.getContext("2d");
        s.snowImg=s.snowLoCtx.createImageData(lw,lh);
        s.snowSurf=document.createElement("canvas"); s.snowSurf.width=nw; s.snowSurf.height=HY; s.snowSurfCtx=s.snowSurf.getContext("2d");
        const blur=(arr)=>{ const out=new Float32Array(arr.length);
          for(let y=0;y<lh;y++) for(let x=0;x<lw;x++){ let a=0,c=0;
            for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const xx=x+dx,yy=y+dy; if(xx<0||yy<0||xx>=lw||yy>=lh) continue; a+=arr[yy*lw+xx]; c++; }
            out[y*lw+x]=a/c; } return out; };
        const mkNoise=(passes)=>{ let n=new Float32Array(lw*lh); for(let i=0;i<n.length;i++) n[i]=Math.random(); for(let p=0;p<passes;p++) n=blur(n); return n; };
        // two coherent octaves: coarse blobs shape the overall edge, medium octave
        // breaks it into clumps. NO per-pixel grain → organic, not salt-and-pepper.
        const coarse=mkNoise(4), mid=mkNoise(2);
        // a separate fine, lightly-blurred field for powder sparkle INSIDE the snow
        s.powder=mkNoise(1);
        s.field=new Float32Array(lw*lh);
        for(let y=0;y<lh;y++) for(let x=0;x<lw;x++){
          const fx=x*SCALE, fy=y*SCALE;
          const e=Math.max(0,Math.min(1,(baseY-fy)/(baseY-peakY)));      // 1 at peak → 0 at base
          let finger=0; for(const r of s.ridges){ const rx=cx-half + r.x*half*2; const ww=r.w*0.8; finger+=Math.exp(-((fx-rx)*(fx-rx))/(2*ww*ww)); }
          finger=Math.min(1,finger);
          const coh=(coarse[y*lw+x]-0.5)*0.5 + (mid[y*lw+x]-0.5)*0.34;   // coherent edge wobble
          s.field[y*lw+x] = Math.pow(e,1.45)*1.18 + coh + finger*e*0.32;
        }
      }
      s.foliage=[0,1,2,3].map(i=>buildFoliage(i,nw,HY));
      s.ripples=Array.from({length:Math.max(40,Math.floor(nw/12))},()=>({
        x:Math.random()*1.2, d:Math.random(), len:20+Math.random()*60,
        ph:Math.random()*6.2832, sp:0.02+Math.random()*0.05, tw:0.6+Math.random()*1.4, a:0.3+Math.random()*0.5,
      }));
      // ── winter ice sheet overlay (built once; faded in by "frozen" factor) ──
      {
        const lakeH=nh-HY;
        const ic=document.createElement("canvas"); ic.width=nw; ic.height=lakeH;
        const g=ic.getContext("2d");
        // pale, faintly luminous ice: frostier near the shore, bluer toward us
        const base=g.createLinearGradient(0,0,0,lakeH);
        base.addColorStop(0,"rgba(228,240,250,0.95)");
        base.addColorStop(0.35,"rgba(201,221,238,0.92)");
        base.addColorStop(1,"rgba(170,196,219,0.96)");
        g.fillStyle=base; g.fillRect(0,0,nw,lakeH);
        // patchy frost mottling
        for(let i=0;i<70;i++){ const x=Math.random()*nw,y=Math.random()*lakeH,r=20+Math.random()*90;
          const gr=g.createRadialGradient(x,y,0,x,y,r);
          const w=Math.random()<0.5; gr.addColorStop(0,`rgba(${w?'255,255,255':'150,178,205'},${0.05+Math.random()*0.1})`); gr.addColorStop(1,"rgba(255,255,255,0)");
          g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); }
        // fracture cracks — branching polylines, drawn as a dark groove + light highlight
        const crack=(x,y,ang,len,depth)=>{
          if(depth<=0||len<8) return;
          const steps=Math.max(2,Math.floor(len/14)); let px=x,py=y,a=ang;
          const pts=[[px,py]];
          for(let i=0;i<steps;i++){ a+=(Math.random()-0.5)*0.5; px+=Math.cos(a)*len/steps; py+=Math.sin(a)*len/steps; pts.push([px,py]); }
          g.lineCap="round";
          g.strokeStyle="rgba(120,150,176,0.45)"; g.lineWidth=depth*0.6+0.4;
          g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(const p of pts) g.lineTo(p[0],p[1]); g.stroke();
          g.strokeStyle="rgba(248,253,255,0.6)"; g.lineWidth=Math.max(0.5,depth*0.3);
          g.beginPath(); g.moveTo(pts[0][0]+0.6,pts[0][1]+0.6); for(const p of pts) g.lineTo(p[0]+0.6,p[1]+0.6); g.stroke();
          if(Math.random()<0.8){ const bi=1+Math.floor(Math.random()*(pts.length-1));
            crack(pts[bi][0],pts[bi][1], a+(Math.random()<0.5?1:-1)*(0.5+Math.random()*0.6), len*0.6, depth-1); }
        };
        const nc=Math.max(5,Math.floor(nw/220));
        for(let i=0;i<nc;i++) crack(Math.random()*nw, lakeH*(0.1+Math.random()*0.7), Math.random()*6.2832, 70+Math.random()*150, 3);
        // frost ferns creeping down from the shoreline (top edge)
        const fern=(x,y,ang,len,depth)=>{
          if(depth<=0||len<3) return; const x2=x+Math.cos(ang)*len, y2=y+Math.sin(ang)*len;
          g.strokeStyle=`rgba(236,246,255,0.3)`; g.lineWidth=Math.max(0.3,depth*0.22);
          g.beginPath(); g.moveTo(x,y); g.lineTo(x2,y2); g.stroke();
          const br=2+depth; for(let i=1;i<br;i++){ const f=i/br; const bx=x+Math.cos(ang)*len*f, by=y+Math.sin(ang)*len*f; const sp=0.5+Math.random()*0.4;
            fern(bx,by,ang-sp,len*0.5*(1-f*0.4),depth-1); fern(bx,by,ang+sp,len*0.5*(1-f*0.4),depth-1); } };
        g.save();
        const nf2=Math.max(10,Math.floor(nw/64));
        for(let i=0;i<nf2;i++){ const x=Math.random()*nw; const L=10+Math.random()*22;
          fern(x,0, Math.PI/2+(Math.random()-0.5)*1.1, L, 3+Math.floor(Math.random()*2)); }
        g.restore();
        // a soft frost band hugging the shoreline so the edge reads as frozen, not blobby
        const fb=g.createLinearGradient(0,0,0,lakeH*0.22);
        fb.addColorStop(0,"rgba(240,248,255,0.55)"); fb.addColorStop(1,"rgba(240,248,255,0)");
        g.fillStyle=fb; g.fillRect(0,0,nw,lakeH*0.22);
        s.iceLayer=ic; s.iceLakeH=lakeH;
        s.iceSparks=Array.from({length:Math.max(30,Math.floor(nw/14))},()=>({ x:Math.random()*nw, y:Math.random()*lakeH, r:0.6+Math.random()*1.6, sp:1.2+Math.random()*3, ph:Math.random()*6.2832 }));
      }
      const count=Math.max(120,Math.min(300,Math.floor((nw*nh)/8000)));
      s.parts=Array.from({length:count},()=>{ const p={ x:Math.random()*nw, y:Math.random()*nh, ph:Math.random()*6.2832, rot:Math.random()*6.2832, rank:Math.random(), wasActive:false }; configP(p,0); return p; });
      s.last=t;
    };
    if (!s.sky) return;
    const dt=Math.min(0.05, t-(s.last ?? t)); s.last=t;
    const W=s.W, H=s.H, HY=s.waterY;
    if (![W,H,HY].every(Number.isFinite) || W<=0 || H<=0) return;

    // season phase: hold ~SEASON sec, cross-fade over the tail TR sec
    const SEASON=(window.__fujiSeasonSeconds || 60);
    const TR=Math.min(SEASON*0.12, 7);
    const L=SEASON*4;
    const pos=(t % L)/SEASON;
    let cur=Math.floor(pos)%4, nxt=(cur+1)%4;
    const frac=pos-Math.floor(pos);
    const trFrac=TR/SEASON;
    let mixk = frac>1-trFrac ? _fSmooth((frac-(1-trFrac))/trFrac) : 0;
    // preview hook: window.__fujiForceSeason = 0|1|2|3 pins a season (Spring..Winter)
    if (Number.isInteger(window.__fujiForceSeason)){ cur=((window.__fujiForceSeason%4)+4)%4; nxt=cur; mixk=0; }
    const P=_fMixSeason(FUJI_SEASONS[cur], FUJI_SEASONS[nxt], mixk);
    const target = mixk<0.5 ? cur : nxt;

    // 1. paint scene offscreen, 2. build its vertical mirror for the lake
    paintScene(s.skyCtx, W, HY, P, t, s);
    const fg=s.flipCtx; fg.clearRect(0,0,W,HY);
    fg.save(); fg.translate(0,HY); fg.scale(1,-1); fg.drawImage(s.sky,0,0); fg.restore();

    // 3. composite
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(s.sky, 0, 0, W, HY);
    paintLake(ctx, W, H, HY, P, t, s);
    paintSunRays(ctx, W, H, HY, P, t);
    paintFoliage(ctx, W, HY, s, cur, nxt, mixk, t, P.wind);
    updateParticles(ctx, W, H, HY, P, target, t, dt, s, P.wind);

    // 4. soft photographic vignette
    const vg=ctx.createRadialGradient(W*0.5,H*0.46,Math.min(W,H)*0.2, W*0.5,H*0.5,Math.max(W,H)*0.75);
    vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(8,16,28,0.28)");
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  };
  const ref = useCanvasAnim(draw);
  return <canvas ref={ref} className="bg-canvas" style={{background:"#2f6fb8"}}/>;
}
