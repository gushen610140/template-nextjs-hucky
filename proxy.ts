import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/",
  "/en",
  "/zh",
  "/en(.*)",
  "/zh(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Run next-intl middleware for locale routing
  const intlResponse = intlMiddleware(req);

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return intlResponse;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
