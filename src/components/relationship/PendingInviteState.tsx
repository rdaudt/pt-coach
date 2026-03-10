import type { PendingInviteRecord } from "../../features/relationships/queries";

type PendingInviteStateProps = {
  invites: PendingInviteRecord[];
};

export function PendingInviteState({ invites }: PendingInviteStateProps) {
  if (invites.length === 0) {
    return (
      <section>
        <h2>Pending Invites</h2>
        <p>No pending invites.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Pending Invites</h2>
      <ul>
        {invites.map((invite) => (
          <li key={invite.id}>
            <strong>{invite.client_email}</strong>
            <span>
              {" "}
              - expires {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(invite.expires_at)}
            </span>
            {invite.invite_token ? (
              <div style={{ marginTop: "0.5rem" }}>
                <div>
                  Local testing token: <code>{invite.invite_token}</code>
                </div>
                <a href={`/invite/${encodeURIComponent(invite.invite_token)}`}>Open invite link</a>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
