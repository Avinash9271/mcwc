export const calendarDayModule = {
    name: 'Calendar Day',
    generateProblem() {
        // Generate a random two-digit number (10-99)
        const x = Math.floor(Math.random() * 90) + 10;
        
        // Calculate the answer: (2 + X + floor(X / 4)) % 7
        const answer = (2 + x + Math.floor(x / 4)) % 7;
        
        return {
            question: `${x}`,
            answer: answer.toString(),
            display: `${x}`
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 