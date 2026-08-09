// Capa 06 — la escena distribuida en WebGPU.
//
// Aquí la GPU se gana el sitio: 8192 nodos y 65 536 enlaces relajándose y
// chismorreando en cada cuadro. En CPU eso no va fluido; en GPU sobra.
//
// Un pase de cómputo hace las dos cosas a la vez —la relajación hacia el
// espacio de latencia y la propagación entre vecinos— porque ambas recorren la
// misma lista de vecinos y no tiene sentido leerla dos veces.
//
// La versión que conoce cada nodo va a doble búfer: se lee de una y se escribe
// en la otra, y se intercambian. Sin eso, un nodo podría adoptar en el mismo
// cuadro un valor que otro acaba de escribir, y la propagación avanzaría a
// saltos irreales.

import { PAL, type Escena } from './escena';
import { aplicarFase, faseDe, FASES, generar, hayCorte } from './distribuido-modelo';

const N = 8192;
const K = 8;

const COMPUTO = /* wgsl */ `
struct Params {
  dt: f32,
  corte: f32,
  n: u32,
  _pad: u32,
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> pos: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> vel: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> verIn: array<u32>;
@group(0) @binding(4) var<storage, read_write> verOut: array<u32>;
@group(0) @binding(5) var<storage, read> lado: array<u32>;
@group(0) @binding(6) var<storage, read> nb: array<u32>;
@group(0) @binding(7) var<storage, read> lat: array<f32>;
@group(0) @binding(8) var<storage, read_write> prog: array<f32>;

const K: u32 = ${K}u;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= P.n) { return; }

  let p = pos[i];
  var f = vec2<f32>(0.0, 0.0);
  var v = verIn[i];
  let mio = lado[i];

  for (var e: u32 = 0u; e < K; e = e + 1u) {
    let o = i * K + e;
    let j = nb[o];
    let d = pos[j] - p;
    let dist = max(length(d), 1e-4);
    let dir = d / dist;

    // Longitud de reposo proporcional a la latencia: lo que se ve no es dónde
    // están las máquinas, sino cuánto tardan en hablarse.
    let reposo = lat[o] * 0.22;
    f = f + dir * (dist - reposo) * 1.6;
    if (dist < 0.05) { f = f - dir * (0.05 - dist) * 6.0; }

    // El corte. Un solo condicional convierte la propagación en desacuerdo.
    let cruza = (P.corte > 0.5) && (mio != lado[j]);
    let vj = verIn[j];
    if (!cruza && vj > v) {
      var pr = prog[o] + P.dt / lat[o];
      if (pr >= 1.0) { v = vj; pr = 0.0; }
      prog[o] = pr;
    } else if (prog[o] > 0.0) {
      prog[o] = max(0.0, prog[o] - P.dt * 2.0);
    }
  }

  f = f - p * 0.35;
  let nv = (vel[i] + f * P.dt) * 0.86;
  vel[i] = nv;
  pos[i] = p + nv * P.dt;
  verOut[i] = v;
}
`;

const DIBUJO = /* wgsl */ `
struct Vista {
  escala: vec2<f32>,
  centro: vec2<f32>,
  punto: vec2<f32>,
  sep: f32,
  corte: f32,
};
@group(0) @binding(0) var<uniform> V: Vista;
@group(0) @binding(1) var<storage, read> pos: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> ver: array<u32>;
@group(0) @binding(3) var<storage, read> lado: array<u32>;
@group(0) @binding(4) var<storage, read> nb: array<u32>;

const K: u32 = ${K}u;

fn color(v: u32) -> vec4<f32> {
  if (v == 0u) { return vec4<f32>(0.271, 0.278, 0.353, 0.85); }
  if (v == 1u) { return vec4<f32>(0.537, 0.706, 0.980, 1.0); }
  if (v == 2u) { return vec4<f32>(0.796, 0.651, 0.969, 1.0); }
  return vec4<f32>(0.651, 0.890, 0.631, 1.0);
}

fn plano(i: u32) -> vec2<f32> {
  var p = pos[i];
  if (lado[i] == 1u) { p.x = p.x + V.sep; } else { p.x = p.x - V.sep; }
  return p * V.escala + V.centro;
}

struct Salida {
  @builtin(position) clip: vec4<f32>,
  @location(0) col: vec4<f32>,
};

// --- Nodos: un cuadrado instanciado por nodo ---
@vertex
fn vsNodo(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> Salida {
  var esquina = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );
  let v = ver[ii];
  let escalaPunto = select(0.8, 1.0, v > 0u);
  let c = plano(ii) + esquina[vi] * V.punto * escalaPunto;
  var s: Salida;
  s.clip = vec4<f32>(c, 0.0, 1.0);
  s.col = color(v);
  return s;
}

// --- Enlaces: dos vértices por arista, en lista de líneas ---
@vertex
fn vsEnlace(@builtin(vertex_index) vi: u32) -> Salida {
  let arista = vi / 2u;
  let extremo = vi % 2u;
  let i = arista / K;
  let j = nb[arista];
  let idx = select(i, j, extremo == 1u);

  var s: Salida;
  s.clip = vec4<f32>(plano(idx), 0.0, 1.0);
  if ((V.corte > 0.5) && (lado[i] != lado[j])) {
    // El enlace sigue existiendo; lo que ya no pasa son los mensajes.
    s.col = vec4<f32>(0.953, 0.545, 0.659, 0.16);
  } else {
    s.col = vec4<f32>(0.271, 0.278, 0.353, 0.30);
  }
  return s;
}

@fragment
fn fs(e: Salida) -> @location(0) vec4<f32> {
  // Destino con alfa premultiplicado.
  return vec4<f32>(e.col.rgb * e.col.a, e.col.a);
}
`;

export async function montar(host: HTMLElement): Promise<Escena> {
  // El proyecto no trae @webgpu/types, así que la superficie de WebGPU se toca
  // como `any`. Es deliberado: no vale la pena una dependencia de tipos para un
  // único módulo que además tiene respaldo si algo falla.
  const G = globalThis as any;
  const gpu: any = G.navigator?.gpu;
  if (!gpu) throw new Error('sin WebGPU');
  const adaptador: any = await gpu.requestAdapter();
  if (!adaptador) throw new Error('sin adaptador');
  const disp: any = await adaptador.requestDevice();
  const USO = G.GPUBufferUsage;
  const ETAPA = G.GPUShaderStage;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(canvas);
  const ctx: any = canvas.getContext('webgpu');
  if (!ctx) throw new Error('sin contexto webgpu');
  const formato = gpu.getPreferredCanvasFormat();
  ctx.configure({ device: disp, format: formato, alphaMode: 'premultiplied' });

  const t = generar(N, K);

  const buf = (datos: ArrayBufferView, uso: number) => {
    const b = disp.createBuffer({
      size: Math.ceil(datos.byteLength / 4) * 4,
      usage: uso,
      mappedAtCreation: true,
    });
    new Uint8Array(b.getMappedRange()).set(
      new Uint8Array(datos.buffer as ArrayBuffer, datos.byteOffset, datos.byteLength),
    );
    b.unmap();
    return b;
  };
  const ST = USO.STORAGE;
  const posB = buf(t.pos, ST);
  const velB = buf(t.vel, ST);
  const verA = buf(t.ver, ST | USO.COPY_DST | USO.COPY_SRC);
  const verB = buf(t.ver, ST | USO.COPY_DST | USO.COPY_SRC);
  // WGSL no tiene arrays de 8 bits: el lado y los vecinos suben como u32.
  const ladoB = buf(Uint32Array.from(t.lado), ST);
  const nbB = buf(Uint32Array.from(t.nb), ST);
  const latB = buf(t.lat, ST);
  const progB = buf(t.prog, ST | USO.COPY_DST);

  const paramsB = disp.createBuffer({ size: 16, usage: USO.UNIFORM | USO.COPY_DST });
  const vistaB = disp.createBuffer({ size: 32, usage: USO.UNIFORM | USO.COPY_DST });
  const lectura = disp.createBuffer({ size: N * 4, usage: USO.COPY_DST | USO.MAP_READ });

  // `n` no cambia nunca: se sube una vez.
  disp.queue.writeBuffer(paramsB, 8, new Uint32Array([N, 0]));

  const modC = disp.createShaderModule({ code: COMPUTO });
  const modD = disp.createShaderModule({ code: DIBUJO });

  const tuberia = disp.createComputePipeline({ layout: 'auto', compute: { module: modC, entryPoint: 'main' } });

  const grupoComputo = (entrada: GPUBuffer, salida: GPUBuffer) =>
    disp.createBindGroup({
      layout: tuberia.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsB } },
        { binding: 1, resource: { buffer: posB } },
        { binding: 2, resource: { buffer: velB } },
        { binding: 3, resource: { buffer: entrada } },
        { binding: 4, resource: { buffer: salida } },
        { binding: 5, resource: { buffer: ladoB } },
        { binding: 6, resource: { buffer: nbB } },
        { binding: 7, resource: { buffer: latB } },
        { binding: 8, resource: { buffer: progB } },
      ],
    });
  const gAB = grupoComputo(verA, verB);
  const gBA = grupoComputo(verB, verA);

  const mezcla = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  };

  // El trazado de enlaces no lee las versiones, y con `layout: 'auto'` WebGPU
  // podaría ese binding y los dos grupos dejarían de ser intercambiables. Por
  // eso la disposición se declara a mano: las dos tuberías comparten firma.
  const bglDibujo = disp.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: ETAPA.VERTEX, buffer: { type: 'uniform' } },
      { binding: 1, visibility: ETAPA.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: ETAPA.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: ETAPA.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: ETAPA.VERTEX, buffer: { type: 'read-only-storage' } },
    ],
  });
  const layoutDibujo = disp.createPipelineLayout({ bindGroupLayouts: [bglDibujo] });

  const dibujoPipe = (entrada: string, topologia: string) =>
    disp.createRenderPipeline({
      layout: layoutDibujo,
      vertex: { module: modD, entryPoint: entrada },
      fragment: { module: modD, entryPoint: 'fs', targets: [{ format: formato, blend: mezcla }] },
      primitive: { topology: topologia },
    });
  const pipeNodos = dibujoPipe('vsNodo', 'triangle-list');
  const pipeEnlaces = dibujoPipe('vsEnlace', 'line-list');

  const grupoDibujo = (_pipe: any, ver: any) =>
    disp.createBindGroup({
      layout: bglDibujo,
      entries: [
        { binding: 0, resource: { buffer: vistaB } },
        { binding: 1, resource: { buffer: posB } },
        { binding: 2, resource: { buffer: ver } },
        { binding: 3, resource: { buffer: ladoB } },
        { binding: 4, resource: { buffer: nbB } },
      ],
    });
  const dNodosA = grupoDibujo(pipeNodos, verA);
  const dNodosB = grupoDibujo(pipeNodos, verB);
  const dEnlacesA = grupoDibujo(pipeEnlaces, verA);
  const dEnlacesB = grupoDibujo(pipeEnlaces, verB);

  // --- HUD en DOM. El texto no se dibuja en la GPU: no hace falta. ---
  const hud = document.createElement('div');
  hud.className = 'escena-hud';
  host.appendChild(hud);

  let fase = -1;
  let corte = false;
  let sep = 0;
  let enA = true; // la versión vigente está en verA
  let anterior = performance.now();
  let vivo = true;
  let rafId = 0;
  let leyendo = false;
  let ultimaLectura = 0;
  let cuenta = [N, 0, 0, 0];

  const medida = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h, dpr };
  };

  const subirFase = () => {
    // PENDIENTE (bug abierto). En pantalla el recuento sale «sin dato 8192»
    // aunque la fase sea PARTICIÓN, es decir: las dos semillas que esta función
    // sube no llegan a verse nunca.
    //
    // Descartado hasta ahora: el sombreador escribe `verOut[i]` siempre, así
    // que ningún nodo se queda sin copiar; los dos grupos de cómputo están bien
    // cruzados (gAB lee A y escribe B, gBA al revés) y el volteo de `enA` casa
    // con el búfer que luego se lee. Aquí se escriben LOS DOS búferes, así que
    // tampoco es que la semilla caiga en el que no toca.
    //
    // Queda por mirar el orden entre `copyBufferToBuffer`, el `submit` y este
    // `writeBuffer`: si la subida de fase se encola después de la copia de
    // lectura, el recuento de ese cuadro es el anterior — pero eso explicaría un
    // cuadro, no un estado permanente.
    //
    // No se arregla ahora a propósito: esta escena la sustituye la capa 06 de
    // la pila 3D. Arreglarlo tiene sentido solo si esa sustitución se retrasa.
    //
    // Reiniciar una fase es reescribir las versiones y los tránsitos. La
    // topología no se toca: es la misma red en otro estado.
    disp.queue.writeBuffer(enA ? verA : verB, 0, t.ver);
    disp.queue.writeBuffer(enA ? verB : verA, 0, t.ver);
    disp.queue.writeBuffer(progB, 0, t.prog);
  };

  const cuadro = (ahora: number) => {
    if (!vivo) return;
    const dt = Math.min(0.05, (ahora - anterior) / 1000);
    anterior = ahora;
    const { w, h, dpr } = medida();

    sep += ((corte ? 0.075 : 0) - sep) * Math.min(1, dt * 3.5);

    disp.queue.writeBuffer(paramsB, 0, new Float32Array([dt, corte ? 1 : 0]));

    const ancha = w > h * 1.25;
    const cx = ancha ? w * 0.63 : w * 0.5;
    const cy = ancha ? h * 0.5 : h * 0.6;
    const esc = ancha ? Math.min(h * 0.42, w * 0.26) : Math.min(h * 0.3, w * 0.42);
    const r = Math.max(1.5, dpr * 1.6);
    disp.queue.writeBuffer(
      vistaB,
      0,
      new Float32Array([
        (2 * esc) / w, (-2 * esc) / h,
        (2 * cx) / w - 1, 1 - (2 * cy) / h,
        (2 * r) / w, (2 * r) / h,
        sep, corte ? 1 : 0,
      ]),
    );

    const cod = disp.createCommandEncoder();
    const pc = cod.beginComputePass();
    pc.setPipeline(tuberia);
    pc.setBindGroup(0, enA ? gAB : gBA);
    pc.dispatchWorkgroups(Math.ceil(N / 64));
    pc.end();
    // Tras el pase, la versión vigente es la que se acaba de escribir.
    enA = !enA;

    const pr = cod.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pr.setPipeline(pipeEnlaces);
    pr.setBindGroup(0, enA ? dEnlacesA : dEnlacesB);
    pr.draw(N * K * 2);
    pr.setPipeline(pipeNodos);
    pr.setBindGroup(0, enA ? dNodosA : dNodosB);
    pr.draw(6, N);
    pr.end();

    // Recuento para el HUD: una lectura pequeña cada 250 ms, no cada cuadro.
    const vigente = enA ? verA : verB;
    if (!leyendo && ahora - ultimaLectura > 250) {
      leyendo = true;
      ultimaLectura = ahora;
      cod.copyBufferToBuffer(vigente, 0, lectura, 0, N * 4);
      disp.queue.submit([cod.finish()]);
      lectura
        .mapAsync(G.GPUMapMode.READ)
        .then(() => {
          const v = new Uint32Array(lectura.getMappedRange());
          const c = [0, 0, 0, 0];
          for (let i = 0; i < N; i++) c[Math.min(3, v[i])]++;
          cuenta = c;
          lectura.unmap();
          pintarHud();
        })
        .catch(() => {})
        .finally(() => {
          leyendo = false;
        });
    } else {
      disp.queue.submit([cod.finish()]);
    }

    rafId = requestAnimationFrame(cuadro);
  };

  const NOMBRES = ['sin dato', 'v1', 'v2', 'v3'];
  const TONOS = [PAL.overlay0, PAL.blue, PAL.mauve, PAL.green];
  const pintarHud = () => {
    const f = Math.max(0, fase);
    const partes = [`<b>${FASES[f].nombre.toUpperCase()}</b>`, `<i>${N} nodos · ${N * K} enlaces</i>`];
    const linea = cuenta
      .map((c, v) =>
        c === 0 ? '' : `<u style="--t:rgb(${TONOS[v].join(',')})">${NOMBRES[v]} ${c}</u>`,
      )
      .join('');
    hud.innerHTML = partes.join('') + `<div class="escena-hud-ver">${linea}</div>`;
  };

  rafId = requestAnimationFrame(cuadro);

  return {
    avance(p) {
      const f = faseDe(p);
      if (f === fase) return;
      fase = f;
      corte = hayCorte(f);
      aplicarFase(t, f);
      subirFase();
      pintarHud();
    },
    destruir() {
      vivo = false;
      cancelAnimationFrame(rafId);
      hud.remove();
      canvas.remove();
      for (const b of [posB, velB, verA, verB, ladoB, nbB, latB, progB, paramsB, vistaB, lectura]) {
        try {
          b.destroy();
        } catch {
          /* ya liberado */
        }
      }
      try {
        disp.destroy();
      } catch {
        /* ya liberado */
      }
    },
  };
}
