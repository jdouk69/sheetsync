import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const paymentData = await req.json();

        // SECURITY: Validate expenseId is provided
        if (!paymentData.expenseId) {
            return Response.json({ error: 'expenseId is required' }, { status: 400 });
        }

        // SECURITY: Get expense and validate access
        const expense = await base44.asServiceRole.entities.Expense.get(paymentData.expenseId);
        
        if (!expense) {
            return Response.json({ error: 'Expense not found' }, { status: 404 });
        }

        if (!expense.projectId) {
            return Response.json({ error: 'Expense not associated with a project' }, { status: 400 });
        }

        // SECURITY: Validate user has access to the project
        const project = await base44.asServiceRole.entities.Project.get(expense.projectId);
        
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // Check permissions
        const isOwner = project.created_by === user.email;
        const isAdmin = user.role === 'admin';
        const sharedAccess = project.sharedWith?.find(s => s.email === user.email);
        const canEdit = isOwner || isAdmin || (sharedAccess && ['admin', 'editor'].includes(sharedAccess.role));

        if (!canEdit) {
            return Response.json({ error: 'Access denied: You do not have permission to add payments in this project' }, { status: 403 });
        }

        // SECURITY: Auto-set audit fields - prevent user spoofing
        const securePaymentData = {
            ...paymentData,
            // Force correct audit trail
            paidBy: user.email,
            paidByName: user.full_name || user.email,
            // Ensure expenseId cannot be changed
            expenseId: paymentData.expenseId
        };

        // Remove any fields user shouldn't control
        delete securePaymentData.id;
        delete securePaymentData.created_date;
        delete securePaymentData.updated_date;
        delete securePaymentData.created_by;

        // Create payment
        const newPayment = await base44.asServiceRole.entities.Payment.create(securePaymentData);

        // Log activity
        await base44.asServiceRole.entities.ActivityLog.create({
            action: 'created_payment',
            entityType: 'payment',
            entityId: newPayment.id,
            entityLabel: `Payment of ${newPayment.amount} for ${expense.description}`,
            performedBy: user.email,
            performedByName: user.full_name || user.email,
            details: `Payment method: ${newPayment.method}`
        });

        return Response.json({ success: true, payment: newPayment });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});