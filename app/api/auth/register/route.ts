import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      username: rawUsername,
      email: rawEmail,
      password: rawPassword,
    } = body as Record<string, unknown>;

    const errors: Record<string, string> = {};

    // ── Validate & narrow types ────────────────────────

    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
    if (!username) {
      errors.username = "Username is required";
    } else if (username.length < 2) {
      errors.username = "Username must be at least 2 characters";
    }

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    const password = typeof rawPassword === "string" ? rawPassword : "";
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // ── Check duplicate email ──────────────────────────

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { errors: { email: "Email already registered" } },
        { status: 409 },
      );
    }

    // ── Create user ────────────────────────────────────

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: username,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
