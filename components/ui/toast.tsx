'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            // Animate progress bar
            const startTime = Date.now();
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
                setProgress(remaining);

                if (remaining === 0) {
                    clearInterval(interval);
                }
            }, 16); // ~60fps

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
    }, [duration, onClose]);

    const isSuccess = type === 'success';

    return (
        <div
            className={`fixed top-20 sm:top-6 right-4 sm:right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border-2 animate-in slide-in-from-top-5 fade-in duration-300 ${isSuccess
                    ? 'bg-green-50/95 dark:bg-green-900/95 border-green-500 text-green-900 dark:text-green-50'
                    : 'bg-red-50/95 dark:bg-red-900/95 border-red-500 text-red-900 dark:text-red-50'
                }`}
        >
            {/* Icon */}
            <div className="flex-shrink-0">
                {isSuccess ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
            </div>

            {/* Message */}
            <p className="font-medium text-sm">{message}</p>

            {/* Close Button */}
            <button
                onClick={onClose}
                className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isSuccess
                        ? 'hover:bg-green-200 dark:hover:bg-green-800'
                        : 'hover:bg-red-200 dark:hover:bg-red-800'
                    }`}
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress Bar */}
            {duration > 0 && (
                <div
                    className={`absolute bottom-0 left-0 h-1 rounded-b-xl transition-all ease-linear ${isSuccess ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    style={{
                        width: `${progress}%`,
                    }}
                />
            )}
        </div>
    );
}
