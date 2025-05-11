export class GameManager {
    constructor() {
        this.currentProblem = null;
        this.problemCount = 0;
        this.startTime = null;
        this.correctAnswers = 0;
        this.timer = null;
        this.currentModule = null;
        this.gameMode = 'timed'; // 'timed' or 'count'
        this.gameDuration = 60; // default 1 minute
        this.mistakes = [];
        this.problemTimings = [];
        this.problemsHistory = []; // Track all problems for history view
        this.lastProblemStartTime = null;
        
        // Smart generator settings with default values
        this.useSmartGenerator = false;
        this.lookbackDays = 1;
        this.probSlowest = 0.25; // P(A)
        this.probMistakes = 0.25; // P(B)
        
        // Time filter settings with default values
        this.useTimeFilter = false;
        this.timeThreshold = 2; // seconds
        
        // Reverse input setting
        this.reverseInput = false;
        
        // Cache for historical problems
        this.slowestProblems = [];
        this.mistakeProblems = [];
        this.hasLoadedHistoricalData = false;
        
        // Flag to track if settings have been loaded
        this.settingsLoaded = false;
    }

    // Async method to initialize settings from IndexedDB
    async initializeSettings() {
        if (this.settingsLoaded) return;
        
        try {
            // Try to get settings from IndexedDB
            this.gameDuration = await this.getSettingFromIndexedDB('lastGameDuration', 60);
            this.useSmartGenerator = await this.getSettingFromIndexedDB('useSmartGenerator', false);
            this.lookbackDays = await this.getSettingFromIndexedDB('lookbackDays', 1);
            this.probSlowest = await this.getSettingFromIndexedDB('probSlowest', 0.25);
            this.probMistakes = await this.getSettingFromIndexedDB('probMistakes', 0.25);
            this.useTimeFilter = await this.getSettingFromIndexedDB('useTimeFilter', false);
            this.timeThreshold = await this.getSettingFromIndexedDB('timeThreshold', 2);
            this.reverseInput = await this.getSettingFromIndexedDB('reverseInput', false);
            
            this.settingsLoaded = true;
            console.log('GameManager settings loaded from IndexedDB');
        } catch (error) {
            console.error('Error loading settings from IndexedDB:', error);
            // If there's an error, we'll keep using the default values
        }
    }
    
    // Helper method to get a setting from IndexedDB
    getSettingFromIndexedDB(key, defaultValue) {
        return new Promise((resolve, reject) => {
            // Check if IndexedDB is available in the window object
            if (!window.indexedDB) {
                console.log(`IndexedDB not supported, using default value for ${key}`);
                resolve(defaultValue);
                return;
            }
            
            // Try to open the database
            const dbName = 'MentalMathDB';
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                console.error('Error opening IndexedDB:', event.target.error);
                resolve(defaultValue);
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                // Check if the settings store exists
                if (!db.objectStoreNames.contains('mathSettings')) {
                    console.log('mathSettings store not found in IndexedDB');
                    resolve(defaultValue);
                    return;
                }
                
                // Get the setting from the store
                const transaction = db.transaction(['mathSettings'], 'readonly');
                const store = transaction.objectStore('mathSettings');
                const getRequest = store.get(key);
                
                getRequest.onsuccess = () => {
                    if (getRequest.result) {
                        resolve(getRequest.result.value);
                    } else {
                        resolve(defaultValue);
                    }
                };
                
                getRequest.onerror = (event) => {
                    console.error(`Error getting setting ${key} from IndexedDB:`, event.target.error);
                    resolve(defaultValue);
                };
            };
        });
    }

    setModule(module) {
        this.currentModule = module;
        // Reset historical data cache when module changes
        this.hasLoadedHistoricalData = false;
    }

    setGameDuration(seconds) {
        this.gameDuration = seconds;
        // Use the global saveSettingToIndexedDB function instead of localStorage
        if (window.saveSettingToIndexedDB) {
            window.saveSettingToIndexedDB('lastGameDuration', seconds);
        }
    }
    
    // Set smart generator settings
    setSmartGeneratorSettings(useSmartGenerator, lookbackDays, probSlowest, probMistakes, useTimeFilter, timeThreshold) {
        this.useSmartGenerator = useSmartGenerator;
        this.lookbackDays = lookbackDays;
        this.probSlowest = probSlowest;
        this.probMistakes = probMistakes;
        this.useTimeFilter = useTimeFilter;
        this.timeThreshold = timeThreshold;
        
        // Save settings to IndexedDB instead of localStorage
        if (window.saveSettingToIndexedDB) {
            window.saveSettingToIndexedDB('useSmartGenerator', useSmartGenerator);
            window.saveSettingToIndexedDB('lookbackDays', lookbackDays);
            window.saveSettingToIndexedDB('probSlowest', probSlowest);
            window.saveSettingToIndexedDB('probMistakes', probMistakes);
            window.saveSettingToIndexedDB('useTimeFilter', useTimeFilter);
            window.saveSettingToIndexedDB('timeThreshold', timeThreshold);
        }
        
        // Reset historical data cache
        this.hasLoadedHistoricalData = false;
    }
    
    // Set reverse input setting
    setReverseInput(reverseInput) {
        this.reverseInput = reverseInput;
        
        // Save setting to IndexedDB
        if (window.saveSettingToIndexedDB) {
            window.saveSettingToIndexedDB('reverseInput', reverseInput);
        }
    }
    
    // Load historical data for the current module
    async loadHistoricalData() {
        if (this.hasLoadedHistoricalData) return;
        
        console.log('Loading historical data for smart generator...');
        
        try {
            // Get all history entries from IndexedDB
            const allScores = await this.getAllScoresFromIndexedDB();
            
            // Filter for current mode and specified lookback period
            const currentTime = new Date();
            const lookbackTime = new Date(currentTime);
            lookbackTime.setDate(lookbackTime.getDate() - this.lookbackDays);
            
            const relevantScores = allScores.filter(score => {
                const scoreDate = new Date(score.date);
                return score.mode === this.currentModule.name && 
                       scoreDate >= lookbackTime &&
                       score.problems && 
                       score.problems.length > 0;
            });
            
            // Reset arrays
            this.slowestProblems = [];
            this.mistakeProblems = [];
            
            // Apply time filter if enabled
            const minTimeThresholdMs = this.useTimeFilter ? (this.timeThreshold * 1000) : 0;
            
            // Process each session to extract slow problems and mistakes
            relevantScores.forEach(session => {
                if (!session.problems) return;
                
                // Filter problems based on time threshold if enabled
                const filteredProblems = this.useTimeFilter ? 
                    session.problems.filter(p => p.timeTaken && p.timeTaken >= minTimeThresholdMs) : 
                    session.problems;
                
                if (filteredProblems.length === 0) return;
                
                // Find slow problems (top 10%)
                const problemCount = filteredProblems.length;
                const sortedByTime = [...filteredProblems].sort((a, b) => (b.timeTaken || 0) - (a.timeTaken || 0));
                const slowCount = Math.max(1, Math.ceil(problemCount * 0.1));
                
                // Add slowest problems to the collection
                this.slowestProblems = [...this.slowestProblems, ...sortedByTime.slice(0, slowCount)];
                
                // Add mistakes to the collection
                const mistakes = filteredProblems.filter(p => p.isCorrect === false);
                this.mistakeProblems = [...this.mistakeProblems, ...mistakes];
            });
            
            console.log(`Loaded ${relevantScores.length} sessions from the last ${this.lookbackDays} days`);
            console.log(`Slowest problems: ${this.slowestProblems.length}`);
            console.log(`Mistake problems: ${this.mistakeProblems.length}`);
            
            if (this.useTimeFilter) {
                console.log(`Using time filter: Only problems ≥ ${this.timeThreshold}s`);
            }
            
            // Show popup if no problems found but settings indicate we should use them
            if (this.probSlowest > 0 && this.slowestProblems.length === 0 && 
                this.probMistakes > 0 && this.mistakeProblems.length === 0) {
                this.showNoProblemsFoundPopup();
            } else if (this.probSlowest > 0 && this.slowestProblems.length === 0 && this.probMistakes === 0) {
                this.showNoProblemsFoundPopup('slow');
            } else if (this.probMistakes > 0 && this.mistakeProblems.length === 0 && this.probSlowest === 0) {
                this.showNoProblemsFoundPopup('mistakes');
            }
            
            this.hasLoadedHistoricalData = true;
        } catch (error) {
            console.error('Error loading historical data:', error);
            // No need for fallback to localStorage anymore
            this.hasLoadedHistoricalData = true;
        }
    }
    
    // Helper method to get scores from IndexedDB
    getAllScoresFromIndexedDB() {
        return new Promise((resolve, reject) => {
            // Check if IndexedDB is available in the window object
            if (!window.indexedDB) {
                console.log('IndexedDB not supported, returning empty array');
                resolve([]);
                return;
            }
            
            // Try to open the database
            const dbName = 'MentalMathDB';
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                console.error('Error opening IndexedDB:', event.target.error);
                resolve([]);
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                // Check if the scores store exists
                if (!db.objectStoreNames.contains('mathScores')) {
                    console.log('mathScores store not found in IndexedDB');
                    resolve([]);
                    return;
                }
                
                // Get all scores from the store
                const transaction = db.transaction(['mathScores'], 'readonly');
                const store = transaction.objectStore('mathScores');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result);
                };
                
                getAllRequest.onerror = (event) => {
                    console.error('Error getting scores from IndexedDB:', event.target.error);
                    resolve([]);
                };
            };
        });
    }
    
    // Show a popup when no problems are found
    showNoProblemsFoundPopup(type = 'both') {
        let message = '';
        
        if (type === 'both') {
            message = 'No mistakes or slow problems found in your history. Random problems will be used instead.';
        } else if (type === 'slow') {
            message = 'No slow problems found in your history. Random problems will be used instead.';
        } else if (type === 'mistakes') {
            message = 'No mistakes found in your history. Random problems will be used instead.';
        }
        
        // Create popup element
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        popup.style.color = 'white';
        popup.style.padding = '20px';
        popup.style.borderRadius = '10px';
        popup.style.zIndex = '1000';
        popup.style.maxWidth = '80%';
        popup.style.textAlign = 'center';
        popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        popup.textContent = message;
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'OK';
        closeButton.style.marginTop = '15px';
        closeButton.style.padding = '8px 16px';
        closeButton.style.backgroundColor = '#2773b1';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => document.body.removeChild(popup);
        
        popup.appendChild(document.createElement('br'));
        popup.appendChild(closeButton);
        
        // Add to body
        document.body.appendChild(popup);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        }, 5000);
    }

    async startGame() {
        // Ensure settings are loaded before starting the game
        if (!this.settingsLoaded) {
            await this.initializeSettings();
        }
        
        this.problemCount = -1;
        this.correctAnswers = 0;
        this.startTime = Date.now();
        this.mistakes = [];
        this.problemTimings = [];
        this.problemsHistory = []; // Reset problem history
        
        // Load historical data if using smart generator
        if (this.useSmartGenerator) {
            await this.loadHistoricalData();
        }
        
        this.nextProblem();
        this.startTimer();
    }

    // Generate a problem based on historical performance
    generateSmartProblem() {
        // If we don't have enough historical data, fall back to random
        if (!this.slowestProblems.length && !this.mistakeProblems.length) {
            console.log('No historical data, using random problem');
            return this.currentModule.generateProblem();
        }
        
        // Normalize probabilities if needed
        let probSlow = this.probSlowest;
        let probMistake = this.probMistakes;
        let probRandom = 1 - probSlow - probMistake;
        
        // If the total exceeds 100%, scale them proportionally
        if (probSlow + probMistake > 1) {
            const total = probSlow + probMistake;
            probSlow = probSlow / total;  // Scale to proportion of total
            probMistake = probMistake / total;  // Scale to proportion of total
            probRandom = 0;  // No random problems in this case
            console.log(`Normalizing probabilities: Slow ${Math.round(probSlow*100)}%, Mistake ${Math.round(probMistake*100)}%, Random 0%`);
        } else {
            // Otherwise, random gets whatever is left of 100%
            probRandom = 1 - probSlow - probMistake;
            console.log(`Using probabilities: Slow ${Math.round(probSlow*100)}%, Mistake ${Math.round(probMistake*100)}%, Random ${Math.round(probRandom*100)}%`);
        }
        
        const random = Math.random();
        let selectedProblem = null;
        let problemSource = 'random'; // Default source
        
        // Try to select from slowest problems (weighted by normalized probSlow)
        if (random < probSlow && this.slowestProblems.length > 0) {
            console.log('Selecting from slowest problems');
            selectedProblem = this.slowestProblems[Math.floor(Math.random() * this.slowestProblems.length)];
            problemSource = 'slow';
        }
        // Try to select from mistakes (weighted by normalized probMistake)
        else if (random < probSlow + probMistake && this.mistakeProblems.length > 0) {
            console.log('Selecting from mistakes');
            selectedProblem = this.mistakeProblems[Math.floor(Math.random() * this.mistakeProblems.length)];
            problemSource = 'mistake';
        }
        
        // If using time filter but no problems match the time threshold, generate a random one
        if (!selectedProblem && this.useTimeFilter) {
            console.log(`No problems match the time threshold (≥ ${this.timeThreshold}s). Using random problem.`);
            const problem = this.currentModule.generateProblem();
            problem.source = problemSource;
            return problem;
        }
        
        // If we selected a historical problem, use it directly instead of generating a similar one
        if (selectedProblem) {
            console.log('Using exact historical problem:', selectedProblem.problem);
            console.log('Original problem took:', selectedProblem.timeTaken ? `${Math.round(selectedProblem.timeTaken/1000)}s` : 'unknown');
            
            // Create a problem object with the same structure as generated problems
            const problem = {
                question: selectedProblem.problem,
                answer: selectedProblem.answer,
                display: `${selectedProblem.problem} = `,
                source: problemSource
            };
            
            // Handle special cases for different modules
            if (this.currentModule.name === 'Multiplication') {
                // Check if it's a large number multiplication problem (contains 'x')
                if (selectedProblem.problem.includes('x') || selectedProblem.problem.includes('×')) {
                    const parts = selectedProblem.problem.split(/[x×]/);
                    if (parts.length === 2) {
                        const num1 = parseInt(parts[0].trim());
                        const num2 = parseInt(parts[1].trim());
                        if (!isNaN(num1) && !isNaN(num2) && (num1 >= 100 || num2 >= 100)) {
                            problem.isLargeNumbers = true;
                            problem.verticalDisplay = `${num1}<br>× ${num2}<br>———`;
                        }
                    }
                }
            }
            
            return problem;
        }
        
        // Otherwise use random generation
        console.log('Using random problem');
        const problem = this.currentModule.generateProblem();
        problem.source = problemSource;
        return problem;
    }

    nextProblem() {
        this.problemCount++;
        this.lastProblemStartTime = Date.now();
        
        // Use smart generator if enabled
        if (this.useSmartGenerator) {
            this.currentProblem = this.generateSmartProblem();
        } else {
            this.currentProblem = this.currentModule.generateProblem();
            this.currentProblem.source = 'random';
        }
        
        return {
            problem: this.currentProblem,
            problemCount: this.problemCount
        };
    }

    checkAnswer(userAnswer) {
        if (!userAnswer) return { isCorrect: false, message: 'Please enter an answer' };

        const timeTaken = Date.now() - this.lastProblemStartTime;
        const isCorrect = this.currentModule.validateAnswer(userAnswer, this.currentProblem.answer);
        
        // Create a record of this problem
        const problemRecord = {
            problem: this.currentProblem.question,
            answer: this.currentProblem.answer,
            userAnswer: userAnswer,
            timeTaken: timeTaken,
            isCorrect: isCorrect,
            source: this.currentProblem.source || 'random'
        };
        
        // Record timing for this problem
        this.problemTimings.push(problemRecord);
        
        // Add to complete history
        this.problemsHistory.push(problemRecord);

        if (isCorrect) {
            this.correctAnswers++;
            return { isCorrect: true, message: 'Correct' };
        } else {
            // Record mistake
            this.mistakes.push({
                problem: this.currentProblem.question,
                correctAnswer: this.currentProblem.answer,
                userAnswer: userAnswer
            });
            return { isCorrect: false, message: 'Incorrect' };
        }
    }

    shouldEndGame() {
        const elapsedTime = Date.now() - this.startTime;
        return elapsedTime >= this.gameDuration * 1000;
    }

    endGame() {
        clearInterval(this.timer);
        const endTime = Date.now();
        const timeTaken = Math.floor((endTime - this.startTime) / 1000);

        // Sort problem timings to get the slowest ones
        const sortedTimings = [...this.problemTimings].sort((a, b) => b.timeTaken - a.timeTaken);
        const slowestFive = sortedTimings.slice(0, 5);

        return {
            time: timeTaken,
            score: this.correctAnswers,
            totalProblems: this.problemCount,
            mistakes: this.mistakes,
            slowestFive: slowestFive,
            problemsHistory: this.problemsHistory, // Return complete problem history
            useSmartGenerator: this.useSmartGenerator,
            smartStats: this.useSmartGenerator ? {
                lookbackDays: this.lookbackDays,
                slowestProblems: this.slowestProblems.length,
                mistakeProblems: this.mistakeProblems.length,
                probSlowest: this.probSlowest,
                probMistakes: this.probMistakes,
                useTimeFilter: this.useTimeFilter,
                timeThreshold: this.timeThreshold
            } : null
        };
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.startTime = Date.now();
    }

    getElapsedTime() {
        if (!this.startTime) return { minutes: 0, seconds: 0 };
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        return {
            minutes: Math.floor(elapsed / 60),
            seconds: elapsed % 60,
            total: elapsed
        };
    }

    getRemainingTime() {
        const elapsed = this.getElapsedTime().total;
        const remaining = this.gameDuration - elapsed;
        return {
            minutes: Math.floor(remaining / 60),
            seconds: remaining % 60,
            total: remaining
        };
    }
} 