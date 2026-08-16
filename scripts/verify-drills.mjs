// El oráculo: cada drill interactivo se ejecuta contra un Neovim REAL.
//
//   node scripts/verify-drills.mjs [track]
//
// Extrae de los MDX los <Drill> con doc/solucion/objetivo, reproduce la
// solución en `nvim --clean --headless` con feedkeys, y compara el buffer
// resultante con el objetivo. Si divergen, o la solución está mal o la
// emulación del navegador no cubre ese comando: en ambos casos el drill no
// debe publicarse como interactivo. Correr en CI con neovim instalado.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GUIA = 'src/content/guia';
const track = process.argv[2] ?? 'neovim';

// El oráculo preferido es nvim; si no está, un Vim ≥8 con --clean se comporta
// igual para todo lo que estos drills ejercitan (ORACULO_BIN lo fuerza).
let bin = process.env.ORACULO_BIN ?? 'nvim';
let esNvim = true;
try {
  execFileSync(bin, ['--version'], { stdio: 'pipe' });
  esNvim = !/^VIM - Vi IMproved/m.test(String(execFileSync(bin, ['--version'], { stdio: 'pipe' })));
} catch {
  try {
    bin = 'vim';
    execFileSync(bin, ['--version'], { stdio: 'pipe' });
    esNvim = false;
    console.warn('⚠ sin nvim: usando vim clásico como oráculo (equivalente para estos drills)');
  } catch {
    console.error('✗ ni `nvim` ni `vim` en el PATH.');
    process.exit(2);
  }
}

/** Extrae los atributos de cada <Drill …> multilínea con doc y solucion. */
function extraerDrills(texto, fichero) {
  const drills = [];
  const re = /<Exercise\b/g;
  let m;
  while ((m = re.exec(texto))) {
    // la ventana del tag: hasta el ">" solo en su línea (drills interactivos),
    // el "/>" de un autocierre, el cierre </Drill> de un accordion, o el
    // siguiente <Drill — lo primero que llegue, para no mezclar drills
    const resto = texto.slice(m.index);
    const limites = [/\n>\s*\n/, /\/>/, /<\/Exercise>/, /(?!^)<Exercise\b/m]
      .map((r) => resto.slice(1).search(r) + 1)
      .filter((i) => i > 0);
    if (limites.length === 0) continue;
    const tag = resto.slice(0, Math.min(...limites));
    const attr = (nombre) => {
      const r = new RegExp(`${nombre}=\\{(('(?:\\\\.|[^'\\\\])*')|("(?:\\\\.|[^"\\\\])*")|(\\[[^\\]]*\\])|(\\d+))\\}`);
      const hit = r.exec(tag);
      if (!hit) return undefined;
      // es una expresión JS de nuestro propio contenido: evaluarla es seguro
      return new Function(`return (${hit[1]})`)();
    };
    const doc = attr('doc');
    const solution = attr('solution');
    if (doc === undefined || solution === undefined) continue;
    drills.push({
      file: fichero,
      challenge: /challenge="([^"]*)"/.exec(tag)?.[1] ?? '(sin enunciado)',
      doc,
      cursor: attr('cursor') ?? [1, 0],
      goal: attr('goal'),
      goalCursor: attr('goalCursor'),
      setup: attr('setup'),
      solution,
    });
  }
  return drills;
}

/** "ci\"adiós<Esc>" → cadena para feedkeys() entre comillas dobles de vimscript */
function aFeedkeys(teclas) {
  return teclas
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    // <Esc>, <CR>, <C-v>… pasan a notación \<...> que vimscript expande
    .replace(/<([^<>]+)>/g, '\\<$1>')
    // y los saltos de línea reales, al FINAL: si fuera antes, la regla de
    // arriba re-escaparía el <CR> recién creado y llegaría como texto
    .replaceAll('\n', '\\<CR>');
}

const dir = mkdtempSync(join(tmpdir(), 'drills-'));
let total = 0;
let mal = 0;

for (const f of readdirSync(join(GUIA, track)).filter((f) => f.endsWith('.mdx'))) {
  const drills = extraerDrills(readFileSync(join(GUIA, track, f), 'utf8'), f);
  for (const d of drills) {
    total += 1;
    const entrada = join(dir, 'in.txt');
    const salida = join(dir, 'out.txt');
    const posicion = join(dir, 'pos.txt');
    writeFileSync(entrada, d.doc.endsWith('\n') || d.doc === '' ? d.doc : d.doc + '\n');
    const teclas = aFeedkeys((d.setup ?? '') + d.solution);
    const [lin, col] = d.cursor;
    try {
      execFileSync(
        bin,
        [
          '--clean', ...(esNvim ? ['--headless'] : ['--not-a-term', '-X']), '-n', entrada,
          '-c', `call cursor(${lin},${col + 1})`,
          // 'tx': la t hace que las teclas cuenten como TECLEADAS — sin ella,
          // una grabación de macro (q…q) captura un registro vacío
          '-c', `call feedkeys("${teclas}", 'tx')`,
          '-c', `call writefile([line('.') . ',' . (col('.') - 1)], '${posicion}')`,
          '-c', `silent! write! ${salida}`,
          '-c', 'qa!',
        ],
        { stdio: 'pipe', timeout: 10_000 },
      );
      const res = readFileSync(salida, 'utf8').replace(/\n$/, '');
      const esperado = (d.goal ?? d.doc).replace(/\n$/, '');
      const [rl, rc] = readFileSync(posicion, 'utf8').trim().split(',').map(Number);
      const docOk = res === esperado;
      const curOk = !d.goalCursor || (rl === d.goalCursor[0] && rc === d.goalCursor[1]);
      if (docOk && curOk) {
        console.log(`✓ ${f} · ${d.challenge.slice(0, 60)}`);
      } else {
        mal += 1;
        console.error(`✗ ${f} · ${d.reto.slice(0, 60)}`);
        if (!docOk) console.error(`    buffer real:    ${JSON.stringify(res)}\n    buffer esperado: ${JSON.stringify(esperado)}`);
        if (!curOk) console.error(`    cursor real: [${rl},${rc}] · esperado: [${d.goalCursor}]`);
      }
    } catch (e) {
      mal += 1;
      console.error(`✗ ${f} · ${d.reto.slice(0, 60)} — nvim falló: ${e.message?.split('\n')[0]}`);
    }
  }
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n${total} drills contra nvim real · ${mal} divergencias`);
process.exit(mal ? 1 : 0);
