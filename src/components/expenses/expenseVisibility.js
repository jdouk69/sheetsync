// Central rule: an expense is active unless it is in Recently Deleted.
// Records that never had isDeleted set are treated as active.
export const isActiveExpense = (expense) => expense?.isDeleted !== true;

export const onlyActiveExpenses = (list) => (list || []).filter(isActiveExpense);