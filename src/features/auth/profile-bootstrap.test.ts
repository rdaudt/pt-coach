import { describe, expect, it, vi } from "vitest";

import { ensureProfileBootstrap } from "./profile-bootstrap";

describe("ensureProfileBootstrap", () => {
  it("creates profile when no existing profile is found", async () => {
    const createProfile = vi.fn(async (profile) => profile);
    const repository = {
      findByUserId: vi.fn(async () => null),
      createProfile,
      updateRole: vi.fn(async () => undefined),
    };

    const result = await ensureProfileBootstrap(repository, {
      userId: "user-1",
      email: "client@example.com",
      role: "client",
      fullName: "Client One",
    });

    expect(createProfile).toHaveBeenCalledOnce();
    expect(result.role).toBe("client");
    expect(result.full_name).toBe("Client One");
  });

  it("throws support-required error when role mismatch is found", async () => {
    const repository = {
      findByUserId: vi.fn(async () => ({
        id: "user-1",
        email: "person@example.com",
        role: "trainer" as const,
        full_name: "Person",
      })),
      createProfile: vi.fn(async () => {
        throw new Error("should_not_create");
      }),
      updateRole: vi.fn(async () => undefined),
    };

    await expect(
      ensureProfileBootstrap(repository, {
        userId: "user-1",
        email: "person@example.com",
        role: "client",
        fullName: "Person",
      }),
    ).rejects.toThrow("ROLE_MISMATCH_SUPPORT_REQUIRED");

    expect(repository.updateRole).not.toHaveBeenCalled();
  });

  it("repairs role when allowRoleRepair is enabled", async () => {
    const repository = {
      findByUserId: vi.fn(async () => ({
        id: "user-1",
        email: "person@example.com",
        role: "trainer" as const,
        full_name: "Person",
      })),
      createProfile: vi.fn(async () => {
        throw new Error("should_not_create");
      }),
      updateRole: vi.fn(async () => undefined),
    };

    const result = await ensureProfileBootstrap(repository, {
      userId: "user-1",
      email: "person@example.com",
      role: "client",
      fullName: "Person",
      allowRoleRepair: true,
    });

    expect(repository.updateRole).toHaveBeenCalledWith("user-1", "client");
    expect(result.role).toBe("client");
  });
});