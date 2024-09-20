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

export const questions = [];

export function addQuestion() {}
