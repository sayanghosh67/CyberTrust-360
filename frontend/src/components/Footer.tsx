import { ArrowUpRight, Shield } from 'lucide-react';

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="site-footer shell">
      <div className="footer-top">
        <a className="brand" href="#home">
          <span className="brand-symbol">
            <Shield size={22} />
          </span>
          <span>
            cybertrust<span className="brand-360">360</span>
          </span>
        </a>
        <p>A clearer view of a complex web.</p>
        <a href="#investigate" className="text-link">
          Stay a step ahead <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="footer-bottom">
        <span>
          © {currentYear} CyberTrust 360. Engineered by <strong>TECHNIX PRO</strong>.
        </span>
        <span>BUILT WITH PURPOSE. DESIGNED FOR TRUST.</span>
        <a href="#home">Back to top ↑</a>
      </div>
    </footer>
  );
}
