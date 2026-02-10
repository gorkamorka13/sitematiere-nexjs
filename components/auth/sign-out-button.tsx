"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
    variant?: "default" | "icon" | "sidebar";
}

export function SignOutButton({ variant = "default" }: SignOutButtonProps) {
    if (variant === "icon") {
        return (
            <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Déconnexion"
            >
                <LogOut className="w-5 h-5" />
            </button>
        );
    }

    if (variant === "sidebar") {
        return (
            <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-500 hover:text-red-600 bg-gray-50/50 dark:bg-gray-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all group"
                title="Déconnexion"
            >
                <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span className="truncate">Déconnexion</span>
            </button>
        );
    }

    return (
        <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
            Déconnexion
        </button>
    );
}
