import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { description, vendor, projectId } = await req.json();

        if (!description && !vendor) {
            return Response.json({ error: 'Description or vendor required' }, { status: 400 });
        }

        // Get existing expenses for this project to learn from
        const expenses = await base44.entities.Expense.filter({ 
            projectId: projectId 
        });

        // Build context from past expenses
        const expenseExamples = expenses
            .filter(e => e.category && (e.description || e.vendor))
            .slice(0, 50) // Limit to recent 50 expenses
            .map(e => `- "${e.vendor || ''} ${e.description || ''}".trim() → ${e.category}`)
            .join('\n');

        const prompt = `You are an expense categorization assistant. Based on the user's past expense patterns, suggest the most appropriate category for a new expense.

Past expenses and their categories:
${expenseExamples || 'No past expenses yet.'}

New expense:
${vendor ? `Vendor: ${vendor}` : ''}
${description ? `Description: ${description}` : ''}

Based on the patterns above, what category should this expense be in? If there are no past expenses, use common sense for construction expenses (Materials, Labor, Equipment, Permits, Professional Services, Utilities, or Other).

Respond with ONLY the category name, nothing else.`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt
        });

        const suggestedCategory = result.trim();

        return Response.json({ 
            suggestedCategory: suggestedCategory,
            confidence: expenseExamples ? 'high' : 'low'
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});