import mammoth from "mammoth";

export interface ParsedQuestion {
  originalIndex: number;
  text: string;
  options: string[];
  correctAnswer: string; // always the first option's text before shuffle
}

export interface OpenQuestion {
  originalIndex: number;
  text: string;
}

/**
 * Parse a .docx file and extract test questions with options.
 * Supports formats: A) A. A- A: and numbered questions like 1) 1. etc.
 * The FIRST option (A) is always treated as the correct answer.
 * * IMPORTANT: Lines starting with numbers (1. 2. 3.) are treated as
 * continuation of the question text, NOT as options.
 * Only lines starting with A-E letters are treated as options.
 */
export async function parseDocx(file: File): Promise<ParsedQuestion[]> {
  const arrayBuffer = await file.arrayBuffer();

  const optionsConfig = {
    convertImage: mammoth.images.imgElement(async (image) => {
      const buffer = await image.read("base64");
      return { src: "data:" + image.contentType + ";base64," + buffer };
    }),
  };

  const result = await mammoth.convertToHtml({ arrayBuffer }, optionsConfig);
  const html = result.value;

  // Düzəliş edilmiş HTML təmizləmə hissəsi:
  const rawLines = html
    .replace(/<\/?p[^>]*>|<br\s*\/?>/gi, "\n") // p və br teqlərini sətir sonu kimi qəbul edirik
    .replace(/<\/ol>|<\/ul>/gi, "\n@list_end@\n") // AVTOMATİK NÖMRƏLƏMƏ: siyahı qruplarının bitişini tuturuq
    .replace(/<li[^>]*>/gi, "\n@li@") // <li> teqlərini itirməmək üçün marker qoyuruq
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "") // digər bütün HTML teqlərini silirik
    .replace(/&nbsp;/g, " ") // boşluq kodlarını normal boşluğa çeviririk
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10))) // numeric HTML entities (Cyrillic etc.)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16))) // hex HTML entities
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // AVTOMATİK NÖMRƏLƏMƏ: Hər fərqli siyahı blokuna unikal ID veririk
  let currentListGroupId = 1;
  const lines: string[] = [];
  for (const line of rawLines) {
    if (line === "@list_end@") {
      currentListGroupId++;
    } else {
      if (line.startsWith("@li@")) {
        lines.push(`@li_${currentListGroupId}@` + line.substring(4));
      } else {
        lines.push(line);
      }
    }
  }

  // Cyrillic-to-Latin option letter mapping
  const cyrillicToLatin: Record<string, string> = {
    'А': 'A', 'а': 'A', 'Б': 'B', 'б': 'B', 'В': 'C', 'в': 'C',
    'Г': 'D', 'г': 'D', 'Д': 'E', 'д': 'E', 'Е': 'F', 'е': 'F',
    'Ъ': 'G', 'ъ': 'G',
  };
  const cyrillicOptionLetters = 'АаБбВвГгДдЕеЪъ';

  const genericPattern = /^\s*(\d+)\s*[.)-]\s*(.*)/;
  
  const questions: ParsedQuestion[] = [];
  let i = 0;

  while (i < lines.length) {
    const qMatch = lines[i].match(genericPattern);
    
    if (qMatch) {
      let questionHeader = qMatch[2].trim(); 
      i++;
      
      const blockLines: string[] = [];
      
      while (i < lines.length) {
        if (genericPattern.test(lines[i])) {
            let variantCount = 0;
            for (let j = blockLines.length - 1; j >= 0; j--) {
                // AVTOMATİK NÖMRƏLƏMƏ ÜÇÜN DƏYİŞİKLİK: regex həm A-E hərfini, həm də qruplaşdırılmış siyahı markerini axtarır
                if (/^\s*([A-Ea-e][.):\-]|@li_\d+@)/.test(blockLines[j]) || new RegExp(`^\\s*[${cyrillicOptionLetters}][.):\\-]`).test(blockLines[j])) {
                    variantCount++;
                } else {
                    break;
                }
            }

            if (variantCount >= 4) {
                break; 
            }
        }
        
        blockLines.push(lines[i]);
        i++;
      }

      const splitPoint = blockLines.length - 5;
      const textPart = blockLines.slice(0, splitPoint);
      const optionPart = blockLines.slice(splitPoint);

      // AVTOMATİK NÖMRƏLƏMƏ ÜÇÜN DƏYİŞİKLİK: Sual mətni içindəki rəqəm (1,2) və hərfləri (a,b) bərpa edirik
      let listCounters: Record<string, number> = {};
      let listTypes: Record<string, string> = {};

      const cleanTextPart = textPart.map((t) => {
        const match = t.match(/^@li_(\d+)@\s*(.*)/);
        if (match) {
          const listId = match[1];
          const content = match[2];

          // Bu siyahı qrupunu ilk dəfə görürüksə
          if (!listCounters[listId]) {
            listCounters[listId] = 1;
            const typeCount = Object.keys(listCounters).length;
            
            // Sualın içindəki ilk siyahını rəqəmlə (1., 2.), ikincisini hərflə (a., b.) nömrələyirik
            if (typeCount === 1) listTypes[listId] = "number";
            else if (typeCount === 2) listTypes[listId] = "letter";
            else listTypes[listId] = "dash";
          }

          let marker = "";
          const currentCount = listCounters[listId];
          if (listTypes[listId] === "number") {
            marker = `${currentCount}.`;
          } else if (listTypes[listId] === "letter") {
            marker = `${String.fromCharCode(96 + currentCount)}.`; // 97 = 'a'
          } else {
            marker = `-`;
          }

          listCounters[listId]++;
          return `${marker} ${content}`;
        }
        return t;
      });

      const fullText = [questionHeader, ...cleanTextPart].join("\n");

      // AVTOMATİK NÖMRƏLƏMƏ ÜÇÜN DƏYİŞİKLİK: Variantlardan lazımsız markerləri təmizləyirik
      const options = optionPart.map(opt => opt.replace(new RegExp(`^\\s*([A-Ea-e${cyrillicOptionLetters}][.):\\-]?|@li_\\d+@)\\s*`), "").trim());

      if (options.length >= 5) {
        questions.push({
          originalIndex: questions.length + 1,
          text: fullText,
          options,
          correctAnswer: options[0], 
        });
      }
    } else {
      i++;
    }
  }

  return questions;
}

/**
 * Parse open-ended questions from a .docx file.
 */
export async function parseOpenQuestions(file: File): Promise<OpenQuestion[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value;

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const questions: OpenQuestion[] = [];

  for (const line of lines) {
    // Remove leading numbers
    const cleaned = line.replace(/^\s*\d+\s*[.):\-]?\s*/, "").trim();
    if (cleaned.length > 10) {
      questions.push({
        originalIndex: questions.length + 1,
        text: cleaned,
      });
    }
  }

  return questions;
}

/**
 * Shuffle options for a question, re-label A-E, track correct answer.
 */
export interface ShuffledQuestion {
  index: number;
  text: string;
  options: string[];
  correctLetter: string;
  correctText: string;
}

export type ShuffleMode = "options-only" | "questions-and-options";

export function shuffleQuestions(
  questions: ParsedQuestion[],
  count?: number,
  mode: ShuffleMode = "questions-and-options"
): ShuffledQuestion[] {
  let selected = [...questions];

  if (mode === "questions-and-options") {
    // Shuffle question order
    if (count && count < selected.length) {
      selected = shuffleArray(selected).slice(0, count);
    } else {
      selected = shuffleArray(selected);
    }
  } else {
    // options-only: keep question order, optionally limit count
    if (count && count < selected.length) {
      selected = selected.slice(0, count);
    }
  }

  return selected.map((q, idx) => {
    const shuffledOpts = shuffleArray([...q.options]);
    const correctIdx = shuffledOpts.findIndex(
      (o) => o.trim() === q.correctAnswer.trim()
    );
    const correctLetter = String.fromCharCode(65 + correctIdx);

    return {
      index: idx + 1, // Always re-number from 1
      text: q.text,
      options: shuffledOpts,
      correctLetter,
      correctText: q.correctAnswer,
    };
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
