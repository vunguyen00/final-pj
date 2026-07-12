export const RESERVED_WITHDRAWAL_STATUSES = ["PENDING", "APPROVED", "PAID", "COMPLETED"] as const;

export const REVENUE_ELIGIBLE_ORDER_ITEM_WHERE = {
  refundRequest: { isNot: { status: "APPROVED" } },
} as const;

export function calculateAvailableTeacherRevenue(
  earnedRevenue: number,
  reservedWithdrawals: number,
) {
  return Math.max(0, Math.floor(earnedRevenue) - Math.floor(reservedWithdrawals));
}
