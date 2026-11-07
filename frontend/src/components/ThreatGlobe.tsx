import { useEffect, useRef, useState } from 'react';
import { Pause, Play, ShieldCheck, MoveUpRight } from 'lucide-react';

// Geographic silhouettes projected onto a rotating three-dimensional sphere.
const land = [
  [[-168,70],[-135,72],[-125,60],[-110,58],[-98,50],[-66,48],[-53,53],[-62,35],[-82,25],[-87,15],[-105,22],[-117,32],[-126,48],[-150,58]],
  [[-80,12],[-65,10],[-50,0],[-35,-7],[-42,-23],[-54,-35],[-68,-55],[-76,-38],[-70,-18],[-81,-4]],
  [[-52,60],[-42,60],[-20,76],[-40,83],[-58,76]],
  [[-18,35],[5,37],[26,31],[35,12],[50,10],[42,-12],[30,-34],[18,-35],[10,-14],[-2,4],[-17,15]],
  [[-10,36],[-10,58],[5,60],[15,72],[40,69],[58,56],[85,72],[130,70],[170,62],[150,47],[132,33],[120,22],[108,4],[95,6],[79,8],[70,26],[49,30],[36,42],[25,36],[16,45],[2,43]],
  [[112,-11],[136,-12],[153,-24],[146,-39],[128,-33],[113,-25]],
  [[47,-13],[50,-17],[47,-26],[44,-24]], [[130,33],[142,45],[145,39],[137,32]],
];
function isLand(lon: number, lat: number) {
  return land.some(poly => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}
const points: { lat: number; lon: number; land: boolean }[] = [];
for (let lat = -76; lat <= 80; lat += 2.5) {
  for (let lon = -180; lon < 180; lon += 2.5 / Math.cos(lat * Math.PI / 180)) {
    points.push({ lat: lat * Math.PI / 180, lon: lon * Math.PI / 180, land: isLand(lon, lat) });
  }
}

export function ThreatGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = media.matches;
    const onMotion = () => { reduced = media.matches; };
    media.addEventListener('change', onMotion);
    let size = 600, frame = 0, rotation = -0.38, last = 0, visible = true;
    const resize = new ResizeObserver(([entry]) => {
      size = entry.contentRect.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr; canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(canvas);
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden || time - last < 32) return;
      const delta = Math.min(time - last, 60); last = time;
      if (!paused && !reduced) rotation += delta * 0.000055;
      ctx.clearRect(0, 0, size, size);
      const r = size * 0.335, cx = size / 2, cy = size * 0.49;
      const project = (lat: number, lon: number, scale = 1) => {
        const a = lon + rotation + pointer.current.x * 0.16;
        const x = Math.cos(lat) * Math.sin(a);
        const y = -Math.sin(lat), z = Math.cos(lat) * Math.cos(a);
        const tilt = -0.13 + pointer.current.y * 0.08;
        return { x: cx + x * r * scale, y: cy + (y * Math.cos(tilt) - z * Math.sin(tilt)) * r * scale, z: y * Math.sin(tilt) + z * Math.cos(tilt) };
      };
      const halo = ctx.createRadialGradient(cx, cy, r * .8, cx, cy, r * 1.45);
      halo.addColorStop(0, 'rgba(172,222,92,.10)'); halo.addColorStop(.55, 'rgba(157,207,74,.035)'); halo.addColorStop(1, 'rgba(157,207,74,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, size, size);
      const sphere = ctx.createRadialGradient(cx - r * .5, cy - r * .5, 0, cx, cy, r);
      sphere.addColorStop(0, '#202b1e'); sphere.addColorStop(.65, '#10180f'); sphere.addColorStop(1, '#090e0c');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = sphere; ctx.fill();
      ctx.strokeStyle = 'rgba(184,230,123,.2)'; ctx.lineWidth = .8; ctx.stroke();
      for (const p of points) {
        const q = project(p.lat, p.lon);
        if (q.z < 0) continue;
        ctx.beginPath(); ctx.arc(q.x, q.y, p.land ? .65 + q.z * .7 : .45, 0, Math.PI * 2);
        ctx.fillStyle = p.land ? `rgba(190,224,145,${.16 + q.z * .68})` : `rgba(116,145,101,${.06 + q.z * .13})`;
        ctx.fill();
      }
      // Delicate orbital rings and packets, projected in 3D rather than flat circles.
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= 180; i++) {
          const a = i / 180 * Math.PI * 2;
          const lat = Math.sin(a) * (.35 + ring * .32);
          const q = project(lat, a + ring * 1.8, 1.16 + ring * .095);
          if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.strokeStyle = `rgba(184,222,137,${.16 - ring * .025})`; ctx.lineWidth = .7; ctx.stroke();
        const a = rotation * (ring + 2) + ring * 2;
        const q = project(Math.sin(a) * (.35 + ring * .32), a + ring * 1.8, 1.16 + ring * .095);
        ctx.shadowColor = '#c7ff82'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#d3ffab'; ctx.beginPath(); ctx.arc(q.x, q.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      [[.67,.1],[.3,1.1],[-.35,.55]].forEach(([lat, lon], i) => {
        const q = project(lat, lon);
        if (q.z < 0) return;
        ctx.strokeStyle = i === 1 ? 'rgba(247,158,108,.5)' : 'rgba(200,248,140,.45)';
        ctx.fillStyle = i === 1 ? '#f3ad81' : '#d1fa9a';
        ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(q.x, q.y, 8 + (reduced || paused ? 0 : (time / 130 + i * 4) % 10), 0, Math.PI * 2); ctx.stroke();
      });
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); media.removeEventListener('change', onMotion); };
  }, [paused]);

  return <div className="globe-scene" onPointerMove={e => {
    const b = e.currentTarget.getBoundingClientRect();
    pointer.current = { x: (e.clientX - b.left) / b.width - .5, y: (e.clientY - b.top) / b.height - .5 };
  }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}>
    <div className="scene-coordinate coord-top">GLOBAL INTELLIGENCE NETWORK <span>01 / 03</span></div>
    <canvas ref={canvasRef} className="threat-globe" role="img" aria-label="Animated three-dimensional globe with orbiting security signals. Decorative network visualization." />
    <div className="globe-label label-one"><span className="signal-dot" /><span>THREAT INTELLIGENCE<br /><strong>Beyond the surface.</strong></span><MoveUpRight size={14} /></div>
    <div className="globe-label label-two"><ShieldCheck size={23} /><span>360° VISIBILITY<br /><strong>Every signal. Connected.</strong></span></div>
    <div className="scene-bottom"><span><i /> NETWORK VISUALIZATION</span><button onClick={() => setPaused(!paused)} aria-label={paused ? 'Play globe animation' : 'Pause globe animation'}>{paused ? <Play size={13} /> : <Pause size={13} />}</button></div>
  </div>;
}
