import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, PieChart, BarChart3, FileText, Filter } from "lucide-react";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { useLanguage } from "../components/LanguageContext";
import { useProject } from "../components/ProjectContext";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899', '#64748b'];

export default function ReportsPage() {
    const { t } = useLanguage();
    const { currentProjectId, projects, isLoading: projectsLoading } = useProject();
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAuth();
    }, []);

    const { data: allExpenses = [] } = useQuery({
        queryKey: ['expenses', currentProjectId],
        queryFn: async () => {
            if (!currentProjectId) return [];
            const expenses = await base44.entities.Expense.list('-date');
            return expenses.filter(exp => exp.projectId === currentProjectId);
        },
        enabled: !!currentProjectId,
    });

    const [filters, setFilters] = useState({
        category: 'all',
        vendor: 'all',
        startDate: '',
        endDate: ''
    });

    const expenses = useMemo(() => {
        return allExpenses.filter(exp => {
            const categoryMatch = filters.category === 'all' || exp.category === filters.category;
            const vendorMatch = filters.vendor === 'all' || exp.vendor === filters.vendor;
            
            const expDate = new Date(exp.date);
            const startMatch = !filters.startDate || expDate >= new Date(filters.startDate);
            const endMatch = !filters.endDate || expDate <= new Date(filters.endDate);
            
            return categoryMatch && vendorMatch && startMatch && endMatch;
        });
    }, [allExpenses, filters]);

    const uniqueVendors = useMemo(() => {
        return [...new Set(allExpenses.map(exp => exp.vendor).filter(Boolean))];
    }, [allExpenses]);

    const uniqueCategories = useMemo(() => {
        return [...new Set(allExpenses.map(exp => exp.category).filter(Boolean))];
    }, [allExpenses]);

    const categoryData = expenses.reduce((acc, exp) => {
        const existing = acc.find(item => item.name === exp.category);
        if (existing) {
            existing.value += exp.amount;
        } else {
            acc.push({ name: exp.category, value: exp.amount });
        }
        return acc;
    }, []);

    const monthlyData = expenses.reduce((acc, exp) => {
        const monthYear = format(new Date(exp.date), 'MMM yyyy');
        const existing = acc.find(item => item.name === monthYear);
        if (existing) {
            existing.amount += exp.amount;
        } else {
            acc.push({ name: monthYear, amount: exp.amount });
        }
        return acc;
    }, []).sort((a, b) => new Date(a.name) - new Date(b.name));

    const handleExportPDF = async () => {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;
        
        const reportContent = document.createElement('div');
        reportContent.style.width = '800px';
        reportContent.style.padding = '40px';
        reportContent.style.backgroundColor = 'white';
        reportContent.style.fontFamily = 'Arial, sans-serif';
        
        reportContent.innerHTML = `
            <h1 style="font-size: 24px; margin-bottom: 20px;">Construction Expense Report</h1>
            <p style="margin: 5px 0;">Generated: ${format(new Date(), 'PPP')}</p>
            <p style="margin: 5px 0;">Total Expenses: ${expenses.length}</p>
            <p style="margin: 5px 0; font-weight: bold;">Total Amount: €${expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            
            <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 15px;">Expenses by Category</h2>
            ${categoryData.map(cat => `
                <p style="margin: 5px 0; padding-left: 10px;">
                    ${cat.name}: €${cat.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
            `).join('')}
            
            <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 15px;">Expense Details</h2>
            ${expenses.map(exp => `
                <p style="margin: 3px 0; font-size: 12px; padding-left: 10px;">
                    ${format(new Date(exp.date), 'MM/dd/yyyy')} - ${exp.description} - €${exp.amount.toFixed(2)} - ${exp.category}
                </p>
            `).join('')}
        `;
        
        document.body.appendChild(reportContent);
        
        const canvas = await html2canvas(reportContent, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        });
        
        document.body.removeChild(reportContent);
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        pdf.save('construction-expenses-report.pdf');
    };

    const handleExportCSV = () => {
        const headers = ['Date', 'Description', 'Amount (€)', 'Category', 'Vendor', 'Notes'];
        const rows = expenses.map(exp => [
            format(new Date(exp.date), 'yyyy-MM-dd'),
            exp.description,
            exp.amount.toFixed(2),
            exp.category,
            exp.vendor || '',
            exp.notes || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `construction-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (projectsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    if (projects.length === 0 || !currentProjectId) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Project Selected</h2>
                            <p className="text-slate-600">Please create a project first to view reports.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('reportsAnalytics')}</h1>
                        <p className="text-slate-600 mt-1">{t('visualBreakdown')}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleExportCSV} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                            <FileText className="w-4 h-4 mr-2" />
                            {t('exportCsv')}
                        </Button>
                        <Button onClick={handleExportPDF} className="bg-blue-600 hover:bg-blue-700">
                            <Download className="w-4 h-4 mr-2" />
                            {t('exportPdf')}
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold">{t('filters')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('category')}</label>
                            <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('allCategories')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('allCategories')}</SelectItem>
                                    {uniqueCategories.sort().map(category => (
                                        <SelectItem key={category} value={category}>{category}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('vendor')}</label>
                            <Select value={filters.vendor} onValueChange={(value) => setFilters({...filters, vendor: value})}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('allVendors')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('allVendors')}</SelectItem>
                                    {uniqueVendors.map(vendor => (
                                        <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('startDate')}</label>
                            <Input 
                                type="date" 
                                value={filters.startDate}
                                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('endDate')}</label>
                            <Input 
                                type="date" 
                                value={filters.endDate}
                                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                            />
                        </div>
                    </div>
                    {(filters.category !== 'all' || filters.vendor !== 'all' || filters.startDate || filters.endDate) && (
                        <div className="mt-4">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setFilters({ category: 'all', vendor: 'all', startDate: '', endDate: '' })}
                            >
                                {t('clearFilters')}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChart className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">{t('expensesByCategory')}</h2>
                        </div>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsPie>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-12">{t('noDataAvailable')}</p>
                        )}
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">{t('monthlySpending')}</h2>
                        </div>
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
                                    <Bar dataKey="amount" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-12">{t('noDataAvailable')}</p>
                        )}
                        </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">{t('categoryBreakdown')}</h2>
                    <div className="space-y-3">
                        {categoryData.map((cat, index) => {
                            const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                            const percentage = (cat.value / total) * 100;
                            return (
                                <div key={cat.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{cat.name}</span>
                                        <span className="text-slate-600">
                                            €{cat.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: COLORS[index % COLORS.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}