import React from "react";
import { format } from "date-fns";
import { CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../LanguageContext";

export default function PaymentHistory({ payments, canDelete, onDelete }) {
    const { t } = useLanguage();
    if (!payments || payments.length === 0) return null;

    return (
        <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('paymentHistory')}</p>
            <div className="space-y-1.5">
                {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">€{payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-600">{format(new Date(payment.date), "dd MMM yyyy")}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-600">{payment.method}</span>
                            {payment.referenceNumber && (
                                <>
                                    <span className="text-slate-500">·</span>
                                    <span className="text-slate-500 text-xs">Ref: {payment.referenceNumber}</span>
                                </>
                            )}
                        </div>
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                onClick={(e) => { e.stopPropagation(); onDelete(payment); }}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}