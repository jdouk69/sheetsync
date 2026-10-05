// Shared helper: permanently removes an Expense and its Payments.
// Refuses to run before the expense's purgeAfter unless force is true.
export async function purgeExpenseAndPayments(base44: any, expense: any, force: boolean) {
    if (!expense.isDeleted) {
        throw new Error('Expense is not in Recently Deleted');
    }
    if (!force) {
        const due = expense.purgeAfter ? new Date(expense.purgeAfter).getTime() : NaN;
        if (isNaN(due) || Date.now() < due) {
            return false;
        }
    }
    const payments = await base44.asServiceRole.entities.Payment.filter({ expenseId: expense.id });
    for (const payment of payments) {
        await base44.asServiceRole.entities.Payment.delete(payment.id);
    }
    await base44.asServiceRole.entities.Expense.delete(expense.id);
    return true;
}