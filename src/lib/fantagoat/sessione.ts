import { cookies } from "next/headers";

export const COOKIE_PARTECIPANTE = "fantagoat_partecipante_slug";

export async function getPartecipanteLoggato() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_PARTECIPANTE)?.value ?? null;
}