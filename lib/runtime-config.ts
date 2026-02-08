// Enable Edge Runtime only on Cloudflare (not in local dev)
export const runtime = process.env.CF_PAGES ? 'edge' : undefined;
