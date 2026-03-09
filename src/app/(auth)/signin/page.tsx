import Link from "next/link";

export default function SignInPage() {
  return (
    <main style={{ maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Sign In</h1>
      <p>Use your trainer or client account credentials.</p>

      <form method="post" action="/api/auth/signin">
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
