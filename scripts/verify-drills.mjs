// The oracle: every interactive exercise runs against a REAL Neovim.
//
//   node scripts/verify-drills.mjs [track]
//
// Pulls the <Exercise> blocks that carry doc/solution/goal out of the MDX,
// replays the solution in `nvim --clean --headless` through feedkeys, and
// compares the resulting buffer with the goal. If they diverge, either the
// solution is wrong or the browser emulation does not cover that command: in
// both cases the exercise must not ship as interactive. Run it in CI.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GUIDE = 'src/content/guide';
const track = process.argv[2] ?? 'neovim';

// nvim is the preferred oracle; failing that, a Vim >=8 with --clean behaves
// the same for everything these exercises exercise (ORACLE_BIN forces it).
let bin = process.env.ORACLE_BIN ?? 'nvim';
let isNvim = true;
try {
  execFileSync(bin, ['--version'], { stdio: 'pipe' });
  isNvim = !/^VIM - Vi IMproved/m.test(String(execFileSync(bin, ['--version'], { stdio: 'pipe' })));
} catch {
  try {
    bin = 'vim';
    execFileSync(bin, ['--version'], { stdio: 'pipe' });
    isNvim = false;
    console.warn('⚠ sin nvim: usando vim clásico como oráculo (equivalente para estos drills)');
  } catch {
    console.error('✗ ni `nvim` ni `vim` en el PATH.');
    process.exit(2);
  }
}

/** Pulls the attributes out of each multiline <Exercise …> with doc + solution. */
function extractExercises(text, file) {
  const found = [];
  const re = /<Exercise\b/g;
  let m;
  while ((m = re.exec(text))) {
    // the tag window: up to a ">" alone on its line (interactive form), the
    // "/>" of a self-close, the </Exercise> of an accordion, or the next
    // <Exercise — whichever comes first, so two never blend into one
    const rest = text.slice(m.index);
    const bounds = [/\n>\s*\n/, /\/>/, /<\/Exercise>/, /(?!^)<Exercise\b/m]
      .map((r) => rest.slice(1).search(r) + 1)
      .filter((i) => i > 0);
    if (bounds.length === 0) continue;
    const tag = rest.slice(0, Math.min(...bounds));
    const attr = (name) => {
      const r = new RegExp(`${name}=\\{(('(?:\\\\.|[^'\\\\])*')|("(?:\\\\.|[^"\\\\])*")|(\\[[^\\]]*\\])|(\\d+))\\}`);
      const hit = r.exec(tag);
      if (!hit) return undefined;
      // a JS expression from our own content: evaluating it is safe
      return new Function(`return (${hit[1]})`)();
    };
    const doc = attr('doc');
    const solution = attr('solution');
    if (doc === undefined || solution === undefined) continue;
    found.push({
      file,
      challenge: /challenge="([^"]*)"/.exec(tag)?.[1] ?? '(sin enunciado)',
      doc,
      cursor: attr('cursor') ?? [1, 0],
      goal: attr('goal'),
      goalCursor: attr('goalCursor'),
      setup: attr('setup'),
      solution,
    });
  }
  return found;
}

/** "ci\"adiós<Esc>" -> a string for feedkeys() inside vimscript double quotes */
function toFeedkeys(keys) {
  return keys
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    // <Esc>, <CR>, <C-v>… become the \<...> notation vimscript expands
    .replace(/<([^<>]+)>/g, '\\<$1>')
    // real newlines LAST: any earlier and the rule above would re-escape the
    // <CR> it just created, and it would arrive as literal text
    .replaceAll('\n', '\\<CR>');
}

const dir = mkdtempSync(join(tmpdir(), 'drills-'));
let total = 0;
let bad = 0;

for (const f of readdirSync(join(GUIDE, track)).filter((f) => f.endsWith('.mdx'))) {
  const exercises = extractExercises(readFileSync(join(GUIDE, track, f), 'utf8'), f);
  for (const d of exercises) {
    total += 1;
    const input = join(dir, 'in.txt');
    const output = join(dir, 'out.txt');
    const posFile = join(dir, 'pos.txt');
    writeFileSync(input, d.doc.endsWith('\n') || d.doc === '' ? d.doc : d.doc + '\n');
    const keys = toFeedkeys((d.setup ?? '') + d.solution);
    const [line, col] = d.cursor;
    try {
      execFileSync(
        bin,
        [
          '--clean', ...(isNvim ? ['--headless'] : ['--not-a-term', '-X']), '-n', input,
          '-c', `call cursor(${line},${col + 1})`,
          // 'tx': the t makes the keys count as TYPED — without it, recording
          // a macro (q…q) captures an empty register
          '-c', `call feedkeys("${keys}", 'tx')`,
          '-c', `call writefile([line('.') . ',' . (col('.') - 1)], '${posFile}')`,
          '-c', `silent! write! ${output}`,
          '-c', 'qa!',
        ],
        { stdio: 'pipe', timeout: 10_000 },
      );
      const got = readFileSync(output, 'utf8').replace(/\n$/, '');
      const want = (d.goal ?? d.doc).replace(/\n$/, '');
      const [rl, rc] = readFileSync(posFile, 'utf8').trim().split(',').map(Number);
      const docOk = got === want;
      const curOk = !d.goalCursor || (rl === d.goalCursor[0] && rc === d.goalCursor[1]);
      if (docOk && curOk) {
        console.log(`✓ ${f} · ${d.challenge.slice(0, 60)}`);
      } else {
        bad += 1;
        console.error(`✗ ${f} · ${d.challenge.slice(0, 60)}`);
        if (!docOk) console.error(`    buffer real:    ${JSON.stringify(got)}\n    buffer esperado: ${JSON.stringify(want)}`);
        if (!curOk) console.error(`    cursor real: [${rl},${rc}] · esperado: [${d.goalCursor}]`);
      }
    } catch (e) {
      bad += 1;
      console.error(`✗ ${f} · ${d.challenge.slice(0, 60)} — nvim falló: ${e.message?.split('\n')[0]}`);
    }
  }
}

rmSync(dir, { recursive: true, force: true });
console.log(`\n${total} drills contra nvim real · ${bad} divergencias`);
process.exit(bad ? 1 : 0);
