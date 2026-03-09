import Link from "next/link";

export default function ClientSignupPage() {
  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Create Client Account</h1>
      <p>Client accounts are invite-only. You need an active trainer invite link.</p>

      <form method="post" action="/api/auth/client-signup">
        <label htmlFor="invite_token">Invite Token</label>
        <input id="invite_token" name="invite_token" type="text" required />

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
