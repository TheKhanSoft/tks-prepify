
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Paper, PaperQuestion, Settings } from '@/types';

export const generatePdf = async (paper: Paper, questions: PaperQuestion[], settings: Settings): Promise<void> => {
    // Create an element to render the PDF content, but keep it off-screen
    const reportElement = document.createElement('div');
    reportElement.style.position = 'absolute';
    reportElement.style.left = '-9999px';
    reportElement.style.width = '210mm'; // A4 width
    reportElement.style.padding = '20mm';
    reportElement.style.fontFamily = 'Helvetica, Arial, sans-serif';
    reportElement.style.color = '#000';
    reportElement.style.backgroundColor = '#fff';

    let contentHtml = `
        <h1 style="font-size: 24pt; margin-bottom: 8px;">${paper.title}</h1>
        <p style="font-size: 12pt; color: #555; margin-bottom: 24px;">${paper.description}</p>
        <hr style="border-top: 1px solid #ddd; margin: 24px 0;" />
    `;

    questions.forEach(q => {
        contentHtml += `
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
                <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 12px;">Question ${q.order}</h2>
                <p style="font-size: 12pt; margin-bottom: 12px;">${q.questionText}</p>
        `;
        
        if (q.type === 'mcq' && q.options) {
            contentHtml += `<div style="margin-left: 20px;">`;
            q.options.forEach(opt => {
                const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt;
                contentHtml += `<p style="font-size: 11pt; ${isCorrect ? 'font-weight: bold; color: #28a745;' : ''}">${isCorrect ? '✔' : '•'} ${opt}</p>`;
            });
            contentHtml += `</div>`;
        } else if (q.type === 'short_answer') {
            contentHtml += `<p style="font-size: 11pt; color: #28a745; margin-left: 20px;"><strong>Correct Answer:</strong> ${q.correctAnswer}</p>`;
        }
        
        if (q.explanation) {
            contentHtml += `<p style="font-size: 11pt; color: #666; margin-left: 20px; margin-top: 8px; border-left: 2px solid #eee; padding-left: 8px;"><strong>Explanation:</strong> ${q.explanation}</p>`;
        }
        
        contentHtml += '</div>';
    });

    reportElement.innerHTML = contentHtml;
    document.body.appendChild(reportElement);

    const canvas = await html2canvas(reportElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
    });

    document.body.removeChild(reportElement);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    const imgWidth = pdfWidth;
    const imgHeight = imgWidth / ratio;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
    }
    
    const pageCount = pdf.internal.getNumberOfPages();
    
    // Add watermark and footer to each page
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        // Watermark
        if (settings.pdfWatermarkEnabled) {
            const watermarkText = `Downloaded From ${settings.siteName}`;
            pdf.setFontSize(50);
            pdf.setTextColor(230, 230, 230); // Very light gray
            pdf.text(watermarkText, pdfWidth / 2, pdfHeight / 2, {
                angle: 45,
                align: 'center'
            });
        }
        
        // Footer with page number
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        const footerText = `Page ${i} of ${pageCount}`;
        const textWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const x = (pdf.internal.pageSize.getWidth() - textWidth) / 2;
        const y = pdf.internal.pageSize.getHeight() - 10;
        pdf.text(footerText, x, y);
    }
    
    pdf.save(`${paper.slug}.pdf`);
};
