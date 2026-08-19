// The site's one search normalization. Build (build-db's search column),
// palette, sidebar filter and cheatsheet filter must all agree on it.
export const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
