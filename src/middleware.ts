import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/dashboard/:path*",
    "/login",
    "/register",
  ],
};
