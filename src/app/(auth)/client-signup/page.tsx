import Link from "next/link";

const ERROR_COPY: Record<string, string> = {
  invalid_input: "Please complete all required fields correctly.",
  email_taken: "That email is already registered. Sign in instead.",
  invite_not_found: "Invite token is invalid. Ask your trainer for a new link.",
  invite_expired: "Invite token has expired. Ask your trainer to resend it.",
  invite_consumed: "Invite token was already used. Ask your trainer for a new link.",
  invite_revoked: "Invite token has been revoked. Ask your trainer for a new invite.",
  invite_email_mismatch: "Invite token email must match your signup email.",
  client_already_linked: "Client account is already linked to a trainer.",
  role_mismatch: "This account is assigned to another role. Contact support.",
  unexpected_error: "Signup failed unexpectedly. Try again.",
};

type ClientSignupPageProps = {
  searchParams?: Promise<{
    invite_token?: string;
    error?: string;
  }>;
};

export default async function ClientSignupPage({ searchParams }: ClientSignupPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const inviteToken = resolvedSearchParams?.invite_token ?? "";
  const errorCode = resolvedSearchParams?.error;
  const errorMessage = errorCode ? ERROR_COPY[errorCode] ?? "Signup failed. Please try again." : null;

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Create Client Account</h1>
      <p>Client accounts are invite-only. You need an active trainer invite link.</p>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}

      <form method="post" action="/api/auth/client-signup">
        <label htmlFor="invite_token">Invite Token</label>
        <input id="invite_token" name="invite_token" type="text" defaultValue={inviteToken} required />

        <label htmlFor="full_name">Full Name</label>
        <input id="full_name" name="full_name" type="text" required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" minLength={8} required />

        <button type="submit">Create Client Account</button>
      </form>

      <p>
        Already have an account? <Link href="/signin">Sign in</Link>
      </p>
    </main>
  );
}
