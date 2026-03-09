import { randomBytes } from "node:crypto";

import {
  acceptInviteSchema,
  inviteTokenSchema,
  resendInviteSchema,
  sendInviteSchema,
  type InviteRecord,
} from "./schemas";

const INVITE_TTL_DAYS = 7;
const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

export type ProfileRole = "trainer" | "client";

export type ProfileRecord = {
  id: string;
  email: string;
  role: ProfileRole;
};

export type TrainerClientRecord = {
  id: string;
  trainer_id: string;
  client_id: string;
  status: "invited" | "active" | "inactive";
};

export type InviteRepository = {
  findPendingByTrainerAndEmail(trainerId: string, clientEmail: string): Promise<InviteRecord | null>;
  createPendingInvite(input: {
    trainerId: string;
    clientEmail: string;
    inviteToken: string;
    expiresAt: Date;
  }): Promise<InviteRecord>;
  refreshPendingInvite(input: {
    inviteId: string;
    inviteToken: string;
    expiresAt: Date;
  }): Promise<InviteRecord>;
  findByToken(inviteToken: string): Promise<InviteRecord | null>;
  consumeInvite(input: { inviteId: string; clientId: string; consumedAt: Date }): Promise<void>;
};

export type RelationshipRepository = {
  findActiveByClientId(clientId: string): Promise<TrainerClientRecord | null>;
  activateLink(input: { trainerId: string; clientId: string }): Promise<TrainerClientRecord>;
  activateLinkFromInvite?(input: {
    inviteId: string;
    trainerId: string;
    clientId: string;
    consumedAt: Date;
  }): Promise<TrainerClientRecord>;
};

export type ProfileRepository = {
  findById(userId: string): Promise<ProfileRecord | null>;
  findByEmail(email: string): Promise<ProfileRecord | null>;
};

export type InviteServiceDependencies = {
  invites: InviteRepository;
  relationships: RelationshipRepository;
  profiles: ProfileRepository;
  now?: () => Date;
};

export type InviteIssueResult = {
  action: "created" | "refreshed";
  invite: InviteRecord;
};

export type InviteAcceptResult = {
  relationship: TrainerClientRecord;
  invite: InviteRecord;
};

export type InviteStatus = "pending" | "expired" | "consumed" | "revoked";

export type InviteServiceErrorCode =
  | "SERVICE_NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "FORBIDDEN_ROLE"
  | "PROFILE_NOT_FOUND"
  | "INVITE_NOT_FOUND"
  | "INVITE_EXPIRED"
  | "INVITE_REVOKED"
  | "INVITE_CONSUMED"
  | "INVITE_EMAIL_MISMATCH"
  | "CLIENT_ALREADY_LINKED";

export class InviteServiceError extends Error {
  constructor(
    readonly code: InviteServiceErrorCode,
    message: string,
    readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "InviteServiceError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

function getInviteStatus(invite: InviteRecord, now: Date): InviteStatus {
  if (invite.revoked_at) {
    return "revoked";
  }
  if (invite.consumed_at) {
    return "consumed";
  }
  if (invite.expires_at.getTime() <= now.getTime()) {
    return "expired";
  }
  return "pending";
}

export class InviteService {
  private readonly now: () => Date;

  constructor(private readonly deps: InviteServiceDependencies) {
    this.now = deps.now ?? (() => new Date());
  }

  async issueInvite(trainerId: string, payload: unknown): Promise<InviteIssueResult> {
    const parsed = sendInviteSchema.parse(payload);
    const trainer = await this.assertTrainer(trainerId);
    const clientEmail = normalizeEmail(parsed.client_email);

    await this.assertClientCanBeInvited(clientEmail);

    const existingInvite = await this.deps.invites.findPendingByTrainerAndEmail(trainer.id, clientEmail);
    const nextToken = createInviteToken();
    const expiresAt = new Date(this.now().getTime() + INVITE_TTL_MS);

    if (existingInvite) {
      const refreshedInvite = await this.deps.invites.refreshPendingInvite({
        inviteId: existingInvite.id,
        inviteToken: nextToken,
        expiresAt,
      });
      return { action: "refreshed", invite: refreshedInvite };
    }

    const createdInvite = await this.deps.invites.createPendingInvite({
      trainerId: trainer.id,
      clientEmail,
      inviteToken: nextToken,
      expiresAt,
    });
    return { action: "created", invite: createdInvite };
  }

  async resendInvite(trainerId: string, payload: unknown): Promise<InviteIssueResult> {
    const parsed = resendInviteSchema.parse(payload);
    const trainer = await this.assertTrainer(trainerId);
    const clientEmail = normalizeEmail(parsed.client_email);

    const existingInvite = await this.deps.invites.findPendingByTrainerAndEmail(trainer.id, clientEmail);
    if (!existingInvite) {
      throw new InviteServiceError("INVITE_NOT_FOUND", "No pending invite found for that client email.", 404);
    }

    await this.assertClientCanBeInvited(clientEmail);

    const refreshedInvite = await this.deps.invites.refreshPendingInvite({
      inviteId: existingInvite.id,
      inviteToken: createInviteToken(),
      expiresAt: new Date(this.now().getTime() + INVITE_TTL_MS),
    });

    return { action: "refreshed", invite: refreshedInvite };
  }

  async ensureTokenUsable(inviteToken: string, email: string): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const parsedToken = inviteTokenSchema.parse(inviteToken);
    const invite = await this.deps.invites.findByToken(parsedToken);

    if (!invite) {
      throw new InviteServiceError("INVITE_NOT_FOUND", "Invite token is invalid.", 404);
    }

    const status = getInviteStatus(invite, this.now());
    if (status === "expired") {
      throw new InviteServiceError("INVITE_EXPIRED", "Invite token has expired.", 410);
    }
    if (status === "revoked") {
      throw new InviteServiceError("INVITE_REVOKED", "Invite token has been revoked.", 409);
    }
    if (status === "consumed") {
      throw new InviteServiceError("INVITE_CONSUMED", "Invite token has already been used.", 409);
    }

    if (normalizeEmail(invite.client_email) !== normalizedEmail) {
      throw new InviteServiceError(
        "INVITE_EMAIL_MISMATCH",
        "Invite token email does not match the current account email.",
        409,
      );
    }
  }

  async acceptInvite(clientId: string, payload: unknown): Promise<InviteAcceptResult> {
    const parsed = acceptInviteSchema.parse(payload);
    const invite = await this.deps.invites.findByToken(parsed.invite_token);

    if (!invite) {
      throw new InviteServiceError("INVITE_NOT_FOUND", "Invite token is invalid.", 404);
    }

    const status = getInviteStatus(invite, this.now());
    if (status === "expired") {
      throw new InviteServiceError("INVITE_EXPIRED", "Invite token has expired.", 410);
    }
    if (status === "revoked") {
      throw new InviteServiceError("INVITE_REVOKED", "Invite token has been revoked.", 409);
    }
    if (status === "consumed") {
      throw new InviteServiceError("INVITE_CONSUMED", "Invite token has already been used.", 409);
    }

    const clientProfile = await this.deps.profiles.findById(clientId);
    if (!clientProfile) {
      throw new InviteServiceError("PROFILE_NOT_FOUND", "Client profile not found.", 404);
    }
    if (clientProfile.role !== "client") {
      throw new InviteServiceError("FORBIDDEN_ROLE", "Only client accounts can accept invites.", 403);
    }
    if (normalizeEmail(clientProfile.email) !== normalizeEmail(invite.client_email)) {
      throw new InviteServiceError(
        "INVITE_EMAIL_MISMATCH",
        "Invite token email does not match the authenticated client account.",
        409,
      );
    }

    const activeLink = await this.deps.relationships.findActiveByClientId(clientId);
    if (activeLink && activeLink.trainer_id !== invite.trainer_id) {
      throw new InviteServiceError(
        "CLIENT_ALREADY_LINKED",
        "Client is already linked to another trainer. Contact support for role correction.",
        409,
      );
    }

    const relationship =
      activeLink ??
      (await this.acceptInviteTransition({
        inviteId: invite.id,
        trainerId: invite.trainer_id,
        clientId,
      }));

    if (activeLink) {
      await this.deps.invites.consumeInvite({
        inviteId: invite.id,
        clientId,
        consumedAt: this.now(),
      });
    }

    return { relationship, invite };
  }

  private async assertTrainer(trainerId: string): Promise<ProfileRecord> {
    const profile = await this.deps.profiles.findById(trainerId);
    if (!profile) {
      throw new InviteServiceError("PROFILE_NOT_FOUND", "Trainer profile not found.", 404);
    }
    if (profile.role !== "trainer") {
      throw new InviteServiceError("FORBIDDEN_ROLE", "Only trainer accounts can issue invites.", 403);
    }
    return profile;
  }

  private async assertClientCanBeInvited(clientEmail: string): Promise<void> {
    const existingProfile = await this.deps.profiles.findByEmail(clientEmail);
    if (!existingProfile) {
      return;
    }

    if (existingProfile.role !== "client") {
      throw new InviteServiceError("FORBIDDEN_ROLE", "Trainer invites can only target client accounts.", 409);
    }

    const activeLink = await this.deps.relationships.findActiveByClientId(existingProfile.id);
    if (activeLink) {
      throw new InviteServiceError(
        "CLIENT_ALREADY_LINKED",
        "Client is already linked to a trainer and cannot be re-invited.",
        409,
      );
    }
  }

  private async acceptInviteTransition(input: {
    inviteId: string;
    trainerId: string;
    clientId: string;
  }): Promise<TrainerClientRecord> {
    const consumedAt = this.now();

    // Repository adapters should implement this for true DB-level atomicity.
    if (this.deps.relationships.activateLinkFromInvite) {
      return this.deps.relationships.activateLinkFromInvite({
        inviteId: input.inviteId,
        trainerId: input.trainerId,
        clientId: input.clientId,
        consumedAt,
      });
    }

    // Fallback for non-transactional adapters used in local/dev scaffolding.
    const relationship = await this.deps.relationships.activateLink({
      trainerId: input.trainerId,
      clientId: input.clientId,
    });
    await this.deps.invites.consumeInvite({
      inviteId: input.inviteId,
      clientId: input.clientId,
      consumedAt,
    });
    return relationship;
  }
}

export type InviteServiceFactory = () => InviteService;

let inviteServiceFactory: InviteServiceFactory | null = null;

export function registerInviteServiceFactory(factory: InviteServiceFactory): void {
  inviteServiceFactory = factory;
}

export function getInviteServiceOrThrow(): InviteService {
  if (!inviteServiceFactory) {
    throw new InviteServiceError(
      "SERVICE_NOT_CONFIGURED",
      "Invite service dependencies are not registered for this environment.",
      503,
    );
  }

  return inviteServiceFactory();
}
