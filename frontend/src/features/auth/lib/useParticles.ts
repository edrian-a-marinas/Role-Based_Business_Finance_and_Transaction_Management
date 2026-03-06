import { useState, useEffect, useRef } from "react";
import { S } from "./authConst";

export interface Particle {
  id:       number;
  x:        number;
  duration: number;
  opacity:  number;
  color:    string;
  label:    string;
  fontSize: number;
}

const LABELS = ["+₱240", "-₱85", "+₱1,200", "-₱340", "+₱67", "-₱22", "+₱890", "-₱430", "+₱3,500", "-₱120"];
const COLORS  = [S.income, S.primary, S.expense, S.primary, S.income];
let _pid = 0;

function makeParticle(): Particle {
  const id = _pid++;
  return {
    id,
    x:        Math.random() * 88 + 4,
    duration: Math.random() * 14 + 16,
    opacity:  Math.random() * 0.055 + 0.025,
    color:    COLORS[id % COLORS.length],
    label:    LABELS[id % LABELS.length],
    fontSize: Math.random() * 2 + 9,
  };
}

export function useParticles(): Particle[] {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;

    function scheduleNext() {
      const delay = Math.random() * 7000 + 7000;
      timerRef.current = setTimeout(() => {
        if (!alive) return;
        const p = makeParticle();
        setParticles(prev => [...prev, p]);
        setTimeout(() => {
          setParticles(prev => prev.filter(x => x.id !== p.id));
        }, (p.duration + 2) * 1000);
        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return particles;
}