import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export default function VendorCombobox({ value, onChange, existingVendors }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const vendors = [...new Set(existingVendors.filter(Boolean))].sort();

    const handleSelect = (vendor) => {
        onChange(vendor);
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
                    className="w-full justify-between font-normal"
                >
                    <span className={cn("truncate", !value && "text-muted-foreground")}>
                        {value || t('vendorPlaceholder')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput
                        placeholder={t('vendorPlaceholder')}
                        value={search}
                        onValueChange={setSearch}
                        onKeyDown={handleKeyDown}
                    />
                    <CommandEmpty>
                        <div className="p-2 text-sm text-slate-500">
                            Press Enter to add "{search}"
                        </div>
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {vendors
                            .filter(v => v.toLowerCase().includes(search.toLowerCase()))
                            .map((vendor) => (
                                <CommandItem
                                    key={vendor}
                                    value={vendor}
                                    onSelect={() => handleSelect(vendor)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === vendor ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {vendor}
                                </CommandItem>
                            ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}