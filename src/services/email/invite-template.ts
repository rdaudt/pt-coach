export type InviteEmailTemplateInput = {
  trainerDisplayName?: string;
  clientEmail: string;
  inviteUrl: string;
  expiresAt: Date;
};

export type InviteEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type InviteEmailSender = (message: InviteEmailMessage) => Promise<void>;

function formatInviteExpiry(expiresAt: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(expiresAt);
}

export function buildTrainerInviteEmail(input: InviteEmailTemplateInput): InviteEmailMessage {
  const coachName = input.trainerDisplayName?.trim() || "Your trainer";
  const expiresAtLabel = formatInviteExpiry(input.expiresAt);
  const subject = `${coachName} invited you to coaching`;

  const text = [
    `${coachName} invited you to join their coaching portal.`,
    `Open invite: ${input.inviteUrl}`,
    `Invite expires: ${expiresAtLabel}`,
    "If you already have an account, sign in first and then accept the invite.",
  ].join("\n");

  const html = [
    `<p><strong>${coachName}</strong> invited you to join their coaching portal.</p>`,
    `<p><a href="${input.inviteUrl}">Accept your invite</a></p>`,
    `<p>Invite expires: <strong>${expiresAtLabel}</strong></p>`,
    "<p>If you already have an account, sign in first and then accept the invite.</p>",
  ].join("");

  return {
    to: input.clientEmail,
    subject,
    text,
    html,
  };
}

let inviteEmailSender: InviteEmailSender | null = null;

export function registerInviteEmailSender(sender: InviteEmailSender): void {
  inviteEmailSender = sender;
}

export async function sendInviteEmail(message: InviteEmailMessage): Promise<void> {
  if (!inviteEmailSender) {
    throw new Error("INVITE_EMAIL_SENDER_NOT_CONFIGURED");
  }

  await inviteEmailSender(message);
}