// Canvas-Animationen für die Hintergrund-Vorlagen. Jede Engine bekommt einen
// 2D-Kontext und liefert resize() und frame(). Bewusst schlank gehalten:
// keine Abhängigkeiten, Dichte skaliert mit der Fläche, damit ein 4K-Monitor
// nicht zwanzigmal so viel rechnet wie ein Telefon.

import { hexToRgb } from "@/lib/theme/color";

interface EngineOptions {
  colors: [string, string, string];
  /** Faktor: 0 = still, 1 = normal */
  speed: number;
  /** 0.1 – 1 */
  intensity: number;
  dark: boolean;
}

interface Engine {
  resize(w: number, h: number): void;
  frame(dt: number, t: number): void;
  pointer?(x: number, y: number): void;
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// ── Sternenhimmel ───────────────────────────────────────────

function starfield(ctx: CanvasRenderingContext2D, o: EngineOptions): Engine {
  let w = 0, h = 0;
  let stars: Array<{ x: number; y: number; z: number; r: number; tw: number; c: string }> = [];
  let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  let nextShot = rand(3, 8);
  const starColor = o.dark ? "#ffffff" : "#1b1b2f";

  return {
    resize(nw, nh) {
      w = nw; h = nh;
      const count = Math.round((w * h) / 2600 * (0.4 + o.intensity * 0.8));
      stars = Array.from({ length: count }, () => {
        const z = Math.random();
        const tint = Math.random() < 0.18 ? o.colors[Math.floor(Math.random() * 3)] : starColor;
        return { x: Math.random() * w, y: Math.random() * h, z, r: 0.3 + z * 1.4, tw: Math.random() * Math.PI * 2, c: tint };
      });
    },
    frame(dt, t) {
      ctx.clearRect(0, 0, w, h);
      // weicher Nebelschleier hinter den Sternen
      const g1 = ctx.createRadialGradient(w * 0.2, h * 0.25, 0, w * 0.2, h * 0.25, Math.max(w, h) * 0.55);
      g1.addColorStop(0, rgba(o.colors[0], 0.16 * o.intensity));
      g1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.8, 0, w * 0.85, h * 0.8, Math.max(w, h) * 0.5);
      g2.addColorStop(0, rgba(o.colors[1], 0.12 * o.intensity));
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.x -= (4 + s.z * 14) * o.speed * dt;
        if (s.x < -2) { s.x = w + 2; s.y = Math.random() * h; }
        const alpha = (0.35 + 0.65 * s.z) * (0.6 + 0.4 * Math.sin(t * (0.8 + s.z * 2) + s.tw));
        ctx.fillStyle = rgba(s.c, alpha * (o.dark ? 1 : 0.55));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (o.speed > 0) {
        nextShot -= dt;
        if (!shooting && nextShot <= 0) {
          shooting = { x: rand(w * 0.3, w), y: rand(0, h * 0.4), vx: -rand(500, 800), vy: rand(180, 320), life: 1 };
          nextShot = rand(5, 12) / Math.max(o.speed, 0.2);
        }
        if (shooting) {
          const s = shooting;
          s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 0.9;
          const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
          grad.addColorStop(0, rgba(starColor, Math.max(s.life, 0)));
          grad.addColorStop(1, rgba(starColor, 0));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12);
          ctx.stroke();
          if (s.life <= 0 || s.x < -100 || s.y > h + 100) shooting = null;
        }
      }
    },
  };
}

// ── Partikelnetz ────────────────────────────────────────────

function particles(ctx: CanvasRenderingContext2D, o: EngineOptions): Engine {
  let w = 0, h = 0;
  let pts: Array<{ x: number; y: number; vx: number; vy: number; c: string }> = [];
  let mx = -9999, my = -9999;
  const link = 140;

  return {
    resize(nw, nh) {
      w = nw; h = nh;
      const count = Math.min(160, Math.round((w * h) / 16000 * (0.5 + o.intensity)));
      pts = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: rand(-18, 18),
        vy: rand(-18, 18),
        c: o.colors[i % 3],
      }));
    },
    pointer(x, y) { mx = x; my = y; },
    frame(dt) {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx * o.speed * dt;
        p.y += p.vy * o.speed * dt;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dxm = p.x - mx, dym = p.y - my;
        const dm = Math.hypot(dxm, dym);
        if (dm < 160 && dm > 0.1) {
          // sanft zur Maus hin ziehen
          p.x -= (dxm / dm) * 12 * dt;
          p.y -= (dym / dm) * 12 * dt;
        }
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = rgba(a.c, (1 - d / link) * 0.45 * o.intensity);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = rgba(p.c, 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

// ── Wellen ──────────────────────────────────────────────────

function waves(ctx: CanvasRenderingContext2D, o: EngineOptions): Engine {
  let w = 0, h = 0;
  const layers = [
    { amp: 34, len: 0.0042, spd: 0.35, y: 0.58, c: 0, a: 0.28 },
    { amp: 26, len: 0.0061, spd: -0.5, y: 0.66, c: 1, a: 0.26 },
    { amp: 40, len: 0.0031, spd: 0.25, y: 0.74, c: 2, a: 0.24 },
    { amp: 22, len: 0.0078, spd: -0.7, y: 0.82, c: 0, a: 0.22 },
  ];
  let phase = 0;
  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(dt) {
      phase += dt * o.speed;
      ctx.clearRect(0, 0, w, h);
      for (const l of layers) {
        const base = h * l.y;
        const grad = ctx.createLinearGradient(0, base - l.amp, 0, h);
        grad.addColorStop(0, rgba(o.colors[l.c], l.a * (0.5 + o.intensity)));
        grad.addColorStop(1, rgba(o.colors[(l.c + 1) % 3], 0.02));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + 10; x += 10) {
          const y = base + Math.sin(x * l.len + phase * l.spd * 2) * l.amp + Math.sin(x * l.len * 2.3 + phase * l.spd) * l.amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
    },
  };
}

// ── Bokeh ───────────────────────────────────────────────────

function bokeh(ctx: CanvasRenderingContext2D, o: EngineOptions): Engine {
  let w = 0, h = 0;
  let orbs: Array<{ x: number; y: number; r: number; vy: number; vx: number; c: string; a: number; ph: number }> = [];
  return {
    resize(nw, nh) {
      w = nw; h = nh;
      const count = Math.round(14 + (w * h) / 90000 * o.intensity);
      orbs = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(20, 110),
        vy: -rand(6, 22),
        vx: rand(-6, 6),
        c: o.colors[i % 3],
        a: rand(0.12, 0.38),
        ph: Math.random() * Math.PI * 2,
      }));
    },
    frame(dt, t) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = o.dark ? "lighter" : "source-over";
      for (const b of orbs) {
        b.y += b.vy * o.speed * dt;
        b.x += (b.vx + Math.sin(t * 0.4 + b.ph) * 6) * o.speed * dt;
        if (b.y < -b.r) { b.y = h + b.r; b.x = Math.random() * w; }
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, rgba(b.c, b.a * o.intensity));
        g.addColorStop(0.7, rgba(b.c, b.a * 0.4 * o.intensity));
        g.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

export const CANVAS_ENGINES = { starfield, particles, waves, bokeh } as const;
export type CanvasPreset = keyof typeof CANVAS_ENGINES;
