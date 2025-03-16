export const squareRootRangeModule = {
    name: 'Square Root Range',
    minRange: 70,
    maxRange: 80,
    
    setRange(min, max) {
        this.minRange = min;
        this.maxRange = max;
    },
    
    generateProblem() {
        // Generate a random number within the specified range
        const range = this.maxRange - this.minRange + 1;
        const root = Math.floor(Math.random() * range) + this.minRange;
        
        // Calculate the square
        const square = root * root;
        
        return {
            question: `${root}²`,
            answer: square.toString(),
            display: `${root}²`,
            range: `${this.minRange}-${this.maxRange}`
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 