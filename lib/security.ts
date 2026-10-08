import { ZodError } from "zod";
import { validationErrors } from "./validation-errors";
import { authSettings } from "./auth-config";
import { isAgencyOwner } from "./agency";
import { headers } from "next/headers";
import { getAuth } from "./auth";
import { db } from "@/db";
import { user, appRateLimits } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function currentUser() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  const s = await getAuth().api.getSession({ headers: await headers() });
  if (!s) return null;
  const [u] = await db().select().from(user).where(eq(user.id, s.user.id));
  return u?.active ? u : null;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Devam etmek için giriş yapın.");
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (!isAgencyOwner(u))
    throw new HttpError(403, "Bu işlem için yetkiniz yok.");
  return u;
}
export function assertOwner(u: { id: string; role: string }, owner: string) {
  if (u.id !== owner) throw new HttpError(403, "Bu işlem için yetkiniz yok.");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  let allowed: string[];
  try {
    allowed = authSettings().trustedOrigins;
  } catch {
    try {
      const url = new URL(
        process.env.BETTER_AUTH_URL || "http://localhost:3000",
      );
      allowed = [url.origin];
    } catch {
      throw new HttpError(503, "Sunucu site adresi geçersiz.");
    }
  }
  if (!origin || !allowed.includes(origin))
    throw new HttpError(403, "İstek kaynağı doğrulanamadı.");
}
export async function limit(key: string, max = 30, seconds = 60) {
  const expires = new Date(Date.now() + seconds * 1000);
  const [r] = await db()
    .insert(appRateLimits)
    .values({ key, count: 1, expiresAt: expires })
    .onConflictDoUpdate({
      target: appRateLimits.key,
      set: {
        count: sql`case when ${appRateLimits.expiresAt}<now() then 1 else ${appRateLimits.count}+1 end`,
        expiresAt: sql`case when ${appRateLimits.expiresAt}<now() then ${expires} else ${appRateLimits.expiresAt} end`,
      },
    })
    .returning();
  if (r.count > max)
    throw new HttpError(
      429,
      "Çok fazla işlem yaptınız. Biraz sonra tekrar deneyin.",
    );
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) {
    const fieldErrors = validationErrors(error);
    return Response.json(
      { error: Object.values(fieldErrors).join(" "), fieldErrors },
      { status: 400 },
    );
  }
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "unknown",
  );
  return Response.json(
    { error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." },
    { status: 500 },
  );
}

async function boundedBody(req: Request, max: number) {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > max) throw new HttpError(413, "İstek boyutu sınırı aşıldı.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "İstek içeriği boş.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "İstek boyutu sınırı aşıldı.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return data;
}
export async function jsonBody(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "JSON içerik bekleniyor.");
  try {
    return JSON.parse(
      new TextDecoder().decode(await boundedBody(req, 64 * 1024)),
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      throw new HttpError(400, "Geçersiz JSON içeriği.");
    throw e;
  }
}
export async function formBody(req: Request) {
  const type = req.headers.get("content-type");
  if (!type?.startsWith("multipart/form-data"))
    throw new HttpError(415, "Dosya formu bekleniyor.");
  const bytes = await boundedBody(req, Math.floor(4.5 * 1024 * 1024));
  try {
    return await new Response(bytes, {
      headers: { "content-type": type },
    }).formData();
  } catch {
    throw new HttpError(400, "Geçersiz dosya formu.");
  }
}
