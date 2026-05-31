import React, { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, PieChart, BarChart3, FileText, Filter, Search, Calendar, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, endOfDay } from "date-fns";
import { el as elLocale } from 'date-fns/locale';
import { useLanguage } from "../components/LanguageContext";
import { useProject } from "../components/ProjectContext";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899', '#64748b', '#ef4444', '#14b8a6', '#f97316', '#a855f7', '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#d97706', '#7c3aed', '#059669'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CAD: 'CA$', CHF: 'Fr' };

// ─── Payment Model Helpers ─────────────────────────────────────────────────
// expenseValue = the full quoted/project cost of an expense
const expenseValue = (exp) => exp.totalAmount || exp.amount;
// paidSoFar = how much has actually been paid (always expense.amount)
const paidSoFar = (exp) => exp.amount || 0;
// remainingBalance = what is still owed (can be negative = overpayment)
const remainingBalance = (exp) => exp.totalAmount ? exp.totalAmount - (exp.amount || 0) : 0;
// paymentLabel for display
const paymentLabel = (exp) => {
    if (exp.paymentStatus === 'fully_paid' || exp.isPaid) return 'Fully Paid';
    if (exp.paymentStatus === 'deposit_paid') return 'Partially Paid';
    return 'Unpaid';
};

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
    if (percent < 0.03) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 6) * Math.cos(-midAngle * RADIAN);
    const sy = cy + (outerRadius + 6) * Math.sin(-midAngle * RADIAN);
    const mx = cx + (outerRadius + 18) * Math.cos(-midAngle * RADIAN);
    const my = cy + (outerRadius + 18) * Math.sin(-midAngle * RADIAN);
    const anchor = x > cx ? 'start' : 'end';
    const shortName = name?.length > 18 ? name.slice(0, 16) + '…' : name;
    return (
        <g>
            <path d={`M${sx},${sy}L${mx},${my}L${x},${y}`} stroke="#94a3b8" fill="none" strokeWidth={1} />
            <circle cx={x} cy={y} r={2} fill="#94a3b8" />
            <text x={x + (anchor === 'start' ? 4 : -4)} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={11} fill="#334155">
                {shortName} {(percent * 100).toFixed(0)}%
            </text>
        </g>
    );
};

export default function ReportsPage() {
    const { t, language } = useLanguage();
    const { currentProjectId, projects, currentProject, isLoading: projectsLoading } = useProject();
    const currencySymbol = CURRENCY_SYMBOLS[currentProject?.currency] || '€';
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

    const { data: allExpenses = [], refetch: refetchExpenses, isFetching } = useQuery({
        queryKey: ['expenses', currentProjectId],
        queryFn: async () => {
            if (!currentProjectId || !user) return [];
            return base44.entities.Expense.filter({ projectId: currentProjectId }, '-date', 9999);
        },
        enabled: !!currentProjectId && !!user,
        staleTime: 0,
    });

    const [filters, setFilters] = useState({
        category: 'all',
        vendor: 'all',
        startDate: '',
        endDate: '',
        search: '',
        paymentStatus: 'all',
        user: 'all'
    });

    const expenses = useMemo(() => {
        return allExpenses.filter(exp => {
            const categoryMatch = filters.category === 'all' || exp.category === filters.category;
            const vendorMatch = filters.vendor === 'all' || exp.vendor === filters.vendor;
            const expDate = new Date(exp.date);
            const startMatch = !filters.startDate || expDate >= new Date(filters.startDate);
            const endMatch = !filters.endDate || expDate <= endOfDay(new Date(filters.endDate));
            const searchMatch = !filters.search ||
                exp.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
                exp.vendor?.toLowerCase().includes(filters.search.toLowerCase()) ||
                exp.category?.toLowerCase().includes(filters.search.toLowerCase()) ||
                exp.notes?.toLowerCase().includes(filters.search.toLowerCase());
            const userMatch = filters.user === 'all' || exp.created_by === filters.user;

            // Payment status filter — uses paymentStatus field primarily
            let statusMatch = true;
            if (filters.paymentStatus === 'fully_paid') {
                statusMatch = exp.paymentStatus === 'fully_paid' || exp.isPaid === true;
            } else if (filters.paymentStatus === 'deposit_paid') {
                statusMatch = exp.paymentStatus === 'deposit_paid';
            } else if (filters.paymentStatus === 'unpaid') {
                statusMatch = exp.paymentStatus === 'unpaid' || (!exp.paymentStatus && !exp.isPaid);
            } else if (filters.paymentStatus === 'outstanding') {
                statusMatch = remainingBalance(exp) > 0;
            } else if (filters.paymentStatus === 'overpaid') {
                statusMatch = exp.totalAmount && remainingBalance(exp) < 0;
            }

            return categoryMatch && vendorMatch && startMatch && endMatch && searchMatch && statusMatch && userMatch;
        });
    }, [allExpenses, filters]);

    const uniqueVendors = useMemo(() => [...new Set(allExpenses.map(exp => exp.vendor).filter(Boolean))], [allExpenses]);
    const uniqueCategories = useMemo(() => [...new Set(allExpenses.map(exp => exp.category).filter(Boolean))], [allExpenses]);
    const uniqueUsers = useMemo(() => [...new Set(allExpenses.map(exp => exp.created_by).filter(Boolean))], [allExpenses]);

    // ─── Summary Metrics ─────────────────────────────────────────────────────
    const totalProjectValue = expenses.reduce((sum, exp) => sum + expenseValue(exp), 0);
    const totalPaid = expenses.reduce((sum, exp) => sum + paidSoFar(exp), 0);

    const fullyPaidCount = expenses.filter(exp => exp.paymentStatus === 'fully_paid' || exp.isPaid).length;
    const partiallyPaidCount = expenses.filter(exp => exp.paymentStatus === 'deposit_paid').length;
    const unpaidCount = expenses.filter(exp => exp.paymentStatus === 'unpaid' || (!exp.paymentStatus && !exp.isPaid && exp.paymentStatus !== 'deposit_paid')).length;

    // Overpayments: expenses where paid > quoted total
    const overpaidExpenses = expenses.filter(exp => exp.totalAmount && remainingBalance(exp) < 0);
    const totalOverpaid = overpaidExpenses.reduce((sum, exp) => sum + Math.abs(remainingBalance(exp)), 0);
    // For remaining balance summary, clamp at 0 so overpayments don't reduce the total
    const totalRemaining = expenses.reduce((sum, exp) => sum + Math.max(remainingBalance(exp), 0), 0);

    // ─── Chart Data — uses expenseValue (project cost, not just cash paid) ──
    const categoryData = expenses.reduce((acc, exp) => {
        const existing = acc.find(item => item.name === exp.category);
        const val = expenseValue(exp);
        if (existing) existing.value += val;
        else acc.push({ name: exp.category, value: val });
        return acc;
    }, []);

    const monthlyData = expenses.reduce((acc, exp) => {
        const monthYear = format(new Date(exp.date), 'MMM yyyy', { locale: language === 'el' ? elLocale : undefined });
        const existing = acc.find(item => item.name === monthYear);
        const val = expenseValue(exp);
        if (existing) existing.amount += val;
        else acc.push({ name: monthYear, amount: val });
        return acc;
    }, []).sort((a, b) => new Date(a.name) - new Date(b.name));

    // ─── Refs for scroll-to ───────────────────────────────────────────────────
    const outstandingRef = useRef(null);
    const overpaidRef = useRef(null);
    const filtersRef = useRef(null);

    const scrollAndFilter = (status) => {
        setFilters(f => ({ ...f, paymentStatus: status }));
        setTimeout(() => {
            const target = status === 'overpaid' ? overpaidRef.current : outstandingRef.current;
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    };

    // ─── Expenses with outstanding balance ────────────────────────────────────
    const outstandingExpenses = expenses.filter(exp => remainingBalance(exp) > 0);


    // ─── PDF Export ──────────────────────────────────────────────────────────
    const handleExportPDF = async () => {
        const locale = language === 'el' ? 'el-GR' : 'en-US';
        const dateLocale = language === 'el' ? elLocale : undefined;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${t('constructionExpenseReport')}</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px; background: #f8fafc; }
                    .container { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                    .action-buttons { position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 1000; }
                    .action-button { background: #3b82f6; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-weight: 500; }
                    .action-button:hover { background: #2563eb; }
                    .close-button { background: #ef4444; }
                    .close-button:hover { background: #dc2626; }
                    .report-header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                    .report-title { font-size: 28px; font-weight: bold; color: #1e293b; margin: 0 0 10px 0; }
                    .report-meta { color: #64748b; font-size: 14px; margin: 5px 0; }
                    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
                    .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
                    .summary-label { color: #475569; font-size: 13px; margin-bottom: 6px; }
                    .summary-value { font-weight: bold; color: #1e293b; font-size: 18px; }
                    .summary-sub { color: #64748b; font-size: 12px; margin-top: 4px; }
                    .section-title { font-size: 20px; font-weight: bold; color: #1e293b; margin: 30px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
                    .category-item { display: flex; justify-content: space-between; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; margin: 8px 0; border-radius: 6px; }
                    .category-name { font-weight: 500; color: #334155; }
                    .category-amount { color: #3b82f6; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                    th { background: #3b82f6; color: white; padding: 10px 6px; text-align: left; font-weight: 600; }
                    td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .amount-cell { text-align: right; font-weight: 500; color: #1e293b; }
                    .status-full { color: #16a34a; font-weight: 600; }
                    .status-partial { color: #d97706; font-weight: 600; }
                    .status-unpaid { color: #dc2626; font-weight: 600; }
                    @media print { .action-buttons { display: none; } }
                </style>
            </head>
            <body>
            <div class="action-buttons">
                <button class="action-button" onclick="window.print()">🖨️ Print</button>
                <button class="action-button close-button" onclick="window.close()">✕ Close</button>
            </div>
            <div class="container">
            <div class="report-header">
                <h1 class="report-title">${t('constructionExpenseReport')}</h1>
                <p class="report-meta">${currentProject?.name || ''} · ${t('generated')}: ${format(new Date(), 'PPP', { locale: dateLocale })}</p>
            </div>

            <div class="summary-grid">
                <div class="summary-box">
                    <div class="summary-label">Total Project Value</div>
                    <div class="summary-value">${currencySymbol}${totalProjectValue.toLocaleString(locale, { minimumFractionDigits: 2 })}</div>
                    <div class="summary-sub">${expenses.length} expenses</div>
                </div>
                <div class="summary-box">
                    <div class="summary-label">Paid So Far</div>
                    <div class="summary-value">${currencySymbol}${totalPaid.toLocaleString(locale, { minimumFractionDigits: 2 })}</div>
                    <div class="summary-sub">${fullyPaidCount} fully paid · ${partiallyPaidCount} partial</div>
                </div>
                <div class="summary-box" style="border-color: ${totalRemaining > 0 ? '#fecaca' : '#bbf7d0'};">
                    <div class="summary-label">Remaining Balance</div>
                    <div class="summary-value" style="color: ${totalRemaining > 0 ? '#b91c1c' : '#15803d'};">${currencySymbol}${totalRemaining.toLocaleString(locale, { minimumFractionDigits: 2 })}</div>
                    <div class="summary-sub">${unpaidCount} unpaid · ${outstandingExpenses.length} with balance due</div>
                </div>
            </div>

            <h2 class="section-title">${t('expensesByCategory')}</h2>
            ${categoryData.map(cat => {
                const pct = totalProjectValue > 0 ? ((cat.value / totalProjectValue) * 100).toFixed(1) : '0.0';
                return `<div class="category-item"><span class="category-name">${cat.name}</span><span class="category-amount">${currencySymbol}${cat.value.toLocaleString(locale, { minimumFractionDigits: 2 })} (${pct}%)</span></div>`;
            }).join('')}

            <h2 class="section-title">${t('expenseDetails')}</h2>
            <table>
                <thead>
                    <tr>
                        <th>${t('date')}</th>
                        <th>${t('description')}</th>
                        <th>${t('category')}</th>
                        <th>${t('vendor')}</th>
                        <th class="amount-cell">Quoted / Total</th>
                        <th class="amount-cell">Paid So Far</th>
                        <th class="amount-cell">Remaining</th>
                        <th>Status</th>
                        <th>${t('paidCash')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(exp => {
                        const label = paymentLabel(exp);
                        const statusClass = label === 'Fully Paid' ? 'status-full' : label === 'Partially Paid' ? 'status-partial' : 'status-unpaid';
                        return `
                        <tr>
                            <td>${format(new Date(exp.date), 'dd/MM/yyyy', { locale: dateLocale })}</td>
                            <td>${exp.description}</td>
                            <td>${exp.category}</td>
                            <td>${exp.vendor || '-'}</td>
                            <td class="amount-cell">${currencySymbol}${expenseValue(exp).toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                            <td class="amount-cell">${currencySymbol}${paidSoFar(exp).toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                            <td class="amount-cell" style="${remainingBalance(exp) < 0 ? 'color:#d97706;' : remainingBalance(exp) > 0 ? 'color:#b91c1c;' : ''}">${remainingBalance(exp) > 0 ? currencySymbol + remainingBalance(exp).toLocaleString(locale, { minimumFractionDigits: 2 }) : remainingBalance(exp) < 0 ? 'Overpayment ' + currencySymbol + Math.abs(remainingBalance(exp)).toLocaleString(locale, { minimumFractionDigits: 2 }) : '-'}</td>
                            <td class="${statusClass}">${label}</td>
                            <td>${exp.paidCash ? '✓' : '-'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>

            ${outstandingExpenses.length > 0 ? `
            <h2 class="section-title">Outstanding Balances</h2>
            <table>
                <thead>
                    <tr>
                        <th>${t('date')}</th>
                        <th>${t('description')}</th>
                        <th>${t('category')}</th>
                        <th>${t('vendor')}</th>
                        <th class="amount-cell">Quoted Total</th>
                        <th class="amount-cell">Paid So Far</th>
                        <th class="amount-cell">Remaining Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${outstandingExpenses.map(exp => `
                    <tr>
                        <td>${format(new Date(exp.date), 'dd/MM/yyyy', { locale: dateLocale })}</td>
                        <td>${exp.description}</td>
                        <td>${exp.category}</td>
                        <td>${exp.vendor || '-'}</td>
                        <td class="amount-cell">${currencySymbol}${expenseValue(exp).toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                        <td class="amount-cell">${currencySymbol}${paidSoFar(exp).toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                        <td class="amount-cell" style="color:#b91c1c; font-weight:bold;">${currencySymbol}${remainingBalance(exp).toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : ''}

            </div></body></html>`;

        const newWindow = window.open('', '_blank');
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    };

    // ─── CSV Export ──────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        const headers = [
            t('date'), t('description'), t('category'), t('vendor'),
            'Quoted/Total Amount', 'Paid So Far', 'Remaining Balance',
            'Payment Status', t('paidCash'), t('notes')
        ];
        const rows = expenses.map(exp => [
            format(new Date(exp.date), 'yyyy-MM-dd'),
            exp.description,
            exp.category,
            exp.vendor || '',
            expenseValue(exp).toFixed(2),
            paidSoFar(exp).toFixed(2),
            remainingBalance(exp).toFixed(2),
            paymentLabel(exp),
            exp.paidCash ? 'Yes' : 'No',
            exp.notes || '',
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

    if (authLoading || projectsLoading) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <div className="text-slate-600">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-full bg-slate-50">
                <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Authentication Required</h2>
                    <p className="text-slate-600 mb-6">You need to be logged in to view reports.</p>
                    <button onClick={() => base44.auth.redirectToLogin()} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Log In</button>
                </div>
            </div>
        );
    }

    if (projects.length === 0 || !currentProjectId) {
        return (
            <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
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
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('reportsAnalytics')}</h1>
                        <p className="text-slate-600 mt-1">{t('visualBreakdown')}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => refetchExpenses()} variant="outline" disabled={isFetching} title="Refresh data">
                            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
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

                {/* ── Summary KPIs ── */}
                <div className={`grid grid-cols-1 gap-4 mb-6 ${totalOverpaid > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                    <div className="bg-white rounded-lg shadow-sm p-5">
                        <p className="text-sm text-slate-500 mb-1">{t('totalProjectValue')}</p>
                        <p className="text-2xl font-bold text-slate-900">{CURRENCY_SYMBOLS[currentProject?.currency] || '€'}{totalProjectValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-slate-400 mt-1">{expenses.length} expenses (quoted/total amounts)</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-5">
                        <p className="text-sm text-slate-500 mb-1">{t('paidSoFar')}</p>
                        <p className="text-2xl font-bold text-green-700">{CURRENCY_SYMBOLS[currentProject?.currency] || '€'}{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-slate-400 mt-1">{fullyPaidCount} {t('fullyPaidDot')} · {partiallyPaidCount} {t('partialDot')}</p>
                    </div>
                    <div
                        className={`bg-white rounded-lg shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${totalRemaining > 0 ? 'border-l-4 border-red-400' : 'border-l-4 border-green-400'} ${filters.paymentStatus === 'outstanding' ? 'ring-2 ring-red-400' : ''}`}
                        onClick={() => filters.paymentStatus === 'outstanding' ? setFilters(f => ({...f, paymentStatus: 'all'})) : scrollAndFilter('outstanding')}
                        title="Click to filter by outstanding balances"
                    >
                        <p className="text-sm text-slate-500 mb-1">{t('remainingBalance')}</p>
                        <p className={`text-2xl font-bold ${totalRemaining > 0 ? 'text-red-700' : 'text-green-700'}`}>{CURRENCY_SYMBOLS[currentProject?.currency] || '€'}{totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-slate-400 mt-1">{outstandingExpenses.length} {t('expensesWithBalance')}</p>
                        {filters.paymentStatus === 'outstanding' && <p className="text-xs text-red-500 font-medium mt-1">● Filtering active — click to clear</p>}
                        {filters.paymentStatus !== 'outstanding' && totalRemaining > 0 && <p className="text-xs text-slate-400 mt-1">↓ Click to view details</p>}
                    </div>
                    {totalOverpaid > 0 && (
                        <div
                            className={`bg-white rounded-lg shadow-sm p-5 border-l-4 border-amber-400 cursor-pointer transition-all hover:shadow-md ${filters.paymentStatus === 'overpaid' ? 'ring-2 ring-amber-400' : ''}`}
                            onClick={() => filters.paymentStatus === 'overpaid' ? setFilters(f => ({...f, paymentStatus: 'all'})) : scrollAndFilter('overpaid')}
                            title="Click to filter by overpaid expenses"
                        >
                            <p className="text-sm text-slate-500 mb-1">{t('overpayment')}</p>
                            <p className="text-2xl font-bold text-amber-600">{CURRENCY_SYMBOLS[currentProject?.currency] || '€'}{totalOverpaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            <p className="text-xs text-slate-400 mt-1">{overpaidExpenses.length} overpaid expense{overpaidExpenses.length !== 1 ? 's' : ''}</p>
                            {filters.paymentStatus === 'overpaid' && <p className="text-xs text-amber-500 font-medium mt-1">● Filtering active — click to clear</p>}
                            {filters.paymentStatus !== 'overpaid' && <p className="text-xs text-slate-400 mt-1">↓ Click to view details</p>}
                        </div>
                    )}
                </div>

                {/* ── Filters ── */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold">{t('filters')}</h2>
                    </div>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search expenses..."
                                value={filters.search}
                                onChange={(e) => setFilters({...filters, search: e.target.value})}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('category')}</label>
                            <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                                <SelectTrigger><SelectValue placeholder={t('allCategories')} /></SelectTrigger>
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
                                <SelectTrigger><SelectValue placeholder={t('allVendors')} /></SelectTrigger>
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
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <Input type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} className="pl-10" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('endDate')}</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <Input type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} className="pl-10" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('paidStatus')}</label>
                            <Select value={filters.paymentStatus} onValueChange={(value) => setFilters({...filters, paymentStatus: value})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="all">{t('all')}</SelectItem>
                                   <SelectItem value="fully_paid">Fully Paid</SelectItem>
                                   <SelectItem value="deposit_paid">Partially Paid</SelectItem>
                                   <SelectItem value="unpaid">{t('unpaid')}</SelectItem>
                                   <SelectItem value="outstanding">Outstanding Balance</SelectItem>
                                   <SelectItem value="overpaid">Overpaid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('createdBy')}</label>
                            <Select value={filters.user} onValueChange={(value) => setFilters({...filters, user: value})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('all')}</SelectItem>
                                    {uniqueUsers.map(userEmail => (
                                        <SelectItem key={userEmail} value={userEmail}>{userEmail}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {(filters.category !== 'all' || filters.vendor !== 'all' || filters.startDate || filters.endDate || filters.search || filters.paymentStatus !== 'all' || filters.user !== 'all') && (
                        <div className="mt-4">
                            <Button variant="outline" size="sm" onClick={() => setFilters({ category: 'all', vendor: 'all', startDate: '', endDate: '', search: '', paymentStatus: 'all', user: 'all' })}>
                                {t('clearFilters')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* ── Charts ── */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <PieChart className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">{t('expensesByCategory')}</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">{t('projectValueNote')}</p>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={380}>
                                <RechartsPie>
                                    <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={90} dataKey="value">
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${currencySymbol}${value.toFixed(2)}`} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-12">{t('noDataAvailable')}</p>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">{t('monthlySpending')}</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">{t('projectValueByMonth')}</p>
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `${currencySymbol}${value.toFixed(2)}`} />
                                    <Bar dataKey="amount" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-12">{t('noDataAvailable')}</p>
                        )}
                    </div>
                </div>

                {/* ── Category Breakdown ── */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-1">{t('categoryBreakdown')}</h2>
                    <p className="text-xs text-slate-400 mb-4">{t('basedOnProjectValue')}</p>
                    <div className="space-y-3">
                        {categoryData.map((cat, index) => {
                            const percentage = totalProjectValue > 0 ? (cat.value / totalProjectValue) * 100 : 0;
                            const isSelected = filters.category === cat.name;
                            return (
                                <div
                                    key={cat.name}
                                    className={`cursor-pointer rounded-lg p-2 -mx-2 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    onClick={() => setFilters(f => ({ ...f, category: isSelected ? 'all' : cat.name }))}
                                >
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className={`font-medium ${isSelected ? 'text-blue-700' : ''}`}>{cat.name}</span>
                                        <span className="text-slate-600">
                                            {currencySymbol}{cat.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div className="h-2 rounded-full" style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Expense Details Table ── */}
                {expenses.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {filters.category !== 'all' ? `${filters.category} — ` : ''}{t('expenseDetails')} ({expenses.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('date')}</th>
                                        <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('description')}</th>
                                        <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('vendor')}</th>
                                        <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('category')}</th>
                                        <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('quotedTotalHeader')}</th>
                                        <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('paidSoFar')}</th>
                                        <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('remainingHeader')}</th>
                                        <th className="text-center py-2 px-2 font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(exp => {
                                        const label = paymentLabel(exp);
                                        const rem = remainingBalance(exp);
                                        return (
                                            <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-2 px-2 text-slate-600">
                                                    {format(new Date(exp.date), 'dd/MM/yyyy', { locale: language === 'el' ? elLocale : undefined })}
                                                </td>
                                                <td className="py-2 px-2 font-medium text-slate-900">{exp.description}</td>
                                                <td className="py-2 px-2 text-slate-600">{exp.vendor || '-'}</td>
                                                <td className="py-2 px-2">
                                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">{exp.category}</span>
                                                </td>
                                                <td className="py-2 px-2 text-right font-semibold text-slate-900">
                                                    {currencySymbol}{expenseValue(exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2 px-2 text-right text-green-700 font-medium">
                                                    {currencySymbol}{paidSoFar(exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2 px-2 text-right font-medium">
                                                    {rem > 0
                                                        ? <span className="text-red-600">{currencySymbol}{rem.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                        : rem < 0
                                                        ? <span className="text-amber-600 font-semibold">{t('overpayment')} {currencySymbol}{Math.abs(rem).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                        : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    {label === 'Fully Paid'
                                                        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium"><CheckCircle className="w-3 h-3" />Paid</span>
                                                        : label === 'Partially Paid'
                                                        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium"><Clock className="w-3 h-3" />Partial</span>
                                                        : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium"><XCircle className="w-3 h-3" />Unpaid</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Overpaid Expenses ── */}
                {overpaidExpenses.length > 0 && (
                    <div ref={overpaidRef} className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="w-5 h-5 text-amber-500" />
                            <h2 className="text-xl font-semibold">{t('overpayment')}</h2>
                        </div>
                        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex justify-between items-center">
                            <span className="text-sm font-medium text-amber-900">Total overpaid across {overpaidExpenses.length} expense{overpaidExpenses.length !== 1 ? 's' : ''}:</span>
                            <span className="text-xl font-bold text-amber-600">{currencySymbol}{totalOverpaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('date')}</th>
                                        <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('description')}</th>
                                        <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('vendor')}</th>
                                        <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('quotedTotal2')}</th>
                                        <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('paidSoFar')}</th>
                                        <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('overpayment')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overpaidExpenses.map(exp => (
                                        <tr key={exp.id} className="border-b border-slate-100 hover:bg-amber-50">
                                            <td className="py-3 px-2 text-slate-600">{format(new Date(exp.date), 'dd/MM/yyyy', { locale: language === 'el' ? elLocale : undefined })}</td>
                                            <td className="py-3 px-2 font-medium text-slate-900">{exp.description}</td>
                                            <td className="py-3 px-2 text-slate-600">{exp.vendor || '-'}</td>
                                            <td className="py-3 px-2 text-right font-semibold text-slate-900">{currencySymbol}{expenseValue(exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td className="py-3 px-2 text-right text-green-700 font-medium">{currencySymbol}{paidSoFar(exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td className="py-3 px-2 text-right font-bold text-amber-600">{currencySymbol}{Math.abs(remainingBalance(exp)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Outstanding Balances ── */}
                <div ref={outstandingRef} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <h2 className="text-xl font-semibold">{t('outstandingBalances')}</h2>
                    </div>
                    {outstandingExpenses.length > 0 ? (
                        <div className="space-y-2">
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-red-900">{t('totalRemainingBalance')}:</span>
                                    <span className="text-xl font-bold text-red-700">
                                        {currencySymbol}{totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="text-xs text-red-700 mt-1">
                                    {outstandingExpenses.length} {t('unpaidItems')}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('date')}</th>
                                            <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('description')}</th>
                                            <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('vendor')}</th>
                                            <th className="text-left py-2 px-2 font-semibold text-slate-700">{t('category')}</th>
                                            <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('quotedTotal2')}</th>
                                            <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('paidSoFar')}</th>
                                            <th className="text-right py-2 px-2 font-semibold text-slate-700">{t('remainingBalance2')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {outstandingExpenses.map(exp => (
                                            <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-2 text-slate-600">
                                                    {format(new Date(exp.date), 'dd/MM/yyyy', { locale: language === 'el' ? elLocale : undefined })}
                                                </td>
                                                <td className="py-3 px-2 font-medium text-slate-900">{exp.description}</td>
                                                <td className="py-3 px-2 text-slate-600">{exp.vendor || '-'}</td>
                                                <td className="py-3 px-2">
                                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">{exp.category}</span>
                                                </td>
                                                <td className="py-3 px-2 text-right font-semibold text-slate-900">
                                                    {currencySymbol}{expenseValue(exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-2 text-right text-green-700 font-medium">
                                                    {currencySymbol}{paidSoFar(exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-2 text-right font-bold text-red-700">
                                                    {currencySymbol}{remainingBalance(exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mb-3" />
                            <p className="text-slate-600 font-medium">{t('allExpensesPaid')}</p>
                            <p className="text-sm text-slate-500 mt-1">{t('noUnpaidExpenses')}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 mb-20 text-center text-sm text-slate-400">
                <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-blue-600 transition-colors">
                    Privacy Policy
                </Link>
            </div>
        </div>
    );
}