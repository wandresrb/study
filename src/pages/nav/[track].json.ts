import type { APIRoute } from 'astro';

import { getLevels, getTracks, lessonsOf } from '../../data/content';

export function getStaticPaths() {
  return getTracks()
    .filter((t) => t.status === 'written')
    .map((t) => ({ params: { track: t.id } }));
}

export const GET: APIRoute = ({ params }) => {
  const track = params.track!;
  const levels = getLevels(track);
  const lessons = lessonsOf(track);

  const body = levels
    .map((n) => ({
      id: n.idx,
      items: lessons
        .filter((l) => l.level === n.idx)
        .map((l) => ({ u: `/guia/${l.id}/`, t: l.title, n: l.position })),
    }))
    .filter((n) => n.items.length > 0);

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
};
