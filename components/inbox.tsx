import Link from "next/link";
import { db } from "@/db";
import { messages, user, listings } from "@/db/schema";
import { or, eq, desc, count, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/security";
import { Empty } from "./ui";
import { MessageForm, ReadMessage } from "./widgets";
export async function Inbox({
  page = 1,
  base = "/profil/mesajlar",
}: {
  page?: number;
  base?: string;
}) {
  const u = await requireUser();
  const where = or(eq(messages.senderId, u.id), eq(messages.recipientId, u.id));
  const [rows, [total]] = await Promise.all([
    db()
      .select({
        message: messages,
        listingTitle: listings.title,
        slug: listings.slug,
      })
      .from(messages)
      .leftJoin(listings, eq(messages.listingId, listings.id))
      .where(where)
      .orderBy(desc(messages.createdAt))
      .limit(20)
      .offset((page - 1) * 20),
    db().select({ n: count() }).from(messages).where(where),
  ]);
  const ids = [
    ...new Set(
      rows.flatMap((r) => [r.message.senderId, r.message.recipientId]),
    ),
  ];
  const people = ids.length
    ? await db()
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, ids))
    : [];
  return (
    <>
      <h1 style={{ fontSize: 36 }}>Mesajlarım</h1>
      {rows.length ? (
        <div className="panel">
          {rows.map(({ message: m, listingTitle, slug }) => (
            <article key={m.id} className="message">
              <div className="row between">
                <strong>
                  {people.find((p) => p.id === m.senderId)?.name || "Kullanıcı"}{" "}
                  →{" "}
                  {people.find((p) => p.id === m.recipientId)?.name ||
                    "Kullanıcı"}
                </strong>
                <span className="quiet" style={{ fontSize: 13 }}>
                  {m.createdAt.toLocaleString("tr-TR")}
                </span>
              </div>
              {slug ? (
                <Link href={`/ilan/${slug}`} className="quiet">
                  {listingTitle}
                </Link>
              ) : (
                <span className="quiet">İlan kaldırılmış</span>
              )}
              <p style={{ marginTop: 12 }}>{m.body}</p>
              {m.recipientId === u.id && !m.readAt && <ReadMessage id={m.id} />}
              <span className="quiet" style={{ fontSize: 13 }}>
                {m.readAt ? " · Okundu" : " · Okunmadı"}
              </span>
              {m.recipientId === u.id && m.listingId && (
                <details style={{ marginTop: 12 }}>
                  <summary>Yanıtla</summary>
                  <MessageForm
                    listingId={m.listingId}
                    recipientId={m.senderId}
                  />
                </details>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Henüz mesajınız yok."
          text="İlan sahipleriyle yaptığınız yazışmalar burada görünür."
        />
      )}
      <nav className="pagination">
        {page > 1 && (
          <Link className="button secondary" href={`${base}?page=${page - 1}`}>
            Önceki
          </Link>
        )}
        {page * 20 < total.n && (
          <Link className="button secondary" href={`${base}?page=${page + 1}`}>
            Sonraki
          </Link>
        )}
      </nav>
    </>
  );
}
