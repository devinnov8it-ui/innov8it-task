import "server-only";
import { createAdminClient } from "./admin";

export async function createClient({
  readOnly = false,
}: { readOnly?: boolean } = {}) {
  return createAdminClient();
}
