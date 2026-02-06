const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function parseValue(val) {
    val = val.trim();
    if (val === 'NULL') return null;
    if (val.startsWith("'") && val.endsWith("'")) {
        // Remove surrounding quotes and handle escaped single quotes (though simple replacement might suffice for this dump)
        return val.substring(1, val.length - 1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    }
    return val;
}

// Function to split keys/values respecting quotes (simple implementation for this specific dump)
function splitSqlValues(line) {
    // Remove leading '(' and trailing '),' or ');'
    let content = line.trim();
    if (content.endsWith(',')) content = content.slice(0, -1);
    else if (content.endsWith(';')) content = content.slice(0, -1);

    if (content.startsWith('(')) content = content.slice(1);
    if (content.endsWith(')')) content = content.slice(0, -1);

    const result = [];
    let current = '';
    let inQuote = false;
    let escape = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (escape) {
            current += char;
            escape = false;
            continue;
        }

        if (char === '\\') {
            current += char; // Keep the backslash for now, cleaner checks later logic might vary
            escape = true;
            continue;
        }

        if (char === "'" && !escape) {
            inQuote = !inQuote;
            current += char;
            continue;
        }

        if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(parseValue);
}

function mapProjectType(type) {
    const mapping = {
        'PRS': 'PRS',
        'PEB': 'PEB',
        'MPB': 'MPB',
        'MXB': 'MXB',
        'UB': 'UB',
        'Passerelle': 'PASSERELLE',
        'Autre': 'AUTRE',
    };
    return mapping[type] || 'AUTRE';
}

function mapProjectStatus(pin) {
    if (!pin) return 'PROSPECT';
    if (pin.includes('done')) return 'DONE';
    if (pin.includes('underconstruction')) return 'CURRENT';
    return 'PROSPECT';
}

async function importData() {
    console.log('Reading maps.sql...');
    const sqlPath = path.join(__dirname, '..', '..', 'maps.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error(`File not found: ${sqlPath}`);
        // Fallback check in current dir
        const localPath = path.join(__dirname, '..', 'maps.sql');
        if (!fs.existsSync(localPath)) {
            console.error(`File not found in local dir either: ${localPath}`);
            process.exit(1);
        }
    }

    const fileContent = fs.readFileSync(sqlPath, 'utf8');
    const lines = fileContent.split('\n');

    // Create Admin User
    console.log('Ensuring admin user exists...');
    const adminEmail = 'admin';
    let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!adminUser) {
        adminUser = await prisma.user.create({
            data: {
                email: adminEmail,
                name: 'Administrateur',
                passwordHash: await bcrypt.hash('admin123', 12),
                role: 'ADMIN',
            },
        });
        console.log('Admin user created.');
    } else {
        console.log('Admin user already exists.');
    }

    let count = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        // Look for value lines. They start with '(' and usually contain data. 
        // In the dump provided, lines 62-170 matches data.
        if (trimmed.startsWith('(') && (trimmed.endsWith('),') || trimmed.endsWith(');'))) {
            try {
                const vals = splitSqlValues(trimmed);

                // MAPPING based on `INSERT INTO \`maps\` ...` structure from file
                // (`id`, `nom`, `prochantier`, `pays`, `latitude`, `longitude`, `chemin_images`, `texte`, `chemin_flag`, `plan`, `pin`, `prospection`, `etudes`, `fabrication`, `transport`, `construction`, `chemin_client`, `code`, `type`, `RecordDate`, `video`)

                const [
                    id, nom, prochantier, pays, latitude, longitude,
                    chemin_images, texte, chemin_flag, plan, pin,
                    prospection, etudes, fabrication, transport, construction,
                    chemin_client, code, type, recordDate, video
                ] = vals;

                // Create Project
                const project = await prisma.project.create({
                    data: {
                        name: nom || 'Sans nom',
                        country: pays || '',
                        latitude: parseFloat(latitude) || 0,
                        longitude: parseFloat(longitude) || 0,
                        description: texte || '',
                        type: mapProjectType(type),
                        status: mapProjectStatus(pin),
                        prospection: parseInt(prospection) || 0,
                        studies: parseInt(etudes) || 0,
                        fabrication: parseInt(fabrication) || 0,
                        transport: parseInt(transport) || 0,
                        construction: parseInt(construction) || 0,
                        projectCode: prochantier ? String(prochantier) : null,
                        ownerId: adminUser.id,
                    },
                });

                // Images logic (based on previous script logic assumption)
                // The logical assumption was: if chemin_images exists, assume some images.
                // But specifically the SQL doesn't have `nombre_images` column in the schema shown in lines 32-55!
                // Wait, reviewing the SQL content...
                // Line 40: `texte` text
                // ...
                // The INSERT statement (line 61) lists columns.
                // `id`, `nom`, `prochantier`, `pays`, `latitude`, `longitude`, `chemin_images`, `texte`, `chemin_flag`, `plan`, `pin`, `prospection`, `etudes`, `fabrication`, `transport`, `construction`, `chemin_client`, `code`, `type`, `RecordDate`, `video`
                // There is NO `nombre_images` column in the INSERT or CREATE TABLE.

                // The previous script `migrate-data.ts` used `row.nombre_images`, but that column seems missing from this dump?
                // Checking the SQL file again...
                // CREATE TABLE `maps`...
                // No `nombre_images`.
                // However, `chemin_images` is 'images/sewa/sewa'.
                // Maybe the previous logic was flawed or based on a different version.
                // I will add a single image based on `chemin_images` + .jpg if it helps, 
                // but without a count, I can't generate the loop correctly.
                // I'll try to add just one main image if `chemin_images` is present.
                // Actually, looking at the dump: 'images/sewa/sewa'
                // Often in php code it was doing `$chemin_images . $i . '.jpg'`.
                // Without `nombre_images`, I cannot guess how many.
                // Safe bet: Add one image as cover if `chemin_images` is not null.

                if (chemin_images) {
                    // Try adding image 1
                    await prisma.image.create({
                        data: {
                            url: `${chemin_images}1.jpg`, // Assumption based on typical pattern e.g. path/name1.jpg
                            order: 1,
                            projectId: project.id,
                        },
                    });
                }

                // Documents
                if (plan && plan.length > 0) {
                    await prisma.document.create({
                        data: {
                            url: plan,
                            name: `Plan ${nom}`,
                            type: 'PLAN',
                            projectId: project.id,
                        },
                    });
                }

                if (chemin_flag && chemin_flag.length > 0) {
                    await prisma.document.create({
                        data: {
                            url: chemin_flag,
                            name: `Drapeau ${pays}`,
                            type: 'FLAG',
                            projectId: project.id,
                        },
                    });
                }

                if (chemin_client && chemin_client.length > 0) {
                    await prisma.document.create({
                        data: {
                            url: chemin_client,
                            name: `Logo client`,
                            type: 'CLIENT_LOGO',
                            projectId: project.id,
                        },
                    });
                }

                count++;
            } catch (err) {
                console.error(`Failed to import line: ${trimmed.substring(0, 50)}...`);
                console.error(err);
            }
        }
    }

    console.log(`Import completed. Imported ${count} projects.`);
    await prisma.$disconnect();
}

importData().catch(e => {
    console.error(e);
    process.exit(1);
});
