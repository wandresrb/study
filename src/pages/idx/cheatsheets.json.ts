import type { APIRoute } from 'astro';

import { cheatsheetTracks, getCheatsheet, getTrack } from '../../data/content';

// Every shortcut of every cheatsheet as [trackId, trackName, keys, action]:
// lets the palette search a keybinding across all 28 sheets at once. Fetched
// lazily by the palette; cache policy in public/_headers (/idx/*).
export const GET: APIRoute = () => {
  const shortcuts: [string, string, string, string][] = [];
  for (const id of cheatsheetTracks()) {
    const name = getTrack(id).name;
    for (const cat of getCheatsheet(id).cats) {
      for (const item of cat.items) shortcuts.push([id, name, item.keys, item.action]);
    }
  }
  return new Response(JSON.stringify({ v: 1, shortcuts }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
