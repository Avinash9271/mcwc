export const multiplicationModule = {
    name: 'Multiplication',
    // Add difficulty levels
    difficulty: '3x3', // Default: 3x3 (three-digit by three-digit)
    
    setDifficulty(level) {
        if (['2x2', '3x3', '4x4', '8x8'].includes(level)) {
            this.difficulty = level;
        }
    },
    
    generateProblem() {
        let num1, num2;
        
        // Generate numbers based on difficulty level
        switch (this.difficulty) {
            case '2x2':
                num1 = Math.floor(Math.random() * 90) + 10; // 10-99
                num2 = Math.floor(Math.random() * 90) + 10; // 10-99
                break;
            case '3x3':
                num1 = Math.floor(Math.random() * 900) + 100; // 100-999
                num2 = Math.floor(Math.random() * 900) + 100; // 100-999
                break;
            case '4x4':
                num1 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
                num2 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
                break;
            case '8x8':
                // For 8x8, generate 8-digit numbers
                num1 = Math.floor(Math.random() * 90000000) + 10000000; // 10000000-99999999
                num2 = Math.floor(Math.random() * 90000000) + 10000000; // 10000000-99999999
                break;
            default:
                num1 = Math.floor(Math.random() * 900) + 100; // 100-999
                num2 = Math.floor(Math.random() * 900) + 100; // 100-999
        }
        
        const answer = num1 * num2;
        const isLargeNumbers = num1 >= 100 && num2 >= 100;
        
        return {
            question: `${num1} × ${num2}`,
            answer: answer.toString(),
            display: `${num1} × ${num2}`,
            verticalDisplay: `${num1}<br>${num2}<br>———`,
            isLargeNumbers: isLargeNumbers,
            difficulty: this.difficulty // Include difficulty in the problem
        };
    },
    
    // Generate a problem similar to a previously difficult one
    generateSimilarProblem(problem) {
        // Use the difficulty from the original problem if available
        if (problem.difficulty) {
            this.difficulty = problem.difficulty;
        }
        
        // Parse the numbers from the question (e.g., "123 × 456")
        const match = problem.problem.match(/(\d+)\s*×\s*(\d+)/);
        if (!match) {
            // If unable to parse, fall back to random
            return this.generateProblem();
        }
        
        // Extract the original numbers
        const origNum1 = parseInt(match[1]);
        const origNum2 = parseInt(match[2]);
        
        // Generate similar numbers (within ±10% of originals)
        const variance1 = Math.max(5, Math.floor(origNum1 * 0.1)); // 10% variance, min 5
        const variance2 = Math.max(5, Math.floor(origNum2 * 0.1)); // 10% variance, min 5
        
        // Create numbers within that range
        const num1 = origNum1 + Math.floor(Math.random() * variance1 * 2) - variance1;
        const num2 = origNum2 + Math.floor(Math.random() * variance2 * 2) - variance2;
        
        // Ensure minimum values based on difficulty
        let minValue;
        switch (this.difficulty) {
            case '2x2': minValue = 10; break;
            case '3x3': minValue = 100; break;
            case '4x4': minValue = 1000; break;
            case '8x8': minValue = 10000000; break;
            default: minValue = 10;
        }
        
        const finalNum1 = Math.max(minValue, num1);
        const finalNum2 = Math.max(minValue, num2);
        
        const answer = finalNum1 * finalNum2;
        const isLargeNumbers = finalNum1 >= 100 && finalNum2 >= 100;
        
        return {
            question: `${finalNum1} × ${finalNum2}`,
            answer: answer.toString(),
            display: `${finalNum1} × ${finalNum2}`,
            verticalDisplay: `${finalNum1}<br>${finalNum2}<br>———`,
            isLargeNumbers: isLargeNumbers,
            difficulty: this.difficulty
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 