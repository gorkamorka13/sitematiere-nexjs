import { PermissionLevelConfig, type PermissionLevel } from "@/lib/permissions";

interface PermissionBadgeProps {
  level: PermissionLevel | "OWNER" | "ADMIN";
  className?: string;
}

export function PermissionBadge({ level, className = "" }: PermissionBadgeProps) {
  const config = PermissionLevelConfig[level];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}
