import { requireAdmin } from "@/lib/security";
import { Editor } from "@/components/editor";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  return <Editor id={id === "new" ? undefined : id} admin />;
}
