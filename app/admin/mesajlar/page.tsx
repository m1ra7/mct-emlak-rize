import { requireAdmin } from "@/lib/security";
import { Inbox } from "@/components/inbox";
export default async function Messages({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const p = await searchParams;
  return (
    <Inbox
      page={Math.max(1, parseInt(p.page || "1") || 1)}
      base="/admin/mesajlar"
    />
  );
}
