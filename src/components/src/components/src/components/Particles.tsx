import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  vrot: number;
  shape: 'circle' | 'square';
}

export interface ParticlesHandle {
  /** A small radial burst of particles at a point in viewport coordinates. */
  burst: (x: number, y: number, colors: string[], count?: number) => void;
  /** A big celebratory confetti shower across the top of the viewport. */
  confetti: (colors: string[]) => void;
}

/**
 * Full-viewport canvas overlay that renders short-lived particle effects
 * (match bursts, win confetti) without pulling in an external library.
 * Imperative so callers can fire effects from event handlers / reducer
 * side-effects without re-rendering the particle system itself.
 */
export const Particles = forwardRef<ParticlesHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const next: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life -= 1;
        if (p.life <= 0) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.vrot;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
        next.push(p);
      }
      particlesRef.current = next;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    burst(x, y, colors, count = 18) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 2.4 + Math.random() * 3.2;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 0.12,
          size: 4 + Math.random() * 5,
          color: colors[i % colors.length],
          life: 34 + Math.random() * 16,
          maxLife: 50,
          rotation: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
          shape: Math.random() > 0.5 ? 'circle' : 'square',
        });
      }
    },
    confetti(colors) {
      const w = window.innerWidth;
      const count = 90;
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: -20 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 2.4,
          vy: 2 + Math.random() * 2.5,
          gravity: 0.05,
          size: 5 + Math.random() * 6,
          color: colors[i % colors.length],
          life: 130 + Math.random() * 60,
          maxLife: 190,
          rotation: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.25,
          shape: Math.random() > 0.5 ? 'circle' : 'square',
        });
      }
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40"
      aria-hidden="true"
    />
  );
});

Particles.displayName = 'Particles';
