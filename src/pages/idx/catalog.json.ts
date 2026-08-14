import type { APIRoute } from 'astro';

import { getTracks, lessonsOf } from '../../data/content';

// The palette's lazy catalog: every lesson of every written track as compact
// arrays [title, id, position]. The client derives the url (/guia/{id}/) and
// the track (id prefix), and folds titles itself — shipping a folded copy
// would double the payload. Cache policy lives in public/_headers (/idx/*).
export const GET: APIRoute = () => {
  const lessons: [string, string, string][] = [];
  for (const track of getTracks().filter((t) => t.status === 'written')) {
    for (const l of lessonsOf(track.id)) lessons.push([l.title, l.id, l.position]);
  }
  return new Response(JSON.stringify({ v: 1, lessons }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
