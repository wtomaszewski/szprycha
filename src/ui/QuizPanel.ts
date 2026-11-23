import { audio } from '../audio/GameAudio';
import { questionVoiceLine, quizExplanationLine } from '../audio/voiceLines';
import portrait from '../../assets/generated/portraits/sierzant_ola.png?url';
import { moduleId, type GameContent } from '../content/schemas';
import { ui } from '../core/presentation';
import type { MissionProgress } from '../gameplay/MissionProgress';
import {
  answerOrder,
  drawQuestions,
  dueQuestions,
  type QuizQuestion,
} from '../gameplay/quiz/leitner';
import { localDay, type ModuleId } from '../progression/mastery';
import { questionPrompt } from './SignIllustration';
import { progressNotice } from './SkillMap';

const labels = ui.quiz;

function button(text: string, action: () => void) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.addEventListener('click', action);
  return element;
}

function paragraph(text: string, className = '') {
  const element = document.createElement('p');
  element.textContent = text;
  element.className = className;
  return element;
}

function heading(text: string) {
  const element = document.createElement('h3');
  element.textContent = text;
  element.tabIndex = -1;
  return element;
}

export function quizPanel(progress: MissionProgress, content: GameContent) {
  const { store } = progress;
  const rules = new Map(
    content.przepisy.przepisy.map((rule) => [rule.id, rule]),
  );
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog quiz-panel';
  dialog.setAttribute('aria-labelledby', 'quiz-title');

  const header = document.createElement('header');
  const face = document.createElement('span');
  face.className = 'dialogue-portrait';
  face.style.backgroundImage = `url("${portrait}")`;
  face.setAttribute('aria-hidden', 'true');
  const title = document.createElement('h2');
  title.id = 'quiz-title';
  title.textContent = labels.title;
  const close = button(labels.close, () => dialog.close());
  dialog.addEventListener('close', () => audio.stopReading('lesson'));
  close.autofocus = true;
  header.append(face, title, close);

  const body = document.createElement('div');
  const notice = paragraph('', 'quiz-save-notice');
  notice.setAttribute('role', 'status');
  dialog.append(header, body, notice);

  const streak = () => `${labels.streak} · ${store.profile.quiz.streak}`;
  const updateNotice = () => {
    notice.textContent = progressNotice(progress);
    notice.hidden = !notice.textContent;
  };

  function showModes() {
    updateNotice();
    if (!progress.unlocks(content).has('quiz')) {
      body.replaceChildren(paragraph(labels.locked));
      return;
    }
    const available = dueQuestions(
      content.pytania.pytania,
      store.profile.quiz.cards,
      localDay(new Date()),
    );
    const max = Math.min(available.length, content.balans.quiz.szybki_pytan);
    const quick = button(`${labels.quick} · ${max}`, () => start());
    quick.className = 'quiz-primary';
    const modules = document.createElement('div');
    modules.className = 'quiz-modules';
    for (const module of moduleId.options) {
      const count = available.filter(
        (question) => question.modul === module,
      ).length;
      modules.append(
        button(`${ui.skillMap.modules[module]} · ${count}`, () =>
          start(module),
        ),
      );
    }
    body.replaceChildren(
      heading(labels.chooseMode),
      paragraph(`${labels.ready} · ${available.length}`, 'quiz-meta'),
      quick,
      heading(labels.modules),
      modules,
      paragraph(streak(), 'quiz-meta'),
    );
    quick.focus();
  }

  function start(module?: ModuleId) {
    const eligible = dueQuestions(
      content.pytania.pytania,
      store.profile.quiz.cards,
      localDay(new Date()),
    );
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const questions = drawQuestions(
      module
        ? eligible.filter((question) => question.modul === module)
        : eligible,
      store.profile.quiz.cards,
      (rule) => progress.ruleMastery(rule),
      content.balans.mastery,
      seed,
      module ? undefined : content.balans.quiz.szybki_pytan,
    );
    const mode = module ? ui.skillMap.modules[module] : labels.quick;
    if (!questions.length) {
      const message = heading(mode);
      body.replaceChildren(
        message,
        paragraph(labels.caughtUp),
        button(labels.repeat, showModes),
      );
      message.focus();
      return;
    }

    quizQuestions({
      body,
      dialog,
      mode,
      questions,
      seed,
      answer(question, answer, correct) {
        const result = progress.answerPracticeQuestion(
          content,
          question,
          answer,
        );
        const feedback = document.createElement('div');
        feedback.className = 'quiz-feedback';
        feedback.toggleAttribute('data-incorrect', !correct);
        feedback.append(
          paragraph(
            correct ? labels.correct : labels.incorrect,
            'quiz-feedback-title',
          ),
        );
        if (!correct)
          feedback.append(paragraph(question.odpowiedzi[question.poprawna]!));
        const detail = quizExplanationLine(rules.get(question.przepisy[0]!)!);
        feedback.append(paragraph(detail.text));
        audio.read('lesson', detail);
        if (result.achievements.length) audio.play('unlock');
        for (const achievement of result.achievements)
          feedback.append(
            paragraph(`${labels.achievement} · ${achievement.nazwa}`),
          );
        void store.flush().then(updateNotice);
        return feedback;
      },
      finish(correct) {
        audio.stopReading('lesson');
        const result = heading(labels.finished);
        body.replaceChildren(
          result,
          paragraph(
            `${labels.score} · ${correct} / ${questions.length}`,
            'quiz-score',
          ),
          paragraph(streak(), 'quiz-meta'),
          button(labels.repeat, showModes),
        );
        result.focus();
      },
    });
  }

  const open = button(labels.title, () => {
    dialog.showModal();
    showModes();
  });
  open.setAttribute('aria-haspopup', 'dialog');
  return { button: open, dialog };
}

export function quizQuestions({
  body,
  dialog,
  mode,
  questions,
  seed,
  answer,
  finish,
}: {
  body: HTMLElement;
  dialog: HTMLDialogElement;
  mode: string;
  questions: readonly QuizQuestion[];
  seed: number;
  answer?: (
    question: QuizQuestion,
    index: number,
    correct: boolean,
  ) => HTMLElement;
  finish: (correct: number) => void;
}) {
  let correct = 0;
  function showQuestion(index: number) {
    const question = questions[index]!;
    const prompt = heading(question.pytanie);
    prompt.className = 'quiz-prompt';
    const step = paragraph(
      `${mode} · ${labels.question} ${index + 1} / ${questions.length}`,
      'quiz-meta',
    );
    const meter = document.createElement('progress');
    meter.max = questions.length;
    meter.value = index;
    meter.setAttribute('aria-label', step.textContent);
    const answers = document.createElement('div');
    answers.className = 'quiz-answers';
    let answered = false;
    for (const option of answerOrder(question, seed)) {
      answers.append(
        button(question.odpowiedzi[option]!, () => {
          if (answered) return;
          answered = true;
          const isCorrect = option === question.poprawna;
          if (isCorrect) correct++;
          const last = index + 1 === questions.length;
          const advance = () => {
            if (last) finish(correct);
            else showQuestion(index + 1);
          };
          const feedback = answer?.(question, option, isCorrect);
          if (!feedback) {
            advance();
            return;
          }
          meter.value = index + 1;
          const next = button(last ? labels.result : labels.next, advance);
          next.className = 'quiz-primary';
          next.setAttribute('aria-describedby', 'quiz-answer-feedback');
          feedback.id = 'quiz-answer-feedback';
          feedback.tabIndex = -1;
          answers.replaceChildren(feedback, next);
          feedback.focus({ preventScroll: true });
          feedback.scrollIntoView({ block: 'start' });
        }),
      );
    }
    const questionText = document.createElement('div');
    questionText.append(step, meter, prompt);
    const { element } = questionPrompt(questionText, question.obrazek);
    body.replaceChildren(element, answers);
    dialog.scrollTop = 0;
    body.scrollTop = 0;
    prompt.focus();
    if (answer) audio.read('lesson', questionVoiceLine(question, 'pytanie'));
  }
  showQuestion(0);
}
