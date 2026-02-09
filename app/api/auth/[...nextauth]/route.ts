// Route API Auth - NE PAS utiliser Edge Runtime car Prisma n'est pas compatible (pour le dev local)
// export const runtime = 'edge';

import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
