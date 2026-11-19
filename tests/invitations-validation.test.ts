import test from "node:test";
import assert from "node:assert/strict";
import { filterValidInvitationEmails } from "../moneymap/lib/invitationUtils.ts";

test("Suite 5: Group Invitations & Offline Fallback Validation", async (t) => {
  await t.test("filters out invalid emails that lack @ or domain dot", () => {
    const rawInput = ["valid.user@example.com", "not-an-email", "missing-at.com", "user@nodomain"];
    const valid = filterValidInvitationEmails(rawInput);

    assert.equal(valid.length, 1);
    assert.equal(valid[0], "valid.user@example.com");
  });

  await t.test("filters out the inviter's own email case-insensitively", () => {
    const inviterEmail = "Alice@Domain.com";
    const rawInput = ["alice@domain.com", "ALICE@DOMAIN.COM", "bob@domain.com", "  charlie@domain.com "];

    const valid = filterValidInvitationEmails(rawInput, inviterEmail);

    assert.deepEqual(valid, ["bob@domain.com", "charlie@domain.com"]);
  });

  await t.test("trims whitespace and normalizes valid emails to lowercase", () => {
    const rawInput = ["   User.One@Test.Org   ", "USER.TWO@TEST.COM   "];
    const valid = filterValidInvitationEmails(rawInput);

    assert.deepEqual(valid, ["user.one@test.org", "user.two@test.com"]);
  });

  await t.test("validates local fallback invitation schema integrity", () => {
    const inviter = { id: "user-123", email: "alice@test.com", name: "Alice" };
    const groupId = "group-999";
    const validEmails = filterValidInvitationEmails(["bob@test.com"], inviter.email);

    const fallbackRecords = validEmails.map((email, idx) => ({
      id: `local-inv-${Date.now()}-${idx}`,
      group_id: groupId,
      invited_email: email,
      inviter_id: inviter.id,
      inviter_name: inviter.name,
      status: "pending" as const,
      created_at: new Date().toISOString(),
    }));

    assert.equal(fallbackRecords.length, 1);
    const rec = fallbackRecords[0];
    assert.equal(rec.group_id, "group-999");
    assert.equal(rec.invited_email, "bob@test.com");
    assert.equal(rec.status, "pending");
    assert.ok(rec.id.startsWith("local-inv-"));
    assert.ok(rec.created_at.includes("T"));
  });
});
