import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as schema from "@/db/schema";
export async function provisionAdmin<T extends PgQueryResultHKT>(
  database: PgDatabase<T, typeof schema>,
  input: { email: string; password: string; repair?: boolean; phone?: string },
) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("ADMIN_EMAIL geçersiz.");
  if (input.password.length < 12 || input.password.length > 128)
    throw new Error("Şifre 12–128 karakter olmalı.");
  const hash = await hashPassword(input.password);
  return database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(19328472)`);
    const [existing] = await tx
      .select()
      .from(schema.user)
      .where(sql`lower(${schema.user.email})=${email}`)
      .for("update");
    if (existing && !input.repair)
      throw new Error(
        "Hesap mevcut. Onarmak için npm run admin:repair kullanın.",
      );
    if (!existing && input.repair)
      throw new Error("Bu adreste hesap yok. npm run admin:create kullanın.");
    const id = existing?.id || crypto.randomUUID();
    if (existing) {
      await tx
        .update(schema.user)
        .set({
          email,
          role: "admin",
          active: true,
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.user.id, id));
      await tx.delete(schema.session).where(eq(schema.session.userId, id));
      await tx
        .delete(schema.account)
        .where(
          and(
            eq(schema.account.userId, id),
            eq(schema.account.providerId, "credential"),
          ),
        );
    } else {
      await tx
        .insert(schema.user)
        .values({
          id,
          name: "MCT Emlak",
          email,
          emailVerified: true,
          role: "admin",
          active: true,
          phone: input.phone || null,
        });
    }
    await tx
      .insert(schema.account)
      .values({
        id: crypto.randomUUID(),
        userId: id,
        accountId: id,
        providerId: "credential",
        password: hash,
      });
    return { id, repaired: !!existing };
  });
}
