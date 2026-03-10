import Link from "next/link";

const ERROR_COPY: Record<string, string> = {
  invalid_input: "Please provide a valid email and password.",
  invalid_credentials: "Invalid email or password.",
  profile_missing: "Account profile is missing. Contact support.",
  auth_required: "Sign in is required before continuing.",
  unexpected_error: "Sign in failed unexpectedly. Try again.",
};

const NOTICE_COPY: Record<string, string> = {
  signed_out: "You have been signed out.",
};

type SignInPageProps = {
  searchParams?: Promise<{
    invite_token?: string;
    error?: string;
    notice?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const inviteToken = resolvedSearchParams?.invite_token ?? "";
  const errorCode = resolvedSearchParams?.error;
  const noticeCode = resolvedSearchParams?.notice;
  const errorMessage = errorCode ? ERROR_COPY[errorCode] ?? "Sign in failed." : null;
  const noticeMessage = noticeCode ? NOTICE_COPY[noticeCode] ?? null : null;

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Sign In</h1>
      <p>Use your trainer or client account credentials.</p>
      {noticeMessage ? <p role="status">{noticeMessage}</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {inviteToken ? <p>After sign in you will be redirected back to your invite link.</p> : null}

      <form method="post" action="/api/auth/signin">
        {inviteToken ? <input type="hidden" name="invite_token" value={inviteToken} /> : null}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />

        <button type="submit">Sign In</button>
      </form>

      <p>
        New here? <Link href="/">Choose role to create an account</Link>
      </p>
    </main>
  );
}
