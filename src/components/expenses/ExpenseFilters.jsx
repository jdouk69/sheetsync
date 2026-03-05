import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, Search } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function ExpenseFilters({ filters, onFiltersChange, availableCategories = [], availableVendors = [] }) {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                    type="checkbox"
                    checked={filters.unpaidOnly || false}
                    onChange={(e) => onFiltersChange({ ...filters, unpaidOnly: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                />
                <span className="text-sm font-medium text-slate-700">Show Unpaid Only</span>
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    type="text"
                    placeholder={t('searchExpenses')}
                    value={filters.search || ''}
                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                    className="pl-10"
                />
            </div>
            <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select
                    value={filters.category}
                    onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
                >
                    <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder={t('allCategories')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('allCategories')}</SelectItem>
                        {availableCategories.sort().map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>

                <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select
                    value={filters.vendor || "all"}
                    onValueChange={(value) => onFiltersChange({ ...filters, vendor: value })}
                >
                    <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {availableVendors.sort().map(vendor => (
                            <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>

                <div className="flex gap-2 flex-1">
                <div className="flex-1">
                    <label className="block text-xs text-slate-600 mb-1">{t('startDate')}</label>
                    <Input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-slate-600 mb-1">{t('endDate')}</label>
                    <Input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                    />
                </div>
            </div>
            </div>
        </div>
    );
}