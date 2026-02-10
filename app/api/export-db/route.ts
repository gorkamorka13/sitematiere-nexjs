import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");
    
    // Simple protection - you can change this password
    if (password !== "export2026") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Export all data
    const data = {
      users: await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      projects: await prisma.project.findMany({
        include: {
          images: true,
          videos: true,
          documents: true,
        }
      }),
    };

    // Create SQL dump
    let sql = "-- Database Export\n";
    sql += "-- Generated: " + new Date().toISOString() + "\n\n";
    
    // Users
    sql += "-- Users\n";
    sql += "TRUNCATE TABLE users CASCADE;\n";
    for (const user of data.users) {
      sql += `INSERT INTO users (id, email, name, role, "createdAt", "updatedAt") VALUES ('${user.id}', '${user.email}', '${user.name?.replace(/'/g, "''") || ""}', '${user.role}', '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}');\n`;
    }
    sql += "\n";

    // Projects
    sql += "-- Projects\n";
    sql += "TRUNCATE TABLE projects CASCADE;\n";
    for (const project of data.projects) {
      sql += `INSERT INTO projects (
        id, name, country, latitude, longitude, description, type, status,
        prospection, studies, fabrication, transport, construction,
        "projectCode", "createdAt", "updatedAt", "ownerId"
      ) VALUES (
        '${project.id}', '${project.name.replace(/'/g, "''")}', '${project.country.replace(/'/g, "''")}',
        ${project.latitude}, ${project.longitude}, ${project.description ? `'${project.description.replace(/'/g, "''")}'` : 'NULL'},
        '${project.type}', '${project.status}', ${project.prospection}, ${project.studies},
        ${project.fabrication}, ${project.transport}, ${project.construction},
        ${project.projectCode ? `'${project.projectCode.replace(/'/g, "''")}'` : 'NULL'},
        '${project.createdAt.toISOString()}', '${project.updatedAt.toISOString()}', '${project.ownerId}'
      );\n`;
    }
    sql += "\n";

    // Images
    sql += "-- Images\n";
    sql += "TRUNCATE TABLE images CASCADE;\n";
    for (const project of data.projects) {
      for (const image of project.images) {
        sql += `INSERT INTO images (id, url, alt, "order", "projectId", "createdAt") VALUES (
          '${image.id}', '${image.url.replace(/'/g, "''")}', ${image.alt ? `'${image.alt.replace(/'/g, "''")}'` : 'NULL'},
          ${image.order}, '${image.projectId}', '${image.createdAt.toISOString()}'
        );\n`;
      }
    }
    sql += "\n";

    // Videos
    sql += "-- Videos\n";
    sql += "TRUNCATE TABLE videos CASCADE;\n";
    for (const project of data.projects) {
      for (const video of project.videos) {
        sql += `INSERT INTO videos (id, url, title, "projectId", "createdAt") VALUES (
          '${video.id}', '${video.url.replace(/'/g, "''")}', ${video.title ? `'${video.title.replace(/'/g, "''")}'` : 'NULL'},
          '${video.projectId}', '${video.createdAt.toISOString()}'
        );\n`;
      }
    }
    sql += "\n";

    // Documents
    sql += "-- Documents\n";
    sql += "TRUNCATE TABLE documents CASCADE;\n";
    for (const project of data.projects) {
      for (const doc of project.documents) {
        sql += `INSERT INTO documents (id, url, name, type, "projectId", "createdAt") VALUES (
          '${doc.id}', '${doc.url.replace(/'/g, "''")}', '${doc.name.replace(/'/g, "''")}',
          '${doc.type}', '${doc.projectId}', '${doc.createdAt.toISOString()}'
        );\n`;
      }
    }

    return new NextResponse(sql, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": "attachment; filename=database-export.sql",
      },
    });

  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export database", details: String(error) },
      { status: 500 }
    );
  }
}