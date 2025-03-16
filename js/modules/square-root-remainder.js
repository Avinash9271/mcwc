export const squareRootRemainderModule = {
    name: 'Square Root Remainder',
    generateProblem() {
        // Generate a random 6-digit number
        const x = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
        
        // Calculate the closest 10 multiplied square
        const sqrtX100 = Math.sqrt(x / 100);
        const closestSquare = Math.floor(10 * sqrtX100) ** 2;
        
        // Calculate the remainder
        const remainder = x - closestSquare;
        
        return {
            question: `${x}`,
            answer: remainder.toString(),
            display: `${x}`
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 