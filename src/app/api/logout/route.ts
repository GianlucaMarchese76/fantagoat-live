import { NextResponse } from "next/server";
import { COOKIE_PARTECIPANTE } from "../../../lib/fantagoat/sessione";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set(COOKIE_PARTECIPANTE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}