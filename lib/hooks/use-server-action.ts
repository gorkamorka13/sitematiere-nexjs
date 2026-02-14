"use client";

import { useState, useCallback } from "react";

interface ServerActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

interface UseServerActionOptions<T = unknown> {
  /** Callback when action succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when action fails - receives error message */
  onError?: (error: string) => void;
  /** Callback for loading state changes */
  onLoadingChange?: (isLoading: boolean) => void;
}

interface UseServerActionReturn<TInput> {
  /** Execute the server action */
  execute: (input: TInput) => Promise<void>;
  /** Whether the action is currently executing */
  isPending: boolean;
  /** Error message if action failed */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Hook for managing server action state with loading indicators and error handling
 * 
 * Usage example:
 * ```tsx
 * const { execute, isPending, error } = useServerAction(
 *   updateProject,
 *   {
 *     onSuccess: () => {
 *       setNotification({ type: 'success', message: 'Projet mis à jour' });
 *       router.refresh();
 *     },
 *     onError: (err) => {
 *       setNotification({ type: 'error', message: err });
 *     },
 *   }
 * );
 * 
 * // In JSX:
 * <Button disabled={isPending} onClick={() => execute(formData)}>
 *   {isPending ? <Loader2 className="animate-spin" /> : "Enregistrer"}
 * </Button>
 * ```
 */
export function useServerAction<TInput, TOutput = unknown>(
  action: (input: TInput) => Promise<ServerActionResult<TOutput>>,
  options: UseServerActionOptions<TOutput> = {}
): UseServerActionReturn<TInput> {
  const { onSuccess, onError, onLoadingChange } = options;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (input: TInput) => {
      setIsPending(true);
      onLoadingChange?.(true);
      setError(null);

      try {
        const result = await action(input);

        if (result.success) {
          onSuccess?.(result.data as TOutput);
        } else {
          const errMsg = result.error || "Une erreur est survenue";
          setError(errMsg);
          onError?.(errMsg);
        }
      } catch {
        const errMsg = "Erreur inattendue";
        setError(errMsg);
        onError?.(errMsg);
      } finally {
        setIsPending(false);
        onLoadingChange?.(false);
      }
    },
    [action, onSuccess, onError, onLoadingChange]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isPending,
    error,
    clearError,
  };
}

export default useServerAction;
