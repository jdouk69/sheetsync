import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// Shown after the PDF is generated. The buttons give a fresh tap (user gesture),
// which iOS requires for opening/sharing files.
export default function PdfReadyDialog({ blob, fileName, language, onClose }) {
    const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
    const el = language === 'el';

    const handleShare = async () => {
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: fileName });
            } catch (e) {
                if (e.name !== "AbortError") toast.error(el ? "Η κοινοποίηση απέτυχε." : "Sharing failed. Try Open PDF instead.");
            }
        } else {
            toast.error(el ? "Η κοινοποίηση δεν υποστηρίζεται. Χρησιμοποιήστε το Άνοιγμα PDF." : "Sharing isn't supported here. Use Open PDF instead.");
        }
    };

    return (
        <Dialog open={!!blob} onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{el ? "Το PDF είναι έτοιμο" : "Your PDF is ready"}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">
                    {el ? "Ανοίξτε το PDF ή κοινοποιήστε το για αποθήκευση στα Αρχεία ή εκτύπωση." : "Open the PDF, or share it to save to Files or print."}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                        <a href={url} target="_blank" rel="noreferrer" download={fileName}>
                            <ExternalLink className="w-4 h-4 mr-2" />{el ? "Άνοιγμα PDF" : "Open PDF"}
                        </a>
                    </Button>
                    <Button variant="outline" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />{el ? "Κοινοποίηση / Αποθήκευση" : "Share / Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}