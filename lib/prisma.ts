import { PrismaPg } from "@prisma/adapter-pg";
import type { RuntimeDataModel } from "@prisma/client/runtime/client";
import { Prisma, PrismaClient } from "@/.generated/prisma/client";
import { getDatabaseAdapterConfig, getDatabaseUrlTarget } from "@/lib/database-url";

declare global {
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

type RuntimePrismaClient = InstanceType<typeof PrismaClient> &
  Record<string, unknown> & {
    _runtimeDataModel?: RuntimeDataModel;
  };

function hasRuntimeModelFields(
  prismaClient: RuntimePrismaClient,
  modelName: string,
  fieldNames: string[],
) {
  const fields = prismaClient._runtimeDataModel?.models?.[modelName]?.fields;
  if (!fields) return false;

  const availableFields = new Set(fields.map((field) => field.name));
  return fieldNames.every((fieldName) => availableFields.has(fieldName));
}

function getReusablePrismaClient() {
  const cachedPrisma = global.prisma as RuntimePrismaClient | undefined;
  if (!cachedPrisma) return undefined;

  const isStaleGeneratedClient =
    typeof cachedPrisma.teacherBankAccountChangeOtp === "undefined" ||
    typeof cachedPrisma.teacherBankAccountChangeLog === "undefined" ||
    typeof cachedPrisma.courseReport === "undefined" ||
    !hasRuntimeModelFields(cachedPrisma, "TeacherApplication", [
      "questionRevealState",
    ]) ||
    !hasRuntimeModelFields(cachedPrisma, "Question", [
      "preparationTimeSeconds",
      "answerTimeSeconds",
    ]) ||
    !hasRuntimeModelFields(cachedPrisma, "AntiCheatLog", ["incidentId"]) ||
    !hasRuntimeModelFields(cachedPrisma, "TeacherRevenueWithdrawalComplaint", [
      "evidenceImageUrl",
      "evidenceImageName",
    ]);

  if (isStaleGeneratedClient) {
    console.info("[prisma] Resetting stale Prisma client after schema generation.");
    void cachedPrisma.$disconnect().catch(() => undefined);
    global.prisma = undefined;
    return undefined;
  }

  return cachedPrisma;
}

const databaseConfig = getDatabaseAdapterConfig();
const adapter = new PrismaPg(
  { connectionString: databaseConfig.connectionString },
  databaseConfig.schema ? { schema: databaseConfig.schema } : undefined,
);
const prismaClientOptions: Prisma.PrismaClientOptions = { adapter };

if (!global.prisma) {
  console.info("[prisma] DATABASE_URL target:", getDatabaseUrlTarget());
}

export const prisma =
  getReusablePrismaClient() ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
