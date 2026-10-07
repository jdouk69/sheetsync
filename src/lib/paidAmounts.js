// Single source of truth for "how much has been paid on an expense".
// Rule: if the expense has linked Payment records, paid = sum of those records
// (deposits are Payment records too, so they are counted exactly once).
// Otherwise (legacy expenses with no Payment records) paid = Expense.amount.

// Map of expenseId -> sum of its Payment amounts, for the given expenses only.
export function buildPaymentTotals(payments, expenses) {
    const ids = new Set(expenses.map((e) => e.id));
    const totals = {};
    payments.forEach((p) => {
        if (!p.expenseId || !ids.has(p.expenseId)) return;
        totals[p.expenseId] = (totals[p.expenseId] || 0) + (p.amount || 0);
    });
    return totals;
}

export function paidAmount(expense, totals) {
    const fromPayments = totals[expense.id];
    return fromPayments !== undefined ? fromPayments : (expense.amount || 0);
}