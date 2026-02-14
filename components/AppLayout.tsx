'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
    LayoutDashboard,
    FolderOpen,
    Folders,
    FileStack,
    Image as ImageIcon,
    Menu,
    PanelLeftClose,
    ChevronRight,
    Users,
    Presentation,
    X
} from 'lucide-react';
import { SignOutButton } from "@/components/auth/sign-out-button";
import UserBadge from "@/components/settings/user-badge";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserRole } from "@prisma/client";
import { useSwipe } from '@/hooks/use-swipe';
import packageInfo from '../package.json';
const version = packageInfo.version;

interface User {
    name?: string | null;
    username?: string | null;
    role?: UserRole;
    color?: string | null;
}

interface AppLayoutProps {
    children: ReactNode;
    user: User;
    // Optional callbacks if we want to trigger dashboard-specific dialogs from sidebar
    onManageUsers?: () => void;
    onManageProjects?: (tab: 'create' | 'modify' | 'delete') => void;
    onManageFiles?: () => void;
}

const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case "ADMIN":
            return "Administrateur";
        case "USER":
            return "Utilisateur";
        case "VISITOR":
            return "Visiteur";
        default:
            return role;
    }
};

export default function AppLayout({
    children,
    user,
    onManageUsers,
    onManageProjects,
    onManageFiles
}: AppLayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    const swipeHandlers = useSwipe({
        onSwipeLeft: () => {
            if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        },
        onSwipeRight: () => {
            // Uniquement si on commence le swipe près du bord gauche (< 50px)
            if (!isMobileMenuOpen && swipeHandlers.touchStartX !== null && swipeHandlers.touchStartX < 50) {
                setIsMobileMenuOpen(true);
            }
        },
    });

    const isActive = (path: string) => pathname === path;


    return (
        <div
            className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300"
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchMove={swipeHandlers.onTouchMove}
            onTouchEnd={swipeHandlers.onTouchEnd}
        >
            {/* Mobile Header - Sticky */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 relative">
                        <Image
                            src="/Matiere_logo_512.png"
                            alt="Matière Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="matiere text-lg tracking-tight">Matière</span>
                </div>
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Sidebar Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity animate-in fade-in duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Desktop & Mobile Drawer */}
            <aside
                className={`fixed top-0 left-0 z-[60] h-screen transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
                    ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                    ${isSidebarCollapsed ? "lg:w-20" : "lg:w-64"}
                    w-72 shadow-2xl lg:shadow-none`}
            >
                {/* Branding Header */}
                <div className="flex items-center justify-between px-3 h-20 border-b border-gray-100 dark:border-gray-700 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 relative shrink-0">
                            <Image
                                src="/Matiere_logo_512.png"
                                alt="Matière Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        {!isSidebarCollapsed && (
                            <>
                                <span className="matiere text-lg lg:text-xl tracking-tight whitespace-nowrap">
                                    Matière
                                </span>
                                <div className="ml-1 scale-90 origin-left">
                                    <ModeToggle />
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            if (isMobileMenuOpen) {
                                setIsMobileMenuOpen(false);
                            } else {
                                setIsSidebarCollapsed(!isSidebarCollapsed);
                            }
                        }}
                        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors shrink-0 ${isSidebarCollapsed ? "hidden" : "lg:block"}`}
                    >
                        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                    {isSidebarCollapsed && (
                        <button
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="absolute -right-3 top-7 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-gray-400 hover:text-indigo-600 transition-all z-10 hidden lg:block"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* User Section */}
                <div className={`p-4 border-b border-gray-100 dark:border-gray-700 ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}>
                    <div className="flex items-center gap-3 w-full bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all group hover:border-indigo-200 dark:hover:border-indigo-900/50">
                        <UserBadge
                            username={user.username || null}
                            name={user.name || null}
                            color={user.color || null}
                            role={user.role || "USER"}
                            size={isSidebarCollapsed ? "sm" : "md"}
                        />
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{getRoleLabel(user.role || "USER")}</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || user.username}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Menus */}
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    <div className="mb-6">
                        {!isSidebarCollapsed && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3 mb-2 block">Menu Principal</span>}
                        <Link
                            href="/"
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${isActive('/') ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400"} ${isSidebarCollapsed ? "justify-center" : ""}`}
                        >
                            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                            {!isSidebarCollapsed && <span className="text-sm font-semibold">Dashboard</span>}
                        </Link>
                    </div>

                    {/* Section Projets */}
                    {user.role === 'USER' && (
                        <div className="space-y-1 mb-6">
                            {!isSidebarCollapsed && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3 mb-2 block">Projets</span>}
                            <button
                                onClick={() => onManageProjects?.('modify')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400 transition-all group cursor-pointer"
                            >
                                <FolderOpen className={`w-5 h-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white">Modification Projets</span>}
                            </button>
                        </div>
                    )}

                    {/* Section Administration */}
                    {user.role === 'ADMIN' && (
                        <div className="space-y-1">
                            {!isSidebarCollapsed && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3 mb-2 block">Administration</span>}
                            <button
                                onClick={() => onManageUsers?.()}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400 transition-all group cursor-pointer"
                            >
                                <Users className={`w-5 h-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white">Gestion Utilisateurs</span>}
                            </button>
                            <button
                                onClick={() => onManageProjects?.('create')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400 transition-all group cursor-pointer"
                            >
                                <Folders className={`w-5 h-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white">Gestion Projet</span>}
                            </button>
                            <button
                                onClick={() => onManageFiles?.()}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400 transition-all group cursor-pointer"
                            >
                                <FileStack className={`w-5 h-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white">Gestion Fichiers</span>}
                            </button>
                            <Link
                                href="/image-processor"
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${isActive('/image-processor') ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400"} ${isSidebarCollapsed ? "justify-center" : ""}`}
                            >
                                <ImageIcon className={`w-5 h-5 ${isSidebarCollapsed ? "" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium">Gestion Images</span>}
                            </Link>
                            <Link
                                href="/slideshow"
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${isActive('/slideshow') ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400"} ${isSidebarCollapsed ? "justify-center" : ""}`}
                            >
                                <Presentation className={`w-5 h-5 ${isSidebarCollapsed ? "" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium">Gestion Diaporama</span>}
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Sidebar Actions */}
                <div className={`p-4 border-t border-gray-100 dark:border-gray-700 ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}>
                    <SignOutButton variant={isSidebarCollapsed ? "icon" : "sidebar"} />
                </div>


                {/* Bottom Section: Credits */}
                <div className={`p-3 border-t border-gray-100 dark:border-gray-700 ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Site Matière
                            </div>
                            <div className="text-[9px] font-medium text-gray-300 dark:text-gray-600">
                                © 2024-2025 • v{version}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main
                className={`flex-grow transition-all duration-300
                    ${isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}
                    min-w-0 pt-20 lg:pt-0 pb-12 lg:pb-0 px-2 sm:px-4`}
            >
                <div className="w-full h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
