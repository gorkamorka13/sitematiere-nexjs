import { Project } from "@prisma/client";
import { Ruler, Search, Factory, Truck, HardHat } from "lucide-react";

interface ProjectProgressProps {
    selectedProject: Project | null;
}

const getProgressColors = (val: number) => {
    if (val >= 100) return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-500',
        bgLight: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-500/50',
        shadow: 'shadow-green-200'
    };
    if (val > 50) return {
        text: 'text-yellow-600 dark:text-yellow-300',
        bg: 'bg-yellow-500',
        bgLight: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-500/50',
        shadow: 'shadow-yellow-200'
    };
    if (val > 25) return {
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-500',
        bgLight: 'bg-orange-100 dark:bg-orange-900/30',
        border: 'border-orange-500/50',
        shadow: 'shadow-orange-200'
    };
    return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500',
        bgLight: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-500/50',
        shadow: 'shadow-red-200'
    };
};

export function ProjectProgress({ selectedProject }: ProjectProgressProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors flex flex-col shrink-0">
            <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Avancement du Projet</h3>
            </div>
            <div className="p-4 lg:px-4 lg:py-6 flex flex-col md:flex-row gap-6 lg:gap-8">
                <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 min-w-[140px]">
                    <div className="relative flex items-center justify-center w-24 h-24 mb-3">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
                            {(() => {
                                const total = (selectedProject?.prospection || 0) + (selectedProject?.studies || 0) + (selectedProject?.fabrication || 0) + (selectedProject?.transport || 0) + (selectedProject?.construction || 0);
                                const avg = Math.round(total / 5);
                                const circumference = 40 * 2 * Math.PI;
                                const offset = circumference - (avg / 100) * circumference;
                                const colors = getProgressColors(avg);
                                return (
                                    <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${colors.text} transition-all duration-1000 ease-out`} />
                                );
                            })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-black text-gray-900 dark:text-white">
                                {Math.round(((selectedProject?.prospection || 0) + (selectedProject?.studies || 0) + (selectedProject?.fabrication || 0) + (selectedProject?.transport || 0) + (selectedProject?.construction || 0)) / 5)}%
                            </span>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Progression Globale</span>
                </div>

                <div className="flex-grow flex flex-col gap-5 py-2">
                    {[
                        { label: 'Prospection', val: selectedProject?.prospection || 0, icon: <Search className="w-3.5 h-3.5" /> },
                        { label: 'Études', val: selectedProject?.studies || 0, icon: <Ruler className="w-3.5 h-3.5" /> },
                        { label: 'Fabrication', val: selectedProject?.fabrication || 0, icon: <Factory className="w-3.5 h-3.5" /> },
                        { label: 'Transport', val: selectedProject?.transport || 0, icon: <Truck className="w-3.5 h-3.5" /> },
                        { label: 'Montage', val: selectedProject?.construction || 0, icon: <HardHat className="w-3.5 h-3.5" /> }
                    ].map((step, index, array) => (
                        <div key={step.label} className="relative last:mb-0">
                            {index !== array.length - 1 && (
                                <div className="absolute left-[17px] top-[24px] w-[2px] h-[34px] bg-gray-100 dark:bg-gray-700 z-0">
                                    <div className="absolute top-0 left-0 w-full bg-indigo-500/30 transition-all duration-1000" style={{ height: step.val > 0 ? (index < array.length - 1 && array[index + 1].val > 0 ? '100%' : '50%') : '0%' }} />
                                </div>
                            )}
                            <div className="flex items-center gap-4 group relative z-10">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-sm ${step.val > 0 ? `${getProgressColors(step.val).bg} ${getProgressColors(step.val).border} text-white scale-110` : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                                    {step.icon}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className={`text-[11px] font-bold uppercase tracking-wider ${step.val > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 text-[10px]'}`}>{step.label}</h4>
                                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${step.val > 0 ? `${getProgressColors(step.val).bgLight} ${getProgressColors(step.val).text}` : 'bg-gray-100 dark:bg-gray-900 text-gray-500'}`}>{step.val}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-700/30">
                                        <div className={`h-full transition-all duration-1000 ease-out rounded-full ${getProgressColors(step.val).bg}`} style={{ width: `${step.val}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
