/**
 * Access control validation utilities
 * Import and use in backend functions to enforce security
 */

/**
 * Validates that a user has access to a specific project
 */
export async function validateProjectAccess(base44, user, projectId, requiredRole = 'viewer') {
    if (!user) {
        throw new Error('Authentication required');
    }

    const project = await base44.asServiceRole.entities.Project.get(projectId);
    
    if (!project) {
        throw new Error('Project not found');
    }
    
    if (user.role === 'admin') {
        return project;
    }
    
    if (project.created_by === user.email) {
        return project;
    }
    
    const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
    const hasLegacyAccess = project.sharedWithUsers?.includes(user.email);
    
    if (!sharedAccess && !hasLegacyAccess) {
        throw new Error('Access denied: You do not have access to this project');
    }
    
    if (hasLegacyAccess && !sharedAccess) {
        const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
        if (roleHierarchy['editor'] < roleHierarchy[requiredRole]) {
            throw new Error(`Access denied: ${requiredRole} role required`);
        }
        return project;
    }
    
    const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
    const userRoleLevel = roleHierarchy[sharedAccess.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    if (userRoleLevel < requiredRoleLevel) {
        throw new Error(`Access denied: ${requiredRole} role required`);
    }
    
    return project;
}

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
    
    await validateProjectAccess(base44, user, expense.projectId, requiredRole);
    
    return expense;
}

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

export function requireAdmin(user) {
    if (!user || user.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
    }
}