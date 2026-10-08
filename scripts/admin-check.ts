import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { authSettings } from "../lib/auth-config";
import { db } from "../db";
import { user, account } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";
async function main() {
  const settings = authSettings();
  if (!process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL eksik. Neon bağlantısını .env.local içine yazın.",
    );
  const [owner] = await db()
    .select()
    .from(user)
    .where(sql`lower(${user.email})=${settings.email}`);
  if (!owner)
    throw new Error("Yönetici hesabı yok. npm run admin:create çalıştırın.");
  const [credential] = await db()
    .select({ password: account.password })
    .from(account)
    .where(
      and(
        eq(account.userId, owner.id),
        eq(account.accountId, owner.id),
        eq(account.providerId, "credential"),
      ),
    );
  if (
    owner.role !== "admin" ||
    !owner.active ||
    !owner.emailVerified ||
    !credential?.password
  )
    throw new Error(
      "Hesabın yetkisi, doğrulaması veya şifre kaydı eksik. npm run admin:repair çalıştırın.",
    );
  console.log(
    "Sunucu ayarları, veritabanı bağlantısı ve yönetici hesabı hazır.",
  );
  console.log("Giriş adresi: " + settings.baseURL + "/yonetim/giris");
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
    console.log(
      "E-posta ile şifre sıfırlama ayarlı değil. Gerekirse admin:repair kullanabilirsiniz.",
    );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    const messages: Record<string, string> = {
      AUTH_SECRET_MISSING: "BETTER_AUTH_SECRET en az 32 karakter olmalı.",
      ADMIN_EMAIL_MISSING: "ADMIN_EMAIL yönetici e-postasıyla doldurulmalı.",
      AUTH_URL_INVALID:
        "BETTER_AUTH_URL geçerli site adresi olmalı; yayında HTTPS kullanın.",
    };
    const safe =
      messages[error.message] ||
      [
        "DATABASE_URL eksik. Neon bağlantısını .env.local içine yazın.",
        "Yönetici hesabı yok. npm run admin:create çalıştırın.",
        "Hesabın yetkisi, doğrulaması veya şifre kaydı eksik. npm run admin:repair çalıştırın.",
      ].find((message) => message === error.message);
    console.error(
      safe ||
        "Veritabanı bağlantısı veya sorgusu başarısız. DATABASE_URL, bağlantı erişimi ve npm run db:migrate adımını kontrol edin.",
    );
    process.exit(1);
  });
