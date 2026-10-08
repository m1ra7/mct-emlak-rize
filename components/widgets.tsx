"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export async function request(path: string, method: string, body?: unknown) {
  const res = await fetch("/api/manage/" + path, {
    method,
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body instanceof FormData
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "İşlem tamamlanamadı.");
  return data;
}
export function Logout() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button secondary small"
        onClick={async () => {
          const r = await authClient.signOut();
          if (r.error) setError("Çıkış yapılamadı.");
          else {
            router.push("/");
            router.refresh();
          }
        }}
      >
        Çıkış
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
export function DeleteListing({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        disabled={busy}
        className="button danger small"
        onClick={async () => {
          if (!confirm("Bu ilanı ve fotoğraflarını silmek istiyor musunuz?"))
            return;
          setBusy(true);
          try {
            await request(`listings/${id}`, "DELETE");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Sil
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
export function MessageForm({
  listingId,
  recipientId,
}: {
  listingId: string;
  recipientId?: string;
}) {
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setNotice("");
        try {
          await request("messages", "POST", { listingId, body, recipientId });
          setBody("");
          setNotice("Mesajınız gönderildi.");
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Mesajınız
        <textarea
          required
          maxLength={3000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bu ilan hakkında bilgi almak istiyorum…"
        />
      </label>
      <button className="button" disabled={busy}>
        {busy ? "Gönderiliyor…" : "Mesaj gönder"}
      </button>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert success" role="status">
          {notice}
        </p>
      )}
    </form>
  );
}
export function ReadMessage({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button secondary small"
        onClick={async () => {
          try {
            await request(`messages/${id}`, "PATCH");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Okundu olarak işaretle
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
export function ProfileForm({
  name,
  phone,
}: {
  name: string;
  phone: string | null;
}) {
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setOk(false);
        const f = new FormData(e.currentTarget);
        try {
          await request("profile", "PATCH", {
            name: f.get("name"),
            phone: f.get("phone"),
          });
          setOk(true);
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Ad soyad
        <input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label>
        Telefon
        <input
          name="phone"
          type="tel"
          defaultValue={phone || ""}
          placeholder="+90 …"
        />
        <span className="quiet">
          İlanlarınızda görünür; telefon ve WhatsApp iletişiminde kullanılır.
        </span>
      </label>
      <button disabled={busy} className="button">
        Kaydet
      </button>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="alert success" role="status">
          Profiliniz güncellendi.
        </p>
      )}
    </form>
  );
}
export function UserControl({
  id,
  role,
  active,
}: {
  id: string;
  role: string;
  active: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(r: string, a: boolean) {
    setBusy(true);
    setError("");
    try {
      await request(`users/${id}`, "PATCH", { role: r, active: a });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="row">
      <select
        aria-label="Kullanıcı rolü"
        value={role}
        disabled={busy}
        style={{ width: 105 }}
        onChange={(e) => {
          if (confirm("Kullanıcının rolünü değiştirmek istiyor musunuz?"))
            void save(e.target.value, active);
        }}
      >
        <option value="user">Kullanıcı</option>
        <option value="admin">Yönetici</option>
      </select>
      <button
        disabled={busy}
        className="button secondary small"
        onClick={() => {
          if (confirm("Hesap durumunu değiştirmek istiyor musunuz?"))
            void save(role, !active);
        }}
      >
        {active ? "Pasif yap" : "Aktif yap"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
