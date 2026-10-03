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

        // Safe break points (canvas px): after each row/box, and before each section heading,
        // so a page never cuts through a table row or separates a heading from its content.
        const top = el.getBoundingClientRect().top;
        const breaks = [];
        el.querySelectorAll("tr, .category-item, .report-header, .summary-grid").forEach((n) => {
            breaks.push(Math.round((n.getBoundingClientRect().bottom - top) * scale));
        });
        el.querySelectorAll("h2").forEach((n) => {
            breaks.push(Math.round((n.getBoundingClientRect().top - top) * scale));
        });
        breaks.sort((a, b) => a - b);

        let y = 0;
        for (let page = 0; y < canvas.height - 1; page++) {
            const limit = y + slicePx;
            let end = limit;
            if (limit < canvas.height) {
                const fit = breaks.filter((b) => b <= limit && b > y + slicePx * 0.3);
                if (fit.length) end = fit[fit.length - 1];
            } else {
                end = canvas.height;
            }
            const sliceH = end - y;
            const slice = document.createElement("canvas");
            slice.width = canvas.width;
            slice.height = sliceH;
            slice.getContext("2d").drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            if (page > 0) pdf.addPage();
            pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, (sliceH / canvas.width) * imgW);
            y = end;
        }
        return pdf.output("blob");
    } finally {
        document.body.removeChild(iframe);
    }
}