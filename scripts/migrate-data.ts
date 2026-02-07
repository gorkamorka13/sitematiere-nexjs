import { PrismaClient, ProjectType, ProjectStatus } from '@prisma/client';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// MySQL project row interface
interface MySQLProjectRow {
  id: number;
  nom: string;
  pays: string;
  latitude: string | number;
  longitude: string | number;
  texte: string;
  type: string;
  pin: string;
  prospection: number;
  etudes: number;
  fabrication: number;
  transport: number;
  construction: number;
  prochantier: string;
  chemin_images?: string;
  nombre_images?: number;
  plan?: string;
  chemin_flag?: string;
  chemin_client?: string;
}

async function migrateData() {
    // MySQL Connection details from environment variables
    const mysqlConfig = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'your_database_name',
    };

    console.log('Connecting to MySQL...');
    let mysqlConnection;
    try {
        mysqlConnection = await mysql.createConnection(mysqlConfig);
    } catch (error) {
        console.error('Failed to connect to MySQL. Please check your MYSQL_* environment variables in .env');
        process.exit(1);
    }

    // Fetch data from MySQL
    console.log('Fetching data from MySQL...');
    const [rows] = await mysqlConnection.execute('SELECT * FROM maps');

    // Create default admin user
    console.log('Creating default admin user...');
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
    }

    const typedRows = rows as MySQLProjectRow[];
    console.log(`Migrating ${typedRows.length} projects...`);

    // Migrate each project
    for (const row of typedRows) {
        try {
            const project = await prisma.project.create({
                data: {
                    name: row.nom,
                    country: row.pays,
                    latitude: parseFloat(String(row.latitude)) || 0,
                    longitude: parseFloat(String(row.longitude)) || 0,
                    description: row.texte,
                    type: mapProjectType(row.type),
                    status: mapProjectStatus(row.pin || ''),
                    prospection: row.prospection || 0,
                    studies: row.etudes || 0,
                    fabrication: row.fabrication || 0,
                    transport: row.transport || 0,
                    construction: row.construction || 0,
                    projectCode: row.prochantier,
                    ownerId: adminUser.id,
                },
            });

            // Migrate images
            // Assuming row.nombre_images exists based on the plan's logic
            if (row.chemin_images && row.nombre_images && row.nombre_images > 0) {
                for (let i = 1; i <= row.nombre_images; i++) {
                    await prisma.image.create({
                        data: {
                            url: `${row.chemin_images}${i}.jpg`,
                            order: i,
                            projectId: project.id,
                        },
                    });
                }
            }

            // Migrate documents
            if (row.plan) {
                await prisma.document.create({
                    data: {
                        url: row.plan,
                        name: `Plan ${row.nom}`,
                        type: 'PLAN',
                        projectId: project.id,
                    },
                });
            }

            if (row.chemin_flag) {
                await prisma.document.create({
                    data: {
                        url: row.chemin_flag,
                        name: `Drapeau ${row.pays}`,
                        type: 'FLAG',
                        projectId: project.id,
                    },
                });
            }

            if (row.chemin_client) {
                await prisma.document.create({
                    data: {
                        url: row.chemin_client,
                        name: `Logo client`,
                        type: 'CLIENT_LOGO',
                        projectId: project.id,
                    },
                });
            }
        } catch (err) {
            console.error(`Error migrating project ${row.nom}:`, err);
        }
    }

    console.log('Migration completed successfully!');
    await mysqlConnection.end();
    await prisma.$disconnect();
}

function mapProjectType(type: string): ProjectType {
    const mapping: Record<string, ProjectType> = {
        'PRS': ProjectType.PRS,
        'PEB': ProjectType.PEB,
        'MPB': ProjectType.MPB,
        'MXB': ProjectType.MXB,
        'UB': ProjectType.UB,
        'Passerelle': ProjectType.PASSERELLE,
        'Autre': ProjectType.AUTRE,
    };
    return mapping[type] || ProjectType.AUTRE;
}

function mapProjectStatus(pin: string): ProjectStatus {
    if (pin.includes('done')) return ProjectStatus.DONE;
    if (pin.includes('underconstruction')) return ProjectStatus.CURRENT;
    return ProjectStatus.PROSPECT;
}

migrateData().catch(console.error);
