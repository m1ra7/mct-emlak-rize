export function authErrorMessage(error: {
  code?: string;
  status?: number;
  message?: string;
}) {
  if (error.status === 429)
    return "Çok fazla giriş denemesi. Biraz sonra tekrar deneyin.";
  if (
    (error.status ?? 0) >= 500 ||
    [
      "AUTH_SERVICE_UNAVAILABLE",
      "AUTH_SECRET_MISSING",
      "ADMIN_EMAIL_MISSING",
      "AUTH_URL_INVALID",
      "DATABASE_NOT_CONFIGURED",
      "DATABASE_URL_INVALID",
    ].includes(error.code || "")
  )
    return "Yönetim servisi hazır değil veya veritabanına erişilemiyor. Terminalde npm run admin:check komutunu çalıştırın.";
  if (["INVALID_ORIGIN", "INVALID_CALLBACK_URL"].includes(error.code || ""))
    return "Site adresi sunucu ayarıyla eşleşmiyor. BETTER_AUTH_URL adresini kontrol edip sunucuyu yeniden başlatın.";
  if (error.code === "EMAIL_NOT_VERIFIED")
    return "Yönetici hesabı doğrulanmamış. Terminalde npm run admin:repair komutuyla hesabınızı onarın.";
  if (error.code === "OWNER_ACCESS_DENIED")
    return "Bu hesap işletme sahibi olarak tanımlı değil veya pasif. ADMIN_EMAIL ayarını kontrol edin; gerekirse admin:repair çalıştırın.";
  if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401)
    return "E-posta veya şifre hatalı. Şifrenizi yenileyebilir veya Terminalde npm run admin:repair çalıştırabilirsiniz.";
  return "Giriş tamamlanamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.";
}
