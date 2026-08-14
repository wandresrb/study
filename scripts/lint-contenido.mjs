import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

const GUIA = 'src/content/guia';
const TRACKS = 'src/content/tracks';
const ICONOS = 'src/lib/iconos.ts';

const COMPONENTES = new Set([
  'Callout', 'KeyCap', 'Kbd', 'Mermaid', 'Cards', 'Card', 'PluginCard',
  'Objetivos', 'Reto', 'Lead', 'Drill', 'Paso', 'Instalar',
  'Fragment',
]);

const fallos = [];
const avisos = [];
const falla = (f, m) => fallos.push(`${f}: ${m}`);
const avisa = (f, m) => avisos.push(`${f}: ${m}`);

function frontmatter(texto) {
  if (!texto.startsWith('---\n')) return null;
  const fin = texto.indexOf('\n---', 4);
  if (fin === -1) return null;
  const datos = {};
  for (const linea of texto.slice(4, fin).split('\n')) {
    const m = linea.match(/^(\w+):\s*(.*)$/);
    if (m) datos[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
  return datos;
}

const soloTrack = process.argv[2];
const tracks = new Set(
  (await readdir(TRACKS)).filter((f) => f.endsWith('.json')).map((f) => basename(f, '.json')),
);
const carpetas = (await readdir(GUIA, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && (!soloTrack || d.name === soloTrack))
  .map((d) => d.name);

for (const sueltoEnRaiz of (await readdir(GUIA, { withFileTypes: true })).filter((d) => d.isFile())) {
  falla(GUIA, `"${sueltoEnRaiz.name}" está en la raíz; cada track va en su carpeta`);
}

let total = 0;

for (const track of carpetas) {
  const dir = join(GUIA, track);
  if (!tracks.has(track)) falla(dir, `no existe ${TRACKS}/${track}.json`);

  let niveles;
  try {
    niveles = JSON.parse(await readFile(join(dir, '_niveles.json'), 'utf8')).niveles;
  } catch {
    falla(dir, 'falta _niveles.json o no es JSON válido');
    continue;
  }

  const lecciones = [];
  for (const f of (await readdir(dir)).filter((f) => f.endsWith('.mdx'))) {
    const ruta = join(dir, f);
    const texto = await readFile(ruta, 'utf8');
    const fm = frontmatter(texto);
    total++;
    if (!fm) { falla(ruta, 'sin frontmatter'); continue; }

    for (const campo of ['title', 'description', 'subject', 'level', 'order', 'posicion']) {
      if (!fm[campo]) falla(ruta, `falta "${campo}"`);
    }
    if (fm.subject && fm.subject !== track) {
      falla(ruta, `subject "${fm.subject}" no coincide con la carpeta "${track}"`);
    }
    if (fm.posicion && !/^\d+(\.\d+)?$/.test(fm.posicion)) {
      falla(ruta, `posicion "${fm.posicion}" no tiene la forma «17» o «17.5»`);
    }
    const level = Number(fm.level);
    const order = Number(fm.order);
    if (!Number.isInteger(level) || level < 0) falla(ruta, `level "${fm.level}" inválido`);
    else if (level >= niveles.length) falla(ruta, `level ${level} y _niveles.json solo tiene ${niveles.length}`);
    if (!Number.isInteger(order) || order < 1) falla(ruta, `order "${fm.order}" inválido`);
    if (fm.posicion && fm.posicion !== `${level}.${order}`) {
      avisa(ruta, `posicion "${fm.posicion}" debería ser "${level}.${order}"`);
    }

    const prosa = texto
      .slice(texto.indexOf('\n---', 4) + 4)
      .replace(/^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1/gm, '')
      .replace(/`[^`\n]*`/g, '');
    for (const [, etiqueta] of prosa.matchAll(/<([A-Z]\w*)[\s/>]/g)) {
      if (!COMPONENTES.has(etiqueta)) falla(ruta, `<${etiqueta}> no está registrado en guia/[...slug].astro`);
    }

    lecciones.push({ ruta, level, order });
  }

  const vistas = new Map();
  for (const l of lecciones) {
    const clave = `${l.level}.${l.order}`;
    if (vistas.has(clave)) falla(l.ruta, `level.order ${clave} duplicado con ${vistas.get(clave)}`);
    else vistas.set(clave, basename(l.ruta));
  }

  for (let n = 0; n < niveles.length; n++) {
    const ordenes = lecciones.filter((l) => l.level === n).map((l) => l.order).sort((a, b) => a - b);
    if (ordenes.length === 0) { avisa(dir, `el nivel ${n} ("${niveles[n].nombre}") no tiene lecciones`); continue; }
    for (let i = 0; i < ordenes.length; i++) {
      if (ordenes[i] !== i + 1) { falla(dir, `nivel ${n}: la numeración salta (${ordenes.join(',')})`); break; }
    }
  }
}

{
  const fuente = await readFile(ICONOS, 'utf8');
  const mapa = /const TRACK_ICON[^{]*\{([\s\S]*?)^\};/m.exec(fuente);
  if (!mapa) falla(ICONOS, 'no se encuentra el objeto TRACK_ICON');
  else {
    const claves = new Set([...mapa[1].matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));
    for (const t of tracks) {
      if (!claves.has(t)) falla(ICONOS, `el track "${t}" no tiene icono en TRACK_ICON`);
    }
    for (const c of claves) {
      if (!tracks.has(c)) falla(ICONOS, `"${c}" tiene icono pero no existe ${TRACKS}/${c}.json`);
    }
  }
}

for (const m of fallos) console.error(`✗ ${m}`);
for (const m of avisos) console.warn(`⚠ ${m}`);
console.log(
  `\n${total} lecciones en ${carpetas.length} tracks · ${fallos.length} errores · ${avisos.length} avisos`,
);
process.exit(fallos.length ? 1 : 0);
