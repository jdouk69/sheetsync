import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { EXPENSE_KEYS } from "@/lib/expenseCache";
import { buildPaymentTotals, paidAmount } from "@/lib/paidAmounts";

// Shared paid-amount calculation for Expenses dashboard, Reports and CSV.
// Uses the same cache key that refreshExpenseCaches() invalidates after any payment change.
export function useProjectPaidTotals(projectId, expenses, enabled = true) {
    const { data: payments = [], isLoading, refetch } = useQuery({
        queryKey: EXPENSE_KEYS.reportPayments(projectId),
        queryFn: () => base44.entities.Payment.list('-date', 9999),
        enabled: !!projectId && enabled,
        staleTime: 0,
    });
    const totals = useMemo(() => buildPaymentTotals(payments, expenses), [payments, expenses]);
    const paidOf = useCallback((exp) => paidAmount(exp, totals), [totals]);
    return { paidOf, paymentsLoading: isLoading, refetchPayments: refetch };
}