import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");
        const spreadsheetId = Deno.env.get('BACKUP_SPREADSHEET_ID');

        const users = await base44.asServiceRole.entities.User.list();
        const allExpenses = await base44.asServiceRole.entities.Expense.list();
        const allProjects = await base44.asServiceRole.entities.Project.list();

        const projectMap = {};
        for (const p of allProjects) {
            projectMap[p.id] = p.name;
        }

        const today = new Date().toLocaleDateString('en-GB');
        let emailsSent = 0;

        for (const user of users) {
            // Find projects this user has access to
            const userProjects = allProjects.filter(p =>
                p.created_by === user.email ||
                (p.sharedWith && p.sharedWith.some(s => s.email === user.email))
            );

            if (userProjects.length === 0) continue;

            const projectIds = new Set(userProjects.map(p => p.id));
            const userExpenses = allExpenses.filter(e => projectIds.has(e.projectId));

            if (userExpenses.length === 0) continue;

            // Create a tab name for this user
            const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
            const tabName = `${safeEmail}_${today.replace(/\//g, '-')}`;

            // Add a new sheet tab
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [{
                        addSheet: {
                            properties: { title: tabName }
                        }
                    }]
                })
            });

            // Build rows
            const headers = ['Date', 'Description', 'Category', 'Vendor', 'Amount (€)', 'Paid', 'Notes', 'Project', 'Created By'];
            const rows = userExpenses.map(e => [
                e.date || '',
                e.description || '',
                e.category || '',
                e.vendor || '',
                e.amount || 0,
                e.isPaid ? 'Yes' : 'No',
                e.notes || '',
                projectMap[e.projectId] || '',
                e.createdByName || e.created_by || ''
            ]);

            const values = [headers, ...rows];

            // Write data to the tab
            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:I${values.length}?valueInputOption=RAW`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values })
            });

            const totalAmount = userExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const unpaidAmount = userExpenses.filter(e => !e.isPaid).reduce((sum, e) => sum + (e.amount || 0), 0);
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

            const emailBody = `Hello ${user.full_name || user.email},

Your weekly expense backup is ready for ${today}.

Summary:
- Total Expenses: ${userExpenses.length}
- Total Amount: €${totalAmount.toFixed(2)}
- Unpaid Amount: €${unpaidAmount.toFixed(2)}
- Projects: ${userProjects.map(p => p.name).join(', ')}

Your data has been backed up to a Google Sheet. You can download your CSV from there:
${sheetUrl}

(Look for the tab named: ${tabName})

This backup is sent automatically every week.

Greece Construction App`;

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