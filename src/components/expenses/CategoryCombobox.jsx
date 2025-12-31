import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CategoryCombobox({ value, onChange, existingCategories }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const suggestedCategories = [
        "Υλικά",
        "Εργασία", 
        "Εξοπλισμός",
        "Άδειες",
        "Επαγγελματικές Υπηρεσίες",
        "Υπηρεσίες Κοινής Ωφέλειας",
        "Ηλεκτρολόγος",
        "Υδραυλικός",
        "Ξυλουργός",
        "Σκυρόδεμα",
        "Άλλο"
    ];

    const allCategories = [...new Set([...existingCategories, ...suggestedCategories])].sort();

    const handleSelect = (category) => {
        onChange(category);
        setOpen(false);
        setSearch("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && search.trim()) {
            e.preventDefault();
            onChange(search.trim());
            setOpen(false);
            setSearch("");
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value || "Επιλέξτε ή πληκτρολογήστε κατηγορία..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput 
                        placeholder="Αναζήτηση ή πληκτρολόγηση νέας κατηγορίας..." 
                        value={search}
                        onValueChange={setSearch}
                        onKeyDown={handleKeyDown}
                    />
                    <CommandEmpty>
                        <div className="p-2 text-sm">
                            Πατήστε <kbd className="px-1 py-0.5 bg-slate-100 rounded">Enter</kbd> για να προσθέσετε "{search}"
                        </div>
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {allCategories
                            .filter(cat => cat.toLowerCase().includes(search.toLowerCase()))
                            .map((category) => (
                                <CommandItem
                                    key={category}
                                    value={category}
                                    onSelect={() => handleSelect(category)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === category ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {category}
                                </CommandItem>
                            ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}