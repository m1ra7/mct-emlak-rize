import { locations } from "@/lib/queries";
import { apiError } from "@/lib/security";
export async function GET(request: Request) {
  try {
    const district =
      new URL(request.url).searchParams.get("district") || undefined;
    if (
      district &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        district,
      )
    )
      return Response.json({ error: "Geçersiz ilçe." }, { status: 400 });
    return Response.json(await locations(district));
  } catch (e) {
    return apiError(e);
  }
}
