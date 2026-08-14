import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const ROOT_URL = new URL('../..', import.meta.url);
const ROOT = fileURLToPath(ROOT_URL);

function buildDb(): void {
  const res = spawnSync(process.execPath, ['scripts/build-db.mjs'], { cwd: ROOT, stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`build-db exited with status ${res.status}`);
}

export default function catalog(): AstroIntegration {
  return {
    name: 'catalog',
    hooks: {
      'astro:config:setup': ({ addWatchFile, command }) => {
        if (command === 'preview') return;
        buildDb();
        // Schema or seed edits restart the dev server, which re-runs buildDb.
        addWatchFile(new URL('db/schema.sql', ROOT_URL));
        for (const seed of readdirSync(new URL('db/seeds', ROOT_URL))) {
          addWatchFile(new URL(`db/seeds/${seed}`, ROOT_URL));
        }
      },
      'astro:server:setup': ({ server }) => {
        // Lesson frontmatter feeds the lesson table: rebuild the db on .mdx
        // changes and force content.ts to re-import against the fresh file.
        const contentModule = join(ROOT, 'src/data/content.ts');
        let timer: ReturnType<typeof setTimeout> | undefined;
        const onChange = (file: string) => {
          if (!file.includes('src/content/guia/') || !file.endsWith('.mdx')) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            try {
              buildDb();
            } catch {
              return; // build-db already reported the failure on stderr
            }
            for (const mod of server.moduleGraph.getModulesByFile(contentModule) ?? []) {
              server.moduleGraph.invalidateModule(mod);
            }
            server.ws.send({ type: 'full-reload' });
          }, 300);
        };
        server.watcher.on('add', onChange);
        server.watcher.on('change', onChange);
        server.watcher.on('unlink', onChange);
      },
    },
  };
}
