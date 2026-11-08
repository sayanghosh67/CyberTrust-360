import { useEffect, useRef, useState } from 'react';
import { createSculptureRenderer, type SceneVariant } from '../graphics/sculptureRenderer';
import { SecuritySculpture } from './SecuritySculpture';

/** Responsive WebGL geometry. No raster textures: sharp on high-density and 4K screens. */
export function OrbitalScene({ variant = 'hero', className = '' }: { variant?: SceneVariant; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const element = stage.current, target = canvas.current;
    if (!element || !target) return;
    let renderer: ReturnType<typeof createSculptureRenderer> = null;
    let disposed = false;
    let frame = 0, last = 0, time = 0, visible = false, dirty = true;
    let px = 0, py = 0, tx = 0, ty = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const paused = () => motion.matches || document.documentElement.dataset.motion === 'paused';
    const start = () => {
      if (!frame && visible && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
    };
    const tick = (stamp: number) => {
      frame = 0;
      if (!visible || document.hidden || disposed) return;
      const still = paused();
      if (stamp - last >= 32 || dirty) {
        const delta = Math.min(stamp - last, 50); last = stamp;
        if (!still) { time += delta; px += (tx-px)*.06; py += (ty-py)*.06; }
        if (renderer && (!still || dirty)) renderer.render(time, px, py);
        dirty = false;
      }
      if (!still) start();
    };
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const dpr = Math.min(devicePixelRatio || 1, width > 1400 ? 1.5 : 2);
      target.width = Math.max(1,Math.round(width*dpr)); target.height = Math.max(1,Math.round(height*dpr));
      dirty = true; start();
    });
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      element.classList.toggle('scene-visible', visible);
      // Allocate GPU resources only once this sculpture approaches the viewport.
      if (visible && !renderer && !disposed) {
        try { renderer = createSculptureRenderer(target, variant); } catch { renderer = null; }
        if (!renderer) { disposed = true; setFallback(true); return; }
      }
      if (visible) { last = performance.now(); dirty = true; start(); }
      else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: '80px' });
    intersection.observe(element);
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || paused()) return;
      const b = element.getBoundingClientRect();
      tx = (event.clientX-b.left)/b.width-.5; ty = (event.clientY-b.top)/b.height-.5;
    };
    const leave = () => { tx=0; ty=0; };
    const update = () => { dirty=true; start(); };
    const motionObserver = new MutationObserver(update);
    motionObserver.observe(document.documentElement, { attributes:true, attributeFilter:['data-motion'] });
    const lost = (event: Event) => { event.preventDefault(); disposed = true; setFallback(true); cancelAnimationFrame(frame); frame=0; };
    element.addEventListener('pointermove',move,{passive:true}); element.addEventListener('pointerleave',leave);
    target.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',update); motion.addEventListener('change',update);
    return () => {
      disposed=true; cancelAnimationFrame(frame); intersection.disconnect(); resize.disconnect(); motionObserver.disconnect();
      element.removeEventListener('pointermove',move); element.removeEventListener('pointerleave',leave);
      target.removeEventListener('webglcontextlost',lost); document.removeEventListener('visibilitychange',update); motion.removeEventListener('change',update);
      renderer?.dispose();
    };
  }, [variant]);
  return <div ref={stage} className={`orbital-scene orbital-${variant} ${className}`} aria-hidden="true">
    <div className="orbital-aura" /><div className="orbital-floor" />
    {fallback ? <SecuritySculpture variant="orbit" className="orbital-fallback" /> : <canvas ref={canvas} className="orbital-canvas" />}
    <div className="scene-spark spark-a" /><div className="scene-spark spark-b" /><div className="scene-spark spark-c" />
  </div>;
}
