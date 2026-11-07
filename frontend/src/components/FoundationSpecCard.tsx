import React from 'react';
import { Layers, ShieldCheck, Terminal, Check } from 'lucide-react';

export const FoundationSpecCard: React.FC = () => {
  const specs = [
    {
      title: 'Frontend Foundation',
      items: [
        'React 19 + TypeScript strict mode',
        'Vite high-speed build system',
        'Tailwind CSS v4 modern utility stack',
        'Asynchronous health check polling hook',
      ],
    },
    {
      title: 'Backend Architecture',
      items: [
        'Python 3.11+ with FastAPI & Pydantic v2',
        'CORS security middleware configured',
        'Modular app/api/core/models/schemas tree',
        'Comprehensive exception handling handlers',
      ],
    },
    {
      title: 'Database & Migrations',
      items: [
        'PostgreSQL 16 ready via Docker Compose',
        'SQLAlchemy 2.0 ORM base & session factory',
        'Alembic environment migration runner',
        'Non-blocking connection health probe',
      ],
    },
    {
      title: 'Security & Integrity',
      items: [
        'Strict environment variable isolation (.env)',
        'Zero hardcoded API secrets or keys',
        'Input validation & safe mode gating',
        'No mock or fabricated scan data',
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
      <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-wider text-slate-400">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span>Phase 1 Verification Matrix</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {specs.map((spec) => (
          <div
            key={spec.title}
            className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              {spec.title}
            </h4>
            <ul className="space-y-2">
              {spec.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Quick Launch Commands */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-400 mb-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-300">Phase 1 Dev Execution Commands:</span>
        </div>
        <div className="space-y-1 text-slate-400 pl-2">
          <p>
            <span className="text-slate-500"># Backend: </span>
            <code className="text-cyan-300">backend/.venv/bin/uvicorn backend.app.main:app --reload --port 8000</code>
          </p>
          <p>
            <span className="text-slate-500"># Frontend: </span>
            <code className="text-cyan-300">cd frontend && npm run dev</code>
          </p>
          <p>
            <span className="text-slate-500"># Tests: </span>
            <code className="text-cyan-300">PYTHONPATH=. backend/.venv/bin/pytest backend/tests</code>
          </p>
        </div>
      </div>
    </div>
  );
};

