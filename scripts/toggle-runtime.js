const fs = require('fs');
const path = require('path');

const mode = process.argv[2]; // 'local' or 'cloudflare'

if (!['local', 'cloudflare'].includes(mode)) {
    console.error('Usage: node scripts/toggle-runtime.js [local|cloudflare]');
    process.exit(1);
}

const files = [
    'app/page.tsx',
    'app/projects/[id]/page.tsx',
    'app/api/auth/[...nextauth]/route.ts',
    'app/api/files/[id]/route.ts',
    'app/api/files/delete/route.ts',
    'app/api/files/list/route.ts',
    'app/api/files/serve/[...key]/route.ts',
    'app/api/files/upload/route.ts',
    'app/api/files/rename/route.ts',
    'app/api/files/statistics/route.ts',
    'app/api/users/route.ts',
    'app/api/blob-proxy/route.ts',
    'app/api/blob-url/route.ts'
];

files.forEach(relativePath => {
    const absolutePath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found: ${relativePath}`);
        return;
    }

    let content = fs.readFileSync(absolutePath, 'utf8');
    let newContent;

    if (mode === 'cloudflare') {
        // Uncomment: remove // from the start of the line or before export const runtime
        // Matches: // export const runtime = 'edge'; or //export const runtime = 'edge';
        newContent = content.replace(/\/\/ ?(export const runtime = ['"]edge['"];?)/g, '$1');
    } else {
        // Comment: add // before export const runtime if not already present
        // Matches: export const runtime = 'edge'; but not // export const runtime = 'edge';
        newContent = content.replace(/^(?!\/\/)(export const runtime = ['"]edge['"];?)/gm, '// $1 // Commenté pour le dev local');
    }

    if (content !== newContent) {
        fs.writeFileSync(absolutePath, newContent, 'utf8');
        console.log(`Updated ${relativePath} to ${mode} mode.`);
    } else {
        console.log(`${relativePath} is already in ${mode} mode.`);
    }
});

console.log(`\nFinished switching to ${mode.toUpperCase()} mode.`);
