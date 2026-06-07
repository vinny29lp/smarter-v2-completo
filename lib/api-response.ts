import { NextResponse } from "next/server";

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiErr(message: string, status = 500, errorCode?: string) {
  console.error(`[API ERROR] ${errorCode ?? "UNKNOWN"}: ${message}`);
  return NextResponse.json({ success: false, message, errorCode }, { status });
}

export function handleApiError(e: unknown, errorCode: string, fallback = "Erro interno. Tente novamente.") {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[${errorCode}]`, msg);
  return apiErr(fallback, 500, errorCode);
}
