import gsap from 'gsap';

interface Node {
  x: number;
  y: number;
  value: number;
  stamp: number;
  heat: number;
  pulse: number;
  neighbors: number[];
}

interface Message {
  from: number;
  to: number;
  value: number;
  stamp: number;
  t: number;
}

const DENSITY = 13000;
const MAX_NODES = 110;
const NEIGHBORS = 3;
const HEAT_RADIUS = 130;

export function mount(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {} };

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;

  const palette = [
    read('--mauve', '#cba6f7'),
    read('--blue', '#89b4fa'),
    read('--teal', '#94e2d5'),
    read('--peach', '#fab387'),
    read('--green', '#a6e3a1'),
  ];
  const idle = read('--surface1', '#45475a');
  const link = read('--surface0', '#313244');

  let nodes: Node[] = [];
  const messages = new Set<Message>();
  let clock = 0;
  let width = 0;
  let height = 0;
  let pointerX = -1e9;
  let pointerY = -1e9;
  let ticking = false;
  let live = 0;

  function build() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(MAX_NODES, Math.round((width * height) / DENSITY));
    const cols = Math.max(2, Math.round(Math.sqrt((target * width) / height)));
    const rows = Math.max(2, Math.round(target / cols));
    const cw = width / cols;
    const ch = height / rows;

    gsap.killTweensOf(nodes);
    nodes = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        nodes.push({
          x: (c + 0.5) * cw + (Math.random() - 0.5) * cw * 0.7,
          y: (r + 0.5) * ch + (Math.random() - 0.5) * ch * 0.7,
          value: -1,
          stamp: 0,
          heat: 0,
          pulse: 0,
          neighbors: [],
        });
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].neighbors = nodes
        .map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 }))
        .filter((n) => n.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, NEIGHBORS)
        .map((n) => n.j);
    }
    for (const [i, n] of nodes.entries()) {
      for (const j of n.neighbors) if (!nodes[j].neighbors.includes(i)) nodes[j].neighbors.push(i);
    }

    messages.clear();
  }

  function wake() {
    live++;
    if (!ticking && !still.matches) {
      ticking = true;
      gsap.ticker.add(render);
    }
  }

  function rest() {
    live = Math.max(0, live - 1);
    if (live === 0 && ticking) {
      ticking = false;
      gsap.ticker.remove(render);
      render();
    }
  }

  function nearest(x: number, y: number) {
    let best = -1;
    let bestD = Infinity;
    for (const [i, n] of nodes.entries()) {
      const d = (n.x - x) ** 2 + (n.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function pulse(node: Node) {
    node.pulse = 1;
    wake();
    gsap.to(node, { pulse: 0, duration: 1.1, ease: 'expo.out', onComplete: rest });
  }

  function send(from: number, value: number, stamp: number) {
    for (const to of nodes[from].neighbors) {
      const d = Math.hypot(nodes[to].x - nodes[from].x, nodes[to].y - nodes[from].y);
      const msg: Message = { from, to, value, stamp, t: 0 };
      messages.add(msg);
      wake();
      gsap.to(msg, {
        t: 1,
        duration: 0.22 + d / 420 + Math.random() * 0.14,
        ease: 'power1.inOut',
        onComplete: () => {
          messages.delete(msg);
          const n = nodes[msg.to];
          if (msg.stamp > n.stamp) {
            n.value = msg.value;
            n.stamp = msg.stamp;
            pulse(n);
            send(msg.to, msg.value, msg.stamp);
          }
          rest();
        },
      });
    }
  }

  function write(x: number, y: number) {
    const i = nearest(x, y);
    if (i < 0) return;
    const value = Math.floor(Math.random() * palette.length);
    clock++;
    nodes[i].value = value;
    nodes[i].stamp = clock;

    if (still.matches) {
      for (const n of nodes) {
        if (clock > n.stamp) {
          n.value = value;
          n.stamp = clock;
        }
      }
      render();
      return;
    }
    pulse(nodes[i]);
    send(i, value, clock);
  }

  function heatTo(x: number, y: number) {
    if (still.matches) return;
    wake();
    let pending = nodes.length;
    for (const n of nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      gsap.to(n, {
        heat: d < HEAT_RADIUS ? 1 - d / HEAT_RADIUS : 0,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
        onComplete: () => {
          if (--pending === 0) rest();
        },
        onInterrupt: () => {
          if (--pending === 0) rest();
        },
      });
    }
  }

  function render() {
    ctx!.clearRect(0, 0, width, height);

    ctx!.lineWidth = 1;
    ctx!.strokeStyle = link;
    for (const [i, n] of nodes.entries()) {
      for (const j of n.neighbors) {
        if (j < i) continue;
        const m = nodes[j];
        ctx!.globalAlpha = Math.min(0.7, 0.16 + (n.heat + m.heat) * 0.4);
        ctx!.beginPath();
        ctx!.moveTo(n.x, n.y);
        ctx!.lineTo(m.x, m.y);
        ctx!.stroke();
      }
    }

    for (const m of messages) {
      const a = nodes[m.from];
      const b = nodes[m.to];
      ctx!.fillStyle = palette[m.value];
      ctx!.globalAlpha = 0.9;
      ctx!.beginPath();
      ctx!.arc(a.x + (b.x - a.x) * m.t, a.y + (b.y - a.y) * m.t, 2.4, 0, Math.PI * 2);
      ctx!.fill();
    }

    for (const n of nodes) {
      ctx!.fillStyle = n.value < 0 ? idle : palette[n.value];
      ctx!.globalAlpha = n.value < 0 ? 0.35 + n.heat * 0.5 : 0.55 + n.heat * 0.45;
      ctx!.beginPath();
      ctx!.arc(n.x, n.y, 1.7 + n.heat * 2.6 + n.pulse * 3.4, 0, Math.PI * 2);
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
  }

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;
    heatTo(pointerX, pointerY);
  };

  const onLeave = () => heatTo(-1e9, -1e9);

  const onDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    write(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onResize = () => {
    build();
    render();
  };

  build();
  render();

  if (!still.matches) window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('blur', onLeave);
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      gsap.killTweensOf(nodes);
      for (const m of messages) gsap.killTweensOf(m);
      messages.clear();
      if (ticking) gsap.ticker.remove(render);
      ticking = false;
      live = 0;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('resize', onResize);
    },
  };
}
