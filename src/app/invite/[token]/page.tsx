import Link from "next/link";

type InvitePageProps = {
  params: {
    token: string;
  };
  searchParams?: {
    notice?: string;
  };
};

export default function InviteTokenPage({ params, searchParams }: InvitePageProps) {
  const token = params.token;
  const encodedToken = encodeURIComponent(token);
  const notice = searchParams?.notice;

  return (
    <main style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Trainer Invite</h1>
      <p>
        This invite links your client account to a trainer. Invite links expire after 7 days and can only be used
        once.
      </p>

      {notice ? <p role="status">{notice}</p> : null}

      <form method="post" action="/api/invites/accept">
        <input type="hidden" name="invite_token" value={token} />
        <button type="submit">Accept Invite</button>
      </form>

      <hr style={{ margin: "1.5rem 0" }} />

      <h2>Need to sign in first?</h2>
      <p>
        Existing clients should sign in, then return to this invite page and click <strong>Accept Invite</strong>.
      </p>
      <p>
        <Link href={`/signin?invite_token=${encodedToken}`}>Sign in to your client account</Link>
      </p>

      <h2>New client?</h2>
      <p>Create your client account using this invite token.</p>
      <p>
        <Link href={`/client-signup?invite_token=${encodedToken}`}>Create client account</Link>
      </p>
    </main>
  );
}