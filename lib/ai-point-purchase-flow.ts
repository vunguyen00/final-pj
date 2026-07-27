export const AI_POINT_PURCHASE_CONTEXT_KEY = "ai-point-purchase-context";
export const AI_POINT_PURCHASE_EVENT_KEY = "ai-point-purchase-complete";

export type AiPointPurchaseContext = {
  returnTo: string;
  popup: boolean;
};

export function isSafeLocalReturnPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function createAiPointPurchaseContext(returnTo: string, popup: boolean): AiPointPurchaseContext {
  return {
    returnTo: isSafeLocalReturnPath(returnTo) ? returnTo : "",
    popup,
  };
}

