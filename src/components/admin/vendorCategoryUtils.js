import { base44 } from "@/api/base44Client";

// Pure helper: given a list of existing canonical values and a newly entered value,
// returns the existing value if it matches case/whitespace-insensitively, otherwise
// returns the trimmed entered value (preserving the user's capitalization for new entries).
// Does NOT fuzzy-match punctuation, spacing-within-words, or spelling differences.
export function findCanonicalValue(existingValues, enteredValue) {
    if (enteredValue == null) return enteredValue;
    const trimmed = String(enteredValue).trim();
    if (!trimmed) return trimmed;
    const match = (existingValues || []).find(
        v => typeof v === "string" && v.trim().toLowerCase() === trimmed.toLowerCase()
    );
    return match || trimmed;
}

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