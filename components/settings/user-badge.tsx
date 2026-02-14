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

  // Fonction pour déterminer si la couleur de texte doit être noir ou blanc
  const getContrastColor = (hexColor: string) => {
    // Supprimer le # si présent
    const hex = hexColor.replace("#", "");

    // Convertir en RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculer la luminosité (formule standard)
    // https://www.w3.org/TR/AERT/#color-contrast
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Si la luminosité est > 128, utiliser du noir, sinon du blanc
    return brightness > 128 ? "text-black" : "text-white";
  };

  const textColorClass = getContrastColor(badgeColor);

  // Tailles
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-9 h-9 text-[11px]",
    lg: "w-14 h-14 text-lg",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${textColorClass} shadow-md border-2 border-white/20 dark:border-black/20 ring-1 ring-black/5 relative overflow-hidden group transition-all duration-300 hover:shadow-lg`}
      style={{
        backgroundColor: badgeColor,
        background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}dd)`
      }}
      title={name || username || role}
    >
      <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors" />
      <span className="relative z-10 tracking-tighter">
        {displayText}
      </span>
    </div>
  );
}
