import { authSettings } from "./auth-config";
import { isAgencyOwner } from "./agency";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import nodemailer from "nodemailer";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import * as schema from "@/db/schema";
export function createAuthentication(
  database: Parameters<typeof drizzleAdapter>[0],
) {
  const settings = authSettings();
  return betterAuth({
    baseURL: settings.baseURL,
    secret: settings.secret,
    trustedOrigins: settings.trustedOrigins,
    advanced: { useSecureCookies: settings.secureCookies },
    database: drizzleAdapter(database, { provider: "pg", schema }),
    databaseHooks: {
      user: {
        create: {
          before: async (u) => {
            if (
              u.name.trim().length < 2 ||
              u.name.length > 100 ||
              u.email.length > 254
            )
              throw new APIError("BAD_REQUEST", {
                message: "Kullanıcı bilgileri geçersiz.",
              });
            return { data: { ...u, name: u.name.trim() } };
          },
        },
      },
      session: {
        create: {
          before: async (s) => {
            const [u] = await database
              .select()
              .from(schema.user)
              .where(eq(schema.user.id, s.userId));
            if (!u || !isAgencyOwner(u))
              throw new APIError("FORBIDDEN", {
                code: "OWNER_ACCESS_DENIED",
                message: "Bu hesap yönetim erişimine yetkili değil.",
              });
            return { data: s };
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      revokeSessionsOnPasswordReset: true,
      requireEmailVerification: process.env.NODE_ENV === "production",
      sendResetPassword: async ({ user, url }) =>
        sendAuthMail(
          user.email,
          "MCT EMLAK — Şifre sıfırlama",
          `Şifrenizi sıfırlamak için bağlantıyı açın: ${url}`,
        ),
    },
    emailVerification: {
      sendOnSignUp: process.env.NODE_ENV === "production",
      sendOnSignIn: process.env.NODE_ENV === "production",
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        sendAuthMail(
          user.email,
          "MCT EMLAK — E-posta doğrulama",
          `Hesabınızın e-posta adresini doğrulamak için bağlantıyı açın: ${url}`,
        ),
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
        active: { type: "boolean", defaultValue: true, input: false },
        phone: { type: "string", required: false },
      },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    plugins: [nextCookies()],
  });
}

let auth: ReturnType<typeof createAuthentication> | undefined;
export function getAuth() {
  return (auth ??= createAuthentication(db()));
}

async function sendAuthMail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
    throw new Error("MAIL_NOT_CONFIGURED");
  const mail = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: process.env.NODE_ENV === "production",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  await mail.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
