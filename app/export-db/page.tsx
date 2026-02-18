import { db } from "@/lib/db";
import { users, projects, files, slideshowImages, images, videos, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

import Link from "next/link";
import { Database, FileJson, FileText, ArrowLeft, Download, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExportDatabasePage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const { password } = await searchParams;
  const session = await auth();

  const isAdmin = session?.user?.role === "ADMIN";

  if (!isAdmin || password !== "export2026") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex shadow-inner items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl border border-red-100 dark:border-red-900/30 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accès Restreint</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {!isAdmin
              ? "Vous devez être administrateur pour accéder à cette page."
              : "Le mot de passe d'exportation est invalide."}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors mt-4">
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  try {
    const [userRecords, projectRecords, fileRecords, slideshowImageRecords] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        role: users.role,
        color: users.color,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users),
      db.select().from(projects),
      db.select().from(files),
      db.select().from(slideshowImages)
    ]);

    const projectWithRelations = await Promise.all(
      projectRecords.map(async (project) => {
        const [projectImages, projectVideos, projectDocuments] = await Promise.all([
          db.select().from(images).where(eq(images.projectId, project.id)),
          db.select().from(videos).where(eq(videos.projectId, project.id)),
          db.select().from(documents).where(eq(documents.projectId, project.id))
        ]);
        return {
          ...project,
          images: projectImages,
          videos: projectVideos,
          documents: projectDocuments
        };
      })
    );

    const fullBackup = {
      metadata: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        stats: {
          users: userRecords.length,
          projects: projectRecords.length,
          files: fileRecords.length,
        }
      },
      users: userRecords,
      projects: projectWithRelations,
      files: fileRecords,
      slideshowImages: slideshowImageRecords
    };
    const jsonString = JSON.stringify(fullBackup, null, 2);

    const projectCsvHeader = "id,name,country,latitude,longitude,type,status,projectCode,createdAt\n";
    const projectCsvRows = projectRecords.map(p => {
      const escape = (val: unknown) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        p.id, p.name, p.country, p.latitude, p.longitude, p.type, p.status, p.projectCode, p.createdAt.toISOString()
      ].map(escape).join(',');
    }).join('\n');
    const projectCsv = projectCsvHeader + projectCsvRows;

    let sql = `-- Matiere DB Export Backup\n-- Generated: ${new Date().toISOString()}\n\n`;

    const q = (val: unknown) => val === null || val === undefined ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`;

    sql += "-- USERS\n";
    userRecords.forEach(u => {
      sql += `INSERT INTO users (id, email, name, username, role, color, "createdAt", "updatedAt") VALUES (${q(u.id)}, ${q(u.email)}, ${q(u.name)}, ${q(u.username)}, ${q(u.role)}, ${q(u.color)}, ${q(u.createdAt.toISOString())}, ${q(u.updatedAt.toISOString())}) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, role=EXCLUDED.role;\n`;
    });

    sql += "\n-- PROJECTS\n";
    projectRecords.forEach(p => {
      sql += `INSERT INTO projects (id, name, country, latitude, longitude, description, type, status, "ownerId", "projectCode", "createdAt", "updatedAt") VALUES (${q(p.id)}, ${q(p.name)}, ${q(p.country)}, ${p.latitude}, ${p.longitude}, ${q(p.description)}, ${q(p.type)}, ${q(p.status)}, ${q(p.ownerId)}, ${q(p.projectCode)}, ${q(p.createdAt.toISOString())}, ${q(p.updatedAt.toISOString())}) ON CONFLICT (id) DO NOTHING;\n`;
    });

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centre d&apos;Exportation</h1>
                <p className="text-gray-500 text-sm">Sauvegarde complète de votre plateforme Matière</p>
              </div>
            </div>
            <Link href="/" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" />
              Quitter l&apos;Export
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Utilisateurs", count: userRecords.length, color: "text-blue-500" },
              { label: "Projets", count: projectRecords.length, color: "text-green-500" },
              { label: "Fichiers", count: fileRecords.length, color: "text-orange-500" },
              { label: "Média", count: projectWithRelations.reduce((acc, p) => acc + p.images.length + p.videos.length, 0), color: "text-purple-500" }
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <FileJson className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sauvegarde JSON</h3>
                <p className="text-sm text-gray-500 mb-6">Backup intégral structurel. Idéal pour les migrations ou la restauration totale.</p>
              </div>
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`}
                download={`matiere_backup_${new Date().toISOString().split('T')[0]}.json`}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none"
              >
                <Download className="w-4 h-4" />
                Télécharger JSON
              </a>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Données CSV</h3>
                <p className="text-sm text-gray-500 mb-6">Format Excel/Tableur. Liste des projets simplifiée pour analyse de données.</p>
              </div>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(projectCsv)}`}
                download={`projets_matiere_${new Date().toISOString().split('T')[0]}.csv`}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none"
              >
                <Download className="w-4 h-4" />
                Télécharger CSV
              </a>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Dump SQL</h3>
                <p className="text-sm text-gray-500 mb-6">Script SQL compatible PostgreSQL pour restaurer la base manuellement.</p>
              </div>
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(sql)}`}
                download={`dump_sql_matiere_${new Date().toISOString().split('T')[0]}.sql`}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <Download className="w-4 h-4" />
                Télécharger SQL
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aperçu du Backup (JSON)</h4>
            </div>
            <pre className="p-6 text-[10px] font-mono text-gray-500 dark:text-gray-400 overflow-auto max-h-[300px] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
              {jsonString.substring(0, 5000)}
              {jsonString.length > 5000 ? `\n\n... [Contenu tronqué pour l'aperçu] ...` : ""}
            </pre>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl border border-red-100 dark:border-red-900/30">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Erreur d&apos;Exportation</h1>
          <pre className="text-xs bg-red-50 dark:bg-red-900/10 text-red-600 p-4 rounded-xl overflow-auto mb-6">
            {String(error)}
          </pre>
          <Link href="/" className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-3 rounded-2xl font-bold transition-all">
            Retour
          </Link>
        </div>
      </div>
    );
  }
}