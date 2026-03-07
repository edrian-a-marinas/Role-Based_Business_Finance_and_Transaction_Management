import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import "@/index.css"

// ── Suppress known Recharts v2 warning (dev + production) ─────────────────
// ResponsiveContainer fires one internal measurement pass with -1x-1 before
// its ResizeObserver kicks in. This is a known unfixed bug in Recharts v2:
// https://github.com/recharts/recharts/issues/3678
//
// The warning is cosmetic — charts render correctly in all environments.
// TODO: Remove this suppression once Recharts v3 stabilizes (currently alpha).
//       v3 rewrites ResponsiveContainer and fixes this measurement bug.
//       To upgrade: npm install recharts@3 (verify breaking changes first)
const _warn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("width(-1) and height(-1)")) return;
  _warn(...args);
};

createRoot(document.getElementById('root')!).render(
  <App />
)