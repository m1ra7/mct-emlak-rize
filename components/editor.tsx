import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings, listingImages, listingFeatures } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { locations } from "@/lib/queries";
import { requireAdmin } from "@/lib/security";
import { ListingForm, ImagesManager } from "./listing-form";
import Link from "next/link";
import { PublicationActions } from "./publication-actions";
import { statusLabel } from "./ui";
export async function Editor({
  id,
  admin = true,
}: {
  id?: string;
  admin?: boolean;
}) {
  const u = await requireAdmin();
  if (!u) notFound();
  const data = await locations();
  if (!id)
    return (
      <>
        <div className="admin-page-heading">
          <div>
            <h1>Yeni ilan</h1>
            <p className="quiet">
              Bilgileri girin, ilanınızı doğrudan yayınlayın.
            </p>
          </div>
        </div>
        <ListingForm data={data} admin={admin} />
      </>
    );
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [listing] = await db()
    .select()
    .from(listings)
    .where(eq(listings.id, id));
  if (!listing || listing.userId !== u.id) notFound();
  data.neighborhoods = (await locations(listing.districtId)).neighborhoods;
  const [images, features] = await Promise.all([
    db()
      .select()
      .from(listingImages)
      .where(eq(listingImages.listingId, id))
      .orderBy(asc(listingImages.sortOrder)),
    db()
      .select()
      .from(listingFeatures)
      .where(eq(listingFeatures.listingId, id)),
  ]);
  return (
    <>
      <div className="admin-page-heading">
        <h1>İlanı düzenle</h1>
        <Link href={`/ilan/${listing.slug}`} className="button secondary">
          Önizleme
        </Link>
      </div>
      <div className="editor-publication-bar">
        <div>
          <span className={`tag status ${listing.status}`}>
            {statusLabel[listing.status]}
          </span>
          <p>
            {listing.status === "published"
              ? "Bu ilan ziyaretçilere açık."
              : "İlanı tek tıklamayla yayınlayabilirsiniz."}
          </p>
        </div>
        <PublicationActions id={listing.id} status={listing.status} />
      </div>
      <ListingForm
        key={listing.updatedAt.toISOString()}
        data={data}
        listing={listing}
        admin={admin}
        features={features}
      />
      <ImagesManager listingId={id} images={images} />
    </>
  );
}
