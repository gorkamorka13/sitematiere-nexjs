const fs = require('fs');
const path = require('path');

const mode = process.argv[2]; // 'local' or 'cloudflare'

if (!['local', 'cloudflare'].includes(mode)) {
    console.error('Usage: node scripts/toggle-runtime.js [local|cloudflare]');
    process.exit(1);
}

const files = [
    'app/layout.tsx', // Ajout du layout global
    'app/page.tsx',
    'app/projects/[id]/page.tsx',
    'app/api/auth/[...nextauth]/route.ts',
    'app/api/files/[id]/route.ts',
    'app/api/files/bulk-move/route.ts',
    'app/api/files/delete/route.ts',
    'app/api/files/list/route.ts',
    'app/api/files/serve/[...key]/route.ts',
    'app/api/files/upload/route.ts',
    'app/api/files/rename/route.ts',
    'app/api/files/restore/route.ts',
    'app/api/files/statistics/route.ts',
    'app/api/users/route.ts',
    'app/api/blob-proxy/route.ts',
    'app/api/blob-url/route.ts',
    'app/api/create-user/route.ts',
    'app/api/debug/route.ts',
    'app/api/debug/auth/route.ts',
    'app/api/debug/health/route.ts',
    'app/api/projects/route.ts',
    'app/api/proxy/route.ts',
    'app/(auth)/login/page.tsx',
    'app/slideshow/view/[projectId]/page.tsx',
    'app/export-db/page.tsx',
    'app/actions/project-media.ts',
    'app/actions/project-actions.ts',
    'app/actions/slideshow-actions.ts',
    'app/actions/video-actions.ts'
];

files.forEach(relativePath => {
    const absolutePath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found: ${relativePath}`);
        return;
    }

    let content = fs.readFileSync(absolutePath, 'utf8');
    let newContent;

    // Pattern to match the runtime export line
    const runtimeRegex = /^(\/\/ )*export const runtime = ['"]edge['"];.*$/gm;

    if (mode === 'cloudflare') {
        newContent = content.replace(runtimeRegex, "export const runtime = 'edge';");
    } else {
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
