import { AuthConfigurationError } from "./auth-config";
export function authFailure(error: unknown) {
  const requestId = crypto.randomUUID();
  const code =
    error instanceof AuthConfigurationError
      ? error.code
      : error instanceof Error &&
          ["DATABASE_NOT_CONFIGURED", "DATABASE_URL_INVALID"].includes(
            error.message,
          )
        ? error.message
        : "AUTH_SERVICE_UNAVAILABLE";
  console.error("Authentication failed", {
    requestId,
    code,
    errorName: error instanceof Error ? error.name : "unknown",
  });
  return Response.json(
    {
      code,
      message:
        code === "AUTH_SERVICE_UNAVAILABLE"
          ? "Yönetim servisine erişilemiyor. Bağlantıyı ve hesap kurulumunu kontrol edin."
          : "Yönetim erişimi için sunucu ayarları eksik veya geçersiz. Kurulum kontrolünü çalıştırın.",
      requestId,
    },
    { status: 503 },
  );
}
