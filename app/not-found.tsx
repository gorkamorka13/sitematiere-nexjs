"use client";

import Link from "next/link";
import { MoveLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
            <AlertTriangle className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <h1 className="text-6xl font-black text-gray-900 dark:text-white mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 uppercase tracking-tight">Page introuvable</h2>

        <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed text-sm">
          Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
          Vérifiez l&apos;URL ou retournez au tableau de bord.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 text-xs uppercase tracking-widest"
        >
          <MoveLeft className="w-4 h-4" />
          Retour au Dashboard
        </Link>

        <div className="mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
          Site Matière &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
