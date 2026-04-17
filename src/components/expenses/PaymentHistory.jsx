import React, { useState } from "react";
import { format } from "date-fns";
import { CreditCard, Trash2, Pencil, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "../LanguageContext";

const METHOD_KEYS = {
    "Bank Transfer": "bankTransfer",
    "Credit Card": "creditCard",
    "Cash": "cash",
    "Check": "check",
    "Deposit": "deposit",
    "Other": "other",
};

export default function PaymentHistory({ payments, canDelete, onDelete, onEdit, currencySymbol = '€' }) {
    const { t } = useLanguage();
    const [viewingPhotos, setViewingPhotos] = useState(null);
    if (!payments || payments.length === 0) return null;

    return (
        <>
        <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('paymentHistory')}</p>
            <div className="space-y-1.5">
                {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">{currencySymbol}{payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-600">{format(new Date(payment.date + 'T00:00:00'), "dd MMM yyyy")}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-600">{t(METHOD_KEYS[payment.method] || 'other')}</span>
                            {payment.referenceNumber && (
                                <>
                                    <span className="text-slate-500">·</span>
                                    <span className="text-slate-500 text-xs">{t('ref')}: {payment.referenceNumber}</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {payment.photos?.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                                    onClick={(e) => { e.stopPropagation(); setViewingPhotos(payment.photos); }}
                                    title="View receipts"
                                >
                                    <ImageIcon className="w-3 h-3" />
                                </Button>
                            )}
                            {canDelete && (
                                <>
                                    {onEdit && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                                            onClick={(e) => { e.stopPropagation(); onEdit(payment); }}
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                                        onClick={(e) => { e.stopPropagation(); onDelete(payment); }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <Dialog open={!!viewingPhotos} onOpenChange={() => setViewingPhotos(null)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('paymentReceipts')}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-auto">
                    {viewingPhotos?.map((photo, i) => (
                        <img key={i} src={photo} alt={`Receipt ${i + 1}`} className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90" onClick={() => window.open(photo, '_blank')} />
                    ))}
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}