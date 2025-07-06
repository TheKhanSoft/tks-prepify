
'use client';

import jsPDF from 'jspdf';
import type { Paper, PaperQuestion, Settings } from '@/types';

export const generatePdf = async (paper: Paper, questions: PaperQuestion[], settings: Settings): Promise<void> => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // 1 inch = 25.4 mm
    const margin = { top: 25.4, bottom: 25.4, left: 20, right: 20 };
    const contentWidth = pdfWidth - margin.left - margin.right;
    let y = margin.top;

    const checkPageBreak = (spaceNeeded: number) => {
        if (y + spaceNeeded > pdfHeight - margin.bottom) {
            pdf.addPage();
            y = margin.top;
            return true;
        }
        return false;
    };
    
    // --- Render Header ---
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    const titleLines = pdf.splitTextToSize(paper.title, contentWidth);
    checkPageBreak(titleLines.length * 10);
    pdf.text(titleLines, pdfWidth / 2, y, { align: 'center' });
    y += titleLines.length * 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
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
        checkPageBreak(20); 

        // Question number and text
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const questionText = `Question ${q.order}: ${q.questionText}`;
        const questionLines = pdf.splitTextToSize(questionText, contentWidth);
        checkPageBreak(questionLines.length * 7);
        pdf.text(questionLines, margin.left, y);
        y += questionLines.length * 7;
        
        pdf.setFontSize(11);

        if (q.type === 'mcq' && q.options) {
            y += 4;
            for (const opt of q.options) {
                const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : q.correctAnswer === opt;
                const optionLines = pdf.splitTextToSize(opt, contentWidth - 15);
                checkPageBreak(optionLines.length * 5.5 + 2);
                
                if (isCorrect) {
                    pdf.setTextColor(40, 167, 69); // Green
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('✔', margin.left + 5, y);
                    pdf.text(optionLines, margin.left + 11, y);
                } else {
                    pdf.setTextColor(0, 0, 0); // Black
                    pdf.setFont('helvetica', 'normal');
                    pdf.text('•', margin.left + 5, y);
                    pdf.text(optionLines, margin.left + 11, y);
                }
                
                y += optionLines.length * 5.5 + 2;
            }
            pdf.setTextColor(0, 0, 0); // Reset color
            pdf.setFont('helvetica', 'normal');
        } else if (q.type === 'short_answer') {
            y += 4;
            const answerLines = pdf.splitTextToSize(String(q.correctAnswer), contentWidth - 12);
            const blockHeight = answerLines.length * 5.5 + 10;
            checkPageBreak(blockHeight + 4);

            pdf.setFillColor(230, 245, 233);
            pdf.setDrawColor(230, 245, 233);
            pdf.roundedRect(margin.left, y, contentWidth, blockHeight, 3, 3, 'FD');
            
            pdf.setTextColor(40, 167, 69);
            pdf.setFont('helvetica', 'bold');
            pdf.text('✔ Correct Answer:', margin.left + 5, y + 6);

            pdf.setTextColor(0,0,0);
            pdf.setFont('helvetica', 'normal');
            pdf.text(answerLines, margin.left + 5, y + 13);

            y += blockHeight + 4;
        }

        if (q.explanation) {
            y += 4;
            const explanationText = `Explanation: ${q.explanation}`;
            const explanationLines = pdf.splitTextToSize(explanationText, contentWidth - 4);
            const explanationHeight = explanationLines.length * 5 + 8;
            checkPageBreak(explanationHeight);

            pdf.setFillColor(248, 249, 250);
            pdf.rect(margin.left, y, contentWidth, explanationHeight, 'F');
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(80, 80, 80);
            pdf.text(explanationLines, margin.left + 2, y + 5);
            y += explanationHeight + 4;
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
        }

        y += 10;
    }
    
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        if (settings.pdfWatermarkEnabled) {
            const rawWatermarkText = settings.pdfWatermarkText || 'Downloaded From\n{siteName}';
            const watermarkText = rawWatermarkText.replace('{siteName}', settings.siteName || 'Prepify');
            const watermarkLines = watermarkText.split('\n');
            
            const angle = -45;
            
            let fontSize = 80;
            pdf.setFontSize(fontSize);

            const calculateRotatedDimensions = (lines: string[], angleDeg: number) => {
                const angleRad = angleDeg * Math.PI / 180;
                const dims = pdf.getTextDimensions(lines);
                const rotatedWidth = Math.abs(dims.w * Math.cos(angleRad)) + Math.abs(dims.h * Math.sin(angleRad));
                const rotatedHeight = Math.abs(dims.w * Math.sin(angleRad)) + Math.abs(dims.h * Math.cos(angleRad));
                return { rotatedWidth, rotatedHeight };
            };

            let dims = calculateRotatedDimensions(watermarkLines, angle);
            
            while ((dims.rotatedWidth > pdfWidth * 0.8 || dims.rotatedHeight > pdfHeight * 0.8) && fontSize > 10) {
                fontSize -= 5;
                pdf.setFontSize(fontSize);
                dims = calculateRotatedDimensions(watermarkLines, angle);
            }

            pdf.saveGraphicsState();
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(220, 220, 220);
            pdf.setGState(new (pdf as any).GState({ opacity: 0.2 }));

            pdf.text(watermarkLines, pdfWidth / 2, pdfHeight / 2, {
                angle: angle,
                align: 'center',
                baseline: 'middle',
            });
            pdf.restoreGraphicsState();
        }
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        const footerText = `Page ${i} of ${pageCount}`;
        const textWidth = pdf.getStringUnitWidth(footerText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(footerText, (pdfWidth - textWidth) / 2, pdfHeight - 15);
    }
    
    pdf.save(`${paper.slug}.pdf`);
};
