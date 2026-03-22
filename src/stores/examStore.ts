import { create } from "zustand";
import type { ShuffledQuestion } from "@/lib/docxParser";

export type ExamMode = "random50" | "all" | "range";

interface ExamState {
  questions: ShuffledQuestion[];
  answers: Record<number, string>;
  mode: ExamMode;
  timeLeft: number;
  isRunning: boolean;
  isFinished: boolean;
  isOfficial: boolean;
  rangeStart: number;
  rangeEnd: number;
  rangeOrder: "sequential" | "random" | "random50";

  setQuestions: (q: ShuffledQuestion[]) => void;
  setAnswer: (questionIndex: number, letter: string) => void;
  setMode: (m: ExamMode) => void;
  setTimeLeft: (t: number) => void;
  tick: () => void;
  start: () => void;
  finish: () => void;
  reset: () => void;
  setRange: (start: number, end: number) => void;
  setRangeOrder: (order: "sequential" | "random" | "random50") => void;
  setIsOfficial: (v: boolean) => void;
}

export const useExamStore = create<ExamState>((set) => ({
  questions: [],
  answers: {},
  mode: "random50",
  timeLeft: 3600,
  isRunning: false,
  isFinished: false,
  isOfficial: false,
  rangeStart: 1,
  rangeEnd: 50,
  rangeOrder: "sequential",

  setQuestions: (q) => set({ questions: q }),
  setAnswer: (idx, letter) =>
    set((s) => ({ answers: { ...s.answers, [idx]: letter } })),
  setMode: (m) => set({ mode: m }),
  setTimeLeft: (t) => set({ timeLeft: t }),
  tick: () =>
    set((s) => {
      if (s.timeLeft <= 0) return { isFinished: true, isRunning: false };
      return { timeLeft: s.timeLeft - 1 };
    }),
  start: () => set({ isRunning: true, isFinished: false, answers: {} }),
  finish: () => set({ isRunning: false, isFinished: true }),
  reset: () =>
    set({
      questions: [],
      answers: {},
      isRunning: false,
      isFinished: false,
      isOfficial: false,
      timeLeft: 3600,
    }),
  setRange: (start, end) => set({ rangeStart: start, rangeEnd: end }),
  setRangeOrder: (order) => set({ rangeOrder: order }),
  setIsOfficial: (v) => set({ isOfficial: v }),
}));
