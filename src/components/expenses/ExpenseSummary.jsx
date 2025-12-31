import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Euro, TrendingUp, Package, Calendar } from "lucide-react";

export default function ExpenseSummary({ expenses }) {
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
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Euro className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Συνολικό Ποσό</p>
                            <p className="text-2xl font-bold text-slate-900">
                                €{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Package className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Συνολικά Έξοδα</p>
                            <p className="text-2xl font-bold text-slate-900">{totalExpenses}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Κύρια Κατηγορία</p>
                            <p className="text-lg font-bold text-slate-900">
                                {topCategory ? topCategory[0] : 'Μ/Δ'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Αυτόν τον Μήνα</p>
                            <p className="text-2xl font-bold text-slate-900">
                                €{monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}