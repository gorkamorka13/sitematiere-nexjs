import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
// export const runtime = 'edge'; // Commenté pour le dev local

export default async function ExportDatabasePage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  // const headersList = await headers();
  const { password } = await searchParams;

  if (password !== "export2026") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Export Database</h1>
        <p className="text-red-500">Access denied. Invalid password.</p>
      </div>
    );
  }

  try {
    // Fetch all data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const projects = await prisma.project.findMany({
      include: {
        images: true,
        videos: true,
        documents: true,
      },
    });

    // Generate SQL
    let sql = "-- Database Export\n";
    sql += "-- Generated: " + new Date().toISOString() + "\n\n";

    // Users
    sql += "-- Users\n";
    sql += "TRUNCATE TABLE users CASCADE;\n";
    for (const user of users) {
      sql += `INSERT INTO users (id, email, name, role, "createdAt", "updatedAt") VALUES ('${user.id}', '${user.email}', '${user.name?.replace(/'/g, "''") || ""}', '${user.role}', '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}');\n`;
    }
    sql += "\n";

    // Projects
    sql += "-- Projects\n";
    sql += "TRUNCATE TABLE projects CASCADE;\n";
    for (const project of projects) {
      sql += `INSERT INTO projects (id, name, country, latitude, longitude, description, type, status, prospection, studies, fabrication, transport, construction, "projectCode", "createdAt", "updatedAt", "ownerId") VALUES ('${project.id}', '${project.name.replace(/'/g, "''")}', '${project.country.replace(/'/g, "''")}', ${project.latitude}, ${project.longitude}, ${project.description ? `'${project.description.replace(/'/g, "''")}'` : "NULL"}, '${project.type}', '${project.status}', ${project.prospection}, ${project.studies}, ${project.fabrication}, ${project.transport}, ${project.construction}, ${project.projectCode ? `'${project.projectCode.replace(/'/g, "''")}'` : "NULL"}, '${project.createdAt.toISOString()}', '${project.updatedAt.toISOString()}', '${project.ownerId}');\n`;
    }

    // Images
    sql += "\n-- Images\n";
    sql += "TRUNCATE TABLE images CASCADE;\n";
    for (const project of projects) {
      for (const image of project.images) {
        sql += `INSERT INTO images (id, url, alt, "order", "projectId", "createdAt") VALUES ('${image.id}', '${image.url.replace(/'/g, "''")}', ${image.alt ? `'${image.alt.replace(/'/g, "''")}'` : "NULL"}, ${image.order}, '${image.projectId}', '${image.createdAt.toISOString()}');\n`;
      }
    }

    // Videos
    sql += "\n-- Videos\n";
    sql += "TRUNCATE TABLE videos CASCADE;\n";
    for (const project of projects) {
      for (const video of project.videos) {
        sql += `INSERT INTO videos (id, url, title, "projectId", "createdAt") VALUES ('${video.id}', '${video.url.replace(/'/g, "''")}', ${video.title ? `'${video.title.replace(/'/g, "''")}'` : "NULL"}, '${video.projectId}', '${video.createdAt.toISOString()}');\n`;
      }
    }

    // Documents
    sql += "\n-- Documents\n";
    sql += "TRUNCATE TABLE documents CASCADE;\n";
    for (const project of projects) {
      for (const doc of project.documents) {
        sql += `INSERT INTO documents (id, url, name, type, "projectId", "createdAt") VALUES ('${doc.id}', '${doc.url.replace(/'/g, "''")}', '${doc.name.replace(/'/g, "''")}', '${doc.type}', '${doc.projectId}', '${doc.createdAt.toISOString()}');\n`;
      }
    }

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Export</h1>
        <div className="mb-4">
          <p className="text-green-600 mb-2">
            ✓ Exported {users.length} users, {projects.length} projects
          </p>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(sql)}`}
            download="database-export.sql"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Download SQL File
          </a>
        </div>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
          {sql.substring(0, 5000)}...
        </pre>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Export Database</h1>
        <p className="text-red-500">Error: {String(error)}</p>
      </div>
    );
  }
}
