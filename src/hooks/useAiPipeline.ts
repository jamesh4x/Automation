import { useEffect, useRef, useState } from 'react';
import type { SurveyRecord } from '../types';
import { extractSurvey, fetchAiActions, generateReport, transcribeRecording } from '../lib/groqService';

export type PipelineStep = 'transcribe' | 'extract' | 'report';

export interface SurveyPipelineState {
  running: PipelineStep | null;
  done: boolean;
  error: string | null;
}

const idle: SurveyPipelineState = { running: null, done: false, error: null };

const messageOf = (err: unknown) => (err instanceof Error ? err.message : 'Pemrosesan AI gagal. Silakan coba lagi.');

export function useAiPipeline(surveys: SurveyRecord[] | null) {
  const [states, setStates] = useState<Record<string, SurveyPipelineState>>({});
  const surveysRef = useRef<SurveyRecord[]>([]);
  const attemptedRef = useRef(new Set<string>());
  const runningRef = useRef(false);

  const patch = (surveyId: string, next: Partial<SurveyPipelineState>) =>
    setStates((prev) => ({ ...prev, [surveyId]: { ...(prev[surveyId] ?? idle), ...next } }));

  const runSurvey = async (survey: SurveyRecord) => {
    let actions: string[];
    try {
      actions = (await fetchAiActions([survey.id]))[survey.id] ?? [];
    } catch (err) {
      patch(survey.id, { error: messageOf(err) });
      return;
    }

    const steps: [PipelineStep, () => Promise<void>][] = [
      ['transcribe', () => transcribeRecording(survey.id, survey.recordingIds[0])],
      ['extract', () => extractSurvey(survey.id)],
      ['report', () => generateReport(survey.id)],
    ];

    for (const [step, run] of steps) {
      if (actions.includes(step)) continue;
      patch(survey.id, { running: step, error: null });
      try {
        await run();
        actions.push(step);
      } catch (err) {
        patch(survey.id, { running: null, error: messageOf(err) });
        return;
      }
    }
    patch(survey.id, { running: null, done: true, error: null });
  };

  const processQueue = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      for (;;) {
        const next = surveysRef.current.find((s) => s.recordingIds.length > 0 && !attemptedRef.current.has(s.id));
        if (!next) break;
        attemptedRef.current.add(next.id);
        await runSurvey(next);
      }
    } finally {
      runningRef.current = false;
    }
  };

  useEffect(() => {
    surveysRef.current = surveys ?? [];
    void processQueue();
  }, [surveys]);

  const retry = (surveyId: string) => {
    attemptedRef.current.delete(surveyId);
    patch(surveyId, { error: null });
    void processQueue();
  };

  return { states, retry };
}
