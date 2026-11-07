import { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';

/** Decorative CSS geometry, never a representation of live security telemetry. */
export function SecuritySculpture({ variant = 'cube', className = '' }: { variant?: 'cube' | 'orbit'; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => element.classList.toggle('is-in-view', entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={stage} className={`security-sculpture sculpture-${variant} ${className}`} aria-hidden="true">
    <div className="sculpture-shadow" />
    <div className="sculpture-float"><div className="sculpture-tilt">
      {variant === 'cube' ? <div className="security-cube">{['front', 'back', 'left', 'right', 'top', 'bottom'].map(face => <div key={face} className={`cube-face cube-${face}`}><ShieldCheck strokeWidth={.8} /><i /></div>)}</div>
        : <div className="security-gyroscope"><i className="gyro-ring gyro-one" /><i className="gyro-ring gyro-two" /><i className="gyro-ring gyro-three" /><div className="gyro-core"><ShieldCheck strokeWidth={1} /></div></div>}
    </div></div>
  </div>;
}
