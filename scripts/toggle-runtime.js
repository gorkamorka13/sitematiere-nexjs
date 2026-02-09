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

    // Pattern to match the runtime export line, whether commented or not, with optional trailing comments
    const runtimeRegex = /^(\/\/ )*export const runtime = ['"]edge['"];.*$/gm;

    if (mode === 'cloudflare') {
        // Mode Cloudflare: Force uncommented version
        newContent = content.replace(runtimeRegex, "export const runtime = 'edge';");
    } else {
        // Mode Local: Force commented version
        newContent = content.replace(runtimeRegex, "// export const runtime = 'edge'; // Commenté pour le dev local");
    }

    if (content !== newContent) {
        fs.writeFileSync(absolutePath, newContent, 'utf8');
        console.log(`Updated ${relativePath} to ${mode} mode.`);
    } else {
        console.log(`${relativePath} is already in ${mode} mode.`);
    }
});

console.log(`\nFinished switching to ${mode.toUpperCase()} mode.`);
