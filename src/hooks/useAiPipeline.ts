import { useEffect, useRef, useState } from 'react';
import type { SurveyRecord } from '../types';
import { buildAndUploadDocx, fetchLatestReport, fetchPipelineStagesBatch, runAiStage, type PipelineStage, type PipelineStageStatus } from '../lib/groqService';

const ALL_STAGES: PipelineStage[] = ['transcribe', 'reference', 'documents', 'extract', 'report', 'docx'];

export interface SurveyPipelineState {
  stages: PipelineStageStatus[];
  running: PipelineStage | null;
  done: boolean;
  error: string | null;
}

const idle: SurveyPipelineState = { stages: [], running: null, done: false, error: null };

const messageOf = (err: unknown) => (err instanceof Error ? err.message : 'Pemrosesan AI gagal. Silakan coba lagi.');

export function useAiPipeline(surveys: SurveyRecord[] | null) {
  const [states, setStates] = useState<Record<string, SurveyPipelineState>>({});
  const surveysRef = useRef<SurveyRecord[]>([]);
  const attemptedRef = useRef(new Set<string>());
  const runningRef = useRef(false);

  const patch = (surveyId: string, next: Partial<SurveyPipelineState>) =>
    setStates((prev) => ({ ...prev, [surveyId]: { ...(prev[surveyId] ?? idle), ...next } }));

  const runSurvey = async (survey: SurveyRecord) => {
    let stageMap: Record<string, PipelineStageStatus[]>;
    try {
      stageMap = await fetchPipelineStagesBatch([survey.id]);
    } catch (err) {
      patch(survey.id, { error: messageOf(err) });
      return;
    }
    const stages = stageMap[survey.id] ?? [];
    patch(survey.id, { stages });

    const hasSources = survey.recordingIds.length > 0;
    if (!hasSources) {
      patch(survey.id, { running: null, done: true, error: null });
      return;
    }

    const completed = new Set(stages.filter((s) => s.status === 'completed').map((s) => s.stage));
    if (ALL_STAGES.every((s) => completed.has(s))) {
      patch(survey.id, { running: null, done: true, error: null });
      return;
    }

    for (const stage of ALL_STAGES) {
      if (completed.has(stage)) continue;
      patch(survey.id, { running: stage, error: null });
      try {
        if (stage === 'docx') {
          const report = await fetchLatestReport(survey.id);
          if (!report) throw new Error('Laporan belum tersedia untuk dibuatkan DOCX.');
          await buildAndUploadDocx(survey.id, survey.supplierName, survey.surveyDate, report);
        } else {
          await runAiStage(survey.id, stage);
        }
        completed.add(stage);
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
        const next = surveysRef.current.find((s) => !attemptedRef.current.has(s.id));
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
