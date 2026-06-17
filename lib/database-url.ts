type DatabaseAdapterConfig = {
  connectionString: string;
  schema?: string;
};

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

export function getDatabaseUrlTarget(databaseUrl = process.env.DATABASE_URL): string {
  if (!databaseUrl) {
    return "not-configured";
  }

  try {
    const url = new URL(databaseUrl);
    const username = url.username ? `${url.username}@` : "";
    const schema = url.searchParams.get("schema");
    const schemaSuffix = schema ? `?schema=${schema}` : "";

    return `${url.protocol}//${username}${url.host}${url.pathname}${schemaSuffix}`;
  } catch {
    return "invalid-database-url";
  }
}

export function getDatabaseAdapterConfig(databaseUrl = getDatabaseUrl()): DatabaseAdapterConfig {
  try {
    const url = new URL(databaseUrl);
    const schema = url.searchParams.get("schema") || undefined;
    url.searchParams.delete("schema");

    return {
      connectionString: url.toString(),
      schema,
    };
  } catch {
    return {
      connectionString: databaseUrl,
    };
  }
}
