import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spreadsheetId, sheetName } = await req.json();
        
        // Get access token from the connector
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");
        
        // First, get spreadsheet metadata to check available sheets
        const metadataResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        if (!metadataResponse.ok) {
            const error = await metadataResponse.text();
            return Response.json({ error: `Failed to fetch spreadsheet metadata: ${error}` }, { status: 400 });
        }
        
        const metadata = await metadataResponse.json();
        const availableSheets = metadata.sheets?.map(s => s.properties.title) || [];
        
        // Try to find the sheet by name or use the first one
        let targetSheet = sheetName || availableSheets[0];
        if (sheetName && !availableSheets.includes(sheetName)) {
            return Response.json({ 
                error: `Sheet "${sheetName}" not found. Available sheets: ${availableSheets.join(', ')}`,
                availableSheets 
            }, { status: 400 });
        }
        
        // Fetch sheet data from Google Sheets API
        const sheetsResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheet)}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        if (!sheetsResponse.ok) {
            const error = await sheetsResponse.text();
            return Response.json({ error: `Failed to fetch sheet data: ${error}` }, { status: 400 });
        }
        
        const data = await sheetsResponse.json();
        const rows = data.values || [];
        
        if (rows.length === 0) {
            return Response.json({ error: 'No data found in sheet' }, { status: 400 });
        }
        
        // First row is headers
        const headers = rows[0];
        const dataRows = rows.slice(1);
        
        // Convert to array of objects
        const records = dataRows.map(row => {
            const record = {};
            headers.forEach((header, index) => {
                record[header] = row[index] || '';
            });
            return record;
        });
        
        return Response.json({
            headers,
            records,
            totalRecords: records.length
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});