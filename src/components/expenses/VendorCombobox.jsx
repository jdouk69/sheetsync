import React, { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && search.trim()) {
            e.preventDefault();
            onChange(search.trim());
            setOpen(false);
            setSearch("");
        }
    };

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
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
                </DrawerTrigger>
                <DrawerContent className="p-0 max-h-[70vh]">
                    <div className="flex flex-col h-full">
                        <div className="p-3 border-b">
                            <input
                                type="text"
                                placeholder={t('vendorPlaceholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full px-3 py-2 border border-input rounded-md text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
                                autoFocus
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                            />
                        </div>
                        <div className="overflow-y-auto flex-1 pb-8">
                            {search.trim() && (
                                <button
                                    className="w-full text-left px-4 py-3 text-sm text-blue-600 border-b border-border hover:bg-accent"
                                    onTouchEnd={(e) => { e.preventDefault(); handleSelect(search.trim()); }}
                                    onClick={() => handleSelect(search.trim())}
                                >
                                    Add "{search.trim()}"
                                </button>
                            )}
                            {filtered.length === 0 && !search.trim() && (
                                <p className="p-4 text-sm text-muted-foreground text-center">No vendors yet</p>
                            )}
                            {filtered.map((vendor) => (
                                <button
                                    key={vendor}
                                    className="w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 flex items-center gap-2 hover:bg-accent active:bg-accent"
                                    onTouchEnd={(e) => { e.preventDefault(); handleSelect(vendor); }}
                                    onClick={() => handleSelect(vendor)}
                                >
                                    <Check className={cn("h-4 w-4 shrink-0", value === vendor ? "opacity-100 text-blue-600" : "opacity-0")} />
                                    {vendor}
                                </button>
                            ))}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
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