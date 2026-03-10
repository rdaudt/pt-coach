export type AppRole = "trainer" | "client";

export type ActiveClientRecord = {
  id: string;
  email: string;
  full_name: string;
  linked_at: Date;
};

export type PendingInviteRecord = {
  id: string;
  client_email: string;
  expires_at: Date;
  sent_at: Date;
  invite_token?: string;
};

export type TrainerSummary = {
  id: string;
  display_name: string;
  business_name: string | null;
};

export type ClientProfile = {
  id: string;
  email: string;
  role: AppRole;
};

export type RelationshipReadRepository = {
  listActiveClientsForTrainer(trainerId: string): Promise<ActiveClientRecord[]>;
  listPendingInvitesForTrainer(trainerId: string): Promise<PendingInviteRecord[]>;
  findClientProfile(clientId: string): Promise<ClientProfile | null>;
  findActiveTrainerForClient(clientId: string): Promise<TrainerSummary | null>;
  findLatestPendingInviteByEmail(email: string): Promise<PendingInviteRecord | null>;
};

export type TrainerDashboardResult = {
  active_clients: ActiveClientRecord[];
  pending_invites: PendingInviteRecord[];
};

export type ClientConnectionResult =
  | {
      status: "active";
      trainer: TrainerSummary;
      linked_at: Date | null;
    }
  | {
      status: "pending";
      invite_expires_at: Date;
    }
  | {
      status: "unlinked";
    };

export type RelationshipQueriesDependencies = {
  repository: RelationshipReadRepository;
  now?: () => Date;
};

export type RelationshipQueriesErrorCode = "SERVICE_NOT_CONFIGURED" | "FORBIDDEN_ROLE" | "PROFILE_NOT_FOUND";

export class RelationshipQueriesError extends Error {
  constructor(
    readonly code: RelationshipQueriesErrorCode,
    message: string,
    readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "RelationshipQueriesError";
  }
}

export class RelationshipQueries {
  private readonly now: () => Date;

  constructor(private readonly deps: RelationshipQueriesDependencies) {
    this.now = deps.now ?? (() => new Date());
  }

  async getTrainerDashboard(input: { trainerId: string; role: AppRole }): Promise<TrainerDashboardResult> {
    if (input.role !== "trainer") {
      throw new RelationshipQueriesError("FORBIDDEN_ROLE", "Trainer dashboard is restricted to trainer users.", 403);
    }

    const [activeClients, pendingInvites] = await Promise.all([
      this.deps.repository.listActiveClientsForTrainer(input.trainerId),
      this.deps.repository.listPendingInvitesForTrainer(input.trainerId),
    ]);

    const now = this.now().getTime();
    const pendingActive = pendingInvites.filter((invite) => invite.expires_at.getTime() > now);

    return {
      active_clients: activeClients,
      pending_invites: pendingActive,
    };
  }

  async getClientConnection(input: { clientId: string; role: AppRole }): Promise<ClientConnectionResult> {
    if (input.role !== "client") {
      throw new RelationshipQueriesError("FORBIDDEN_ROLE", "Client connection view is restricted to client users.", 403);
    }

    const profile = await this.deps.repository.findClientProfile(input.clientId);
    if (!profile) {
      throw new RelationshipQueriesError("PROFILE_NOT_FOUND", "Client profile not found.", 404);
    }

    const activeTrainer = await this.deps.repository.findActiveTrainerForClient(input.clientId);
    if (activeTrainer) {
      return {
        status: "active",
        trainer: activeTrainer,
        linked_at: null,
      };
    }

    const pendingInvite = await this.deps.repository.findLatestPendingInviteByEmail(profile.email);
    if (pendingInvite && pendingInvite.expires_at.getTime() > this.now().getTime()) {
      return {
        status: "pending",
        invite_expires_at: pendingInvite.expires_at,
      };
    }

    return {
      status: "unlinked",
    };
  }
}

export type RelationshipQueriesFactory = () => RelationshipQueries;

let relationshipQueriesFactory: RelationshipQueriesFactory | null = null;

export function registerRelationshipQueriesFactory(factory: RelationshipQueriesFactory): void {
  relationshipQueriesFactory = factory;
}

export function getRelationshipQueriesOrThrow(): RelationshipQueries {
  if (!relationshipQueriesFactory) {
    throw new RelationshipQueriesError(
      "SERVICE_NOT_CONFIGURED",
      "Relationship query service is not registered for this environment.",
      503,
    );
  }

  return relationshipQueriesFactory();
}
