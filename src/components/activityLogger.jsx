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
    base44.entities.ActivityLog.create({
        action,
        entityType,
        entityId: entityId || "",
        entityLabel: entityLabel || "",
        performedBy: user?.email || "",
        performedByName: user?.full_name || user?.email || "",
        details: details || "",
    });
}