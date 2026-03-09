import {
  clientSignupSchema,
  signInSchema,
  trainerSignupSchema,
  type AppRole,
} from "./schemas";
import { ensureProfileBootstrap, type ProfileRepository } from "./profile-bootstrap";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser;
  role: AppRole;
};

export type AuthGateway = {
  signUp(email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
};

export type InviteGuard = {
  ensureTokenUsable(token: string, email: string): Promise<void>;
};

export type TrainerSignupInput = {
  role: "trainer";
  email: string;
  password: string;
  full_name: string;
};

export type ClientSignupInput = {
  role: "client";
  email: string;
  password: string;
  full_name: string;
  invite_token: string;
};

export class AuthService {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly profileRepository: ProfileRepository,
    private readonly inviteGuard: InviteGuard,
  ) {}

  async signUpTrainer(input: TrainerSignupInput): Promise<AuthUser> {
    const parsed = trainerSignupSchema.parse(input);
    const user = await this.authGateway.signUp(parsed.email, parsed.password);
    await ensureProfileBootstrap(this.profileRepository, {
      userId: user.id,
      email: user.email,
      role: "trainer",
      fullName: parsed.full_name,
    });
    return user;
  }

  async signUpClient(input: ClientSignupInput): Promise<AuthUser> {
    const parsed = clientSignupSchema.parse(input);
    await this.inviteGuard.ensureTokenUsable(parsed.invite_token, parsed.email);
    const user = await this.authGateway.signUp(parsed.email, parsed.password);
    await ensureProfileBootstrap(this.profileRepository, {
      userId: user.id,
      email: user.email,
      role: "client",
      fullName: parsed.full_name,
    });
    return user;
  }

  async signIn(input: { email: string; password: string }): Promise<AuthSession> {
    const parsed = signInSchema.parse(input);
    return this.authGateway.signIn(parsed.email, parsed.password);
  }

  async signOut(): Promise<void> {
    await this.authGateway.signOut();
  }

  async getSession(): Promise<AuthSession | null> {
    return this.authGateway.getSession();
  }
}
