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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "../LanguageContext";
import { useProject } from "../ProjectContext";

export default function ImportExpenses({ onImportComplete }) {
    const { t } = useLanguage();
    const { currentProjectId } = useProject();
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [showMapping, setShowMapping] = useState(false);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setResult(null);
            
            // Read CSV headers
            const text = await selectedFile.text();
            const firstLine = text.split('\n')[0];
            const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
            setCsvHeaders(headers);
            
            // Auto-map columns (case-insensitive matching)
            const autoMapping = {};
            const expenseFields = ['description', 'amount', 'category', 'date', 'vendor', 'notes'];
            
            headers.forEach(header => {
                const lowerHeader = header.toLowerCase();
                
                // Direct matches
                if (expenseFields.includes(lowerHeader)) {
                    autoMapping[header] = lowerHeader;
                }
                // Smart matches
                else if (lowerHeader === 'note') {
                    autoMapping[header] = 'notes';
                }
            });
            
            setColumnMapping(autoMapping);
            setShowMapping(true);
        } else {
            alert('Please select a valid CSV file');
        }
    };

    const handleImport = async () => {
        if (!file) {
            setResult({ success: false, error: 'No file selected' });
            return;
        }

        // Check required fields are mapped
        const mappedFields = Object.values(columnMapping);
        const requiredFields = ['description', 'amount', 'category', 'date'];
        const missingFields = requiredFields.filter(field => !mappedFields.includes(field));
        
        if (missingFields.length > 0) {
            setResult({ 
                success: false, 
                error: `Please map these required fields: ${missingFields.join(', ')}` 
            });
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            // Read the file as text and send it along with mapping
            const text = await file.text();
            
            const response = await base44.functions.invoke('importExpenses', {
                fileContent: text,
                columnMapping: columnMapping,
                projectId: currentProjectId
            });
            
            setResult(response.data);
            
            if (response.data.success) {
                setTimeout(() => {
                    setOpen(false);
                    setFile(null);
                    setResult(null);
                    setCsvHeaders([]);
                    setColumnMapping({});
                    setShowMapping(false);
                    onImportComplete();
                }, 2000);
            }
        } catch (error) {
            setResult({ 
                success: false, 
                error: error.response?.data?.error || error.message
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
                    {t('importCsv')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('importExpensesTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('importDescription')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <Button 
                        variant="outline" 
                        onClick={downloadTemplate}
                        className="w-full"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {t('downloadTemplate')}
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
                                <span className="text-sm text-slate-600">{t('clickToSelect')}</span>
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

                    {showMapping && csvHeaders.length > 0 && (
                        <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                            <h3 className="font-medium text-sm">{t('mapColumns')}</h3>
                            <p className="text-xs text-slate-600">{t('mapDescription')}</p>
                            {csvHeaders.map((header) => (
                                <div key={header} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <span className="text-sm font-medium">{header}</span>
                                    </div>
                                    <div className="flex-1">
                                        <Select
                                            value={columnMapping[header] || 'skip'}
                                            onValueChange={(value) => {
                                                setColumnMapping(prev => ({
                                                    ...prev,
                                                    [header]: value === 'skip' ? undefined : value
                                                }));
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={t('selectField')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="skip">{t('skipColumn')}</SelectItem>
                                                <SelectItem value="description">{t('description')} *</SelectItem>
                                                <SelectItem value="amount">{t('amount')} *</SelectItem>
                                                <SelectItem value="category">{t('category')} *</SelectItem>
                                                <SelectItem value="date">{t('date')} *</SelectItem>
                                                <SelectItem value="vendor">{t('vendor')}</SelectItem>
                                                <SelectItem value="notes">{t('notes')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {result && (
                        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            {result.success ? (
                                <div className="text-green-800">
                                    <p className="font-medium">{t('importSuccess')}</p>
                                    <p className="text-sm">{t('imported', { count: result.imported })}</p>
                                    {result.errors && (
                                        <p className="text-sm mt-1">{t('errorsNote', { count: result.errors.length })}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-red-800">
                                    <p className="font-medium">{t('importFailed')}</p>
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
                                {t('importing')}
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                {t('importExpenses')}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}