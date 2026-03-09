import type { AppRole } from "./schemas";

export type ProfileRecord = {
  id: string;
  email: string;
  role: AppRole;
  full_name: string;
};

export type ProfileRepository = {
  findByUserId(userId: string): Promise<ProfileRecord | null>;
  createProfile(profile: ProfileRecord): Promise<ProfileRecord>;
  updateRole(userId: string, role: AppRole): Promise<void>;
};

export type BootstrapProfileInput = {
  userId: string;
  email: string;
  role: AppRole;
  fullName: string;
  allowRoleRepair?: boolean;
};

export async function ensureProfileBootstrap(
  repository: ProfileRepository,
  input: BootstrapProfileInput,
): Promise<ProfileRecord> {
  const existing = await repository.findByUserId(input.userId);
  if (!existing) {
    return repository.createProfile({
      id: input.userId,
      email: input.email,
      role: input.role,
      full_name: input.fullName,
    });
  }

  if (existing.role !== input.role) {
    if (!input.allowRoleRepair) {
      throw new Error("ROLE_MISMATCH_SUPPORT_REQUIRED");
    }
    await repository.updateRole(input.userId, input.role);
  }

  return { ...existing, role: input.role };
}
