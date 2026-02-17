import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";

import Link from "next/link";
import Image from "next/image";
import ProjectMapWrapper from "@/components/ui/project-map-wrapper";
import { normalizeImageUrl } from "@/lib/utils/image-url";

type Props = {
    params: Promise<{ id: string }>
}

export default async function ProjectDetailPage(props: Props) {
    const params = await props.params;
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    const project = await prisma.project.findUnique({
        where: {
            id: params.id,
        },
        include: {
            images: {
                orderBy: {
                    order: 'asc',
                },
            },
            documents: true,
        },
    });

    if (!project) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header / Navbar */}
            <nav className="bg-white shadow sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                                Retour au Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            {project.name}
                        </h2>
                        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                <svg className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.72.829.8 1.654 1.382 2.274 1.766a11.267 11.267 0 00.758.434l.018.008.006.003zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                {project.country}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${project.status === 'DONE' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/20' :
                                    project.status === 'CURRENT' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20' :
                                        'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-200 dark:ring-yellow-400/30'
                                    }`}>
                                    {project.status}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span className="font-semibold mr-1">Type:</span> {project.type}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Left Column: Details & Description */}
                    <div className="space-y-6">
                        {/* Description Card */}
                        <div className="overflow-hidden rounded-xl bg-white shadow ring-1 ring-black ring-opacity-5">
                            <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                                <h3 className="text-base font-semibold leading-6 text-gray-900">Description</h3>
                            </div>
                            <div className="px-4 py-5 sm:p-6 text-gray-700 whitespace-pre-line">
                                {project.description || "Aucune description disponible."}
                            </div>
                        </div>

                        {/* Progress Card (if applicable) */}
                        <div className="overflow-hidden rounded-xl bg-white shadow ring-1 ring-black ring-opacity-5">
                            <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                                <h3 className="text-base font-semibold leading-6 text-gray-900">Avancement du Projet</h3>
                            </div>
                            <div className="px-4 py-5 sm:p-6 space-y-4">
                                {['prospection', 'studies', 'fabrication', 'transport', 'construction'].map((step) => {
                                    const val = project[step as keyof typeof project] as number;
                                    const getColor = (v: number) => {
                                        if (v >= 100) return 'bg-green-500';
                                        if (v > 50) return 'bg-yellow-500';
                                        if (v > 25) return 'bg-orange-500';
                                        return 'bg-red-500';
                                    };
                                    return (
                                        <div key={step}>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-700 capitalize">{step === 'construction' ? 'Montage' : step}</span>
                                                <span className="text-sm font-medium text-gray-700">{val}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                                <div
                                                    className={`${getColor(val)} h-2.5 rounded-full`}
                                                    style={{ width: `${val}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Documents Card */}
                        {project.documents.length > 0 && (
                            <div className="overflow-hidden rounded-xl bg-white shadow ring-1 ring-black ring-opacity-5">
                                <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                                    <h3 className="text-base font-semibold leading-6 text-gray-900">Documents</h3>
                                </div>
                                <ul role="list" className="divide-y divide-gray-100 px-4 py-5 sm:p-6">
                                    {project.documents.map((doc) => (
                                        <li key={doc.id} className="flex items-center justify-between py-2">
                                            <div className="flex items-center truncate">
                                                <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                </svg>
                                                <span className="ml-2 truncate text-sm font-medium text-gray-600">{doc.name}</span>
                                                <span className="ml-2 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                    {doc.type}
                                                </span>
                                            </div>
                                            {/* Note: Links are disabled for now as the paths might be local or need adjustment */}
                                            <span className="text-xs text-gray-400">{doc.url}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Images & Map (Map placeholder for now) */}
                    <div className="space-y-6">
                        {/* Images Gallery */}
                        <div className="overflow-hidden rounded-xl bg-white shadow ring-1 ring-black ring-opacity-5">
                            <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                                <h3 className="text-base font-semibold leading-6 text-gray-900">Galerie Photos</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-4">
                                {project.images.length > 0 ? (
                                    project.images.map((img) => (
                                        <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 group">
                                            {/* Using simple img tag for external urls or local paths without optimization configuration */}
                                            <Image
                                                src={normalizeImageUrl(img.url)}
                                                alt={img.alt || project.name}
                                                fill
                                                sizes="(max-width: 768px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-8 text-center text-gray-500 text-sm italic">
                                        Aucune image disponible.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Map Dynamic Component */}
                        <div className="overflow-hidden rounded-xl bg-white shadow ring-1 ring-black ring-opacity-5">
                            <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                                <h3 className="text-base font-semibold leading-6 text-gray-900">Localisation</h3>
                            </div>
                            <div className="h-80 bg-gray-100 relative z-0">
                                <ProjectMapWrapper
                                    latitude={project.latitude}
                                    longitude={project.longitude}
                                    popupText={project.name}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
