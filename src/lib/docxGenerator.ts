import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import type { ShuffledQuestion } from "./docxParser";

export async function generateShuffledDocx(
  questions: ShuffledQuestion[],
  filename: string = "qarisdirilmis_suallar.docx"
) {
  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: "Qarışdırılmış İmtahan Sualları",
          bold: true,
          size: 28,
          font: "Times New Roman",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  for (const q of questions) {
    // 1. Sualın mətnini sətirlərə bölürük (çünki parser join("\n") ilə birləşdirib)
    const textLines = q.text.split("\n");

    textLines.forEach((line, lineIdx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              // Sualın yalnız İLK sətrinin qabağına nömrə qoyuruq (məs: 1) )
              text: lineIdx === 0 ? `${q.index}) ${line}` : line,
              bold: true,
              size: 24,
              font: "Times New Roman",
            }),
          ],
          // Sualın sətirləri arasında boşluğu tənzimləyirik
          spacing: { 
            before: lineIdx === 0 ? 300 : 0, // Yeni sual başlayanda boşluq qoy
            after: 100 
          },
          // İkinci sətirdən etibarən mətni bir az sağa sürüşdürürük (daha səliqəli görünür)
          indent: lineIdx === 0 ? undefined : { left: 420 },
        })
      );
    });

    // 2. Variantları çap edirik
    q.options.forEach((opt, j) => {
      const letter = String.fromCharCode(65 + j);
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${letter}) ${opt}`,
              size: 24,
              font: "Times New Roman",
            }),
          ],
          spacing: { after: 50 },
          indent: { left: 420 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

export function generateAnswerKey(questions: ShuffledQuestion[]): string {
  return questions.map((q) => `${q.index}) ${q.correctLetter}`).join("\n");
}

export function downloadAnswerKey(
  questions: ShuffledQuestion[],
  filename: string = "cavab_acari.txt"
) {
  const content = generateAnswerKey(questions);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}
