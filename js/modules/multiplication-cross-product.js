export const multiplicationCrossProductModule = {
    name: '8×8 Cross Sum',
    generateProblem() {
        // Generate two 8-digit numbers
        const num1 = Math.floor(Math.random() * 90000000) + 10000000; // 10000000-99999999
        const num2 = Math.floor(Math.random() * 90000000) + 10000000; // 10000000-99999999
        
        // Extract individual digits
        const digits1 = num1.toString().padStart(8, '0').split('').map(Number);
        const digits2 = num2.toString().padStart(8, '0').split('').map(Number);
        
        // Calculate cross product sum (similar to 4×4 but with 8 digits)
        let crossSum = 0;
        for (let i = 0; i < 8; i++) {
            crossSum += digits1[i] * digits2[7-i];
        }
        
        return {
            question: `${num1} ${num2}`,
            answer: crossSum.toString(),
            display: `${num1}<br>${num2}<br>———`,
            verticalDisplay: `${num1}<br>${num2}<br>———`,
            isLargeNumbers: true
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 