import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Download, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function ImportExpenses({ onImportComplete }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setResult(null);
        } else {
            alert('Please select a valid CSV file');
        }
    };

    const handleImport = async () => {
        if (!file) {
            setResult({ success: false, error: 'No file selected' });
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${base44.functions.getBaseUrl()}/importExpenses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${await base44.auth.getToken()}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Import failed');
            }

            setResult(data);
            
            if (data.success) {
                setTimeout(() => {
                    setOpen(false);
                    setFile(null);
                    setResult(null);
                    onImportComplete();
                }, 2000);
            }
        } catch (error) {
            setResult({ 
                success: false, 
                error: error.message
            });
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'description,amount,category,date,vendor,notes\n' +
                        'Cement bags,150.50,Materials,2025-12-30,Local Supplier,Purchased 10 bags\n' +
                        'Electrician work,500.00,Labor,2025-12-29,John Electric,Wiring installation';
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expenses-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Expenses from CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with your expense data. Required columns: description, amount, category, date
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Button 
                        variant="outline" 
                        onClick={downloadTemplate}
                        className="w-full"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV Template
                    </Button>

                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                        {!file ? (
                            <label className="flex flex-col items-center cursor-pointer">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <FileText className="w-12 h-12 text-slate-400 mb-2" />
                                <span className="text-sm text-slate-600">Click to select CSV file</span>
                            </label>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    <span className="text-sm font-medium">{file.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFile(null)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {result && (
                        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            {result.success ? (
                                <div className="text-green-800">
                                    <p className="font-medium">✓ Import successful!</p>
                                    <p className="text-sm">Imported {result.imported} expenses</p>
                                    {result.errors && (
                                        <p className="text-sm mt-1">Note: {result.errors.length} rows had errors</p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-red-800">
                                    <p className="font-medium">✗ Import failed</p>
                                    <p className="text-sm">{result.error}</p>
                                    {result.details && (
                                        <ul className="text-xs mt-2 list-disc list-inside">
                                            {result.details.slice(0, 5).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {importing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Import Expenses
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}