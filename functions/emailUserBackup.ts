import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Use service role to access all data
        const users = await base44.asServiceRole.entities.User.list();
        const allExpenses = await base44.asServiceRole.entities.Expense.list();
        const allProjects = await base44.asServiceRole.entities.Project.list();

        const projectMap = {};
        for (const p of allProjects) {
            projectMap[p.id] = p.name;
        }

        let emailsSent = 0;

        for (const user of users) {
            // Find projects this user has access to
            const userProjects = allProjects.filter(p =>
                p.created_by === user.email ||
                (p.sharedWith && p.sharedWith.some(s => s.email === user.email))
            );

            if (userProjects.length === 0) continue;

            const projectIds = new Set(userProjects.map(p => p.id));

            // Filter expenses for this user's projects
            const userExpenses = allExpenses.filter(e => projectIds.has(e.projectId));

            if (userExpenses.length === 0) continue;

            // Build CSV
            const headers = ['Date', 'Description', 'Category', 'Vendor', 'Amount (€)', 'Paid', 'Notes', 'Project', 'Created By'];
            const rows = userExpenses.map(e => [
                e.date || '',
                `"${(e.description || '').replace(/"/g, '""')}"`,
                e.category || '',
                `"${(e.vendor || '').replace(/"/g, '""')}"`,
                e.amount || 0,
                e.isPaid ? 'Yes' : 'No',
                `"${(e.notes || '').replace(/"/g, '""')}"`,
                `"${(projectMap[e.projectId] || '').replace(/"/g, '""')}"`,
                e.createdByName || e.created_by || ''
            ]);

            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

            const totalAmount = userExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const unpaidAmount = userExpenses.filter(e => !e.isPaid).reduce((sum, e) => sum + (e.amount || 0), 0);
            const today = new Date().toLocaleDateString('en-GB');

            // Upload CSV and get a download link
            const csvBlob = new Blob([csvContent], { type: 'text/csv' });
            const formData = new FormData();
            formData.append('file', csvBlob, `expenses-backup-${today.replace(/\//g, '-')}.csv`);
            const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: csvBlob });
            const downloadUrl = uploadResult.file_url;

            const emailBody = `
Hello ${user.full_name || user.email},

Your weekly expense backup is ready!

📊 Summary
- Total Expenses: ${userExpenses.length}
- Total Amount: €${totalAmount.toFixed(2)}
- Unpaid Amount: €${unpaidAmount.toFixed(2)}
- Projects: ${userProjects.map(p => p.name).join(', ')}
- Generated: ${today}

📥 Download your CSV backup:
${downloadUrl}

This backup is sent automatically every week.

Greece Construction App
            `.trim();

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: user.email,
                subject: `Weekly Expense Backup - ${today}`,
                body: emailBody
            });

            emailsSent++;
        }

        return Response.json({ success: true, emailsSent });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});