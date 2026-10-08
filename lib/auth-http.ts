import { HttpError, jsonBody } from "./security";
import { authFailure } from "./auth-errors";
export async function forwardAuthRequest(
  req: Request,
  handler: (request: Request) => Promise<Response>,
) {
  try {
    let request = req;
    if (req.method === "POST" && req.body !== null) {
      const body = await jsonBody(req);
      const headers = new Headers(req.headers);
      headers.delete("content-length");
      request = new Request(req.url, {
        method: req.method,
        headers,
        body: JSON.stringify(body),
      });
    }
    const response = await handler(request);
    return response.status >= 500
      ? authFailure(new Error("AUTH_HANDLER_FAILURE"))
      : response;
  } catch (e) {
    if (e instanceof HttpError)
      return Response.json(
        { code: "INVALID_REQUEST", message: e.message },
        { status: e.status },
      );
    return authFailure(e);
  }
}
