import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";

export default function ExpenseFilters({ filters, onFiltersChange, availableCategories = [] }) {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select
                    value={filters.category}
                    onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
                >
                    <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableCategories.sort().map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2 flex-1">
                <div className="flex-1">
                    <Input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                        placeholder="Start Date"
                    />
                </div>
                <div className="flex-1">
                    <Input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                        placeholder="End Date"
                    />
                </div>
            </div>
        </div>
    );
}