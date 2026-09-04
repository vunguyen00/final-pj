-- A browser token may be trusted by more than one account. Trust is still granted
-- and stored per user, so confirming one account never confirms another account.
DROP INDEX "TrustedDevice_tokenHash_key";

CREATE UNIQUE INDEX "TrustedDevice_userId_tokenHash_key"
ON "TrustedDevice"("userId", "tokenHash");
