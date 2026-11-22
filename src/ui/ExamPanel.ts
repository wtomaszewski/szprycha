import { audio } from '../audio/GameAudio';
import ola from '../../assets/generated/portraits/sierzant_ola.png?url';
import kazik from '../../assets/generated/portraits/pan_kazik.png?url';
import turbo from '../../assets/generated/portraits/turbo.png?url';
import dj from '../../assets/generated/portraits/dj_dzwonek.png?url';
import type { GameContent } from '../content/schemas';
import { translate, ui } from '../core/presentation';
import {
  drawExamQuestions,
  evaluateExam,
  licenceRequirements,
  theoryPassed,
  type ExamAttempt,
  type ExamResult,
} from '../gameplay/exam/exam';
import type { MissionProgress } from '../gameplay/MissionProgress';
import { showCertificate } from './Certificate';
import { quizQuestions } from './QuizPanel';
import { progressNotice } from './SkillMap';

const labels = ui.exam;
const percent = new Intl.NumberFormat('pl-PL', {
  style: 'percent',
  maximumFractionDigits: 2,
});
const points = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });

function text<K extends keyof HTMLElementTagNameMap>(tag: K, value: string) {
  return Object.assign(document.createElement(tag), { textContent: value });
}

function button(label: string, action: () => void) {
  const button = text('button', label);
  button.type = 'button';
  button.addEventListener('click', action);
  return button;
}

function portrait(url: string) {
  const face = document.createElement('span');
  face.className = 'dialogue-portrait';
  face.style.backgroundImage = `url("${url}")`;
  face.setAttribute('aria-hidden', 'true');
  return face;
}

export function examPanel(
  progress: MissionProgress,
  content: GameContent,
  startPlac: (attempt?: ExamAttempt) => void,
) {
  const balance = content.balans.licencja;
  const profile = progress.store.profile;
  const dialog = document.createElement('dialog');
  dialog.className = 'game-dialog quiz-panel exam-panel';
  dialog.setAttribute('aria-labelledby', 'exam-title');
  const header = document.createElement('header');
  const title = text('h2', labels.title);
  title.id = 'exam-title';
  header.append(
    portrait(ola),
    title,
    button(ui.quiz.close, () => dialog.close()),
  );
  const body = document.createElement('div');
  dialog.append(header, body);

  function certificateButton() {
    return button(labels.certificate, () => showCertificate(profile, dialog));
  }

  function practice() {
    dialog.close();
    startPlac();
  }

  function showLobby() {
    const { cities, rankMet, missingModules } = licenceRequirements(
      profile,
      content,
    );
    const city =
      cities.find((city) => city === progress.selectedCity) ?? cities[0];
    const eligible = !!city && rankMet && !missingModules.length;
    const status = document.createElement('ul');
    status.className = 'exam-conditions';
    for (const [condition, met] of [
      [labels.campaign, !!city],
      [labels.rank, rankMet],
      [
        labels.mastery.replace('{min}', String(balance.mastery_min_modul)),
        !missingModules.length,
      ],
    ] as const) {
      const item = text('li', condition);
      item.append(text('strong', met ? labels.ready : labels.missing));
      status.append(item);
    }
    const start = button(labels.startTheory, () => {
      if (!city || !eligible) return;
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
      const questions = drawExamQuestions(content, seed);
      quizQuestions({
        body,
        dialog,
        mode: labels.theory,
        questions,
        seed,
        finish(correct) {
          const theory = { correct, total: questions.length };
          const passed = theoryPassed(theory, balance);
          const heading = text(
            'h3',
            passed ? labels.theoryPassed : labels.theoryFailed,
          );
          heading.tabIndex = -1;
          body.replaceChildren(
            heading,
            text(
              'p',
              `${correct} / ${theory.total} · ${normalThreshold(balance.teoria_prog)}`,
            ),
          );
          if (passed)
            body.append(
              button(labels.startPractice, () => {
                dialog.close();
                startPlac({ city, theory });
              }),
            );
          body.append(button(labels.back, showLobby));
          heading.focus();
        },
      });
    });
    start.disabled = !eligible;
    body.replaceChildren(
      text('p', labels.intro),
      text(
        'p',
        `${labels.theory} ${percent.format(balance.teoria_prog)} · ${labels.practice} ${percent.format(balance.plac_prog)}`,
      ),
      status,
    );
    if (missingModules.length)
      body.append(
        text(
          'p',
          missingModules
            .map((module) => ui.skillMap.modules[module])
            .join(' · '),
        ),
      );
    if (city)
      body.append(
        text('p', `${labels.ride} · ${translate(`cityPicker.${city}`)}`),
      );
    const actions = document.createElement('div');
    actions.className = 'exam-actions';
    actions.append(start, button(labels.rehearsal, practice));
    if (profile.licence) actions.prepend(certificateButton());
    body.append(actions);
  }

  function showResult(result: ExamResult) {
    const { practice, passed } = evaluateExam(result, content.balans);
    const alreadyEarned = progress.store.profile.licencePassed;
    const earned = passed && progress.recordLicence(content, result);
    if (earned && !alreadyEarned) audio.play('unlock');
    const heading = text(
      'h3',
      earned
        ? labels.licence
        : passed
          ? labels.conditionsChanged
          : labels.failed,
    );
    heading.tabIndex = -1;
    const scores = document.createElement('ul');
    scores.className = 'exam-conditions';
    scores.append(
      text(
        'li',
        `${labels.theory} · ${result.theory.correct} / ${result.theory.total} · ${normalThreshold(balance.teoria_prog)}`,
      ),
      text(
        'li',
        `${labels.practice} · ${points.format(practice.points)} / ${points.format(practice.max)} · ${normalThreshold(balance.plac_prog)}`,
      ),
    );
    if (result.ride)
      scores.append(
        text(
          'li',
          `${labels.ride} · ${labels.rideScore.replace('{minor}', String(result.ride.minor)).replace('{major}', String(result.ride.major))}`,
        ),
      );
    body.replaceChildren(heading, scores);
    if (earned) {
      const celebration = document.createElement('div');
      celebration.className = 'exam-celebration';
      for (const [image, speaker, line] of [
        [kazik, 'pan_kazik', labels.kazik],
        [turbo, 'turbo', labels.turbo],
        [dj, 'dj_dzwonek', labels.dj],
      ] as const) {
        const row = document.createElement('div');
        const caption = document.createElement('div');
        caption.append(
          text('strong', translate(`dialogi.postacie.${speaker}`)),
          text('p', line),
        );
        row.append(portrait(image), caption);
        celebration.append(row);
      }
      body.append(celebration, text('p', labels.reward), certificateButton());
      const notice = text('p', '');
      notice.setAttribute('role', 'status');
      body.append(notice);
      void progress.store.flush().then(() => {
        notice.textContent = progressNotice(progress);
      });
    }
    body.append(button(labels.back, showLobby));
    dialog.showModal();
    heading.focus();
  }

  const open = button(labels.menu, () => {
    showLobby();
    dialog.showModal();
  });
  open.setAttribute('aria-haspopup', 'dialog');
  return { button: open, dialog, showResult };
}

function normalThreshold(threshold: number) {
  return `${ui.exam.threshold} ${percent.format(threshold)}`;
}
