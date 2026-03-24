import React from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CAD: 'CA$', CHF: 'Fr' };

export default function VendorPaymentReminder({ vendorName, projectExpenses, currency, onSelectExpense, onDismiss }) {
    if (!vendorName || !projectExpenses?.length) return null;

    const currencySymbol = CURRENCY_SYMBOLS[currency] || '€';
    const normalizedVendor = vendorName.trim().toLowerCase();

    const outstanding = projectExpenses.filter(exp => {
        if (!exp.vendor) return false;
        if (exp.vendor.trim().toLowerCase() !== normalizedVendor) return false;
        // Has a total amount with a remaining balance
        if (exp.totalAmount && exp.amount < exp.totalAmount && exp.paymentStatus !== 'fully_paid') return true;
        // Is deposit paid
        if (exp.paymentStatus === 'deposit_paid') return true;
        return false;
    });

    if (outstanding.length === 0) return null;

    return (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Outstanding balance for "{vendorName}"</p>
                        <p className="text-xs text-amber-700 mb-2">Would you like to record a payment on an existing expense?</p>
                        <div className="space-y-2">
                            {outstanding.map(exp => {
                                const balance = exp.totalAmount
                                    ? exp.totalAmount - (exp.depositAmount || exp.amount || 0)
                                    : null;
                                return (
                                    <div key={exp.id} className="flex items-center justify-between gap-3 bg-white rounded border border-amber-200 px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-800 truncate">{exp.description}</p>
                                            <p className="text-xs text-slate-500">
                                                {balance != null
                                                    ? `Balance due: ${currencySymbol}${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : `Total: ${currencySymbol}${(exp.totalAmount || exp.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                }
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="text-xs shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
                                            onClick={() => onSelectExpense(exp)}
                                        >
                                            Record Payment <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <button type="button" onClick={onDismiss} className="text-amber-500 hover:text-amber-700 shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}