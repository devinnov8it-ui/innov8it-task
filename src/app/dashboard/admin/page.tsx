import { redirect } from "next/navigation";
import { ADMIN_PORTAL_URL } from "@/lib/admin-portal";

export default function DashboardAdminRedirect() {
  redirect(ADMIN_PORTAL_URL);
}
