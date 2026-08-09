import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createMiddleware().server(async ({ request, next }) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (request.method !== "GET" && request.method !== "HEAD" && origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return new Response("CSRF Validation Failed", { status: 403 });
      }
    } catch {
      /* ignore invalid origin */
    }
  }
  return await next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
