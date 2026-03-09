import Link from "next/link";

const cardStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  borderRadius: "12px",
  padding: "1.25rem",
  marginBottom: "1rem",
};

export default function AuthRoleEntryPage() {
  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Video Coaching Portal</h1>
      <p>Choose your role to continue.</p>

      <section style={cardStyle}>
        <h2>I am a Trainer</h2>
        <p>Create your trainer account and invite clients.</p>
        <Link href="/trainer-signup">Continue as Trainer</Link>
      </section>

      <section style={cardStyle}>
        <h2>I am a Client</h2>
        <p>Join through your trainer invite to connect your account.</p>
        <Link href="/client-signup">Continue as Client</Link>
      </section>

      <p>
        Already have an account? <Link href="/signin">Sign in</Link>
      </p>
    </main>
  );
}
