/**
 * Access control validation utilities for backend functions
 * These functions enforce server-side security boundaries
 */

/**
 * Validates that a user has access to a specific project
 * @param {object} base44 - Base44 SDK client
 * @param {object} user - Current authenticated user
 * @param {string} projectId - Project ID to check
 * @param {string} requiredRole - Minimum role required ('viewer', 'editor', 'admin')
 * @returns {object} Project object if access granted
 * @throws {Error} If access denied
 */
export async function validateProjectAccess(base44, user, projectId, requiredRole = 'viewer') {
    if (!user) {
        throw new Error('Authentication required');
    }

    const project = await base44.asServiceRole.entities.Project.get(projectId);
    
    if (!project) {
        throw new Error('Project not found');
    }
    
    // Super admin has full access
    if (user.role === 'admin') {
        return project;
    }
    
    // Project owner has full access
    if (project.created_by === user.email) {
        return project;
    }
    
    // Check shared access
    const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
    
    // Fallback to legacy structure
    const hasLegacyAccess = project.sharedWithUsers?.includes(user.email);
    
    if (!sharedAccess && !hasLegacyAccess) {
        throw new Error('Access denied: You do not have access to this project');
    }
    
    // For legacy access, treat as editor
    if (hasLegacyAccess && !sharedAccess) {
        const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
        if (roleHierarchy['editor'] < roleHierarchy[requiredRole]) {
            throw new Error(`Access denied: ${requiredRole} role required`);
        }
        return project;
    }
    
    // Validate role permissions
    const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
    const userRoleLevel = roleHierarchy[sharedAccess.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    if (userRoleLevel < requiredRoleLevel) {
        throw new Error(`Access denied: ${requiredRole} role required, you have ${sharedAccess.role}`);
    }
    
    return project;
}

/**
 * Validates that a user has access to a specific expense through its project
 */
export async function validateExpenseAccess(base44, user, expenseId, requiredRole = 'viewer') {
    if (!user) {
        throw new Error('Authentication required');
    }

    const expense = await base44.asServiceRole.entities.Expense.get(expenseId);
    
    if (!expense) {
        throw new Error('Expense not found');
    }
    
    if (!expense.projectId) {
        throw new Error('Expense not associated with a project');
    }
    
    // Validate project access
    await validateProjectAccess(base44, user, expense.projectId, requiredRole);
    
    return expense;
}

/**
 * Validates that a user has access to a payment through its expense and project
 */
export async function validatePaymentAccess(base44, user, paymentId, requiredRole = 'viewer') {
    if (!user) {
        throw new Error('Authentication required');
    }

    const payment = await base44.asServiceRole.entities.Payment.get(paymentId);
    
    if (!payment) {
        throw new Error('Payment not found');
    }
    
    if (!payment.expenseId) {
        throw new Error('Payment not associated with an expense');
    }
    
    // Validate expense access (which validates project access)
    await validateExpenseAccess(base44, user, payment.expenseId, requiredRole);
    
    return payment;
}

/**
 * Filters a list of projects to only those the user can access
 */
export function filterUserProjects(projects, user) {
    if (!user) return [];
    
    if (user.role === 'admin') {
        return projects;
    }
    
    return projects.filter(project => 
        project.created_by === user.email ||
        project.sharedWith?.some(s => s.email === user.email) ||
        project.sharedWithUsers?.includes(user.email)
    );
}

/**
 * Validates admin-only access
 */
export function requireAdmin(user) {
    if (!user || user.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
    }
}

/**
 * Prevents privilege escalation in project sharing
 */
export function validateSharedWithChanges(oldSharedWith, newSharedWith, user, project) {
    // Only project owner or admin can modify sharing
    if (project.created_by !== user.email && user.role !== 'admin') {
        throw new Error('Only project owner or admin can modify sharing settings');
    }
    
    // Validate no one is promoting themselves
    const userShare = newSharedWith?.find(s => s.email === user.email);
    const oldUserShare = oldSharedWith?.find(s => s.email === user.email);
    
    if (userShare && oldUserShare && userShare.role !== oldUserShare.role) {
        throw new Error('Cannot modify your own access level');
    }
    
    return true;
}