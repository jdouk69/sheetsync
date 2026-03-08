import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Euro, TrendingUp, Package, Calendar } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { useProject } from "../ProjectContext";

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CAD: 'CA$', CHF: 'Fr' };

export default function ExpenseSummary({ expenses }) {
    const { t } = useLanguage();
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalExpenses = expenses.length;
    
    const categoryTotals = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
    }, {});
    
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    const thisMonth = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        const now = new Date();
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    });
    const monthlyTotal = thisMonth.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                            <Euro className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-600">{t('totalSpent')}</p>
                            <p className="text-2xl font-bold text-slate-900 break-words">
                                €{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg shrink-0">
                            <Package className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-600">{t('totalExpenses')}</p>
                            <p className="text-2xl font-bold text-slate-900">{totalExpenses}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-600">{t('topCategory')}</p>
                            <p className="text-lg font-bold text-slate-900 break-words">
                                {topCategory ? topCategory[0] : t('na')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                            <Calendar className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-600">{t('thisMonth')}</p>
                            <p className="text-2xl font-bold text-slate-900 break-words">
                                €{monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}