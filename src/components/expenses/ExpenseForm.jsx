import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import CategoryCombobox from "./CategoryCombobox";
import { format } from "date-fns";
import { useLanguage } from "../LanguageContext";

export default function ExpenseForm({ expense, onSubmit, onCancel }) {
    const { t } = useLanguage();
    const { data: allExpenses = [] } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => base44.entities.Expense.list(),
    });

    const existingCategories = [...new Set(allExpenses.map(exp => exp.category).filter(Boolean))];
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        category: "Materials",
        date: new Date().toISOString().split('T')[0],
        vendor: "",
        photos: [],
        notes: ""
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (expense) {
            // Format date to yyyy-MM-dd for date input
            let dateValue = new Date().toISOString().split('T')[0];
            if (expense.date) {
                try {
                    dateValue = format(new Date(expense.date), 'yyyy-MM-dd');
                } catch (e) {
                    console.error('Date formatting error:', e);
                }
            }
            
            setFormData({
                description: expense.description || "",
                amount: expense.amount || "",
                category: expense.category || "Materials",
                date: dateValue,
                vendor: expense.vendor || "",
                photos: expense.photos || [],
                notes: expense.notes || ""
            });
        } else {
            setFormData({
                description: "",
                amount: "",
                category: "Materials",
                date: new Date().toISOString().split('T')[0],
                vendor: "",
                photos: [],
                notes: ""
            });
        }
    }, [expense]);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        setUploading(true);

        try {
            const uploadPromises = files.map(file => 
                base44.integrations.Core.UploadFile({ file })
            );
            const results = await Promise.all(uploadPromises);
            const fileUrls = results.map(r => r.file_url);
            
            setFormData(prev => ({
                ...prev,
                photos: [...(prev.photos || []), ...fileUrls]
            }));
        } catch (error) {
            alert('Failed to upload photos: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
                {expense ? t('editExpense') : t('addNewExpense')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('vendor')}
                        </label>
                        <Input
                            value={formData.vendor}
                            onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                            placeholder={t('vendorPlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('amount')} *
                        </label>
                        <Input
                            required
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('category')} *
                        </label>
                        <CategoryCombobox
                            value={formData.category}
                            onChange={(value) => setFormData({...formData, category: value})}
                            existingCategories={existingCategories}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t('date')} *
                        </label>
                        <Input
                            required
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('description')} *
                    </label>
                    <Textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder={t('descriptionPlaceholder')}
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('notes')}
                    </label>
                    <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder={t('notesPlaceholder')}
                        rows={3}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('photos')}
                    </label>
                    <div className="space-y-3">
                        {formData.photos?.length > 0 && (
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photo}
                                            alt="Expense"
                                            className="w-full h-20 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <span className="text-sm text-slate-600">{t('uploading')}</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-slate-600">{t('clickToUpload')}</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                        {t('cancel')}
                    </Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                        {expense ? t('update') : t('add')} {t('expense')}
                    </Button>
                </div>
            </form>
        </div>
    );
}