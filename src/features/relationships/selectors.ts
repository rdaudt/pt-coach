import type { ClientConnectionResult, TrainerDashboardResult } from "./queries";

export const CLIENT_SUBMISSIONS_ROUTE = "/client/submissions";

export type ClientConnectionUIState = {
  status: "active" | "pending" | "unlinked";
  title: string;
  detail: string;
  action_label: string;
  action_href: string;
};

export function deriveClientConnectionState(connection: ClientConnectionResult): ClientConnectionUIState {
  if (connection.status === "active") {
    return {
      status: "active",
      title: "Coach connected",
      detail: `You are linked to ${connection.trainer.display_name}.`,
      action_label: "View submission dashboard",
      action_href: CLIENT_SUBMISSIONS_ROUTE,
    };
  }

  if (connection.status === "pending") {
    const expiryLabel = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(connection.invite_expires_at);

    return {
      status: "pending",
      title: "Invite pending",
      detail: `Your coach invite is still pending. It expires on ${expiryLabel}.`,
      action_label: "Refresh invite details",
      action_href: "/client",
    };
  }

  return {
    status: "unlinked",
    title: "No coach linked",
    detail: "Ask your trainer to send a new invite link to connect your account.",
    action_label: "Open invite link",
    action_href: "/invite",
  };
}

export type TrainerOverviewMetrics = {
  active_clients_count: number;
  pending_invites_count: number;
  has_active_clients: boolean;
  has_pending_invites: boolean;
};

export function deriveTrainerOverviewMetrics(snapshot: TrainerDashboardResult): TrainerOverviewMetrics {
  const activeClientsCount = snapshot.active_clients.length;
  const pendingInvitesCount = snapshot.pending_invites.length;

  return {
    active_clients_count: activeClientsCount,
    pending_invites_count: pendingInvitesCount,
    has_active_clients: activeClientsCount > 0,
    has_pending_invites: pendingInvitesCount > 0,
  };
}
