import { SignIn } from "@clerk/nextjs";
import { DeletedSessionRecovery } from "@/features/auth/components/DeletedSessionRecovery";
import { getAppOrigin } from "@/features/auth/config";
import { safeNext } from "@/features/auth/validation";

function getSignInRedirect(value?: string) {
  if (!value) return "/dashboard";

  try {
    const origin = getAppOrigin();
    const destination = new URL(value, origin);
    if (destination.origin !== origin) return "/dashboard";
    return safeNext(`${destination.pathname}${destination.search}`);
  } catch {
    return "/dashboard";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect_url?: string;
    sign_in_force_redirect_url?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const redirectUrl = getSignInRedirect(
    params.sign_in_force_redirect_url ?? params.redirect_url,
  );
  const notice = params.notice === "deleted" ? "Your account has been deleted. Please sign in again or create a new account." : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {notice && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
            {notice}
          </p>
        )}
        {params.error === "callback" && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            We could not finish signing you in. Please try again.
          </p>
        )}
        {notice ? (
          <DeletedSessionRecovery>
            <SignIn forceRedirectUrl={redirectUrl} />
          </DeletedSessionRecovery>
        ) : (
          <SignIn forceRedirectUrl={redirectUrl} />
        )}
      </div>
    </div>
  );
}
