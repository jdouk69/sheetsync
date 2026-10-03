import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Renders the report HTML in an off-screen iframe (so the browser draws Greek text and €
// exactly as on screen) and converts it into a multi-page landscape A4 PDF blob.
export async function reportHtmlToPdfBlob(html) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:1100px;height:900px;border:0;";
    document.body.appendChild(iframe);
    try {
        const doc = iframe.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
        doc.querySelector(".action-buttons")?.remove();
        doc.body.style.background = "#ffffff";
        doc.body.style.padding = "0";
        if (doc.fonts?.ready) await doc.fonts.ready;
        await new Promise((r) => setTimeout(r, 300));

        const el = doc.querySelector(".container");
        const w = 1000;
        const h = el.scrollHeight;
        iframe.style.height = `${h + 100}px`;
        // Keep the canvas under iOS Safari's maximum canvas size.
        const scale = Math.min(2, Math.sqrt(12000000 / (w * h)));
        const canvas = await html2canvas(el, { scale, backgroundColor: "#ffffff", windowWidth: 1100 });

        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const margin = 8;
        const imgW = pdf.internal.pageSize.getWidth() - margin * 2;
        const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
        const slicePx = Math.floor((pageH / imgW) * canvas.width);

        for (let y = 0, page = 0; y < canvas.height; y += slicePx, page++) {
            const sliceH = Math.min(slicePx, canvas.height - y);
            const slice = document.createElement("canvas");
            slice.width = canvas.width;
            slice.height = sliceH;
            slice.getContext("2d").drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            if (page > 0) pdf.addPage();
            pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, (sliceH / canvas.width) * imgW);
        }
        return pdf.output("blob");
    } finally {
        document.body.removeChild(iframe);
    }
}