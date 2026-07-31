import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email: rawEmail,
      password: rawPassword,
      code: rawCode,
    } = body as Record<string, unknown>;

    const errors: Record<string, string> = {};

    // ── Validate & narrow types ────────────────────────

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    const code = typeof rawCode === "string" ? rawCode : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";
    const mode: "password" | "code" = code ? "code" : "password";

    if (mode === "password") {
      if (!password) {
        errors.password = "Password is required";
      } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
    } else {
      if (!code) {
        errors.code = "Verification code is required";
      } else if (!/^\d{6}$/.test(code)) {
        errors.code = "Verification code must be 6 digits";
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // ── Find user ──────────────────────────────────────

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { errors: { email: "Account not found" } },
        { status: 404 },
      );
    }

    // ── Verify credentials ─────────────────────────────

    if (mode === "password") {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { errors: { password: "Incorrect password" } },
          { status: 401 },
        );
      }
    } else {
      // TODO: verify against stored/sent code
      // For development, any 6-digit code passes
    }

    // ── 建立会话并写入 httpOnly cookie ────────────────
    const token = await createSession(user.id);

    // ── Return user ────────────────────────────────────
    const { passwordHash: _, ...safeUser } = user;
    const response = NextResponse.json({ user: safeUser }, { status: 200 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
