import { compile } from '@tailwindcss/node'
import fs from 'node:fs'

const root = '/Users/willy/Documents/Claude/nvim-dios'
const css = fs.readFileSync(root + '/src/styles/global.css', 'utf8')

const compiler = await compile(css, {
  base: root + '/src/styles',
  onDependency: () => {},
})

const candidates = [
  'prose', 'prose-invert', 'max-w-none',
  'd-btn', 'd-btn-sm', 'd-btn-active', 'd-join', 'd-join-item',
  'd-dropdown', 'd-dropdown-end', 'd-dropdown-content',
  'max-w-[calc(var(--reading-measure)*1ch)]',
  'text-(length:--reading-size)',
  'd-card', 'd-menu', 'd-breadcrumbs', 'd-drawer', 'd-drawer-open',
]
const out = compiler.build(candidates)
fs.writeFileSync('/Users/willy/.claude/jobs/53428303/tmp/out.css', out)
console.log('bytes', out.length)
