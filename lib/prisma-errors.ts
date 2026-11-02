import { Prisma } from "@/lib/generated/prisma/client";

/** Prisma 唯一约束冲突 (P2002)。 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
