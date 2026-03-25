import { expect, test, type Locator, type Page } from "@playwright/test";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function submitVideo(page: Page, input: { note: string; fileName: string; mimeType: string; content: string }) {
  await page.locator("#submission-exercise-label").selectOption("squat");
  await page.locator("#submission-note").fill(input.note);
  await page.locator("#submission-file").setInputFiles({
    name: input.fileName,
    mimeType: input.mimeType,
    buffer: Buffer.from(input.content),
  });
  await page.getByRole("button", { name: "Submit video" }).click();
}

async function signUpTrainerAndInviteClient(page: Page): Promise<{ clientEmail: string; inviteToken: string }> {
  const trainerEmail = uniqueEmail("trainer");
  const trainerPassword = "trainer-pass-123";
  const clientEmail = uniqueEmail("client");

  await page.goto("/");
  await page.getByRole("link", { name: "Continue as Trainer" }).click();

  await page.locator("#full_name").fill("Trainer Local");
  await page.locator("#email").fill(trainerEmail);
  await page.locator("#password").fill(trainerPassword);
  await page.getByRole("button", { name: "Create Trainer Account" }).click();

  const trainerHeading = page.getByRole("heading", { name: "Trainer Dashboard" });
  const trainerVisible = await trainerHeading.isVisible().catch(() => false);
  if (!trainerVisible) {
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await page.locator("#email").fill(trainerEmail);
    await page.locator("#password").fill(trainerPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
  }

  await expect(trainerHeading).toBeVisible();

  await page.locator("#send_client_email").fill(clientEmail);
  await page.locator('form[action="/api/invites/send"] button[type="submit"]').click();

  const pendingInvite = page
    .locator("section")
    .filter({ hasText: "Pending Invites" })
    .locator("li")
    .filter({ hasText: clientEmail });

  await expect(pendingInvite).toBeVisible();
  const inviteToken = (await pendingInvite.locator("code").textContent())?.trim();
  expect(inviteToken).toBeTruthy();

  return {
    clientEmail,
    inviteToken: inviteToken!,
  };
}

async function signUpAndAcceptClientInvite(page: Page, clientEmail: string, inviteToken: string) {
  const clientPassword = "client-pass-123";
  await page.goto(`/client-signup?invite_token=${encodeURIComponent(inviteToken)}`);

  await page.locator("#full_name").fill("Client Local");
  await page.locator("#email").fill(clientEmail);
  await page.locator("#password").fill(clientPassword);
  await page.getByRole("button", { name: "Create Client Account" }).click();

  const inviteHeading = page.getByRole("heading", { name: "Trainer Invite" });
  const inviteVisible = await inviteHeading.isVisible().catch(() => false);
  if (!inviteVisible) {
    await page.goto(`/signin?invite_token=${encodeURIComponent(inviteToken)}`);
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await page.locator("#email").fill(clientEmail);
    await page.locator("#password").fill(clientPassword);
    await page.getByRole("button", { name: "Sign In" }).click();
  }

  await expect(inviteHeading).toBeVisible();
  await page.getByRole("button", { name: "Accept Invite" }).click();
  await expect(page).toHaveURL(/\/client/);
}

function historySection(page: Page): Locator {
  return page.locator("section").filter({ hasText: "Submission History" });
}

test("phase 2 client submissions UAT flow", async ({ page }) => {
  const { clientEmail, inviteToken } = await signUpTrainerAndInviteClient(page);
  await signUpAndAcceptClientInvite(page, clientEmail, inviteToken);

  await page.goto("/client/submissions");

  await test.step("1) client submissions page loads with form and history section", async () => {
    await expect(page.getByRole("heading", { name: "Submit Training Video" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submission History" })).toBeVisible();
  });

  await test.step("2) selecting Other without custom label blocks submit; standard label clears validation", async () => {
    await page.locator("#submission-exercise-label").selectOption("other");
    await page.locator("#submission-file").setInputFiles({
      name: "invalid-label.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("video-other"),
    });

    await expect(page.getByText("Custom exercise label is required when Other is selected.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit video" })).toBeDisabled();

    await page.locator("#submission-exercise-label").selectOption("squat");
    await expect(page.getByText("Custom exercise label is required when Other is selected.")).toHaveCount(0);
  });

  await test.step("3) successful submit appears in history with note and status", async () => {
    await submitVideo(page, {
      note: "phase2-note-success-1",
      fileName: "phase2-success-1.mp4",
      mimeType: "video/mp4",
      content: "video-success-1",
    });

    await expect(page.getByRole("status").filter({ hasText: "Video submitted." })).toBeVisible();
    const firstRow = historySection(page).locator("li").first();
    await expect(firstRow).toContainText("phase2-note-success-1");
    await expect(firstRow).toContainText("Ready for Review");
  });

  await test.step("4) failed submit preserves metadata for retry", async () => {
    await page.locator("#submission-exercise-label").selectOption("other");
    await page.locator("#submission-custom-label").fill("Cable Fly");
    await page.locator("#submission-note").fill("phase2-retry-note");
    await page.locator("#submission-file").setInputFiles({
      name: "phase2-invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalid-file"),
    });

    await page.getByRole("button", { name: "Submit video" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Submission payload is invalid." })).toBeVisible();
    await expect(page.getByText("Upload failed. Exercise label and note were preserved so you can retry.")).toBeVisible();

    await expect(page.locator("#submission-exercise-label")).toHaveValue("other");
    await expect(page.locator("#submission-custom-label")).toHaveValue("Cable Fly");
    await expect(page.locator("#submission-note")).toHaveValue("phase2-retry-note");

    await page.locator("#submission-file").setInputFiles({
      name: "phase2-retry-success.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("video-retry-success"),
    });
    await page.getByRole("button", { name: "Retry upload" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Video submitted." })).toBeVisible();
  });

  await test.step("5) history remains newest-first with status visibility", async () => {
    await submitVideo(page, {
      note: "phase2-order-note-2",
      fileName: "phase2-order-2.mp4",
      mimeType: "video/mp4",
      content: "video-order-2",
    });
    await expect(page.getByRole("status").filter({ hasText: "Video submitted." })).toBeVisible();

    const firstRow = historySection(page).locator("li").first();
    await expect(firstRow).toContainText("phase2-order-note-2");
    await expect(firstRow).toContainText("Ready for Review");
  });

  await test.step("6) load more fetches older rows without duplicates", async () => {
    for (let index = 0; index < 11; index += 1) {
      await submitVideo(page, {
        note: `phase2-bulk-note-${index}`,
        fileName: `phase2-bulk-${index}.mp4`,
        mimeType: "video/mp4",
        content: `phase2-bulk-content-${index}`,
      });
      await expect(page.getByRole("status").filter({ hasText: "Video submitted." })).toBeVisible();
    }

    await page.reload();
    const history = historySection(page);
    const loadMoreButton = history.getByRole("button", { name: "Load more" });

    await expect(loadMoreButton).toBeVisible();
    const rows = history.locator("li");
    await expect(rows).toHaveCount(10);

    await loadMoreButton.click();
    await expect.poll(async () => rows.count()).toBeGreaterThan(10);

    const fileLines = await history.locator("li p").filter({ hasText: "File:" }).allTextContents();
    expect(new Set(fileLines).size).toBe(fileLines.length);
  });
});
