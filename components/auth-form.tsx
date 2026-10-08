"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Mail, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-messages";
export function AuthForm({ mode }: { mode: string }) {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const forgot = mode === "sifremi-unuttum",
    reset = mode === "sifre-sifirla";
  return (
    <form
      className="stack auth-fields"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const email = String(f.get("email") || "")
            .trim()
            .toLowerCase();
          if (forgot) {
            const r = await authClient.requestPasswordReset({
              email,
              redirectTo: "/yonetim/sifre-sifirla",
            });
            if (r.error) throw new Error(authErrorMessage(r.error));
            setNotice(
              "Bu adrese bağlı bir yönetici hesabı varsa sıfırlama bağlantısı gönderildi.",
            );
          } else if (reset) {
            const token = params.get("token");
            if (!token)
              throw new Error(
                "Sıfırlama bağlantısı geçersiz. Yeni bir bağlantı isteyin.",
              );
            const r = await authClient.resetPassword({
              newPassword: String(f.get("password")),
              token,
            });
            if (r.error)
              throw new Error(
                r.error.status >= 500
                  ? authErrorMessage(r.error)
                  : "Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.",
              );
            setNotice(
              "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
            );
          } else {
            const r = await authClient.signIn.email({
              email,
              password: String(f.get("password")),
              rememberMe: true,
            });
            if (r.error) throw new Error(authErrorMessage(r.error));
            // A full navigation avoids stale prefetched RSC data after the cookie is set.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Discard pre-login RSC cache after the new session cookie is installed.
            window.location.assign("/admin");
          }
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Bağlantı kurulamadı. Tekrar deneyin.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {!reset && (
        <label htmlFor="admin-email">
          Yönetici e-postası
          <div className="auth-input">
            <Mail size={18} />
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="E-posta adresiniz"
              required
              disabled={busy}
            />
          </div>
        </label>
      )}
      {!forgot && (
        <label htmlFor="admin-password">
          {reset ? "Yeni şifre" : "Şifre"}
          <div className="auth-input">
            <LockKeyhole size={18} />
            <input
              id="admin-password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete={reset ? "new-password" : "current-password"}
              placeholder={reset ? "En az 12 karakter" : "Şifreniz"}
              required
              minLength={reset ? 12 : 1}
              maxLength={128}
              disabled={busy}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
              aria-pressed={visible}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
      )}
      {!forgot && !reset && (
        <div className="auth-options">
          <span>Güvenli işletme erişimi</span>
          <Link href="/yonetim/sifremi-unuttum">Şifremi unuttum</Link>
        </div>
      )}
      <button className="button auth-submit" disabled={busy}>
        {busy
          ? "Bağlanılıyor…"
          : forgot
            ? "Sıfırlama bağlantısı gönder"
            : reset
              ? "Şifreyi güncelle"
              : "Yönetim paneline gir"}
        <ArrowRight size={18} />
      </button>
      {error && (
        <p role="alert" className="alert auth-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="alert success">
          {notice}
        </p>
      )}
      {(forgot || reset) && (
        <Link className="auth-return" href="/yonetim/giris">
          Giriş ekranına dön
        </Link>
      )}
    </form>
  );
}
