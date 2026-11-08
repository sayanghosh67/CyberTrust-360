import { useEffect, useRef } from 'react';

/** An animated perspective mesh, decorative and independent of security data. */
export function MeshAtmosphere() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current, ctx = target?.getContext('2d');
    if (!target || !ctx) return;
    let width = 0, height = 0, frame = 0, last = 0, time = 0, dirty = true;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const paused = () => motion.matches || document.documentElement.dataset.motion === 'paused';
    const resize = () => {
      width = innerWidth; height = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      target.width = width*dpr; target.height = height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      dirty = true; start();
    };
    const draw = (stamp: number) => {
      frame = 0;
      if (document.hidden) return;
      if (stamp-last >= 45 || dirty) {
        if (!paused()) time += Math.min(stamp-last,60)*.00015;
        last=stamp; dirty=false;
        ctx.clearRect(0,0,width,height);
        const columns = width < 700 ? 23 : 42, rows = 16;
        const scroll = scrollY*.00015;
        const point = (x: number,y: number) => {
          const u=x/columns, v=y/rows;
          const wave=Math.sin(u*7+v*3+time+scroll)*.13+Math.cos(u*4-v*6+time*.7)*.09;
          return [u*width*1.4-width*.2+Math.sin(v*4+time*.3)*width*.08, height*(.28+v*.8)+wave*height, Math.sin(u*5+v*2+time)*.5+.5];
        };
        for(let x=0;x<columns;x++) for(let y=0;y<rows;y++) {
          const a=point(x,y), b=point(x+1,y), c=point(x,y+1);
          const alpha=(.035+a[2]*.065)*(1-y/rows*.6);
          ctx.strokeStyle=`rgba(173,217,148,${alpha})`; ctx.lineWidth=.6;
          ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.closePath();ctx.stroke();
          if((x*7+y*3)%31===0) {ctx.fillStyle=`rgba(207,248,179,${alpha*4})`;ctx.beginPath();ctx.arc(a[0],a[1],1.4,0,Math.PI*2);ctx.fill();}
        }
      }
      if(!paused()) start();
    };
    const start = () => {if(!frame&&!document.hidden) frame=requestAnimationFrame(draw);};
    const update = () => {dirty=true;start();};
    const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
    resize();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',update);motion.addEventListener('change',update);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',update);motion.removeEventListener('change',update);};
  },[]);
  return <div className="mesh-atmosphere" aria-hidden="true"><canvas ref={canvas} /><div className="mesh-vignette" /><div className="mesh-grain" /></div>;
}
