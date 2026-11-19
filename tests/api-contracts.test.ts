import test from "node:test";
import assert from "node:assert/strict";
import {
  createHealthPayload,
  validateHealthPayload,
  validateErrorPayload,
} from "../moneymap/lib/apiContracts.ts";

test("Suite 6: API Response Contracts & Health Schema", async (t) => {
  await t.test("generates and validates valid health payload", () => {
    const payload = createHealthPayload();

    assert.equal(payload.status, "ok");
    assert.ok(payload.timestamp.includes("T"));
    assert.equal(validateHealthPayload(payload), true);
  });

  await t.test("rejects malformed health payloads", () => {
    assert.equal(validateHealthPayload(null), false);
    assert.equal(validateHealthPayload({ status: "error" }), false);
    assert.equal(validateHealthPayload({ status: "ok", timestamp: "invalid-date" }), false);
    assert.equal(validateHealthPayload({ status: "ok" }), false);
  });

  await t.test("validates error response contracts", () => {
    assert.equal(validateErrorPayload({ error: "Unauthorized" }), true);
    assert.equal(validateErrorPayload({ error: "Invalid ID parameter" }), true);
    assert.equal(validateErrorPayload({ error: "   " }), false);
    assert.equal(validateErrorPayload({}), false);
    assert.equal(validateErrorPayload(null), false);
  });
});
