import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { COOKIE_PARTECIPANTE } from "../../../lib/fantagoat/sessione";

export async function POST(request: Request) {
  const formData = await request.formData();

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const codice = String(formData.get("codice") ?? "").trim();
  const redirectRaw = String(formData.get("redirect") ?? "/").trim();

  const redirectPath = redirectRaw.startsWith("/") ? redirectRaw : "/";

  const { data: partecipante } = await supabase
    .from("partecipanti")
    .select("slug,codice_accesso")
    .eq("slug", slug)
    .maybeSingle();

  if (!partecipante || partecipante.codice_accesso !== codice) {
    return NextResponse.redirect(
      new URL(`/login?errore=1&redirect=${encodeURIComponent(redirectPath)}`, request.url)
    );
  }

  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  response.cookies.set(COOKIE_PARTECIPANTE, partecipante.slug, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}