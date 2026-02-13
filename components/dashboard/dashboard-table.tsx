import { Project } from "@prisma/client";
import { Download } from "lucide-react";

interface DashboardTableProps {
    filteredProjects: Project[];
    selectedProject: Project | null;
    handleProjectSelect: (project: Project) => void;
    onExportClick: (e: React.MouseEvent, project: Project) => void;
}

export function DashboardTable({
    filteredProjects,
    selectedProject,
    handleProjectSelect,
    onExportClick
}: DashboardTableProps) {
    return (
        <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 sm:rounded-lg bg-white dark:bg-gray-800 overflow-hidden transition-colors">
                        <div className="max-h-[400px] overflow-y-auto relative">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm transition-colors">
                                    <tr>
                                        <th scope="col" className="py-4 pl-4 pr-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest sm:pl-6">Nom</th>
                                        <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Pays</th>
                                        <th scope="col" className="hidden sm:table-cell px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                                        <th scope="col" className="hidden md:table-cell px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                        <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {filteredProjects.length > 0 ? (
                                        filteredProjects.map((project) => (
                                            <tr
                                                key={project.id}
                                                onClick={() => handleProjectSelect(project)}
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedProject?.id === project.id
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-inset ring-indigo-500/20'
                                                    : ''
                                                    }`}
                                            >
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">{project.name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">{project.country}</td>
                                                <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{project.type}</td>
                                                <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${project.status === 'DONE' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/20' :
                                                        project.status === 'CURRENT' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20' :
                                                            'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-400/20'
                                                        }`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button
                                                        onClick={(e) => onExportClick(e, project)}
                                                        className="flex items-center gap-1.5 ml-auto text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg transition-colors group"
                                                        title="Générer Rapport PDF"
                                                    >
                                                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        <span className="font-bold">PDF</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                Aucun projet ne correspond à vos critères.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
