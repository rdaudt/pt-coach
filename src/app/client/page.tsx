import Link from "next/link";
import { cookies } from "next/headers";

import { RoleNoticeBanner } from "../../components/navigation/RoleNoticeBanner";
import {
  getRelationshipQueriesOrThrow,
  RelationshipQueriesError,
  type AppRole,
} from "../../features/relationships/queries";
import { deriveClientConnectionState } from "../../features/relationships/selectors";

function getRoleFromCookie(value: string | undefined): AppRole | null {
  if (value === "trainer" || value === "client") {
    return value;
  }
  return null;
}

type ClientLandingPageProps = {
  searchParams?: {
    notice?: string;
  };
};

export default async function ClientLandingPage({ searchParams }: ClientLandingPageProps) {
  const notice = searchParams?.notice;
  const cookieStore = await cookies();
  const role = getRoleFromCookie(cookieStore.get("pt_role")?.value);
  const userId = cookieStore.get("pt_user_id")?.value;

  if (!userId || !role) {
    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Client Dashboard</h1>
        <RoleNoticeBanner notice={notice} />
        <p>Sign in as a client to view your coach connection status.</p>
      </main>
    );
  }

  if (role !== "client") {
    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Client Dashboard</h1>
        <RoleNoticeBanner notice={notice} />
        <p>This page is only available to client accounts.</p>
      </main>
    );
  }

  try {
    const queries = getRelationshipQueriesOrThrow();
    const connection = await queries.getClientConnection({ clientId: userId, role });
    const state = deriveClientConnectionState(connection);

    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Client Dashboard</h1>
        <RoleNoticeBanner notice={notice} />
        <h2>{state.title}</h2>
        <p>{state.detail}</p>
        <p>
          <Link href={state.action_href}>{state.action_label}</Link>
        </p>
      </main>
    );
  } catch (error) {
    const message =
      error instanceof RelationshipQueriesError ? error.message : "Relationship data is currently unavailable.";

    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Client Dashboard</h1>
        <RoleNoticeBanner notice={notice} />
        <p>{message}</p>
      </main>
    );
  }
}
