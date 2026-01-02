import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Get all expenses
        const expenses = await base44.asServiceRole.entities.Expense.list();
        
        // Get all users
        const users = await base44.asServiceRole.entities.User.list();
        
        // Create a map of email to user for quick lookup
        const userMap = new Map(users.map(u => [u.email, u]));
        
        let updated = 0;
        let skipped = 0;
        
        for (const expense of expenses) {
            const needsUpdate = !expense.createdByName || !expense.updatedByName;
            
            if (needsUpdate) {
                const creatorUser = userMap.get(expense.created_by);
                const editorUser = expense.updated_by ? userMap.get(expense.updated_by) : null;
                
                const updateData = {};
                
                if (!expense.createdByName && creatorUser) {
                    updateData.createdByName = creatorUser.full_name || creatorUser.email;
                }
                
                if (!expense.updatedByName && editorUser) {
                    updateData.updatedByName = editorUser.full_name || editorUser.email;
                }
                
                if (Object.keys(updateData).length > 0) {
                    await base44.asServiceRole.entities.Expense.update(expense.id, updateData);
                    updated++;
                }
            } else {
                skipped++;
            }
        }
        
        return Response.json({ 
            success: true,
            message: `Migration complete. Updated ${updated} expenses, skipped ${skipped} expenses.`,
            updated,
            skipped
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});