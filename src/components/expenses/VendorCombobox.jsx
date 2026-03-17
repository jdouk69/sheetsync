import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageContext";

export default function VendorCombobox({ value, onChange, existingVendors }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

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

    const modal = open ? createPortal(
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
            }}
            onClick={handleClose}
        >
            <div
                style={{
                    backgroundColor: '#fff', borderRadius: '16px 16px 0 0',
                    maxHeight: '70vh', display: 'flex', flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', borderBottom:'1px solid #e5e7eb'}}>
                    <span style={{fontWeight:600, fontSize:'16px'}}>{t('vendor')}</span>
                    <button type="button" onClick={handleClose} style={{padding:'4px'}}>
                        <X size={20} color="#6b7280" />
                    </button>
                </div>
                <div style={{padding:'12px', borderBottom:'1px solid #e5e7eb'}}>
                    <input
                        type="text"
                        placeholder={t('vendorPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width:'100%', padding:'10px 12px', fontSize:'16px',
                            border:'1px solid #d1d5db', borderRadius:'8px', outline:'none',
                            backgroundColor:'#fff'
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                    />
                </div>
                <div style={{overflowY:'auto', flex:1, paddingBottom:'24px'}}>
                    {search.trim() && (
                        <button
                            type="button"
                            style={{width:'100%', textAlign:'left', padding:'14px 16px', fontSize:'14px', color:'#2563eb', borderBottom:'1px solid #f3f4f6', background:'none'}}
                            onClick={() => handleSelect(search.trim())}
                        >
                            Add "{search.trim()}"
                        </button>
                    )}
                    {filtered.length === 0 && !search.trim() && (
                        <p style={{padding:'16px', textAlign:'center', fontSize:'14px', color:'#9ca3af'}}>No vendors yet</p>
                    )}
                    {filtered.map((vendor) => (
                        <button
                            type="button"
                            key={vendor}
                            style={{width:'100%', textAlign:'left', padding:'14px 16px', fontSize:'15px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:'8px', background:'none'}}
                            onClick={() => handleSelect(vendor)}
                        >
                            <Check size={16} color="#2563eb" style={{opacity: value === vendor ? 1 : 0, flexShrink:0}} />
                            {vendor}
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    ) : null;

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
            {modal}
        </>
    );
}