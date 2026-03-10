import { cookies } from "next/headers";

import { ActiveClientsTable } from "../../components/relationship/ActiveClientsTable";
import { PendingInviteState } from "../../components/relationship/PendingInviteState";
import {
  getRelationshipQueriesOrThrow,
  RelationshipQueriesError,
  type AppRole,
} from "../../features/relationships/queries";
import { deriveTrainerOverviewMetrics } from "../../features/relationships/selectors";

function getRoleFromCookie(value: string | undefined): AppRole | null {
  if (value === "trainer" || value === "client") {
    return value;
  }
  return null;
}

export default async function TrainerLandingPage() {
  const cookieStore = await cookies();
  const role = getRoleFromCookie(cookieStore.get("pt_role")?.value);
  const userId = cookieStore.get("pt_user_id")?.value;

  if (!userId || !role) {
    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Trainer Dashboard</h1>
        <p>Sign in as a trainer to view your client overview.</p>
      </main>
    );
  }

  if (role !== "trainer") {
    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Trainer Dashboard</h1>
        <p>This page is only available to trainer accounts.</p>
      </main>
    );
  }

  try {
    const queries = getRelationshipQueriesOrThrow();
    const snapshot = await queries.getTrainerDashboard({ trainerId: userId, role });
    const metrics = deriveTrainerOverviewMetrics(snapshot);

    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Trainer Dashboard</h1>
        <p>Active clients: {metrics.active_clients_count}</p>
        <p>Pending invites: {metrics.pending_invites_count}</p>

        <ActiveClientsTable clients={snapshot.active_clients} />
        <PendingInviteState invites={snapshot.pending_invites} />
      </main>
    );
  } catch (error) {
    const message =
      error instanceof RelationshipQueriesError ? error.message : "Relationship data is currently unavailable.";

    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Trainer Dashboard</h1>
        <p>{message}</p>
      </main>
    );
  }
}