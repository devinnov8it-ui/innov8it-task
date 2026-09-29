import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: { path: "src/prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
