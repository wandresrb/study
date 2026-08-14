import type { APIRoute } from 'astro';

import { getTeaches, getTracks, getUnlocks } from '../../data/content';

// The ontology graph for the client: teaches edges [concept, track, level,
// weight], unlocks edges [source, target] and track display names. Feeds the
// «qué leo ahora» widget on /cs/. Cache policy in public/_headers (/idx/*).
export const GET: APIRoute = () => {
  const body = {
    v: 1,
    teaches: getTeaches(),
    unlocks: getUnlocks(),
    tracks: getTracks().map((t) => [t.id, t.name] as [string, string]),
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
};
