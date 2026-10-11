import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { HttpError } from "./security";
import { uuid } from "./validation";
import { z } from "zod";
export const locationKind = z.enum([
  "city",
  "district",
  "neighborhood",
  "property",
]);
export async function deleteLocation<T extends PgQueryResultHKT>(
  database: PgDatabase<T, typeof schema>,
  kind: string,
  id: string,
) {
  const parsed = locationKind.parse(kind);
  uuid.parse(id);
  const table = {
    city: schema.cities,
    district: schema.districts,
    neighborhood: schema.neighborhoods,
    property: schema.propertyTypes,
  }[parsed];
  try {
    const deleted = await database
      .delete(table)
      .where(eq(table.id, id))
      .returning({ id: table.id });
    if (!deleted.length)
      throw new HttpError(404, "Kayıt bulunamadı veya zaten silinmiş.");
  } catch (error) {
    let current: unknown = error;
    for (
      let depth = 0;
      depth < 5 && current && typeof current === "object";
      depth++
    ) {
      const value = current as { code?: string; cause?: unknown };
      if (value.code === "23503" || value.code === "23001")
        throw new HttpError(
          409,
          "Bu kayıt bir ilanda veya alt konumda kullanılıyor. Önce bağlı ilanların konumunu değiştirin ve alt kayıtları silin.",
        );
      current = value.cause;
    }
    throw error;
  }
}
