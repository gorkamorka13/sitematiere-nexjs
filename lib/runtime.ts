// Runtime configuration - Edge for Cloudflare, Node for local
export const runtime = process.env.CF_PAGES === '1' ? 'edge' : undefined;
