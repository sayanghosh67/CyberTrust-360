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
    const reduced = () => media.matches || document.documentElement.dataset.motion === 'paused';
    let frame = 0;
    let scrollFrame = 0;
    let lightPanel: HTMLElement | null = null;
    let clientX = -100;
    let clientY = -100;
    let lastScrollY = window.scrollY;
    let scrollDirection: 'up' | 'down' = 'down';
    const sections = new Map<HTMLElement, { visible: boolean; entered: boolean; animation: Animation | null }>();
    const depthTargets = new Set<HTMLElement>();
    const observedDepth = new Set<HTMLElement>();

    // Re-arm only after a section has left the viewport completely. Tall workbenches
    // remain stable while someone reads, types, or interacts with their controls.
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const state = sections.get(element);
        if (!state) continue;
        if (!entry.isIntersecting) {
          state.visible = false;
          state.animation?.cancel();
          state.animation = null;
          element.classList.remove('is-revealed');
          continue;
        }
        if (state.visible) continue;
        state.visible = true;
        element.classList.add('is-revealed');
        element.dataset.revealDirection = scrollDirection;
        const initialHero = !state.entered && !!element.closest('#home');
        state.entered = true;
        if (reduced() || initialHero || element.contains(document.activeElement)) continue;
        state.animation?.cancel();
        state.animation = element.animate([
          { opacity: 0, transform: `translate3d(0, ${scrollDirection === 'up' ? -34 : 34}px, 0) scale(.992)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        ], { duration: 780, easing: 'cubic-bezier(.2,.75,.2,1)' });
      }
    }, { threshold: 0, rootMargin: '-85px 0px -24px 0px' });

    const depth = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) depthTargets.add(element);
        else depthTargets.delete(element);
      }
      onScroll();
    }, { rootMargin: '60px' });

    const discover = () => {
      for (const [element, state] of sections) if (!element.isConnected) {
        state.animation?.cancel(); reveal.unobserve(element); sections.delete(element);
      }
      for (const element of observedDepth) if (!element.isConnected) {
        depth.unobserve(element); observedDepth.delete(element); depthTargets.delete(element);
      }
      document.querySelectorAll<HTMLElement>('main > section:not(.hero-section):not(#relationship-graph), main > div:not(.report-section), .report-section > div, .hero-copy, .hero-earth-stage, #relationship-graph > .artwork-heading, .site-footer').forEach(element => {
        if (sections.has(element)) return;
        sections.set(element, { visible: false, entered: false, animation: null });
        element.classList.add('cinema-reveal');
        reveal.observe(element);
      });
      document.querySelectorAll<HTMLElement>('.orbital-scene, .hero-earth-stage').forEach(element => {
        if (observedDepth.has(element)) return;
        observedDepth.add(element); depth.observe(element);
      });
      document.querySelectorAll('.scanner-panel, .globe-label, #platform-overview .grid > div, #scam-dna > div:not(.artwork-heading), #blockchain-trust > div:not(.artwork-heading), #incident-guidance > div').forEach(el => el.classList.add('cinema-glass'));
    };
    const mutation = new MutationObserver(discover);
    const main = document.querySelector('main');
    if (main) mutation.observe(main, { childList: true, subtree: true });

    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduced()) return;
      clientX = event.clientX;
      clientY = event.clientY;
      if (cursor.current) {
        cursor.current.style.left = `${clientX}px`;
        cursor.current.style.top = `${clientY}px`;
        cursor.current.classList.add('is-visible');
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = (event.target instanceof Element ? event.target : null) || document.elementFromPoint(clientX, clientY);
        if (cursor.current) {
          cursor.current.classList.toggle('is-hovering', !!target?.closest('a,button,[role="button"],.react-flow__node,label,summary,.cursor-pointer'));
          cursor.current.classList.toggle('is-writing', !!target?.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),textarea'));
        }
        const panel = target?.closest<HTMLElement>('.cinema-glass, .main-nav a, .header-cta');
        if (lightPanel && lightPanel !== panel) lightPanel.classList.remove('has-light');
        lightPanel = panel || null;
        if (panel) {
          const bounds = panel.getBoundingClientRect();
          panel.style.setProperty('--light-x', `${clientX - bounds.left}px`);
          panel.style.setProperty('--light-y', `${clientY - bounds.top}px`);
          panel.classList.add('has-light');
        }
      });
    };
    const enter = () => {
      if (!reduced() && clientX >= 0 && clientY >= 0) {
        cursor.current?.classList.add('is-visible');
      }
    };
    const leave = () => cursor.current?.classList.remove('is-visible');
    const press = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduced()) return;
      cursor.current?.classList.add('is-pressed');
      if (!ripple.current) return;
      ripple.current.style.left = `${event.clientX}px`;
      ripple.current.style.top = `${event.clientY}px`;
      ripple.current.getAnimations().forEach(animation => animation.cancel());
      ripple.current.animate([{ transform: 'translate(-50%, -50%) scale(.4)', opacity: .65 }, { transform: 'translate(-50%, -50%) scale(2.8)', opacity: 0 }], { duration: 550, easing: 'cubic-bezier(.2,.8,.2,1)' });
    };
    const release = () => cursor.current?.classList.remove('is-pressed');
    const onScroll = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastScrollY) > 1) scrollDirection = currentY > lastScrollY ? 'down' : 'up';
      lastScrollY = currentY;
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const distance = document.documentElement.scrollHeight - innerHeight;
        if (progress.current) progress.current.style.transform = `scaleX(${distance > 0 ? scrollY / distance : 0})`;
        document.querySelector('.site-header')?.classList.toggle('is-scrolled', scrollY > 30);
        for (const element of depthTargets) {
          const bounds = element.getBoundingClientRect();
          const phase = reduced() ? 0 : Math.max(-1, Math.min(1, (innerHeight * .5 - bounds.top - bounds.height * .5) / innerHeight));
          element.style.setProperty('--scroll-parallax', `${(phase * 22).toFixed(2)}px`);
          element.style.setProperty('--scroll-roll', `${(phase * 1.8).toFixed(2)}deg`);
        }
      });
    };
    const onMotion = () => {
      if (reduced()) {
        leave(); setIntro(false);
        for (const state of sections.values()) { state.animation?.cancel(); state.animation = null; }
        for (const element of observedDepth) {
          element.style.removeProperty('--scroll-parallax');
          element.style.removeProperty('--scroll-roll');
        }
      }
      onScroll();
    };
    const onFocus = (event: FocusEvent) => {
      for (const [element, state] of sections) if (event.target instanceof Node && element.contains(event.target)) {
        state.animation?.cancel(); state.animation = null;
      }
    };
    const motionObserver = new MutationObserver(onMotion);
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    discover();
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerenter', enter);
    document.documentElement.addEventListener('pointerleave', leave);
    document.addEventListener('pointerdown', press, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('focusin', onFocus);
    window.addEventListener('focus', enter);
    window.addEventListener('blur', leave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    media.addEventListener('change', onMotion);
    onScroll();
    return () => {
      reveal.disconnect(); depth.disconnect(); mutation.disconnect(); motionObserver.disconnect();
      for (const [element, state] of sections) {
        state.animation?.cancel(); element.classList.remove('cinema-reveal', 'is-revealed');
        delete element.dataset.revealDirection;
      }
      for (const element of observedDepth) {
        element.style.removeProperty('--scroll-parallax'); element.style.removeProperty('--scroll-roll');
      }
      cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame);
      document.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerenter', enter);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerdown', press); document.removeEventListener('pointerup', release);
      document.removeEventListener('focusin', onFocus);
      window.removeEventListener('focus', enter);
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
