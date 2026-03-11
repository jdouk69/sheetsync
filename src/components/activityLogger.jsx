import { base44 } from "@/api/base44Client";

/**
 * Logs a user action to the ActivityLog entity.
 * @param {object} params
 * @param {string} params.action - e.g. "created_expense"
 * @param {string} params.entityType - "expense" | "project" | "user"
 * @param {string} params.entityId
 * @param {string} params.entityLabel - human-readable name
 * @param {object} params.user - current user object
 * @param {string} [params.details]
 */
export async function logActivity({ action, entityType, entityId, entityLabel, user, details }) {
    // SECURITY: Client-side activity logging
    // Note: For production, consider moving this to server-side to prevent tampering
    // Users should NOT be able to create arbitrary activity log entries
    try {
        await base44.entities.ActivityLog.create({
            action,
            entityType,
            entityId: entityId || "",
            entityLabel: entityLabel || "",
            performedBy: user?.email || "",
            performedByName: user?.full_name || user?.email || "",
            details: details || "",
        });
    } catch (error) {
        // SECURITY: Log failures silently to not break user workflows
        // In production, this should be server-side only
        console.error('Failed to log activity:', error);
    }
}