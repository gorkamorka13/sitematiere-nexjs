const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_NAME = "sitematiere-nexjs";
const ENV_FILE = '.env.production';

// Variables qui ne sont PAS des secrets (publiques)
const PUBLIC_VAR_PREFIXES = ['NEXT_PUBLIC_', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'NEXTAUTH_URL'];

async function syncEnv() {
    const envPath = path.join(process.cwd(), ENV_FILE);
    if (!fs.existsSync(envPath)) {
        console.error(`Erreur: Fichier ${ENV_FILE} introuvable.`);
        return;
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');

    console.log(`🚀 Synchronisation de ${ENV_FILE} vers le projet Cloudflare: ${PROJECT_NAME}...\n`);

    for (const line of lines) {
        // Ignorer les commentaires et lignes vides
        if (!line.trim() || line.startsWith('#')) continue;

        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, ''); // Enlever les quotes

        if (!key || !value) continue;

        const isPublic = PUBLIC_VAR_PREFIXES.some(prefix => key.startsWith(prefix));

        try {
            if (isPublic) {
                // Optionnel : On pourrait mettre à jour wrangler.json ici, 
                // mais pour l'instant on les définit comme variables de projet simples
                console.log(`📡 Variable: ${key}=${value.substring(0, 5)}...`);
                // Note: La CLI Pages ne permet pas encore de mettre des variables simples "on the fly" facilement, 
                // donc on les met toutes en secrets pour plus de sécurité et de simplicité de script
                execSync(`echo ${value} | npx wrangler pages secret put ${key} --project-name ${PROJECT_NAME}`, { stdio: 'ignore' });
            } else {
                console.log(`🔐 Secret:   ${key}=********`);
                execSync(`echo ${value} | npx wrangler pages secret put ${key} --project-name ${PROJECT_NAME}`, { stdio: 'ignore' });
            }
        } catch (error) {
            console.error(`❌ Échec pour ${key}`);
        }
    }

    console.log("\n✅ Terminé ! Toutes vos variables sont synchronisées sur Cloudflare.");
}

syncEnv();
