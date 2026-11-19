export type HealthResponse = {
  status: "ok";
  timestamp: string;
};

export type ApiErrorResponse = {
  error: string;
};

export function createHealthPayload(date = new Date()): HealthResponse {
  return {
    status: "ok",
    timestamp: date.toISOString(),
  };
}

export function validateHealthPayload(payload: unknown): payload is HealthResponse {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    p.status === "ok" &&
    typeof p.timestamp === "string" &&
    !Number.isNaN(new Date(p.timestamp).getTime())
  );
}

export function validateErrorPayload(payload: unknown): payload is ApiErrorResponse {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return typeof p.error === "string" && p.error.trim().length > 0;
}
