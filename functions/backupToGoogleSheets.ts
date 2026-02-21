import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Get access token for Google Sheets
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

        // Fetch all expenses and projects
        const [expenses, projects] = await Promise.all([
            base44.asServiceRole.entities.Expense.list('-date', 5000),
            base44.asServiceRole.entities.Project.list('-created_date', 100),
        ]);

        const projectMap = {};
        for (const p of projects) {
            projectMap[p.id] = p.name;
        }

        const now = new Date();
        const tabName = `Backup ${now.toISOString().slice(0, 10)}`;

        // Get spreadsheet ID from env (set by user)
        const spreadsheetId = Deno.env.get("BACKUP_SPREADSHEET_ID");
        if (!spreadsheetId) {
            return Response.json({ error: "BACKUP_SPREADSHEET_ID environment variable not set." }, { status: 400 });
        }

        const headers = ["Date", "Description", "Amount (€)", "Category", "Vendor", "Notes", "Project", "Paid", "Paid At", "Paid By", "Created By", "Expense ID"];

        const rows = expenses.map(exp => [
            exp.date || "",
            exp.description || "",
            exp.amount ?? "",
            exp.category || "",
            exp.vendor || "",
            exp.notes || "",
            projectMap[exp.projectId] || exp.projectId || "",
            exp.isPaid ? "Yes" : "No",
            exp.paidAt ? new Date(exp.paidAt).toISOString().slice(0, 16).replace("T", " ") : "",
            exp.paidBy || "",
            exp.created_by || "",
            exp.id || "",
        ]);

        // Add the new sheet tab
        const addSheetRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    requests: [{ addSheet: { properties: { title: tabName } } }],
                }),
            }
        );

        if (!addSheetRes.ok) {
            const err = await addSheetRes.text();
            return Response.json({ error: "Failed to create sheet tab", details: err }, { status: 500 });
        }

        // Write data to the new tab
        const values = [headers, ...rows];
        const writeRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:L${values.length}?valueInputOption=RAW`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ values }),
            }
        );

        if (!writeRes.ok) {
            const err = await writeRes.text();
            return Response.json({ error: "Failed to write data", details: err }, { status: 500 });
        }

        return Response.json({
            success: true,
            tab: tabName,
            expensesBackedUp: expenses.length,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});