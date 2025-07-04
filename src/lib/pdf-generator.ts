
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Paper, PaperQuestion, Settings } from '@/types';

export const generatePdf = async (paper: Paper, questions: PaperQuestion[], settings: Settings): Promise<void> => {
    // 1. Create an off-screen element to render the HTML content
    const reportElement = document.createElement('div');
    reportElement.style.position = 'absolute';
    reportElement.style.left = '-9999px';
    // Use a fixed pixel width that corresponds to A4 content area for consistent rendering
    reportElement.style.width = '800px'; 
    reportElement.style.padding = '20px'; // Internal padding
    reportElement.style.boxSizing = 'border-box';
    reportElement.style.fontFamily = 'Helvetica, Arial, sans-serif';
    reportElement.style.color = '#000';
    reportElement.style.backgroundColor = '#fff';

    // 2. Build the HTML string with all the paper content
    let contentHtml = `
        <h1 style="font-size: 24pt; margin-bottom: 8px;">${paper.title}</h1>
        <p style="font-size: 12pt; color: #555; margin-bottom: 24px;">${paper.description}</p>
        <hr style="border-top: 1px solid #ddd; margin: 24px 0;" />
    `;

    questions.forEach(q => {
        // Sanitize and format text to ensure it wraps correctly
        const questionText = q.questionText.replace(/\n/g, '<br />');
        const explanationText = q.explanation ? q.explanation.replace(/\n/g, '<br />') : '';
        
        contentHtml += `
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 12px;">Question ${q.order}</h2>
                <p style="font-size: 12pt; margin-bottom: 12px; word-wrap: break-word;">${questionText}</p>
        `;
        
        if (q.type === 'mcq' && q.options) {
            contentHtml += `<div style="margin-left: 20px;">`;
            q.options.forEach(opt => {
                const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt;
                contentHtml += `<p style="font-size: 11pt; margin: 4px 0; ${isCorrect ? 'font-weight: bold; color: #28a745;' : ''}">${isCorrect ? '✔' : '•'} ${opt}</p>`;
            });
            contentHtml += `</div>`;
        } else if (q.type === 'short_answer') {
            contentHtml += `<p style="font-size: 11pt; color: #28a745; margin-left: 20px;"><strong>Correct Answer:</strong> ${q.correctAnswer}</p>`;
        }
        
        if (explanationText) {
            contentHtml += `<p style="font-size: 11pt; color: #666; margin-left: 20px; margin-top: 8px; border-left: 2px solid #eee; padding-left: 8px; white-space: pre-wrap; word-wrap: break-word;"><strong>Explanation:</strong> ${explanationText}</p>`;
        }
        
        contentHtml += '</div>';
    });

    reportElement.innerHTML = contentHtml;
    document.body.appendChild(reportElement);

    // 3. Render the HTML to a canvas
    const canvas = await html2canvas(reportElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight
    });

    document.body.removeChild(reportElement);
    
    const imgData = canvas.toDataURL('image/png');

    // 4. Create the PDF and add the rendered content as an image
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Define margins: 1 inch for top/bottom, 20mm for left/right
    const topMargin = 25.4;
    const bottomMargin = 25.4;
    const leftMargin = 20;
    const rightMargin = 20;

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pdfWidth - leftMargin - rightMargin;
    const pageContentHeight = pdfHeight - topMargin - bottomMargin;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasHeight / canvasWidth;

    const totalImgHeight = contentWidth * ratio;

    let heightLeft = totalImgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', leftMargin, position + topMargin, contentWidth, totalImgHeight);
    heightLeft -= pageContentHeight;

    // Add subsequent pages if content overflows
    while (heightLeft > 0) {
        position -= pageContentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', leftMargin, position + topMargin, contentWidth, totalImgHeight);
        heightLeft -= pageContentHeight;
    }
    
    const pageCount = pdf.internal.getNumberOfPages();
    
    // 5. Add watermark and footer to each page
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        // Watermark
        if (settings.pdfWatermarkEnabled) {
            const rawWatermarkText = settings.pdfWatermarkText || 'Downloaded From {siteName}';
            const watermarkText = rawWatermarkText.replace('{siteName}', settings.siteName);
            const watermarkLines = watermarkText.split('\\n');
            
            pdf.setFontSize(50);
            pdf.setTextColor(230, 230, 230); // Very light gray
            // Save current graphics state to apply transparency
            pdf.saveGraphicsState();
            pdf.setGState(new (pdf as any).GState({ opacity: 0.5 }));
            pdf.text(watermarkLines, pdfWidth / 2, pdfHeight / 2, {
                angle: -45,
                align: 'center',
                baseline: 'middle' // Vertically center the text block
            });
            // Restore graphics state
            pdf.restoreGraphicsState();
        }
        
        // Footer with page number
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        const footerText = `Page ${i} of ${pageCount}`;
        const textWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const x = (pdfWidth - textWidth) / 2;
        const y = pdfHeight - (bottomMargin / 2);
        pdf.text(footerText, x, y);
    }
    
    // 6. Save the PDF
    pdf.save(`${paper.slug}.pdf`);
};
