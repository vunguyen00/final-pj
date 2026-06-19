export const RESERVED_WITHDRAWAL_STATUSES = ["PENDING", "APPROVED", "PAID"] as const;

export function calculateAvailableTeacherRevenue(
  earnedRevenue: number,
  reservedWithdrawals: number,
) {
  return Math.max(0, Math.floor(earnedRevenue) - Math.floor(reservedWithdrawals));
}
