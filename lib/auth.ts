import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "node:crypto"

const SESSION_COOKIE_NAME = "docmate_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

type AuthConfig = {
  username: string
  password: string
  displayName: string
  secret: string
  usesDevelopmentDefaults: boolean
}

type SessionPayload = {
  username: string
  issuedAt: number
}

export type AuthSession = {
  username: string
  displayName: string
  initials: string
}

function getInitials(value: string): string {
  const letters = value
    .split(/\s+/)
    .map((part) => part.trim()[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return letters || "DM"
}

function getAuthConfig(): AuthConfig | null {
  const username = process.env.DOCMATE_AUTH_USERNAME?.trim()
  const password = process.env.DOCMATE_AUTH_PASSWORD?.trim()
  const displayName = process.env.DOCMATE_AUTH_DISPLAY_NAME?.trim()
  const secret = process.env.DOCMATE_AUTH_SECRET?.trim()

  if (username && password) {
    return {
      username,
      password,
      displayName: displayName || username,
      secret: secret || "docmate-dev-secret",
      usesDevelopmentDefaults: false,
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      username: "demo",
      password: "demo1234",
      displayName: "Demo Admin",
      secret: secret || "docmate-dev-secret",
      usesDevelopmentDefaults: true,
    }
  }

  return null
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function signValue(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function serializeSession(payload: SessionPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = signValue(encoded, secret)
  return `${encoded}.${signature}`
}

function toSession(config: AuthConfig): AuthSession {
  return {
    username: config.username,
    displayName: config.displayName,
    initials: getInitials(config.displayName),
  }
}

export function getLoginHint() {
  const config = getAuthConfig()
  if (!config?.usesDevelopmentDefaults) {
    return null
  }

  return {
    username: config.username,
    password: config.password,
  }
}

export function validateLogin(username: string, password: string) {
  const config = getAuthConfig()

  if (!config) {
    return {
      ok: false as const,
      status: 503,
      message: "로그인 환경변수가 설정되지 않았습니다.",
    }
  }

  const normalizedUsername = username.trim()
  const isUsernameValid = safeEqual(normalizedUsername, config.username)
  const isPasswordValid = safeEqual(password, config.password)

  if (!isUsernameValid || !isPasswordValid) {
    return {
      ok: false as const,
      status: 401,
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    }
  }

  return {
    ok: true as const,
    session: toSession(config),
    token: serializeSession(
      {
        username: config.username,
        issuedAt: Date.now(),
      },
      config.secret,
    ),
  }
}

export async function createSession(token: string) {
  const cookieStore = await cookies()
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSession(): Promise<AuthSession | null> {
  const config = getAuthConfig()
  if (!config) {
    return null
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signValue(encodedPayload, config.secret)
  if (!safeEqual(signature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload

    const isExpired = Date.now() - payload.issuedAt > SESSION_MAX_AGE * 1000
    if (isExpired) {
      return null
    }

    if (!safeEqual(payload.username, config.username)) {
      return null
    }

    return toSession(config)
  } catch {
    return null
  }
}
