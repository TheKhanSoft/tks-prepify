
'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Paper, PaperQuestion, Settings } from '@/types';

// Helper function to render an element to a canvas
const renderElementToCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    return await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });
};

export const generatePdf = async (paper: Paper, questions: PaperQuestion[], settings: Settings): Promise<void> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // 1 inch margins for top/bottom, 20mm for left/right
    const topMargin = 25.4;
    const bottomMargin = 25.4;
    const leftMargin = 20;
    const rightMargin = 20;

    const contentWidth = pdfWidth - leftMargin - rightMargin;
    
    let currentY = topMargin;

    // Create an off-screen container for rendering individual elements
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'absolute';
    renderContainer.style.left = '-9999px';
    // Convert mm content width to px for accurate rendering by html2canvas
    renderContainer.style.width = `${contentWidth * (96 / 25.4)}px`; // Assuming 96 DPI
    renderContainer.style.padding = '1px';
    renderContainer.style.boxSizing = 'content-box';
    renderContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';
    renderContainer.style.color = '#000';
    renderContainer.style.backgroundColor = '#fff';
    document.body.appendChild(renderContainer);

    // Function to add content and handle pagination
    const addContent = async (html: string) => {
        renderContainer.innerHTML = html;
        const canvas = await renderElementToCanvas(renderContainer);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        if (currentY + imgHeight > pdfHeight - bottomMargin) {
            pdf.addPage();
            currentY = topMargin;
        }

        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', leftMargin, currentY, contentWidth, imgHeight);
        currentY += imgHeight + 5; // Add a 5mm gap between elements
    };

    // 1. Render Header
    const headerHtml = `
        <div style="text-align: center; margin-bottom: 10px;">
            <h1 style="font-size: 20pt; margin-bottom: 5px; word-wrap: break-word;">${paper.title}</h1>
            <p style="font-size: 11pt; color: #555; word-wrap: break-word;">${paper.description}</p>
            <hr style="border: 0; border-top: 1px solid #ccc; margin-top: 10px;" />
        </div>`;
    await addContent(headerHtml);

    // 2. Render Questions
    for (const q of questions) {
        const questionText = q.questionText.replace(/\n/g, '<br />');
        const explanationText = q.explanation ? q.explanation.replace(/\n/g, '<br />') : '';

        let questionHtml = `
            <div style="margin-bottom: 10px; break-inside: avoid;">
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
        
        await addContent(questionHtml);
    }

    // 3. Add Watermark and Footer to all pages
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        // Watermark
        if (settings.pdfWatermarkEnabled) {
            const rawWatermarkText = settings.pdfWatermarkText || 'Downloaded From {siteName}';
            const watermarkText = rawWatermarkText.replace('{siteName}', settings.siteName);
            const watermarkLines = watermarkText.split('\\n');

            pdf.setFontSize(50);
            pdf.setTextColor(230, 230, 230); // Light gray
            pdf.saveGraphicsState();
            pdf.setGState(new (pdf as any).GState({ opacity: 0.5 }));
            pdf.text(watermarkLines, pdfWidth / 2, pdfHeight / 2, {
                angle: -45,
                align: 'center',
                baseline: 'middle'
            });
            pdf.restoreGraphicsState();
        }
        
        // Footer with page number
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        const footerText = `Page ${i} of ${pageCount}`;
        const textWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const x = (pdfWidth - textWidth) / 2;
        const y = pdfHeight - 15; // Position footer 15mm from bottom
        pdf.text(footerText, x, y);
    }

    // 4. Clean up and Save
    document.body.removeChild(renderContainer);
    pdf.save(`${paper.slug}.pdf`);
};
