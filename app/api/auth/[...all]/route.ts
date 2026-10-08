import { getAuth } from "@/lib/auth";
import { forwardAuthRequest } from "@/lib/auth-http";
export const runtime = "nodejs";
const handle = (req: Request) =>
  forwardAuthRequest(req, (request) => getAuth().handler(request));
export const GET = handle;
export const POST = handle;
