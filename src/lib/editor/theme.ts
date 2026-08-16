// The editor's skin, built from the site tokens so it follows the three themes
// with no per-theme copy. CodeMirror is themed from JS — its official route —
// which also keeps the selectors out of the site's global CSS.
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';

const chrome = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--crust)', color: 'var(--text)', fontSize: '0.95rem' },
    '.cm-content': { fontFamily: 'var(--font-mono)', padding: '0.75rem 0' },
    '.cm-line': { padding: '0 0.85rem' },
    '.cm-gutters': {
      backgroundColor: 'var(--crust)',
      color: 'var(--overlay0)',
      border: 'none',
      paddingLeft: '0.35rem',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--surface0) 45%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--subtext1)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
    /* Normal-mode block cursor; the vim plugin paints it with this class. */
    '.cm-fat-cursor': { background: 'var(--mauve)', color: 'var(--crust)' },
    '&:not(.cm-focused) .cm-fat-cursor': {
      background: 'transparent',
      outline: '1px solid var(--overlay1)',
      color: 'inherit',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--surface1)',
    },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
      backgroundColor: 'color-mix(in srgb, var(--overlay0) 40%, transparent)',
      outline: 'none',
    },
    '.cm-vim-panel': {
      backgroundColor: 'var(--mantle)',
      color: 'var(--text)',
      fontFamily: 'var(--font-mono)',
      padding: '0 0.85rem',
    },
    '.cm-vim-panel input': { color: 'var(--text)', fontFamily: 'var(--font-mono)' },
    '.cm-tooltip': {
      backgroundColor: 'var(--mantle)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-sm)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'var(--surface0)',
      color: 'var(--text)',
    },
  },
  { dark: true },
);

/* Same reading as the Shiki themes: keyword mauve, string green, number peach. */
const syntax = HighlightStyle.define([
  { tag: [t.keyword, t.moduleKeyword, t.controlKeyword], color: 'var(--mauve)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--green)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--peach)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--overlay0)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: 'var(--blue)' },
  { tag: [t.typeName, t.className, t.namespace], color: 'var(--yellow)' },
  { tag: [t.operator, t.operatorKeyword, t.derefOperator], color: 'var(--sky)' },
  { tag: [t.propertyName, t.attributeName], color: 'var(--lavender)' },
  { tag: [t.variableName, t.labelName], color: 'var(--text)' },
  { tag: [t.constant(t.variableName), t.standard(t.variableName)], color: 'var(--peach)' },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: 'var(--text)' },
  { tag: [t.punctuation, t.separator, t.bracket], color: 'var(--overlay2)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--blue)' },
  { tag: [t.meta, t.processingInstruction], color: 'var(--subtext0)' },
  { tag: [t.heading], color: 'var(--mauve)', fontWeight: 'bold' },
  { tag: [t.link, t.url], color: 'var(--sapphire)', textDecoration: 'underline' },
  { tag: [t.emphasis], fontStyle: 'italic' },
  { tag: [t.strong], fontWeight: 'bold' },
  { tag: [t.strikethrough], textDecoration: 'line-through' },
  { tag: [t.invalid], color: 'var(--red)' },
]);

export const theme: Extension = [chrome, syntaxHighlighting(syntax)];
