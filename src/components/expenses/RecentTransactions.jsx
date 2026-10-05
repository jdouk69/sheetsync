import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { el as elLocale } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { EXPENSE_KEYS } from "@/lib/expenseCache";

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', CAD: 'CA$', CHF: 'Fr' };

// Payment.date is a plain YYYY-MM-DD string; parse it as a local date to avoid timezone shifts.
const parseDate = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};

export default function RecentTransactions({ open, onClose, expenses, projectId, currency }) {
    const { language } = useLanguage();
    const el = language === 'el';
    const symbol = CURRENCY_SYMBOLS[currency] || '€';

    // Same shared payment cache as Reports, so it refreshes with every payment change.
    const { data: payments = [], isLoading } = useQuery({
        queryKey: EXPENSE_KEYS.reportPayments(projectId),
        queryFn: () => base44.entities.Payment.list('-date', 9999),
        enabled: open && !!projectId,
        staleTime: 0,
    });

    const rows = useMemo(() => {
        const byId = new Map(expenses.map(e => [e.id, e]));
        return payments
            .filter(p => byId.has(p.expenseId) && p.date)
            .map(p => ({ payment: p, expense: byId.get(p.expenseId) }))
            .sort((a, b) =>
                parseDate(b.payment.date) - parseDate(a.payment.date) ||
                new Date(b.payment.created_date || 0) - new Date(a.payment.created_date || 0));
    }, [payments, expenses]);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg w-[calc(100%-1rem)] max-h-[85vh] flex flex-col p-4">
                <DialogHeader>
                    <DialogTitle>{el ? "Πρόσφατες Συναλλαγές" : "Recent Transactions"}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
                    {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">{el ? "Φόρτωση..." : "Loading..."}</p>}
                    {!isLoading && rows.length === 0 && (
                        <p className="text-sm text-muted-foreground py-6 text-center">{el ? "Δεν υπάρχουν συναλλαγές" : "No transactions yet"}</p>
                    )}
                    {rows.map(({ payment: p, expense: e }) => (
                        <div key={p.id} className="border border-border rounded-lg p-3 bg-card">
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{e.vendor || e.description}</p>
                                    {e.vendor && <p className="text-sm text-muted-foreground truncate">{e.description}</p>}
                                </div>
                                <p className="font-bold text-foreground whitespace-nowrap">
                                    {symbol}{(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {format(parseDate(p.date), 'MMM d, yyyy', { locale: el ? elLocale : undefined })} · {p.method}
                            </p>
                        </div>
                    ))}
                </div>
                <Button variant="outline" onClick={onClose} className="w-full justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    {el ? "Πίσω" : "Back"}
                </Button>
            </DialogContent>
        </Dialog>
    );
}