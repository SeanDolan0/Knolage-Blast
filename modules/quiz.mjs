const card = document.querySelector(".question");
const gameplay = document.querySelector(".gameplay");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

export class Question {
  /**
   * @param {string} question
   * @param {string} answer
   * @param {string[]} incorrect
   */
  constructor(question, answer, incorrect) {
    this.question = question;
    this.answer = answer;
    this.incorrect = incorrect;
  }
}

/** @type {Question[]} */
export const questions = [];

/**
 * @param {string} question
 * @param {string} answer
 * @param {string[]} incorrect
 * @returns {void}
 */
export function addQuestion(question, answer, incorrect) {
  const q = new Question(question, answer, incorrect);
  questions.push(q);
}

/**
 * @returns {Question}
 */
export function getRandomQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * @returns {void}
 */
export function popupRandom() {
  const question = getRandomQuestion();
  const list = [...question.incorrect, question.answer]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
  card.innerText =
    question.question +
    "\n" +
    list.map((x, i) => (i + 1).toString() + ". " + x).join("\n");
  card.style.visibility = "visible";
  gameplay.style.filter = "blur(8px)";
}
