import { moduleId, type GameContent } from '../content/schemas';
import { translate, ui } from '../core/presentation';
import type { MissionProgress } from '../gameplay/MissionProgress';
import type { QuizQuestion } from '../gameplay/quiz';
import type { ModuleId } from '../progression/mastery';
import { progressNotice } from './SkillMap';
import { signIllustration } from './SignIllustration';

const labels = ui.quiz;
const sentences = new Intl.Segmenter('pl', { granularity: 'sentence' });

function button(label: string, action: () => void) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', action);
  return element;
}

function paragraph(text: string) {
  const element = document.createElement('p');
  element.textContent = text;
  return element;
}

function heading(text: string) {
  const element = document.createElement('h3');
  element.tabIndex = -1;
  element.textContent = text;
  return element;
}

function explanation(rule: GameContent['przepisy']['przepisy'][number]) {
  const description = [...sentences.segment(rule.dla_dziecka)];
  if (description.length === 1 && rule.dla_dziecka.length <= 140)
    return rule.dla_dziecka;
  return sentences
    .segment(rule.feedback)
    [Symbol.iterator]()
    .next()
    .value!.segment.trim();
}

export function quizDialog(progress: MissionProgress, content: GameContent) {
  const rules = new Map(
    content.przepisy.przepisy.map((rule) => [rule.id, rule]),
  );
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog quiz-dialog';
  const title = document.createElement('h2');
  title.id = 'quiz-title';
  title.textContent = labels.title;
  dialog.setAttribute('aria-labelledby', title.id);
  const close = button(ui.skillMap.close, () => dialog.close());
  const header = document.createElement('header');
  header.append(title, close);
  const body = document.createElement('div');
  dialog.append(header, body);

  function show(heading: HTMLElement, ...elements: HTMLElement[]) {
    body.replaceChildren(heading, ...elements);
    dialog.scrollTop = 0;
    heading.focus();
  }

  function showModes() {
    if (!progress.unlocks(content).has('quiz')) {
      show(heading(labels.locked));
      if (dialog.open) close.focus();
      return;
    }
    const modules = document.createElement('div');
    modules.className = 'quiz-modules';
    for (const id of moduleId.options)
      modules.append(
        button(`${id} · ${ui.skillMap.modules[id]}`, () => begin(id)),
      );
    show(
      heading(labels.choose),
      button(labels.quick, () => begin()),
      heading(labels.study),
      modules,
    );
  }

  function begin(module?: ModuleId) {
    const questions = progress.quizQuestions(
      content,
      Math.floor(Math.random() * 2 ** 32),
      module,
    );
    if (!questions.length) {
      show(heading(labels.empty), button(labels.choose, showModes));
      return;
    }
    let score = 0;
    const describeCount = (count: number) => `${count} / ${questions.length}`;

    function showQuestion(question: QuizQuestion, index: number) {
      const prompt = heading(question.pytanie);
      const label = paragraph(`${labels.question} ${describeCount(index + 1)}`);
      label.className = 'quiz-count';
      const signs = document.createElement('div');
      signs.className = 'quiz-signs';
      for (const code of question.obrazek?.split('+') ?? []) {
        const illustration = signIllustration(
          code,
          translate(`quiz.signDescriptions.${code}`),
        );
        if (illustration) signs.append(illustration);
      }
      const answers = document.createElement('fieldset');
      answers.className = 'quiz-answers';
      answers.setAttribute('aria-label', labels.answers);
      const choices = question.odpowiedzi.map((answer, n) =>
        button(answer, () => void answerQuestion(n)),
      );
      answers.append(...choices);
      const feedback = document.createElement('div');
      feedback.setAttribute('role', 'status');
      feedback.className = 'quiz-feedback';
      const next = questions[index + 1];
      const advance = button(next ? labels.next : labels.result, () => {
        if (next) showQuestion(next, index + 1);
        else
          show(
            heading(labels.finished),
            paragraph(`${labels.score} · ${describeCount(score)}`),
            paragraph(
              `${labels.streak} · ${progress.store.profile.quiz.streak}`,
            ),
            paragraph(progressNotice(progress)),
            button(labels.choose, showModes),
          );
      });

      async function answerQuestion(selected: number) {
        if (answers.disabled) return;
        answers.disabled = true;
        const correct = selected === question.poprawna;
        if (correct) score++;
        choices[question.poprawna]!.classList.add('quiz-answer-correct');
        if (!correct) choices[selected]!.classList.add('quiz-answer-incorrect');
        const outcome = document.createElement('strong');
        outcome.textContent = correct
          ? labels.correct
          : `${labels.incorrect} · ${question.odpowiedzi[question.poprawna]}`;
        const rule = rules.get(question.przepisy[0]!)!;
        const tip = paragraph(`${labels.mentor} · ${explanation(rule)}`);
        feedback.append(outcome, tip);
        const save = progress.recordStudyAnswer(content, question, correct);
        advance.disabled = true;
        body.append(advance);
        await save;
        if (advance.isConnected && dialog.open) {
          advance.disabled = false;
          advance.focus();
        }
      }
      show(prompt, label, signs, answers, feedback);
    }

    showQuestion(questions[0]!, 0);
  }

  const open = button(labels.title, () => {
    dialog.showModal();
    showModes();
  });
  open.className = 'menu-quiz';
  open.setAttribute('aria-haspopup', 'dialog');
  return { open, dialog };
}
