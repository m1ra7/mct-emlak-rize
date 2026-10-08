import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { db } from "../db";
import { storageJobs } from "../db/schema";
import { eq } from "drizzle-orm";
import { storage } from "../lib/storage";
async function main() {
  const jobs = await db().select().from(storageJobs).limit(100);
  let failed = 0;
  for (const job of jobs) {
    try {
      await storage().uploader.destroy(job.storageKey, { invalidate: true });
      await db().delete(storageJobs).where(eq(storageJobs.id, job.id));
    } catch {
      failed++;
    }
  }
  console.log(
    `${jobs.length - failed} dosya işi tamamlandı; ${failed} iş tekrar denenmek üzere korundu.`,
  );
  if (failed) process.exitCode = 1;
}
main()
  .then(() => process.exit(process.exitCode || 0))
  .catch(() => {
    console.error(
      "Storage bakımı tamamlanamadı. Servis ayarlarını kontrol edin.",
    );
    process.exit(1);
  });
