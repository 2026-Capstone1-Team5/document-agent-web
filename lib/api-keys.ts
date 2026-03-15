export type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
};

export type ApiKeyListResponse = {
  items: ApiKeySummary[];
};

export type IssuedApiKeyResponse = {
  apiKey: string;
  key: ApiKeySummary;
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown> | null;
  };
};

const API_ROOT = "/api/auth/api-keys";

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return path === "/" ? API_ROOT : `${API_ROOT}${normalizedPath}`;
}

async function buildError(response: Response): Promise<Error> {
  let message = `API key 요청에 실패했습니다. (${response.status})`;
  try {
    const body = (await response.json()) as ApiErrorResponse;
    if (
      typeof body.error?.message === "string" &&
      body.error.message.trim() !== ""
    ) {
      message = body.error.message;
    }
  } catch {
    // Ignore parse failure and fall back to the default message.
  }
  return new Error(message);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), init);
  if (!response.ok) {
    throw await buildError(response);
  }
  return (await response.json()) as T;
}

export async function listApiKeys(): Promise<ApiKeyListResponse> {
  return requestJson<ApiKeyListResponse>("/", {
    method: "GET",
  });
}

export async function issueApiKey(name: string): Promise<IssuedApiKeyResponse> {
  return requestJson<IssuedApiKeyResponse>("/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}

export async function renameApiKey(
  apiKeyId: string,
  name: string,
): Promise<ApiKeySummary> {
  return requestJson<ApiKeySummary>(`/${encodePathSegment(apiKeyId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(apiKeyId: string): Promise<void> {
  const response = await fetch(buildUrl(`/${encodePathSegment(apiKeyId)}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    throw await buildError(response);
  }
}
