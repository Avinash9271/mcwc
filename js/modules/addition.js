export const additionModule = {
    name: 'Addition',
    generateProblem() {
        const num1 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const num2 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        return {
            question: `${num1} + ${num2}`,
            answer: (num1 + num2).toString(),
            display: `${num1} + ${num2}`
        };
    },
    
    // Generate a problem similar to a previously difficult one
    generateSimilarProblem(problem) {
        // Parse the numbers from the question (e.g., "1234 + 5678")
        const match = problem.problem.match(/(\d+)\s*\+\s*(\d+)/);
        if (!match) {
            // If unable to parse, fall back to random
            return this.generateProblem();
        }
        
        // Extract the original numbers
        const origNum1 = parseInt(match[1]);
        const origNum2 = parseInt(match[2]);
        
        // Generate similar numbers (within ±10% of originals)
        const variance1 = Math.floor(origNum1 * 0.1); // 10% variance
        const variance2 = Math.floor(origNum2 * 0.1); // 10% variance
        
        // Create numbers within that range
        const num1 = origNum1 + Math.floor(Math.random() * variance1 * 2) - variance1;
        const num2 = origNum2 + Math.floor(Math.random() * variance2 * 2) - variance2;
        
        // Ensure they're at least 100
        const finalNum1 = Math.max(100, num1);
        const finalNum2 = Math.max(100, num2);
        
        return {
            question: `${finalNum1} + ${finalNum2}`,
            answer: (finalNum1 + finalNum2).toString(),
            display: `${finalNum1} + ${finalNum2}`
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 