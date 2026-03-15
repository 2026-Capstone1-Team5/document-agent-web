import { NextResponse } from "next/server"

import { createSession, validateLogin } from "@/lib/auth"

type LoginBody = {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginBody | null

  const username = body?.username
  const password = body?.password

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json(
      {
        error: {
          message: "아이디와 비밀번호를 입력해 주세요.",
        },
      },
      { status: 400 },
    )
  }

  const result = validateLogin(username, password)
  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          message: result.message,
        },
      },
      { status: result.status },
    )
  }

  await createSession(result.token)

  return NextResponse.json({
    user: result.session,
  })
}
