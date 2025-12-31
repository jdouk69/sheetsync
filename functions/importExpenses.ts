import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            return Response.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
        }

        // Parse header row
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Find column indices
        const descriptionIdx = headers.indexOf('description');
        const amountIdx = headers.indexOf('amount');
        const categoryIdx = headers.indexOf('category');
        const dateIdx = headers.indexOf('date');
        const vendorIdx = headers.indexOf('vendor');
        const notesIdx = headers.indexOf('notes');

        if (descriptionIdx === -1 || amountIdx === -1 || categoryIdx === -1 || dateIdx === -1) {
            return Response.json({ 
                error: 'Missing required columns. CSV must have: description, amount, category, date' 
            }, { status: 400 });
        }

        // Parse data rows
        const expenses = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            // Simple CSV parsing (handles quoted values)
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            try {
                const amount = parseFloat(values[amountIdx]);
                if (isNaN(amount)) {
                    errors.push(`Row ${i + 1}: Invalid amount`);
                    continue;
                }

                const expense = {
                    description: values[descriptionIdx] || '',
                    amount: amount,
                    category: values[categoryIdx] || '',
                    date: values[dateIdx] || new Date().toISOString().split('T')[0],
                };

                if (vendorIdx !== -1 && values[vendorIdx]) {
                    expense.vendor = values[vendorIdx];
                }

                if (notesIdx !== -1 && values[notesIdx]) {
                    expense.notes = values[notesIdx];
                }

                expenses.push(expense);
            } catch (error) {
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }

        if (expenses.length === 0) {
            return Response.json({ 
                error: 'No valid expenses found in CSV',
                details: errors
            }, { status: 400 });
        }

        // Bulk create expenses
        await base44.entities.Expense.bulkCreate(expenses);

        return Response.json({
            success: true,
            imported: expenses.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});