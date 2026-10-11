import { searchListings } from "@/lib/queries";
import { apiError } from "@/lib/security";
export async function GET(req: Request) {
  try {
    return Response.json(
      await searchListings(Object.fromEntries(new URL(req.url).searchParams)),
    );
  } catch (e) {
    return apiError(e);
  }
}
