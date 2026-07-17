export function getRequiredAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET (or JWT_SECRET) is required.");
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("AUTH_SECRET (or JWT_SECRET) must contain at least 32 characters in production.");
  }

  return secret;
}
