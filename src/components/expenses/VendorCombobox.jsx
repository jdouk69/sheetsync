import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export default function VendorCombobox({ value, onChange, existingVendors }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const isMobile = window.innerWidth < 768;

    const vendors = [...new Set(existingVendors.filter(Boolean))].sort();
    const filtered = vendors.filter(v => v.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = (vendor) => {
        onChange(vendor);
        setOpen(false);
        setSearch("");
    };

    const handleClose = () => {
        setOpen(false);
        setSearch("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && search.trim()) {
            e.preventDefault();
            handleSelect(search.trim());
        }
    };

    if (isMobile) {
        return (
            <>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                    onClick={() => setOpen(true)}
                >
                    <span className={cn("truncate", !value && "text-muted-foreground")}>
                        {value || t('vendorPlaceholder')}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {open && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                        <div className="bg-white rounded-t-2xl flex flex-col" style={{maxHeight: '70vh'}}>
                            <div className="flex items-center justify-between p-4 border-b">
                                <span className="font-semibold text-base">{t('vendor')}</span>
                                <button type="button" onClick={handleClose} className="p-1">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-3 border-b">
                                <input
                                    type="text"
                                    placeholder={t('vendorPlaceholder')}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base outline-none bg-white"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck="false"
                                />
                            </div>
                            <div className="overflow-y-auto flex-1 pb-6">
                                {search.trim() && (
                                    <button
                                        type="button"
                                        className="w-full text-left px-4 py-4 text-sm text-blue-600 border-b border-gray-100 active:bg-gray-100"
                                        onClick={() => handleSelect(search.trim())}
                                    >
                                        Add "{search.trim()}"
                                    </button>
                                )}
                                {filtered.length === 0 && !search.trim() && (
                                    <p className="p-4 text-sm text-gray-400 text-center">No vendors yet</p>
                                )}
                                {filtered.map((vendor) => (
                                    <button
                                        type="button"
                                        key={vendor}
                                        className="w-full text-left px-4 py-4 text-sm border-b border-gray-100 flex items-center gap-2 active:bg-gray-100"
                                        onClick={() => handleSelect(vendor)}
                                    >
                                        <Check className={cn("h-4 w-4 shrink-0 text-blue-600", value === vendor ? "opacity-100" : "opacity-0")} />
                                        {vendor}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

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
                        <div className="p-2 text-sm text-muted-foreground">Press Enter to add "{search}"</div>
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {vendors.filter(v => v.toLowerCase().includes(search.toLowerCase())).map((vendor) => (
                            <CommandItem key={vendor} value={vendor} onSelect={() => handleSelect(vendor)}>
                                <Check className={cn("mr-2 h-4 w-4", value === vendor ? "opacity-100" : "opacity-0")} />
                                {vendor}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}