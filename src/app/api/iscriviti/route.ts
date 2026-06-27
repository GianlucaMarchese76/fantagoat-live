import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { COOKIE_PARTECIPANTE } from "../../../lib/fantagoat/sessione";

function creaSlug(nome: string) {
  return nome
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const nome = String(formData.get("nome") ?? "").trim();
  const codice = String(formData.get("codice") ?? "").trim();
  const slug = creaSlug(nome);

  if (!nome || !codice || !slug) {
    return NextResponse.redirect(new URL("/login?errore=1", request.url));
  }

  const { data: esistente } = await supabase
    .from("partecipanti")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (esistente) {
    return NextResponse.redirect(new URL("/login?errore=1", request.url));
  }

  const { error } = await supabase.from("partecipanti").insert({
    nome,
    slug,
    codice_accesso: codice,
    attivo: true,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?errore=1", request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set(COOKIE_PARTECIPANTE, slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}