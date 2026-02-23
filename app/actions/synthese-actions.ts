"use server";

import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { ne } from "drizzle-orm";

export type SyntheseStats = {
    totalProjects: number;
    totalCountries: number;
    usersByRole: { ADMIN: number; USER: number; VISITOR: number };
    projectsByType: Record<string, number>;
    projectsByStatus: { DONE: number; CURRENT: number; PROSPECT: number };
    averageProgressByPhase: {
        prospection: number;
        studies: number;
        fabrication: number;
        transport: number;
        construction: number;
    };
};

export async function getSyntheseStats(): Promise<SyntheseStats> {
    // Fetch all real projects (exclude "Système")
    const allProjects = await db
        .select()
        .from(projects)
        .where(ne(projects.country, "Système"));

    const allUsers = await db.select().from(users);

    // Total projects
    const totalProjects = allProjects.length;

    // Distinct countries
    const distinctCountries = new Set(allProjects.map((p) => p.country).filter(Boolean));
    const totalCountries = distinctCountries.size;

    // Users by role
    const usersByRole = { ADMIN: 0, USER: 0, VISITOR: 0 };
    for (const u of allUsers) {
        const role = u.role as "ADMIN" | "USER" | "VISITOR";
        if (role in usersByRole) {
            usersByRole[role]++;
        }
    }

    // Projects by type
    const projectsByType: Record<string, number> = {};
    for (const p of allProjects) {
        const type = p.type || "AUTRE";
        projectsByType[type] = (projectsByType[type] || 0) + 1;
    }

    // Projects by status
    const projectsByStatus = { DONE: 0, CURRENT: 0, PROSPECT: 0 };
    for (const p of allProjects) {
        const status = p.status as "DONE" | "CURRENT" | "PROSPECT";
        if (status in projectsByStatus) {
            projectsByStatus[status]++;
        }
    }

    // Average progression per phase
    const count = totalProjects || 1;
    const sum = allProjects.reduce(
        (acc, p) => ({
            prospection: acc.prospection + (p.prospection ?? 0),
            studies: acc.studies + (p.studies ?? 0),
            fabrication: acc.fabrication + (p.fabrication ?? 0),
            transport: acc.transport + (p.transport ?? 0),
            construction: acc.construction + (p.construction ?? 0),
        }),
        { prospection: 0, studies: 0, fabrication: 0, transport: 0, construction: 0 }
    );

    const averageProgressByPhase = {
        prospection: Math.round(sum.prospection / count),
        studies: Math.round(sum.studies / count),
        fabrication: Math.round(sum.fabrication / count),
        transport: Math.round(sum.transport / count),
        construction: Math.round(sum.construction / count),
    };

    return {
        totalProjects,
        totalCountries,
        usersByRole,
        projectsByType,
        projectsByStatus,
        averageProgressByPhase,
    };
}
