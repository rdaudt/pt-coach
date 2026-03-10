import Link from "next/link";
import { cookies } from "next/headers";

import { RoleNoticeBanner } from "../../components/navigation/RoleNoticeBanner";
import { ensureLocalRuntimeRegistered } from "../../features/dev/local-runtime";
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
  searchParams?: Promise<{
    notice?: string;
  }>;
};

export default async function ClientLandingPage({ searchParams }: ClientLandingPageProps) {
  ensureLocalRuntimeRegistered();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const notice = resolvedSearchParams?.notice;
  const cookieStore = await cookies();
  const role = getRoleFromCookie(cookieStore.get("pt_role")?.value);
  const userId = cookieStore.get("pt_user_id")?.value;

  if (!userId || !role) {
    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Client Dashboard</h1>
        <RoleNoticeBanner notice={notice} />
        <p>Sign in as a client to view your coach connection status.</p>
        <p>
          <Link href="/signin">Go to sign in</Link>
        </p>
      </main>
    );
  }

  if (role !== "client") {
    return (
      <main style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}>
        <h1>Client Dashboard</h1>
        <RoleNoticeBanner notice={notice} />
        <p>This page is only available to client accounts.</p>
        <form method="post" action="/api/auth/signout">
          <button type="submit">Sign out</button>
        </form>
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
        <form method="post" action="/api/auth/signout" style={{ marginTop: "1.5rem" }}>
          <button type="submit">Sign out</button>
        </form>
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
        <form method="post" action="/api/auth/signout">
          <button type="submit">Sign out</button>
        </form>
      </main>
    );
  }
}
