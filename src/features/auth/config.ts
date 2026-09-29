import "server-only";

export function getAppOrigin(): string {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("APP_URL is required in production.");
  }
  const url = new URL(configured || "http://localhost:3000");
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  ) {
    throw new Error(
      "APP_URL must be an HTTPS origin, or localhost for development.",
    );
  }
  return url.origin;
}
