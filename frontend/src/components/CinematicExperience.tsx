import { useEffect, useRef, useState } from 'react';
import { Shield, Pause, Play } from 'lucide-react';

/** Decorative motion only: never intercepts scrolling, focus or application input. */
export function CinematicExperience() {
  const [motionPaused, setMotionPaused] = useState(() => sessionStorage.getItem('cybertrust-motion') === 'paused');
  useEffect(() => {
    document.documentElement.dataset.motion = motionPaused ? 'paused' : 'playing';
    sessionStorage.setItem('cybertrust-motion', motionPaused ? 'paused' : 'playing');
  }, [motionPaused]);
  const cursor = useRef<HTMLDivElement>(null);
  const ripple = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState(() => !sessionStorage.getItem('cybertrust-intro-seen') && !matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (!intro) return;
    sessionStorage.setItem('cybertrust-intro-seen', '1');
    const timer = window.setTimeout(() => setIntro(false), 1900);
    return () => clearTimeout(timer);
  }, [intro]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(pointer: fine)');
    const reduced = () => media.matches || document.documentElement.dataset.motion === 'paused';
    let frame = 0;
    let scrollFrame = 0;
    let lightPanel: HTMLElement | null = null;
    const seen = new WeakSet<Element>();
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        reveal.unobserve(entry.target);
      }
    }, { threshold: 0.04, rootMargin: '0px 0px -30px 0px' });
    const discover = () => {
      document.querySelectorAll('main > section:not(.hero-section):not(#relationship-graph), main > div:not(.report-section), .report-section > div, .site-footer').forEach(el => {
        if (seen.has(el)) return;
        seen.add(el); el.classList.add('cinema-reveal'); reveal.observe(el);
      });
      document.querySelectorAll('.scanner-panel, .globe-label, #platform-overview .grid > div, #scam-dna > div, #blockchain-trust > div, #incident-guidance > div').forEach(el => el.classList.add('cinema-glass'));
    };
    discover();
    const mutation = new MutationObserver(discover);
    const main = document.querySelector('main');
    if (main) mutation.observe(main, { childList: true, subtree: true });

    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !fine.matches || reduced()) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = event.target instanceof Element ? event.target : null;
        if (cursor.current) {
          cursor.current.style.left = `${event.clientX}px`;
          cursor.current.style.top = `${event.clientY}px`;
          cursor.current.classList.add('is-visible');
          cursor.current.classList.toggle('is-hovering', !!target?.closest('a,button,[role="button"],.react-flow__node'));
          cursor.current.classList.toggle('is-writing', !!target?.closest('input,textarea,select'));
        }
        const panel = target?.closest<HTMLElement>('.cinema-glass, .main-nav a, .header-cta');
        if (lightPanel && lightPanel !== panel) lightPanel.classList.remove('has-light');
        lightPanel = panel || null;
        if (panel) {
          const bounds = panel.getBoundingClientRect();
          panel.style.setProperty('--light-x', `${event.clientX - bounds.left}px`);
          panel.style.setProperty('--light-y', `${event.clientY - bounds.top}px`);
          panel.classList.add('has-light');
        }
      });
    };
    const leave = () => cursor.current?.classList.remove('is-visible');
    const press = (event: PointerEvent) => {
      cursor.current?.classList.add('is-pressed');
      if (reduced() || !ripple.current) return;
      ripple.current.style.left = `${event.clientX}px`;
      ripple.current.style.top = `${event.clientY}px`;
      ripple.current.getAnimations().forEach(animation => animation.cancel());
      ripple.current.animate([{ transform: 'translate(-50%, -50%) scale(.4)', opacity: .65 }, { transform: 'translate(-50%, -50%) scale(2.8)', opacity: 0 }], { duration: 550, easing: 'cubic-bezier(.2,.8,.2,1)' });
    };
    const release = () => cursor.current?.classList.remove('is-pressed');
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const distance = document.documentElement.scrollHeight - innerHeight;
        if (progress.current) progress.current.style.transform = `scaleX(${distance > 0 ? scrollY / distance : 0})`;
        document.querySelector('.site-header')?.classList.toggle('is-scrolled', scrollY > 30);
      });
    };
    const onMotion = () => { if (reduced()) { leave(); setIntro(false); } };
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    document.addEventListener('pointerdown', press, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('blur', leave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    media.addEventListener('change', onMotion);
    onScroll();
    return () => {
      reveal.disconnect(); mutation.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame);
      document.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerdown', press); document.removeEventListener('pointerup', release);
      window.removeEventListener('blur', leave); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll);
      media.removeEventListener('change', onMotion);
    };
  }, []);

  return <>
    <button className="motion-control" onClick={() => setMotionPaused(value => !value)} aria-label={motionPaused ? 'Play decorative motion' : 'Pause decorative motion'} aria-pressed={motionPaused}>
      {motionPaused ? <Play size={12} /> : <Pause size={12} />} <span>{motionPaused ? 'Motion paused' : 'Pause motion'}</span>
    </button>
    <div className="cinema-atmosphere" aria-hidden="true"><i /><i /><div className="cinema-grid" /></div>
    <div ref={progress} className="cinema-progress" aria-hidden="true" />
    <div ref={cursor} className="cinema-cursor" aria-hidden="true"><Shield size={15} strokeWidth={1.3} /><i /></div>
    <div ref={ripple} className="cinema-ripple" aria-hidden="true" />
    {intro && <div className="cinema-intro" aria-hidden="true">
      <div className="intro-orbit"><span /><span /><div className="intro-emblem"><Shield size={46} strokeWidth={1} /></div></div>
      <div className="intro-wordmark">cybertrust<span>360</span></div>
      <div className="intro-caption">YOUR DIGITAL WORLD. PROTECTED FROM EVERY ANGLE.</div>
      <div className="intro-line" />
      <div className="intro-signature">AN EXPERIENCE BY TECHNIX PRO</div>
    </div>}
  </>;
}
