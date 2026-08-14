export const fileTitleTransformer = {
  name: 'file-title',
  pre(this: { options?: { meta?: { __raw?: string } } }, node: { properties?: Record<string, unknown> }) {
    const raw = this?.options?.meta?.__raw ?? '';
    const m = /title="([^"]+)"/.exec(raw);
    if (m) {
      node.properties = node.properties || {};
      node.properties['data-title'] = m[1];
    }
  },
};
