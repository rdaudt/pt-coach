import { randomUUID } from "node:crypto";

import type { ProfileRepository as BootstrapProfileRepository } from "../auth/profile-bootstrap";
import { AuthService, type AuthGateway, type InviteGuard } from "../auth/server";
import type { AppRole } from "../auth/schemas";
import {
  InviteService,
  registerInviteServiceFactory,
  type InviteRepository,
  type ProfileRecord as InviteProfileRecord,
  type ProfileRepository as InviteProfileRepository,
  type RelationshipRepository,
  type TrainerClientRecord,
} from "../invites/service";
import type { InviteRecord } from "../invites/schemas";
import {
  RelationshipQueries,
  registerRelationshipQueriesFactory,
  type ActiveClientRecord,
  type PendingInviteRecord,
  type RelationshipReadRepository,
  type TrainerSummary,
} from "../relationships/queries";
import {
  SubmissionRepositoryConflictError,
  SubmissionService,
  getSubmissionServiceOrThrow,
  registerSubmissionServiceFactory,
  type SubmissionRecord,
  type SubmissionRepository,
} from "../submissions/service";
import {
  SubmissionQueries,
  getSubmissionQueriesOrThrow,
  registerSubmissionQueriesFactory,
  type SubmissionHistoryRepository,
} from "../submissions/queries";
import { registerInviteEmailSender, type InviteEmailMessage } from "../../services/email/invite-template";

type LocalUserRecord = {
  id: string;
  email: string;
  password: string;
  created_at: Date;
};

type LocalProfileRecord = {
  id: string;
  email: string;
  role: AppRole;
  full_name: string;
  created_at: Date;
  updated_at: Date;
};

type LocalRelationshipRecord = TrainerClientRecord & {
  linked_at: Date;
  updated_at: Date;
};

type LocalSubmissionRecord = SubmissionRecord;

type LocalRuntimeState = {
  users: LocalUserRecord[];
  profiles: LocalProfileRecord[];
  invites: InviteRecord[];
  relationships: LocalRelationshipRecord[];
  submissions: LocalSubmissionRecord[];
  sent_emails: InviteEmailMessage[];
};

declare global {
  // eslint-disable-next-line no-var
  var __ptCoachLocalRuntimeState: LocalRuntimeState | undefined;
}

let runtimeRegistered = false;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getRuntimeState(): LocalRuntimeState {
  if (!globalThis.__ptCoachLocalRuntimeState) {
    globalThis.__ptCoachLocalRuntimeState = {
      users: [],
      profiles: [],
      invites: [],
      relationships: [],
      submissions: [],
      sent_emails: [],
    };
  }
  return globalThis.__ptCoachLocalRuntimeState;
}

function findUserByEmail(state: LocalRuntimeState, email: string): LocalUserRecord | null {
  const normalized = normalizeEmail(email);
  return state.users.find((user) => normalizeEmail(user.email) === normalized) ?? null;
}

function buildAuthGateway(state: LocalRuntimeState): AuthGateway {
  return {
    async signUp(email, password) {
      const normalizedEmail = normalizeEmail(email);
      if (findUserByEmail(state, normalizedEmail)) {
        throw new Error("AUTH_EMAIL_ALREADY_REGISTERED");
      }

      const user: LocalUserRecord = {
        id: randomUUID(),
        email: normalizedEmail,
        password,
        created_at: new Date(),
      };
      state.users.push(user);
      return {
        id: user.id,
        email: user.email,
      };
    },

    async signIn(email, password) {
      const normalizedEmail = normalizeEmail(email);
      const user = findUserByEmail(state, normalizedEmail);
      if (!user || user.password !== password) {
        throw new Error("AUTH_INVALID_CREDENTIALS");
      }

      const profile = state.profiles.find((candidate) => candidate.id === user.id) ?? null;
      if (!profile) {
        throw new Error("PROFILE_NOT_FOUND");
      }

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        role: profile.role,
      };
    },

    async signOut() {},

    async getSession() {
      return null;
    },
  };
}

function buildBootstrapProfileRepository(state: LocalRuntimeState): BootstrapProfileRepository {
  return {
    async findByUserId(userId) {
      const profile = state.profiles.find((candidate) => candidate.id === userId) ?? null;
      if (!profile) {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: profile.full_name,
      };
    },

    async createProfile(profile) {
      const now = new Date();
      const nextProfile: LocalProfileRecord = {
        id: profile.id,
        email: normalizeEmail(profile.email),
        role: profile.role,
        full_name: profile.full_name,
        created_at: now,
        updated_at: now,
      };
      state.profiles.push(nextProfile);
      return {
        id: nextProfile.id,
        email: nextProfile.email,
        role: nextProfile.role,
        full_name: nextProfile.full_name,
      };
    },

    async updateRole(userId, role) {
      const profile = state.profiles.find((candidate) => candidate.id === userId) ?? null;
      if (!profile) {
        return;
      }
      profile.role = role;
      profile.updated_at = new Date();
    },
  };
}

function buildInviteProfileRepository(state: LocalRuntimeState): InviteProfileRepository {
  return {
    async findById(userId) {
      const profile = state.profiles.find((candidate) => candidate.id === userId) ?? null;
      if (!profile) {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      };
    },

    async findByEmail(email) {
      const normalized = normalizeEmail(email);
      const profile = state.profiles.find((candidate) => normalizeEmail(candidate.email) === normalized) ?? null;
      if (!profile) {
        return null;
      }
      return {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      };
    },
  };
}

function isInvitePending(invite: InviteRecord, now: Date): boolean {
  return !invite.revoked_at && !invite.consumed_at && invite.expires_at.getTime() > now.getTime();
}

function buildInviteRepository(state: LocalRuntimeState): InviteRepository {
  return {
    async findPendingByTrainerAndEmail(trainerId, clientEmail) {
      const normalizedEmail = normalizeEmail(clientEmail);
      const now = new Date();
      return (
        state.invites.find(
          (candidate) =>
            candidate.trainer_id === trainerId &&
            normalizeEmail(candidate.client_email) === normalizedEmail &&
            isInvitePending(candidate, now),
        ) ?? null
      );
    },

    async createPendingInvite(input) {
      const now = new Date();
      const invite: InviteRecord = {
        id: randomUUID(),
        trainer_id: input.trainerId,
        client_email: normalizeEmail(input.clientEmail),
        invite_token: input.inviteToken,
        expires_at: input.expiresAt,
        created_at: now,
        updated_at: now,
        consumed_at: null,
        consumed_by_client_id: null,
        revoked_at: null,
      };
      state.invites.push(invite);
      return invite;
    },

    async refreshPendingInvite(input) {
      const invite = state.invites.find((candidate) => candidate.id === input.inviteId) ?? null;
      if (!invite) {
        throw new Error("INVITE_NOT_FOUND");
      }

      invite.invite_token = input.inviteToken;
      invite.expires_at = input.expiresAt;
      invite.updated_at = new Date();
      invite.revoked_at = null;
      invite.consumed_at = null;
      invite.consumed_by_client_id = null;
      return invite;
    },

    async findByToken(inviteToken) {
      return state.invites.find((candidate) => candidate.invite_token === inviteToken) ?? null;
    },

    async consumeInvite(input) {
      const invite = state.invites.find((candidate) => candidate.id === input.inviteId) ?? null;
      if (!invite) {
        throw new Error("INVITE_NOT_FOUND");
      }
      invite.consumed_at = input.consumedAt;
      invite.consumed_by_client_id = input.clientId;
      invite.updated_at = new Date();
    },
  };
}

function buildRelationshipRepository(state: LocalRuntimeState): RelationshipRepository {
  return {
    async findActiveByClientId(clientId) {
      return state.relationships.find((candidate) => candidate.client_id === clientId && candidate.status === "active") ?? null;
    },

    async activateLink(input) {
      const existing = state.relationships.find(
        (candidate) =>
          candidate.client_id === input.clientId &&
          candidate.trainer_id === input.trainerId &&
          candidate.status === "active",
      );
      if (existing) {
        return existing;
      }

      const now = new Date();
      const relationship: LocalRelationshipRecord = {
        id: randomUUID(),
        trainer_id: input.trainerId,
        client_id: input.clientId,
        status: "active",
        linked_at: now,
        updated_at: now,
      };
      state.relationships.push(relationship);
      return relationship;
    },

    async activateLinkFromInvite(input) {
      const relationship = await this.activateLink({
        trainerId: input.trainerId,
        clientId: input.clientId,
      });

      const invite = state.invites.find((candidate) => candidate.id === input.inviteId) ?? null;
      if (invite) {
        invite.consumed_at = input.consumedAt;
        invite.consumed_by_client_id = input.clientId;
        invite.updated_at = new Date();
      }

      return relationship;
    },
  };
}

function buildInviteService(state: LocalRuntimeState): InviteService {
  return new InviteService({
    invites: buildInviteRepository(state),
    relationships: buildRelationshipRepository(state),
    profiles: buildInviteProfileRepository(state),
  });
}

type SubmissionRuntimeRepository = SubmissionRepository & SubmissionHistoryRepository;

function buildSubmissionRepository(state: LocalRuntimeState): SubmissionRuntimeRepository {
  return {
    async findByClientAndRequestId(clientId, requestId) {
      return (
        state.submissions.find((record) => record.client_id === clientId && record.request_id === requestId) ?? null
      );
    },

    async findActiveTrainerIdForClient(clientId) {
      const relationship = state.relationships.find(
        (candidate) => candidate.client_id === clientId && candidate.status === "active",
      );
      return relationship?.trainer_id ?? null;
    },

    async create(input) {
      const existing = state.submissions.find(
        (record) => record.client_id === input.client_id && record.request_id === input.request_id,
      );
      if (existing) {
        throw new SubmissionRepositoryConflictError("DUPLICATE_REQUEST", "Submission request already exists.");
      }

      const now = new Date();
      const submission: LocalSubmissionRecord = {
        id: randomUUID(),
        request_id: input.request_id,
        client_id: input.client_id,
        trainer_id: input.trainer_id,
        exercise_key: input.exercise_key,
        exercise_label: input.exercise_label,
        client_note: input.client_note,
        file_name: input.file_name,
        mime_type: input.mime_type,
        file_size_bytes: input.file_size_bytes,
        duration_seconds: input.duration_seconds,
        status: input.status,
        uploaded_at: input.uploaded_at,
        submitted_at: input.submitted_at,
        ready_for_review_at: null,
        created_at: now,
        updated_at: now,
      };
      state.submissions.push(submission);
      return submission;
    },

    async updateStatus(input) {
      const submission = state.submissions.find((record) => record.id === input.submissionId) ?? null;
      if (!submission) {
        throw new Error("SUBMISSION_NOT_FOUND");
      }

      submission.status = input.status;
      submission.ready_for_review_at = input.transitionedAt;
      submission.updated_at = input.transitionedAt;
      return submission;
    },

    async listByClient(input) {
      return state.submissions
        .filter((record) => record.client_id === input.clientId)
        .filter(
          (record) =>
            !input.cursorSubmittedAt || record.submitted_at.getTime() < input.cursorSubmittedAt.getTime(),
        )
        .sort((left, right) => right.submitted_at.getTime() - left.submitted_at.getTime())
        .slice(0, input.limit);
    },
  };
}

function buildSubmissionService(state: LocalRuntimeState): SubmissionService {
  return new SubmissionService({
    repository: buildSubmissionRepository(state),
  });
}

function buildSubmissionQueries(state: LocalRuntimeState): SubmissionQueries {
  return new SubmissionQueries({
    repository: buildSubmissionRepository(state),
  });
}

function buildInviteGuard(state: LocalRuntimeState): InviteGuard {
  return {
    ensureTokenUsable(token, email) {
      return buildInviteService(state).ensureTokenUsable(token, email);
    },
  };
}

function buildRelationshipReadRepository(state: LocalRuntimeState): RelationshipReadRepository {
  return {
    async listActiveClientsForTrainer(trainerId) {
      const active = state.relationships.filter(
        (relationship) => relationship.trainer_id === trainerId && relationship.status === "active",
      );

      const result: ActiveClientRecord[] = [];
      for (const relationship of active) {
        const profile = state.profiles.find((candidate) => candidate.id === relationship.client_id) ?? null;
        if (!profile) {
          continue;
        }
        result.push({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          linked_at: relationship.linked_at,
        });
      }
      return result;
    },

    async listPendingInvitesForTrainer(trainerId) {
      const now = new Date();
      const pending = state.invites.filter(
        (invite) => invite.trainer_id === trainerId && isInvitePending(invite, now),
      );
      const mapped: PendingInviteRecord[] = pending.map((invite) => ({
        id: invite.id,
        client_email: invite.client_email,
        expires_at: invite.expires_at,
        sent_at: invite.created_at,
        invite_token: invite.invite_token,
      }));
      mapped.sort((left, right) => right.sent_at.getTime() - left.sent_at.getTime());
      return mapped;
    },

    async findClientProfile(clientId) {
      const profile = state.profiles.find((candidate) => candidate.id === clientId) ?? null;
      if (!profile || profile.role !== "client") {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      };
    },

    async findActiveTrainerForClient(clientId) {
      const relationship = state.relationships.find(
        (candidate) => candidate.client_id === clientId && candidate.status === "active",
      );
      if (!relationship) {
        return null;
      }

      const profile = state.profiles.find((candidate) => candidate.id === relationship.trainer_id) ?? null;
      if (!profile) {
        return null;
      }

      const summary: TrainerSummary = {
        id: profile.id,
        display_name: profile.full_name,
        business_name: null,
      };
      return summary;
    },

    async findLatestPendingInviteByEmail(email) {
      const normalized = normalizeEmail(email);
      const now = new Date();
      const matching = state.invites
        .filter((invite) => normalizeEmail(invite.client_email) === normalized && isInvitePending(invite, now))
        .sort((left, right) => right.created_at.getTime() - left.created_at.getTime());

      const invite = matching[0];
      if (!invite) {
        return null;
      }
      return {
        id: invite.id,
        client_email: invite.client_email,
        expires_at: invite.expires_at,
        sent_at: invite.created_at,
      };
    },
  };
}

export function ensureLocalRuntimeRegistered(): void {
  if (runtimeRegistered) {
    return;
  }

  const state = getRuntimeState();
  registerInviteServiceFactory(() => buildInviteService(state));
  registerSubmissionServiceFactory(() => buildSubmissionService(state));
  registerSubmissionQueriesFactory(() => buildSubmissionQueries(state));
  registerRelationshipQueriesFactory(
    () =>
      new RelationshipQueries({
        repository: buildRelationshipReadRepository(state),
      }),
  );
  registerInviteEmailSender(async (message) => {
    state.sent_emails.push(message);
  });

  runtimeRegistered = true;
}

export function getLocalAuthService(): AuthService {
  ensureLocalRuntimeRegistered();
  const state = getRuntimeState();
  return new AuthService(buildAuthGateway(state), buildBootstrapProfileRepository(state), buildInviteGuard(state));
}

export function getLocalProfileById(userId: string): InviteProfileRecord | null {
  const state = getRuntimeState();
  const profile = state.profiles.find((candidate) => candidate.id === userId) ?? null;
  if (!profile) {
    return null;
  }
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
  };
}

export function getLocalSubmissionService(): SubmissionService {
  ensureLocalRuntimeRegistered();
  return getSubmissionServiceOrThrow();
}

export function getLocalSubmissionQueries(): SubmissionQueries {
  ensureLocalRuntimeRegistered();
  return getSubmissionQueriesOrThrow();
}

export function resetLocalRuntimeForTests(): void {
  runtimeRegistered = false;
  globalThis.__ptCoachLocalRuntimeState = undefined;
}

export function seedLocalRelationshipForTests(input: {
  trainerId: string;
  clientId: string;
  status?: TrainerClientRecord["status"];
  linkedAt?: Date;
}): LocalRelationshipRecord {
  const state = getRuntimeState();
  const now = input.linkedAt ?? new Date();
  const relationship: LocalRelationshipRecord = {
    id: randomUUID(),
    trainer_id: input.trainerId,
    client_id: input.clientId,
    status: input.status ?? "active",
    linked_at: now,
    updated_at: now,
  };
  state.relationships.push(relationship);
  return relationship;
}

export function seedLocalSubmissionForTests(input: {
  requestId?: string;
  clientId: string;
  trainerId: string;
  exerciseKey?: SubmissionRecord["exercise_key"];
  exerciseLabel?: string;
  status?: SubmissionRecord["status"];
  submittedAt?: Date;
  durationSeconds?: number | null;
  fileName?: string;
  mimeType?: SubmissionRecord["mime_type"];
  fileSizeBytes?: number;
}): LocalSubmissionRecord {
  const state = getRuntimeState();
  const submittedAt = input.submittedAt ?? new Date();
  const status = input.status ?? "ready_for_review";
  const submission: LocalSubmissionRecord = {
    id: randomUUID(),
    request_id: input.requestId ?? randomUUID(),
    client_id: input.clientId,
    trainer_id: input.trainerId,
    exercise_key: input.exerciseKey ?? "squat",
    exercise_label: input.exerciseLabel ?? "Squat",
    client_note: null,
    file_name: input.fileName ?? "seed.mp4",
    mime_type: input.mimeType ?? "video/mp4",
    file_size_bytes: input.fileSizeBytes ?? 100_000,
    duration_seconds: input.durationSeconds ?? 120,
    status,
    uploaded_at: submittedAt,
    submitted_at: submittedAt,
    ready_for_review_at: status === "ready_for_review" ? submittedAt : null,
    created_at: submittedAt,
    updated_at: submittedAt,
  };
  state.submissions.push(submission);
  return submission;
}
