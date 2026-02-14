"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight, User, Lock } from "lucide-react";

import packageInfo from "@/package.json";
const version = packageInfo.version;

// export const runtime = 'edge'; // Commenté pour le dev local

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const result = await signIn("credentials", {
            username,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Identifiants invalides");
            setLoading(false);
        } else {
            router.push("/");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050b14] p-4 font-sans text-gray-100">
            <div className="w-full max-w-md relative">
                {/* Glow Effect */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative rounded-3xl bg-[#0a0f1c] border border-white/5 p-8 shadow-2xl backdrop-blur-sm">

                    {/* Header / Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-4">
                            {/* Logo identical to sidebar but larger */}
                            <Image
                                src="/Matiere_logo_512.png"
                                alt="Matière Logo"
                                width={128}
                                height={128}
                                className="w-32 h-32 object-contain drop-shadow-xl"
                                priority
                            />
                        </div>

                        <h1 className="text-3xl font-black mb-1">
                            <span className="matiere text-3xl">Matière</span>
                        </h1>
                        <h2 className="text-xl font-bold text-white mb-2">Connexion</h2>

                    </div>

                    {/* Form */}
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {/* Username Input */}
                        <div className="space-y-2">
                            <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                                Utilisateur
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-yellow-500/70" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    className="block w-full rounded-xl border-0 py-3.5 pl-10 text-gray-100 bg-[#3f3f10]/80 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 transition-all shadow-inner"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                                Mot de passe
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-yellow-500/70" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="block w-full rounded-xl border-0 py-3.5 pl-10 pr-10 text-gray-100 bg-[#3f3f10]/80 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 transition-all shadow-inner"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-400 text-center bg-red-900/20 py-2 rounded-lg border border-red-500/20">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white hover:from-blue-500 hover:to-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? "Connexion..." : "Se connecter"}
                                {!loading && <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold opacity-50">
                            v{version}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
