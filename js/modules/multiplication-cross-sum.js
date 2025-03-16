export const multiplicationCrossSumModule = {
    name: '4×4 Cross Sum',
    generateProblem() {
        // Generate two 4-digit numbers
        const num1 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const num2 = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        
        // Extract individual digits
        const digits1 = num1.toString().padStart(4, '0').split('').map(Number);
        const digits2 = num2.toString().padStart(4, '0').split('').map(Number);
        
        // Calculate cross product sum: ah+bg+cf+de
        const a = digits1[0], b = digits1[1], c = digits1[2], d = digits1[3];
        const e = digits2[0], f = digits2[1], g = digits2[2], h = digits2[3];
        
        const crossSum = (a * h) + (b * g) + (c * f) + (d * e);
        
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