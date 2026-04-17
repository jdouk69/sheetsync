import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "../LanguageContext";
import { Image as ImageIcon, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PAYMENT_METHODS = [
    { value: "Bank Transfer", labelKey: "bankTransfer" },
    { value: "Credit Card", labelKey: "creditCard" },
    { value: "Cash", labelKey: "cash" },
    { value: "Check", labelKey: "check" },
    { value: "Deposit", labelKey: "deposit" },
    { value: "Other", labelKey: "other" },
];

export default function PaymentForm({ open, onClose, onSubmit, balanceDue, editPayment }) {
    const { t } = useLanguage();
    const [form, setForm] = useState({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        method: "Bank Transfer",
        referenceNumber: "",
        notes: "",
        photos: [],
    });
    const [uploading, setUploading] = useState(false);

    React.useEffect(() => {
        if (open) {
            if (editPayment) {
                setForm({
                    amount: String(editPayment.amount),
                    date: editPayment.date,
                    method: editPayment.method || "Bank Transfer",
                    referenceNumber: editPayment.referenceNumber || "",
                    notes: editPayment.notes || "",
                    photos: editPayment.photos || [],
                });
            } else {
                setForm({
                    amount: "",
                    date: new Date().toISOString().split("T")[0],
                    method: "Bank Transfer",
                    referenceNumber: "",
                    notes: "",
                    photos: [],
                });
            }
        }
    }, [open, editPayment]);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        setUploading(true);
        try {
            const results = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file })));
            const urls = results.map(r => r.file_url);
            setForm(prev => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index) => {
        setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...form, amount: parseFloat(form.amount) });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{editPayment ? t('editPayment') || 'Edit Payment' : t('recordPayment')}</DialogTitle>
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
                        <Select
                            value={form.method}
                            onValueChange={(value) => setForm({ ...form, method: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHODS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{t(m.labelKey)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('photos')} <span className="text-slate-400 font-normal">(receipts)</span></label>
                        <div className="space-y-2">
                            {form.photos?.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {form.photos.map((photo, index) => (
                                        <div key={index} className="relative group">
                                            <img src={photo} alt="Receipt" className="w-full h-20 object-cover rounded-lg" />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:border-blue-500 transition-colors">
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                        <span className="text-sm text-slate-600">{t('uploading')}</span>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600">{t('clickToUpload')}</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1">{t('cancel')}</Button>
                        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">{editPayment ? t('save') || 'Save' : t('recordPayment')}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}