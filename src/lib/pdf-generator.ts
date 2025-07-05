
'use client';

import jsPDF from 'jspdf';
import type { Paper, PaperQuestion, Settings } from '@/types';

export const generatePdf = async (paper: Paper, questions: PaperQuestion[], settings: Settings): Promise<void> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const margin = { top: 25.4, bottom: 25.4, left: 20, right: 20 };
    const contentWidth = pdfWidth - margin.left - margin.right;
    
    // Create the full HTML content string
    let fullHtml = `
        <div style="text-align: center; margin-bottom: 10px; padding: 1px; box-sizing: content-box; font-family: Helvetica, Arial, sans-serif;">
            <h1 style="font-size: 20pt; margin-bottom: 5px; word-wrap: break-word;">${paper.title}</h1>
            <p style="font-size: 11pt; color: #555; word-wrap: break-word;">${paper.description}</p>
            <hr style="border: 0; border-top: 1px solid #ccc; margin-top: 10px;" />
        </div>`;

    for (const q of questions) {
        const questionText = q.questionText.replace(/\n/g, '<br />');
        const explanationText = q.explanation ? q.explanation.replace(/\n/g, '<br />') : '';

        let questionHtml = `
            <div style="margin-bottom: 15px; margin-top: 10px; page-break-inside: avoid; padding: 1px; box-sizing: content-box; font-family: Helvetica, Arial, sans-serif;">
                <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 8px; word-wrap: break-word;">Question ${q.order}</h2>
                <p style="font-size: 12pt; margin-bottom: 8px; word-wrap: break-word;">${questionText}</p>
            `;

        if (q.type === 'mcq' && q.options) {
            questionHtml += `<div style="margin-left: 15px;">`;
            q.options.forEach(opt => {
                const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt;
                questionHtml += `<p style="font-size: 11pt; margin: 4px 0; word-wrap: break-word; ${isCorrect ? 'font-weight: bold; color: #28a745;' : ''}">${isCorrect ? '✔' : '•'} ${opt.replace(/\n/g, '<br />')}</p>`;
            });
            questionHtml += `</div>`;
        } else if (q.type === 'short_answer') {
            questionHtml += `<p style="font-size: 11pt; color: #28a745; margin-left: 15px; word-wrap: break-word;"><strong>Correct Answer:</strong> ${q.correctAnswer}</p>`;
        }

        if (explanationText) {
            questionHtml += `<p style="font-size: 11pt; color: #444; background-color: #f0f0f0; margin-left: 15px; margin-top: 8px; border-left: 3px solid #ddd; padding: 8px; white-space: pre-wrap; word-wrap: break-word;"><strong>Explanation:</strong> ${explanationText}</p>`;
        }
        questionHtml += `</div>`;
        
        fullHtml += questionHtml;
    }

    const container = document.createElement('div');
    container.style.width = `${contentWidth}mm`;
    container.innerHTML = fullHtml;
    
    await pdf.html(container, {
        x: margin.left,
        y: margin.top,
        autoPaging: 'text',
        margin: [margin.top, margin.right, margin.bottom, margin.left],
        html2canvas: {
            scale: 0.25,
            useCORS: true,
        },
    });

    // Add Watermark and Footer to all pages
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        if (settings.pdfWatermarkEnabled) {
            const rawWatermarkText = settings.pdfWatermarkText || 'Downloaded From {siteName}';
            const watermarkText = rawWatermarkText.replace('{siteName}', settings.siteName || 'Prepify');
            const angle = -45;
            const angleInRadians = angle * (Math.PI / 180);

            // --- Dynamic Font Size Calculation ---
            let fontSize = 60;
            let textDimensions;
            const safePageWidth = pdfWidth * 0.9;
            const safePageHeight = pdfHeight * 0.9;

            while (fontSize > 10) {
                pdf.setFontSize(fontSize);
                textDimensions = pdf.getTextDimensions(watermarkText);
                
                const rotatedWidth = Math.abs(textDimensions.w * Math.cos(angleInRadians)) + Math.abs(textDimensions.h * Math.sin(angleInRadians));
                const rotatedHeight = Math.abs(textDimensions.w * Math.sin(angleInRadians)) + Math.abs(textDimensions.h * Math.cos(angleInRadians));
                
                if (rotatedWidth < safePageWidth && rotatedHeight < safePageHeight) {
                    break;
                }
                fontSize -= 2;
            }
            
            // --- Apply settings and render ---
            pdf.setFontSize(fontSize);
            pdf.setTextColor(230, 230, 230);
            pdf.saveGraphicsState();
            pdf.setGState(new (pdf as any).GState({ opacity: 0.5 }));
            
            pdf.text(
                watermarkText,
                pdfWidth / 2,
                pdfHeight / 2,
                { angle: angle, align: 'center', baseline: 'middle' }
            );
            
            pdf.restoreGraphicsState();
        }
        
        // Footer with page number
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        const footerText = `Page ${i} of ${pageCount}`;
        const textWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const x = (pdfWidth - textWidth) / 2;
        const y = pdfHeight - (margin.bottom / 2);
        pdf.text(footerText, x, y);
    }
    
    pdf.save(`${paper.slug}.pdf`);
};
