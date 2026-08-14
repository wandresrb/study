import type { APIRoute } from 'astro';

import { getConcepts, getTracks, lessonsOf } from '../../data/content';

// The palette's lazy catalog: every lesson of every written track as compact
// arrays [title, id, position], plus the concept pages as [name, id]. The
// client derives the urls (/guide/{id}/, /concepts/{id}/) and folds titles
// itself — shipping a folded copy would double the payload. Cache policy
// lives in public/_headers (/idx/*).
export const GET: APIRoute = () => {
  const lessons: [string, string, string][] = [];
  for (const track of getTracks().filter((t) => t.status === 'written')) {
    for (const l of lessonsOf(track.id)) lessons.push([l.title, l.id, l.position]);
  }
  const concepts: [string, string][] = getConcepts().map((c) => [c.name, c.id]);
  return new Response(JSON.stringify({ v: 1, lessons, concepts }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
