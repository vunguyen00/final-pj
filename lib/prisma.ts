import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");

export const prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
