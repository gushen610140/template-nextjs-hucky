import { Prisma } from "@/lib/generated/prisma/client";

/** Prisma 唯一约束冲突 (P2002)。 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Prisma 外键约束冲突 (P2003), 通常是被其他记录引用而无法删除。 */
export function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}
