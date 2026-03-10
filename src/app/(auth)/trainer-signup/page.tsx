import Link from "next/link";

const ERROR_COPY: Record<string, string> = {
  invalid_input: "Please complete all required fields correctly.",
  email_taken: "That email is already registered. Sign in instead.",
  role_mismatch: "This account is assigned to another role. Contact support.",
  unexpected_error: "Signup failed unexpectedly. Try again.",
};

type TrainerSignupPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function TrainerSignupPage({ searchParams }: TrainerSignupPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorCode = resolvedSearchParams?.error;
  const errorMessage = errorCode ? ERROR_COPY[errorCode] ?? "Signup failed. Please try again." : null;

  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Create Trainer Account</h1>
      <p>Trainer registration is open for this MVP pilot.</p>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}

      <form method="post" action="/api/auth/trainer-signup">
        <label htmlFor="full_name">Full Name</label>
        <input id="full_name" name="full_name" type="text" required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" minLength={8} required />

        <button type="submit">Create Trainer Account</button>
      </form>

      <p>
        Already have an account? <Link href="/signin">Sign in</Link>
      </p>
    </main>
  );
}
