/** The closing constellation: every territory of the site, and what you know of it. */

interface GraphNode {
  id: string;
  name: string;
  color: string;
  status: 'written' | 'indexed' | 'planned';
  cat: number;
  lessons: number;
  href: string;
}

interface GraphData {
  groups: number;
  nodes: GraphNode[];
  edges: [number, number][];
}

interface Placed extends GraphNode {
  x: number;
  y: number;
  phase: number;
  amp: number;
  studied: number;
}

const GOLD = Math.PI * (3 - Math.sqrt(5));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STATUS: Record<GraphNode['status'], string> = {
  written: 'con temario',
  indexed: 'concepto',
  planned: 'por escribir',
};

let stop: (() => void) | null = null;

export function mountGraph(root: HTMLElement) {
  stop?.();

  const canvas = root.querySelector<HTMLCanvasElement>('[data-graph]');
  const tip = root.querySelector<HTMLElement>('[data-graph-tip]');
  const payload = root.querySelector('[data-graph-data]')?.textContent;
  if (!canvas || !payload) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const data = JSON.parse(payload) as GraphData;
  const ink = getComputedStyle(document.documentElement);
  const line = ink.getPropertyValue('--subtext0').trim() || '#a5a190';
  const good = ink.getPropertyValue('--green').trim() || '#98bb6c';

  // A sunflower of clusters, one per category, and a smaller one inside each.
  const perCat = new Map<number, number>();
  const nodes: Placed[] = data.nodes.map((n) => {
    const seen = perCat.get(n.cat) ?? 0;
    perCat.set(n.cat, seen + 1);
    const cr = Math.sqrt((n.cat + 0.5) / data.groups) * 0.94;
    const ca = n.cat * GOLD;
    const ir = 0.06 + Math.sqrt(seen / 4) * 0.07;
    const ia = seen * GOLD + n.cat;
    return {
      ...n,
      x: Math.cos(ca) * cr + Math.cos(ia) * ir,
      y: Math.sin(ca) * cr + Math.sin(ia) * ir,
      phase: (n.cat * 1.7 + seen) % (Math.PI * 2),
      amp: 0.004 + (seen % 3) * 0.002,
      studied: 0,
    };
  });

  let w = 0;
  let h = 0;
  let scaleX = 1;
  let scaleY = 1;
  const centre = { x: 0, y: 0 };
  const mouse = { x: 0, y: 0, on: false };
  const drift = { x: 0, y: 0 };
  let hover = -1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Elliptical: the constellation fills a wide stage instead of balling up.
    scaleX = w * 0.44;
    scaleY = h * 0.44;
    centre.x = w / 2;
    centre.y = h / 2;
  };

  const posOf = (n: Placed, t: number) => ({
    x: centre.x + (n.x + Math.cos(t * 0.4 + n.phase) * n.amp) * scaleX + drift.x,
    y: centre.y + (n.y + Math.sin(t * 0.34 + n.phase) * n.amp) * scaleY + drift.y,
  });

  const draw = (t: number) => {
    ctx.clearRect(0, 0, w, h);
    const points = nodes.map((n) => posOf(n, t));

    ctx.lineWidth = 1;
    for (const [a, b] of data.edges) {
      const pa = points[a];
      const pb = points[b];
      if (!pa || !pb) continue;
      const near = hover === a || hover === b;
      ctx.strokeStyle = near ? good : line;
      ctx.globalAlpha = near ? 0.55 : 0.17;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const p = points[i];
      const known = n.studied > 0;
      const r = (n.status === 'written' ? 5 : 3.5) + (hover === i ? 3 : 0) + (known ? 1 : 0);

      ctx.globalAlpha = known ? 0.3 : 0.16;
      ctx.fillStyle = known ? good : n.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = n.status === 'planned' && !known ? 0.4 : 1;
      ctx.fillStyle = known ? good : n.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (hover >= 0 && tip) {
      const n = nodes[hover];
      const p = points[hover];
      tip.hidden = false;
      tip.textContent = `${n.name} · ${n.lessons ? `${n.lessons} lecciones` : STATUS[n.status]}${
        n.studied ? ` · ${n.studied} leídas` : ''
      }`;
      tip.style.left = `${Math.min(w - tip.offsetWidth - 8, Math.max(8, p.x + 14))}px`;
      tip.style.top = `${Math.max(8, p.y - 34)}px`;
    } else if (tip) {
      tip.hidden = true;
    }
  };

  const hit = () => {
    if (!mouse.on) return -1;
    const t = performance.now() / 1000;
    let best = -1;
    let bestD = 18 * 18;
    for (let i = 0; i < nodes.length; i++) {
      const p = posOf(nodes[i], t);
      const d = (p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.on = true;
    drift.x = (mouse.x / w - 0.5) * -26;
    drift.y = (mouse.y / h - 0.5) * -26;
    hover = hit();
    canvas.style.cursor = hover >= 0 && nodes[hover].href ? 'pointer' : 'default';
  };

  const onLeave = () => {
    mouse.on = false;
    hover = -1;
    drift.x = 0;
    drift.y = 0;
  };

  const onClick = () => {
    if (hover >= 0 && nodes[hover].href) window.location.href = nodes[hover].href;
  };

  let raf = 0;
  let alive = true;
  const frame = () => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    draw(performance.now() / 1000);
  };

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);

  if (reduced()) draw(0);
  else raf = requestAnimationFrame(frame);

  // What the reader already knows lights up: the map remembers.
  void import('../lib/learner')
    .then((learner) => learner.readSet())
    .then((read) => {
      const byTrack = new Map<string, number>();
      for (const id of read) {
        const track = id.split('/')[0];
        byTrack.set(track, (byTrack.get(track) ?? 0) + 1);
      }
      for (const n of nodes) n.studied = byTrack.get(n.id) ?? 0;
      if (reduced()) draw(0);
    })
    .catch(() => {
      /* no storage, no glow */
    });

  stop = () => {
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('click', onClick);
    stop = null;
  };
}

document.addEventListener('astro:before-swap', () => stop?.());
