import { jsPDF } from "jspdf";
import { ENGAGEMENT_LETTER_TEXT } from "@/lib/constants";

/**
 * Generates a PDF for the engagement letter with the client's signature.
 * Handles text wrapping and pagination automatically.
 *
 * @param clientName The full name of the client
 * @param signatureDataUrl The base64 data URL of the signature image
 * @returns The base64 string of the generated PDF (without data:application/pdf;base64, prefix)
 */
export const generateEngagementLetterPDF = (clientName: string, signatureDataUrl: string): string => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ENGAGEMENT LETTER AND CONSENT FOR SERVICES", margin, 30);

    // Client Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Client: ${clientName}`, margin, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 52);

    // Content Body
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(ENGAGEMENT_LETTER_TEXT, contentWidth);

    let cursorY = 65;
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 5; // approx 5mm line height for 10pt font with spacing

    // Print text line by line, adding pages as needed
    for (let i = 0; i < splitText.length; i++) {
        if (cursorY + lineHeight > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
        }
        doc.text(splitText[i], margin, cursorY);
        cursorY += lineHeight;
    }

    // Signature Section
    // Add spacing before signature
    let signatureY = cursorY + 20;

    // Check if signature block fits (approx 60mm needed)
    if (signatureY + 60 > pageHeight - margin) {
        doc.addPage();
        signatureY = margin;
    }

    doc.line(margin, signatureY, pageWidth - margin, signatureY);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT SIGNATURE", margin, signatureY + 10);

    // Embed signature image
    doc.addImage(signatureDataUrl, 'PNG', margin, signatureY + 15, 60, 25);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Digitally signed by ${clientName} on ${new Date().toLocaleString()}`, margin, signatureY + 45);

    // Return base64 string
    return doc.output('datauristring').split(',')[1];
};
