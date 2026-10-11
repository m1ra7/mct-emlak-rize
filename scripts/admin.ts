import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { db } from "../db";
import { user } from "../db/schema";
import { sql } from "drizzle-orm";
import { provisionAdmin } from "../lib/admin-account";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
async function password() {
  if (process.env.ADMIN_INITIAL_PASSWORD)
    return process.env.ADMIN_INITIAL_PASSWORD;
  if (!process.stdin.isTTY)
    throw new Error(
      "Yönetici şifresini Terminal üzerinden girin veya ADMIN_INITIAL_PASSWORD ortam değişkenini geçici olarak tanımlayın.",
    );
  const sink = new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output: sink,
    terminal: true,
  });
  process.stdout.write("Yeni yönetici şifresi (en az 12 karakter): ");
  try {
    const first = await rl.question("");
    process.stdout.write("\nŞifreyi tekrar girin: ");
    const second = await rl.question("");
    if (first !== second)
      throw new Error("Şifreler eşleşmiyor. Komutu tekrar çalıştırın.");
    return first;
  } finally {
    rl.close();
    process.stdout.write("\n");
  }
}
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("ADMIN_EMAIL gerekli.");
  const [existing] = await db()
    .select()
    .from(user)
    .where(sql`lower(${user.email})=${email}`);
  const repair = process.argv.includes("--repair");
  if (existing && !repair) {
    console.log(
      "Hesap mevcut. Giriş hatası yaşıyorsanız npm run admin:repair çalıştırın. İlanlarınız korunur.",
    );
    return;
  }
  if (repair && !existing)
    throw new Error("Hesap bulunamadı. npm run admin:create çalıştırın.");
  if (repair)
    console.log(
      "ADMIN_EMAIL hesabının şifresi, giriş yetkisi ve doğrulaması onarılacak. Mevcut oturumlar kapatılır; ilanlar korunur.",
    );
  const pw = await password();
  await provisionAdmin(db(), {
    email,
    password: pw,
    repair,
    phone: process.env.CONTACT_PHONE,
  });
  console.log(
    repair
      ? "Yönetici hesabı onarıldı. Yeni şifreyle /yonetim/giris adresinden giriş yapın."
      : "Yönetici hesabı oluşturuldu. /yonetim/giris adresini açın.",
  );
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
