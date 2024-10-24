import {
  addScore,
  gameOverAnimation,
  redraw,
  setAnimationStatus,
} from "../script.js";

const card = document.querySelector(".question");
const gameplay = document.querySelectorAll(".gameplay");
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

let correctIndex = -1;
/**
 * @returns {void}
 */
export function popupRandom() {
  card.style.background = "#ffffffa0";
  setAnimationStatus(true);
  const question = getRandomQuestion();
  const list = [...question.incorrect, question.answer]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
  for (let i = 0; i < 4; i++) {
    if (list[i] == question.answer) {
      correctIndex = i;
      break;
    }
  }
  card.innerHTML =
    question.question +
    "\n" +
    list
      .map(
        (x, i) =>
          `<div class="answer${i}">${(i + 1).toString() + ". " + x}</div>`
      )
      .join("\n");
  let answer0 = card.querySelector(".answer0");
  let answer1 = card.querySelector(".answer1");
  let answer2 = card.querySelector(".answer2");
  let answer3 = card.querySelector(".answer3");
  answer0.onclick = () => checkResponse(0);
  answer1.onclick = () => checkResponse(1);
  answer2.onclick = () => checkResponse(2);
  answer3.onclick = () => checkResponse(3);
  card.style.visibility = "visible";
  gameplay.forEach((x) => {
    x.classList.remove("clear");
    x.classList.add("blurred");
  });
}

function closePopup(correct) {
  card.style.background = correct ? "#00ff00a0" : "#ff0000a0";
  setTimeout(() => {
    gameplay.forEach((x) => {
      x.classList.remove("blurred");
      x.classList.add("clear");
    });
    card.style.visibility = "hidden";
    if (correct) {
      setAnimationStatus(false);
    } else {
      gameOverAnimation();
    }
  }, 300);
}

/**
 * @param {number} index
 * @returns {void}
 */
export function checkResponse(index) {
  if (getCorrectness(index)) {
    let totalPoints = 250;
    let totalTime = 1000;
    let intervals = 10;
    for (let i = 0; i < intervals; i++) {
      setTimeout(() => {
        addScore(totalPoints / intervals);
        redraw();
      }, totalTime / intervals);
    }
    closePopup(true);
  } else {
    closePopup(false);
  }
}

function getCorrectness(index) {
  if (index == correctIndex) {
    return true;
  }
  return false;
}
