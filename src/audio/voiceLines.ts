import type { GameContent } from '../content/schemas';
import { translate } from '../core/presentation';

export type VoiceLine = { id: string; text: string };

export const voiceNoticeIds = [
  'driving.collision',
  'driving.slowDown',
  'driving.blocked',
  'driving.walkingHint',
  'm5c.noPhoto',
  'm5c.photoSaved',
  'm5c.photoFailed',
] as const;

export const examRideIntro = 'exam.rideIntro';

export const resultVoiceIds = {
  completed: 'missionUi.completed',
  glory: 'missionResults.gloryVoice',
  failed: 'missionUi.failed',
} as const;

export function localizedVoiceLine(
  id: string,
  values?: Readonly<Record<string, string>>,
): VoiceLine {
  return { id, text: translate(id, values) };
}

type Question = GameContent['pytania']['pytania'][number];
export function questionVoiceLine(
  question: Pick<Question, 'id' | 'pytanie' | 'wyjasnienie'>,
  field: 'pytanie' | 'wyjasnienie',
): VoiceLine {
  return { id: `pytania.${question.id}.${field}`, text: question[field] };
}

const sentences = new Intl.Segmenter('pl', { granularity: 'sentence' });
function firstSentence(text: string) {
  const [sentence] = sentences.segment(text);
  return sentence?.segment.trim() ?? '';
}

type Rule = GameContent['przepisy']['przepisy'][number];
export function ruleFeedbackLine(id: string, text: string): VoiceLine {
  const first = firstSentence(text);
  return {
    id,
    text:
      first.length <= 140
        ? first
        : `${first.slice(0, 139).replace(/\s+\S*$/, '')}…`,
  };
}

export function quizExplanationLine(rule: Rule): VoiceLine {
  const brief = firstSentence(rule.dla_dziecka);
  return {
    id: `przepisy.${rule.id}.quiz`,
    text:
      brief && brief.length <= 140
        ? brief
        : firstSentence(rule.feedback) || rule.feedback,
  };
}
