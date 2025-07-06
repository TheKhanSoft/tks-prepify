
'use client';

import jsPDF from 'jspdf';
import type { Paper, PaperQuestion, Settings } from '@/types';

export const generatePdf = async (paper: Paper, questions: PaperQuestion[], settings: Settings): Promise<void> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // 1 inch margins for top and bottom
    const margin = { top: 25.4, bottom: 25.4, left: 20, right: 20 };
    const contentWidth = pdfWidth - margin.left - margin.right;
    let y = margin.top;

    // Helper to check for page overflow and add a new page
    const checkPageBreak = (spaceNeeded: number) => {
        if (y + spaceNeeded > pdfHeight - margin.bottom) {
            pdf.addPage();
            y = margin.top;
        }
    };
    
    // --- Render Header ---
    pdf.setFontSize(20).setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(paper.title, contentWidth);
    checkPageBreak(titleLines.length * 10);
    pdf.text(titleLines, pdfWidth / 2, y, { align: 'center' });
    y += titleLines.length * 8;
    
    pdf.setFontSize(11).setFont('helvetica', 'normal');
    const descriptionLines = pdf.splitTextToSize(paper.description, contentWidth);
    checkPageBreak(descriptionLines.length * 5 + 5);
    y += 5;
    pdf.text(descriptionLines, pdfWidth / 2, y, { align: 'center' });
    y += descriptionLines.length * 5;

    y += 10;
    pdf.setDrawColor(204, 204, 204);
    pdf.line(margin.left, y, pdfWidth - margin.right, y);
    y += 10;


    // --- Render Questions ---
    for (const q of questions) {
        checkPageBreak(20); // rough space for a new question

        // Question number and text
        pdf.setFontSize(14).setFont('helvetica', 'bold');
        const questionText = `Question ${q.order}: ${q.questionText}`;
        const questionLines = pdf.splitTextToSize(questionText, contentWidth);
        checkPageBreak(questionLines.length * 7);
        pdf.text(questionLines, margin.left, y);
        y += questionLines.length * 7;
        y += 4;

        pdf.setFontSize(11).setFont('helvetica', 'normal');

        // Options or Short Answer
        if (q.type === 'mcq' && q.options) {
            for (const opt of q.options) {
                const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt;
                const prefix = isCorrect ? '✔' : '•';
                const optionText = `${prefix} ${opt}`;
                const optionLines = pdf.splitTextToSize(optionText, contentWidth - 5);
                checkPageBreak(optionLines.length * 6);
                
                if (isCorrect) {
                    pdf.setTextColor(40, 167, 69); // Green
                    pdf.setFont('helvetica', 'bold');
                }
                
                pdf.text(optionLines, margin.left + 5, y);
                y += optionLines.length * 5.5;

                if (isCorrect) {
                    pdf.setTextColor(0, 0, 0); // Reset to black
                    pdf.setFont('helvetica', 'normal');
                }
            }
        } else if (q.type === 'short_answer') {
            const answerText = `Correct Answer: ${q.correctAnswer}`;
            const answerLines = pdf.splitTextToSize(answerText, contentWidth - 5);
            checkPageBreak(answerLines.length * 6);
            pdf.setTextColor(40, 167, 69);
            pdf.setFont('helvetica', 'bold');
            pdf.text(answerLines, margin.left + 5, y);
            y += answerLines.length * 5.5;
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
        }

        // Explanation
        if (q.explanation) {
            y += 4;
            const explanationText = `Explanation: ${q.explanation}`;
            const explanationLines = pdf.splitTextToSize(explanationText, contentWidth);
            checkPageBreak(explanationLines.length * 5 + 4);
            pdf.setFillColor(240, 240, 240);
            pdf.rect(margin.left, y - 3, contentWidth, explanationLines.length * 5 + 2, 'F');
            pdf.setFontSize(10).setFont('helvetica', 'italic');
            pdf.setTextColor(68, 68, 68);
            pdf.text(explanationLines, margin.left + 2, y);
            y += explanationLines.length * 5 + 4;
            pdf.setFontSize(11).setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
        }

        y += 10; // Space between questions
    }
    

    // --- Add Watermark and Footer to all pages ---
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        // Watermark
        if (settings.pdfWatermarkEnabled) {
            const rawWatermarkText = settings.pdfWatermarkText || 'Downloaded From {siteName}';
            const watermarkText = rawWatermarkText.replace('{siteName}', settings.siteName || 'Prepify');
            
            pdf.saveGraphicsState();
            pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
            pdf.setTextColor(150);

            // Dynamic font size calculation using a more precise method
            let fontSize = 120;
            const angle = -45;
            const watermarkLines = watermarkText.split('\n');

            while(fontSize > 10) {
                pdf.setFontSize(fontSize);
                const dims = pdf.getTextDimensions(watermarkLines);
                
                // Calculate diagonal of the text's bounding box
                const diagonal = Math.sqrt(Math.pow(dims.w, 2) + Math.pow(dims.h, 2));
                
                // Check if the diagonal fits within 75% of the page width to be safe
                if (diagonal < pdfWidth * 0.75) {
                    break;
                }
                fontSize -= 5;
            }
            
            pdf.setFontSize(fontSize);
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
        const footerY = pdfHeight - 15; // Position footer within the 1-inch bottom margin
        pdf.text(footerText, x, footerY);
    }
    
    pdf.save(`${paper.slug}.pdf`);
};

