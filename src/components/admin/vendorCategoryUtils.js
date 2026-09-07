import { base44 } from "@/api/base44Client";

// Shared bulk-update pathway used by both the Merge and Rename actions
// in the Admin > Vendors & Categories tool. Project-scoped, exact string match.
export async function bulkUpdateExpenseField(expenses, projectId, field, matchValues, newValue) {
    const toUpdate = expenses.filter(
        e => e.projectId === projectId && matchValues.includes(e[field])
    );

    await Promise.all(
        toUpdate.map(e => base44.entities.Expense.update(e.id, { [field]: newValue }))
    );

    return toUpdate.length;
}