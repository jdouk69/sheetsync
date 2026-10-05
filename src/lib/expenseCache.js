import { base44 } from "@/api/base44Client";
import { onlyActiveExpenses } from "@/components/expenses/expenseVisibility";

// Explicit query keys for every expense-related cache. Each root name is unique;
// nothing depends on one key accidentally being a prefix of another.
export const EXPENSE_KEYS = {
    projectExpenses: (projectId) => ['expenses', projectId],       // active expenses of ONE project (Expenses page, Reports, ExpenseForm)
    adminExpenses: ['allExpenses'],                                // Admin > Expenses
    adminVendors: ['all-expenses'],                                // Admin > Vendors/Categories
    recentlyDeleted: ['recentlyDeletedExpenses'],                  // Admin > Recently Deleted
    reportPayments: (projectId) => ['payments-for-reports', projectId], // Reports payment totals
    expensePayments: (expenseId) => ['payments', expenseId],       // per-expense Payment list
};

// Shared loader for one project's active expenses (single source for Expenses, Reports, ExpenseForm).
export const fetchProjectExpenses = async (projectId) => {
    if (!projectId) return [];
    const list = await base44.entities.Expense.filter({ projectId }, '-date', 9999);
    return onlyActiveExpenses(list);
};

const byRoot = (root) => ({ predicate: (q) => q.queryKey[0] === root });

// Refresh every cache an expense change can affect and wait until they are fresh.
// refetchType 'all' also refetches cached-but-unmounted screens, so they never flash stale rows.
export function refreshExpenseCaches(queryClient, { expenseId } = {}) {
    const refresh = (root) => queryClient.invalidateQueries({ ...byRoot(root), refetchType: 'all' });
    return Promise.all([
        refresh('expenses'),
        refresh('allExpenses'),
        refresh('all-expenses'),
        refresh('recentlyDeletedExpenses'),
        refresh('payments-for-reports'),
        expenseId
            ? queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.expensePayments(expenseId), refetchType: 'all' })
            : queryClient.invalidateQueries(byRoot('payments')),
    ]);
}

// Instantly patch cached lists. updaters: { [rootKey]: (oldList, queryKey) => newList }.
// Returns a snapshot to pass to rollbackExpenseCaches if the mutation fails.
export async function optimisticExpenseUpdate(queryClient, updaters) {
    const roots = Object.keys(updaters);
    const predicate = (q) => roots.includes(q.queryKey[0]);
    await queryClient.cancelQueries({ predicate });
    const snapshot = queryClient.getQueriesData({ predicate });
    snapshot.forEach(([key, old]) => {
        if (Array.isArray(old)) queryClient.setQueryData(key, updaters[key[0]](old, key));
    });
    return snapshot;
}

export function rollbackExpenseCaches(queryClient, snapshot) {
    (snapshot || []).forEach(([key, data]) => queryClient.setQueryData(key, data));
}

// Apply one list updater to every active-expense list cache (project, admin, admin vendors).
export const onAllExpenseLists = (fn) => ({ 'expenses': fn, 'allExpenses': fn, 'all-expenses': fn });

// Common updaters
export const removeIds = (ids) => (old) => old.filter((e) => !ids.includes(e.id));
export const patchById = (id, patch) => (old) => old.map((e) => (e.id === id ? { ...e, ...patch } : e));