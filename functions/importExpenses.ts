import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { fileContent, columnMapping } = body;

        if (!fileContent) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
        }

        const text = fileContent;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            return Response.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
        }

        // Parse header row
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Create reverse mapping (header -> field)
        const headerToField = {};
        headers.forEach((header, idx) => {
            if (columnMapping[header]) {
                headerToField[idx] = columnMapping[header];
            }
        });
        
        // Find column indices based on mapping
        const getFieldIndex = (fieldName) => {
            return Object.entries(headerToField).find(([idx, field]) => field === fieldName)?.[0];
        };
        
        const descriptionIdx = getFieldIndex('description');
        const amountIdx = getFieldIndex('amount');
        const categoryIdx = getFieldIndex('category');
        const dateIdx = getFieldIndex('date');
        const vendorIdx = getFieldIndex('vendor');
        const notesIdx = getFieldIndex('notes');

        if (descriptionIdx === undefined || amountIdx === undefined || categoryIdx === undefined || dateIdx === undefined) {
            return Response.json({ 
                error: 'Missing required field mappings. Please map: description, amount, category, date' 
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
                // Remove commas from amount (handles formats like "3,000.00")
                const amountStr = (values[amountIdx] || '').replace(/,/g, '');
                const amount = parseFloat(amountStr);
                if (isNaN(amount)) {
                    errors.push(`Row ${i + 1}: Invalid amount`);
                    continue;
                }

                const expense = {
                    description: values[descriptionIdx] || '',
                    amount: Math.abs(amount),
                    category: values[categoryIdx] || '',
                    date: values[dateIdx] || new Date().toISOString().split('T')[0],
                };

                if (vendorIdx !== undefined && values[vendorIdx]) {
                    expense.vendor = values[vendorIdx];
                }

                if (notesIdx !== undefined && values[notesIdx]) {
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