export const squareRootModule = {
    generateProblem() {
        const root = Math.floor(Math.random() * 90) + 10; // 10-99
        const square = root * root;
        return {
            question: `√${square}`,
            answer: root.toString(),
            display: `√${square}`
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 