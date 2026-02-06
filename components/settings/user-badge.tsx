"use client";

interface UserBadgeProps {
  username: string | null;
  name: string | null;
  color: string | null;
  role: string;
  size?: "sm" | "md" | "lg";
}

export default function UserBadge({ username, name, color, role, size = "md" }: UserBadgeProps) {
  // Déterminer le texte à afficher (2 premières lettres)
  const displayText = name && name.length >= 2 
    ? name.substring(0, 2).toUpperCase()
    : username && username.length >= 2
    ? username.substring(0, 2).toUpperCase()
    : role.substring(0, 2).toUpperCase();
  
  // Couleur par défaut si non définie
  const badgeColor = color || "#6366f1";
  
  // Tailles
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };
  
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-sm`}
      style={{ backgroundColor: badgeColor }}
      title={name || username || role}
    >
      {displayText}
    </div>
  );
}
