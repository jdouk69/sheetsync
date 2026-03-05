import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "../LanguageContext";

const PAYMENT_METHODS = ["Bank Transfer", "Credit Card", "Cash", "Check", "Other"];

export default function PaymentForm({ open, onClose, onSubmit, balanceDue }) {
    const { t } = useLanguage();
    const [form, setForm] = useState({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        method: "Bank Transfer",
        referenceNumber: "",
        notes: "",
    });

    React.useEffect(() => {
        if (open) {
            setForm({
                amount: "",
                date: new Date().toISOString().split("T")[0],
                method: "Bank Transfer",
                referenceNumber: "",
                notes: "",
            });
        }
    }, [open]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...form, amount: parseFloat(form.amount) });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('recordPayment')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('paymentAmount')} *</label>
                        <Input
                            required
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            placeholder="0.00"
                        />
                        {balanceDue > 0 && (
                            <p className="text-xs text-slate-500 mt-1">{t('balanceDue')}: €{balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('paymentDate')} *</label>
                        <Input
                            required
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('paymentMethod')} *</label>
                        <select
                            value={form.method}
                            onChange={(e) => setForm({ ...form, method: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                            {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('referenceNumber')}</label>
                        <Input
                            value={form.referenceNumber}
                            onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                            placeholder={t('referenceNumberPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('paymentNotes')}</label>
                        <Input
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder={t('notesPlaceholder')}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">{t('cancel')}</Button>
                        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">{t('recordPayment')}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}