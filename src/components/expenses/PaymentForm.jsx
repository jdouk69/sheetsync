import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "../LanguageContext";

const PAYMENT_METHODS = ["Bank Transfer", "Credit Card", "Cash", "Check", "Other"];

export default function PaymentForm({ open, onClose, onSubmit, balanceDue }) {
    const [form, setForm] = useState({
        amount: balanceDue || "",
        date: new Date().toISOString().split("T")[0],
        method: "Bank Transfer",
        referenceNumber: "",
        notes: "",
    });

    React.useEffect(() => {
        if (open) {
            setForm({
                amount: balanceDue || "",
                date: new Date().toISOString().split("T")[0],
                method: "Bank Transfer",
                referenceNumber: "",
                notes: "",
            });
        }
    }, [open, balanceDue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...form, amount: parseFloat(form.amount) });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount (€) *</label>
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
                            <p className="text-xs text-slate-500 mt-1">Balance due: €{balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                        <Input
                            required
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                        <Input
                            value={form.referenceNumber}
                            onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                            placeholder="Transaction ID, check number, etc."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <Input
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Optional notes"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Record Payment</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}