import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Package, Calendar, DollarSign } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { useProject } from "../ProjectContext";

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CAD: 'CA$', CHF: 'Fr' };

export default function ExpenseSummary({ expenses }) {
    const { t } = useLanguage();
    const { currentProject } = useProject();
    const currencySymbol = CURRENCY_SYMBOLS[currentProject?.currency] || '€';
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
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg shrink-0">
                                    <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-muted-foreground">{t('totalSpent')}</p>
                                    <p className="text-2xl font-bold text-foreground break-words">
                                        {currencySymbol}{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg shrink-0">
                            <Package className="w-6 h-6 text-green-600 dark:text-green-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-muted-foreground">{t('totalExpenses')}</p>
                            <p className="text-2xl font-bold text-foreground">{totalExpenses}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg shrink-0">
                            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-muted-foreground">{t('topCategory')}</p>
                            <p className="text-lg font-bold text-foreground break-words">
                                {topCategory ? topCategory[0] : t('na')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg shrink-0">
                            <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-muted-foreground">{t('thisMonth')}</p>
                            <p className="text-2xl font-bold text-foreground break-words">
                                {currencySymbol}{monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}