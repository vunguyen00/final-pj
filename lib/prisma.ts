import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { getDatabaseAdapterConfig, getDatabaseUrlTarget } from "@/lib/database-url";

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

const databaseConfig = getDatabaseAdapterConfig();
const adapter = new PrismaPg(
  { connectionString: databaseConfig.connectionString },
  databaseConfig.schema ? { schema: databaseConfig.schema } : undefined,
);

if (!global.prisma) {
  console.info("[prisma] DATABASE_URL target:", getDatabaseUrlTarget());
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
