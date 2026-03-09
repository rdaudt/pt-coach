import Link from "next/link";

export default function TrainerSignupPage() {
  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Create Trainer Account</h1>
      <p>Trainer registration is open for this MVP pilot.</p>

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
