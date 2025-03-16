const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const calendarModule = {
    name: 'Calendar',
    generateProblem() {
        const year = Math.floor(Math.random() * 501) + 1600; // 1600 to 2100
        const month = Math.floor(Math.random() * 12) + 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        const day = Math.floor(Math.random() * daysInMonth) + 1;
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        return {
            question: `${year} ${MONTHS[month-1]} ${day}`,
            answer: dayOfWeek.toString(),
            display: `${year} ${MONTHS[month-1]} ${day}`
        };
    },

    validateAnswer(userAnswer, correctAnswer) {
        const parsed = parseInt(userAnswer);
        return !isNaN(parsed) && parsed.toString() === correctAnswer;
    }
}; 