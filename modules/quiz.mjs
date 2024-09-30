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
