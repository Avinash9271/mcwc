import { calendarModule } from './modules/calendar.js';
import { calendarDayModule } from './modules/calendar-day.js';
import { multiplicationModule } from './modules/multiplication.js';
import { multiplicationCrossSumModule } from './modules/multiplication-cross-sum.js';
import { multiplicationCrossProductModule } from './modules/multiplication-cross-product.js';
import { additionModule } from './modules/addition.js';
import { squareRootModule } from './modules/square-root.js';
import { squareRootRangeModule } from './modules/square-root-range.js';
import { squareRootRemainderModule } from './modules/square-root-remainder.js';
import { GameManager } from './modules/game-manager.js';

// IndexedDB setup for persistent storage
const DB_NAME = 'MentalMathDB';
const DB_VERSION = 1;
const SCORES_STORE = 'mathScores';
const SETTINGS_STORE = 'mathSettings';
let db;
let dbStatus = 'Not initialized';

// Debug mode flag - controls visibility of debug features
let debugMode = false;

// Function to display IndexedDB status
function displayDBStatus() {
    // Only show status if debug mode is enabled
    if (!debugMode) {
        // Remove any existing status element if debug mode is disabled
        const existingStatus = document.getElementById('indexeddb-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        return;
    }
    
    // Create or update status element
    let statusElement = document.getElementById('indexeddb-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'indexeddb-status';
        statusElement.style.position = 'fixed';
        statusElement.style.bottom = '10px';
        statusElement.style.right = '10px';
        statusElement.style.padding = '5px 10px';
        statusElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
        statusElement.style.color = 'white';
        statusElement.style.borderRadius = '5px';
        statusElement.style.fontSize = '12px';
        statusElement.style.zIndex = '9999';
        document.body.appendChild(statusElement);
    }
    
    // Update status text and color
    statusElement.textContent = `IndexedDB: ${dbStatus}`;
    statusElement.style.backgroundColor = 
        dbStatus.includes('Connected') ? 'rgba(0,128,0,0.7)' : 
        dbStatus.includes('Error') ? 'rgba(255,0,0,0.7)' : 'rgba(0,0,0,0.7)';
}

// Function to check if IndexedDB is supported
function isIndexedDBSupported() {
    return window.indexedDB !== undefined && 
           window.indexedDB !== null && 
           typeof window.indexedDB.open === 'function';
}

// Initialize the database
function initDB() {
    return new Promise((resolve, reject) => {
        // First check if IndexedDB is supported
        if (!isIndexedDBSupported()) {
            console.error('IndexedDB is not supported in this browser');
            dbStatus = 'Not supported in this browser';
            if (debugMode) {
                displayDBStatus();
            }
            resolve(false);
            return;
        }
        
        dbStatus = 'Connecting...';
        if (debugMode) {
            displayDBStatus();
        }
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            dbStatus = `Error: ${event.target.error.message || 'Unknown error'}`;
            if (debugMode) {
                displayDBStatus();
            }
            // Fall back to localStorage if IndexedDB fails
            resolve(false);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB connected');
            dbStatus = `Connected (v${DB_VERSION})`;
            if (debugMode) {
                displayDBStatus();
            }
            resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            dbStatus = 'Upgrading schema...';
            if (debugMode) {
                displayDBStatus();
            }
            
            // Create scores store
            if (!db.objectStoreNames.contains(SCORES_STORE)) {
                const scoresStore = db.createObjectStore(SCORES_STORE, { keyPath: 'id' });
                scoresStore.createIndex('mode', 'mode', { unique: false });
                scoresStore.createIndex('date', 'date', { unique: false });
            }
            
            // Create settings store
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
            }
        };
    });
}

// Save data to IndexedDB
function saveToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            // Fall back to localStorage if IndexedDB is not available
            dbStatus = 'Fallback: Using localStorage';
            if (debugMode) {
                displayDBStatus();
            }
            
            if (storeName === SCORES_STORE) {
                localStorage.setItem('mathScores', JSON.stringify(data));
            } else if (storeName === SETTINGS_STORE && Array.isArray(data)) {
                data.forEach(item => {
                    localStorage.setItem(item.key, JSON.stringify(item.value));
                });
            }
            resolve();
            return;
        }
        
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        transaction.oncomplete = () => {
            dbStatus = `Connected (v${DB_VERSION}) - Last write: ${new Date().toLocaleTimeString()}`;
            if (debugMode) {
                displayDBStatus();
            }
            resolve();
        };
        
        transaction.onerror = (event) => {
            console.error('Transaction error:', event.target.error);
            dbStatus = `Error in transaction: ${event.target.error.message || 'Unknown error'}`;
            if (debugMode) {
                displayDBStatus();
            }
            
            // Fall back to localStorage
            if (storeName === SCORES_STORE) {
                localStorage.setItem('mathScores', JSON.stringify(data));
            } else if (storeName === SETTINGS_STORE && Array.isArray(data)) {
                data.forEach(item => {
                    localStorage.setItem(item.key, JSON.stringify(item.value));
                });
            }
            resolve();
        };
        
        if (Array.isArray(data)) {
            // Clear existing data first
            store.clear().onsuccess = () => {
                // Then add all items
                data.forEach(item => {
                    store.add(item);
                });
            };
        } else {
            store.put(data);
        }
    });
}

// Get all data from IndexedDB
function getAllFromIndexedDB(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            // Fall back to localStorage if IndexedDB is not available
            if (storeName === SCORES_STORE) {
                resolve(JSON.parse(localStorage.getItem('mathScores') || '[]'));
            } else {
                resolve([]);
            }
            return;
        }
        
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            console.error('GetAll error:', event.target.error);
            // Fall back to localStorage
            if (storeName === SCORES_STORE) {
                resolve(JSON.parse(localStorage.getItem('mathScores') || '[]'));
            } else {
                resolve([]);
            }
        };
    });
}

// Get a single setting from IndexedDB
function getSettingFromIndexedDB(key, defaultValue) {
    return new Promise((resolve, reject) => {
        if (!db) {
            // Fall back to localStorage if IndexedDB is not available
            const value = localStorage.getItem(key);
            resolve(value !== null ? JSON.parse(value) : defaultValue);
            return;
        }
        
        const transaction = db.transaction(SETTINGS_STORE, 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.value);
            } else {
                resolve(defaultValue);
            }
        };
        
        request.onerror = (event) => {
            console.error('GetSetting error:', event.target.error);
            // Fall back to localStorage
            const value = localStorage.getItem(key);
            resolve(value !== null ? JSON.parse(value) : defaultValue);
        };
    });
}

// Save a single setting to IndexedDB
function saveSettingToIndexedDB(key, value) {
    return saveToIndexedDB(SETTINGS_STORE, { key, value });
}

// Delete a score from IndexedDB
function deleteScoreFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            // Fall back to localStorage if IndexedDB is not available
            const scores = JSON.parse(localStorage.getItem('mathScores') || '[]');
            const updatedScores = scores.filter(score => score.id !== id);
            localStorage.setItem('mathScores', JSON.stringify(updatedScores));
            resolve();
            return;
        }
        
        const transaction = db.transaction(SCORES_STORE, 'readwrite');
        const store = transaction.objectStore(SCORES_STORE);
        const request = store.delete(id);
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('DeleteScore error:', event.target.error);
            // Fall back to localStorage
            const scores = JSON.parse(localStorage.getItem('mathScores') || '[]');
            const updatedScores = scores.filter(score => score.id !== id);
            localStorage.setItem('mathScores', JSON.stringify(updatedScores));
            resolve();
        };
    });
}

// Clear all scores from IndexedDB
function clearScoresFromIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            // Fall back to localStorage if IndexedDB is not available
            localStorage.removeItem('mathScores');
            resolve();
            return;
        }
        
        const transaction = db.transaction(SCORES_STORE, 'readwrite');
        const store = transaction.objectStore(SCORES_STORE);
        const request = store.clear();
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('ClearScores error:', event.target.error);
            // Fall back to localStorage
            localStorage.removeItem('mathScores');
            resolve();
        };
    });
}

// Initialize the database when the app starts
initDB().then(async dbInitialized => {
    console.log('Database initialized:', dbInitialized);
    // Migrate data from localStorage to IndexedDB if needed
    if (dbInitialized) {
        const localScores = JSON.parse(localStorage.getItem('mathScores') || '[]');
        if (localScores.length > 0) {
            await saveToIndexedDB(SCORES_STORE, localScores);
            console.log('Migrated scores from localStorage to IndexedDB');
            dbStatus += ' (Migrated data from localStorage)';
            if (debugMode) {
                displayDBStatus();
            }
            
            // After migration, clear localStorage to avoid using it again
            localStorage.removeItem('mathScores');
        }
        
        // Migrate settings from localStorage to IndexedDB
        await migrateSettingsFromLocalStorage();
    }
});

// Function to migrate settings from localStorage to IndexedDB
async function migrateSettingsFromLocalStorage() {
    const settingsToMigrate = [
        'lastGameDuration',
        'showFeedback',
        'multiplicationDifficulty',
        'currentLeaderboardMode',
        'currentLeaderboardFilter',
        'currentLeaderboardType',
        'useSmartGenerator',
        'lookbackDays',
        'probSlowest',
        'probMistakes',
        'useTimeFilter',
        'timeThreshold',
        'debugMode'
    ];
    
    for (const key of settingsToMigrate) {
        const value = localStorage.getItem(key);
        if (value !== null) {
            try {
                const parsedValue = JSON.parse(value);
                await saveSettingToIndexedDB(key, parsedValue);
                console.log(`Migrated setting ${key} from localStorage to IndexedDB`);
                
                // Clear the localStorage item after migration
                localStorage.removeItem(key);
            } catch (error) {
                console.error(`Error migrating setting ${key}:`, error);
            }
        }
    }
}

const gameManager = new GameManager();
let timer = null;
let showFeedback = true;
let selectedDuration = 60;
let currentMode = '';

// Time filter variables
let timeThreshold = 2; // in seconds
let isTimeFilterActive = false;

// Leaderboard variables
let currentLeaderboardType = 'speed';
let currentLeaderboardFilter = 'all';
let currentLeaderboardMode = 'Calendar'; // Default to Calendar

const modules = {
    'calendar': calendarModule,
    'calendar-day': calendarDayModule,
    'multiplication': multiplicationModule,
    'multiplication-cross-sum': multiplicationCrossSumModule,
    'multiplication-cross-product': multiplicationCrossProductModule,
    'addition': additionModule,
    'square-root': squareRootModule,
    'square-root-range': squareRootRangeModule,
    'square-root-remainder': squareRootRemainderModule
};

// Load saved settings
async function loadSavedSettings() {
    try {
        // Load last selected duration
        const savedDuration = await getSettingFromIndexedDB('lastSelectedDuration', null);
        if (savedDuration) {
            selectedDuration = parseInt(savedDuration);
        }
        
        // Load feedback preference
        const savedFeedback = await getSettingFromIndexedDB('showFeedback', null);
        if (savedFeedback !== null) {
            showFeedback = savedFeedback;
        }
        
        // Load multiplication difficulty if available
        const savedDifficulty = await getSettingFromIndexedDB('multiplicationDifficulty', null);
        if (savedDifficulty && ['2x2', '3x3', '4x4', '8x8'].includes(savedDifficulty)) {
            modules['multiplication'].setDifficulty(savedDifficulty);
        }
        
        // Load leaderboard settings
        const savedLeaderboardMode = await getSettingFromIndexedDB('currentLeaderboardMode', null);
        if (savedLeaderboardMode) {
            currentLeaderboardMode = savedLeaderboardMode;
        }
        
        const savedLeaderboardFilter = await getSettingFromIndexedDB('currentLeaderboardFilter', null);
        if (savedLeaderboardFilter) {
            currentLeaderboardFilter = savedLeaderboardFilter;
        }
        
        const savedLeaderboardType = await getSettingFromIndexedDB('currentLeaderboardType', null);
        if (savedLeaderboardType) {
            currentLeaderboardType = savedLeaderboardType;
        }
        
        // Load smart generator settings
        const useSmartGenerator = await getSettingFromIndexedDB('useSmartGenerator', false);
        const lookbackDays = await getSettingFromIndexedDB('lookbackDays', 1);
        const probSlowest = await getSettingFromIndexedDB('probSlowest', 0.25);
        const probMistakes = await getSettingFromIndexedDB('probMistakes', 0.25);
        const useTimeFilter = await getSettingFromIndexedDB('useTimeFilter', false);
        const timeThreshold = await getSettingFromIndexedDB('timeThreshold', 2);
        
        // Update UI for smart generator settings
        document.getElementById('use-smart-generator').checked = useSmartGenerator;
        document.getElementById('lookback-days').value = lookbackDays;
        document.getElementById('lookback-days-value').textContent = lookbackDays;
        document.getElementById('prob-slowest').value = Math.round(probSlowest * 100);
        document.getElementById('prob-slowest-value').textContent = `${Math.round(probSlowest * 100)}%`;
        document.getElementById('prob-mistakes').value = Math.round(probMistakes * 100);
        document.getElementById('prob-mistakes-value').textContent = `${Math.round(probMistakes * 100)}%`;
        document.getElementById('use-time-filter').checked = useTimeFilter;
        document.getElementById('time-threshold').value = timeThreshold;
        document.getElementById('time-threshold-value').textContent = `${timeThreshold}s`;
        
        // Show/hide smart generator settings
        document.getElementById('smart-generator-settings').style.display = 
            useSmartGenerator ? 'block' : 'none';
        document.getElementById('time-filter-settings').style.display = 
            useTimeFilter ? 'block' : 'none';
    } catch (error) {
        console.error('Error loading settings:', error);
        // Fall back to original localStorage method if there's an error
        fallbackLoadSettings();
    }
}

// Fallback to localStorage if IndexedDB fails
function fallbackLoadSettings() {
    // Load last selected duration
    const savedDuration = localStorage.getItem('lastSelectedDuration');
    if (savedDuration) {
        selectedDuration = parseInt(savedDuration);
    }
    
    // Load feedback preference
    const savedFeedback = localStorage.getItem('showFeedback');
    if (savedFeedback !== null) {
        showFeedback = savedFeedback === 'true';
    }
    
    // Load multiplication difficulty if available
    const savedDifficulty = localStorage.getItem('multiplicationDifficulty');
    if (savedDifficulty && ['2x2', '3x3', '4x4', '8x8'].includes(savedDifficulty)) {
        modules['multiplication'].setDifficulty(savedDifficulty);
    }
    
    // Load leaderboard settings
    const savedLeaderboardMode = localStorage.getItem('currentLeaderboardMode');
    if (savedLeaderboardMode) {
        currentLeaderboardMode = savedLeaderboardMode;
    }
    
    const savedLeaderboardFilter = localStorage.getItem('currentLeaderboardFilter');
    if (savedLeaderboardFilter) {
        currentLeaderboardFilter = savedLeaderboardFilter;
    }
    
    const savedLeaderboardType = localStorage.getItem('currentLeaderboardType');
    if (savedLeaderboardType) {
        currentLeaderboardType = savedLeaderboardType;
    }
    
    // Load smart generator settings
    const useSmartGenerator = localStorage.getItem('useSmartGenerator') === 'true';
    const lookbackDays = parseInt(localStorage.getItem('lookbackDays')) || 1;
    const probSlowest = parseFloat(localStorage.getItem('probSlowest')) || 0.25;
    const probMistakes = parseFloat(localStorage.getItem('probMistakes')) || 0.25;
    const useTimeFilter = localStorage.getItem('useTimeFilter') === 'true';
    const timeThreshold = parseInt(localStorage.getItem('timeThreshold')) || 2;
    
    // Update UI for smart generator settings
    document.getElementById('use-smart-generator').checked = useSmartGenerator;
    document.getElementById('lookback-days').value = lookbackDays;
    document.getElementById('lookback-days-value').textContent = lookbackDays;
    document.getElementById('prob-slowest').value = Math.round(probSlowest * 100);
    document.getElementById('prob-slowest-value').textContent = `${Math.round(probSlowest * 100)}%`;
    document.getElementById('prob-mistakes').value = Math.round(probMistakes * 100);
    document.getElementById('prob-mistakes-value').textContent = `${Math.round(probMistakes * 100)}%`;
    document.getElementById('use-time-filter').checked = useTimeFilter;
    document.getElementById('time-threshold').value = timeThreshold;
    document.getElementById('time-threshold-value').textContent = `${timeThreshold}s`;
    
    // Show/hide smart generator settings
    document.getElementById('smart-generator-settings').style.display = 
        useSmartGenerator ? 'block' : 'none';
    document.getElementById('time-filter-settings').style.display = 
        useTimeFilter ? 'block' : 'none';
}

function updateTimer() {
    if (!gameManager.startTime) return;
    const remaining = gameManager.getRemainingTime();
    const elapsed = gameManager.getElapsedTime();
    document.getElementById('stats-counter').textContent = gameManager.problemCount;
    document.getElementById('stats-timer').textContent = 
        `${elapsed.minutes}:${elapsed.seconds.toString().padStart(2, '0')}`;
    
    if (remaining.total <= 0) {
        endGame();
    }
}

function showFeedbackIcon(isCorrect) {
    if (!showFeedback) return;
    
    const feedbackElement = document.getElementById('stats-feedback');
    feedbackElement.textContent = isCorrect ? '✓' : '✗';
    feedbackElement.className = isCorrect ? 'feedback-correct' : 'feedback-incorrect';
    
    setTimeout(() => {
        feedbackElement.textContent = '';
    }, 300);
}

async function selectMode(mode) {
    currentMode = mode;
    gameManager.setModule(modules[mode]);
    
    // Hide any open option menus
    document.getElementById('calendar-options').style.display = 'none';
    document.getElementById('multiply-options').style.display = 'none';
    document.getElementById('square-root-options').style.display = 'none';
    
    showDurationSelect();
}

function showDurationSelect() {
    document.getElementById('mode-select-screen').style.display = 'none';
    document.getElementById('history-screen').style.display = 'none';
    document.getElementById('duration-select-screen').style.display = 'block';
    
    // Set the checkbox state
    document.getElementById('show-feedback').checked = showFeedback;
    
    // Highlight selected duration
    document.querySelectorAll('.duration-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const durationElement = document.querySelector(`[data-duration="${selectedDuration}"]`);
    if (durationElement) {
        durationElement.classList.add('selected');
    }
    
    // Setup listeners for smart generator settings
    document.getElementById('use-smart-generator').addEventListener('change', updateSmartGeneratorSettings);
    document.getElementById('use-time-filter').addEventListener('change', updateTimeFilterSettings);
    document.getElementById('lookback-days').addEventListener('input', () => updateSliderValue('lookback-days', 'lookback-days-value'));
    document.getElementById('prob-slowest').addEventListener('input', () => updateSliderValue('prob-slowest', 'prob-slowest-value'));
    document.getElementById('prob-mistakes').addEventListener('input', () => updateSliderValue('prob-mistakes', 'prob-mistakes-value'));
    document.getElementById('time-threshold').addEventListener('input', () => updateSliderValue('time-threshold', 'time-threshold-value'));
}

function selectDuration(duration) {
    selectedDuration = duration;
    saveSettingToIndexedDB('lastSelectedDuration', duration);
    
    document.querySelectorAll('.duration-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector(`[data-duration="${duration}"]`).classList.add('selected');
}

async function startWithSettings() {
    showFeedback = document.getElementById('show-feedback').checked;
    saveSettingToIndexedDB('showFeedback', showFeedback);
    
    // Get and save smart generator settings
    const useSmartGenerator = document.getElementById('use-smart-generator').checked;
    const lookbackDays = parseInt(document.getElementById('lookback-days').value);
    const probSlowest = parseInt(document.getElementById('prob-slowest').value) / 100;
    const probMistakes = parseInt(document.getElementById('prob-mistakes').value) / 100;
    const useTimeFilter = document.getElementById('use-time-filter').checked;
    const timeThreshold = parseInt(document.getElementById('time-threshold').value);
    
    // Save settings to IndexedDB
    saveSettingToIndexedDB('useSmartGenerator', useSmartGenerator);
    saveSettingToIndexedDB('lookbackDays', lookbackDays);
    saveSettingToIndexedDB('probSlowest', probSlowest);
    saveSettingToIndexedDB('probMistakes', probMistakes);
    saveSettingToIndexedDB('useTimeFilter', useTimeFilter);
    saveSettingToIndexedDB('timeThreshold', timeThreshold);
    
    // Apply settings to game manager
    gameManager.setSmartGeneratorSettings(
        useSmartGenerator, 
        lookbackDays, 
        probSlowest, 
        probMistakes, 
        useTimeFilter, 
        timeThreshold
    );
    
    gameManager.setGameDuration(selectedDuration);
    document.getElementById('duration-select-screen').style.display = 'none';
    await startGame();
}

async function startGame() {
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('end-screen').style.display = 'none';
    
    // Reset problem container to default layout
    const problemContainer = document.getElementById('problem-container');
    problemContainer.classList.remove('vertical-problem-container');
    problemContainer.classList.add('problem-container');
    
    // Setup the stats area
    const statsElement = document.getElementById('stats');
    statsElement.innerHTML = `
        <span id="stats-feedback" style="display: inline-block; width: 20px; text-align: center;"></span>
        <span id="stats-counter">0</span> | 
        <span id="stats-timer">0:00</span>
    `;
    
    // Hide feedback area
    const feedbackArea = document.getElementById('feedback-area');
    if (feedbackArea) {
        feedbackArea.style.display = 'none';
    }
    
    // Save selected duration
    saveSettingToIndexedDB('lastSelectedDuration', selectedDuration);
    
    // Start the game (now async)
    await gameManager.startGame();
    timer = setInterval(updateTimer, 100);
    displayNextProblem();
}

function displayNextProblem() {
    const result = gameManager.nextProblem();
    const problem = result.problem;
    
    let displayText = problem.display;
    let useVerticalLayout = false;
    
    if (gameManager.currentModule.name === 'Multiplication' && 
        problem.isLargeNumbers) {
        displayText = problem.verticalDisplay;
        useVerticalLayout = true;
    } else if (gameManager.currentModule.name === '4×4 Cross Sum' || 
               gameManager.currentModule.name === '8×8 Cross Sum') {
        displayText = problem.verticalDisplay;
        useVerticalLayout = true;
    }
    
    document.getElementById('problem').innerHTML = displayText;
    
    // Update container class based on layout
    const problemContainer = document.getElementById('problem-container');
    if (useVerticalLayout) {
        problemContainer.classList.remove('problem-container');
        problemContainer.classList.add('vertical-problem-container');
    } else {
        problemContainer.classList.remove('vertical-problem-container');
        problemContainer.classList.add('problem-container');
    }
    
    document.getElementById('answer').focus();
}

function checkAnswer() {
    const answerInput = document.getElementById('answer');
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) return;
    
    const result = gameManager.checkAnswer(userAnswer);
    
    // Show feedback
    showFeedbackIcon(result.isCorrect);
    
    // Clear input but keep it active
    answerInput.value = '';
    
    // Show next problem
    displayNextProblem();
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().replace(/:\d+ /, ' ');
}

function confirmQuitGame() {
    if (confirm('End session?')) {
        endGame();
    }
}

async function endGame() {
    clearInterval(timer);
    const { time, score, totalProblems, mistakes, slowestFive, problemsHistory, useSmartGenerator, smartStats } = gameManager.endGame();
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';

    // Basic stats
    let resultsHtml = `
        <div class="stats">
            <h3>Results</h3>
            <p>Mode: ${gameManager.currentModule?.name || '-'}</p>
    `;
    
    // Add difficulty level for multiplication
    if (gameManager.currentModule?.name === 'Multiplication') {
        const difficulty = gameManager.currentModule.difficulty || '3x3';
        resultsHtml += `<p>Level: ${difficulty}</p>`;
    }
    
    // Filter out pending problems (those without a userAnswer)
    const validProblems = problemsHistory.filter(p => p.userAnswer !== undefined && p.userAnswer !== null && p.userAnswer !== '');
    const validScore = validProblems.filter(p => p.isCorrect).length;
    const validTotal = validProblems.length;
    const accuracy = validTotal > 0 ? Math.round((validScore / validTotal) * 100) : 100;
    
    resultsHtml += `
            <p>Time: ${minutes}:${seconds.toString().padStart(2, '0')}</p>
            <p>Score: ${validScore}/${validTotal}</p>
            <p>Accuracy: ${accuracy}%</p>
        </div>
    `;
    
    // Smart generator stats
    if (useSmartGenerator && smartStats) {
        // Calculate normalized percentages
        let displayProbSlowest = smartStats.probSlowest;
        let displayProbMistakes = smartStats.probMistakes;
        
        // If total exceeds 100%, show normalized values
        if (smartStats.probSlowest + smartStats.probMistakes > 1) {
            const total = smartStats.probSlowest + smartStats.probMistakes;
            displayProbSlowest = smartStats.probSlowest / total;
            displayProbMistakes = smartStats.probMistakes / total;
        }
        
        resultsHtml += `
            <div class="stats">
                <h3>Smart Practice</h3>
                <p>Days: ${smartStats.lookbackDays}</p>
                <p>Slow: ${smartStats.slowestProblems} (${Math.round(displayProbSlowest * 100)}%${smartStats.probSlowest + smartStats.probMistakes > 1 ? ' scaled' : ''})</p>
                <p>Mistakes: ${smartStats.mistakeProblems} (${Math.round(displayProbMistakes * 100)}%${smartStats.probSlowest + smartStats.probMistakes > 1 ? ' scaled' : ''})</p>
                ${smartStats.useTimeFilter ? 
                  `<p>Time Filter: ≥ ${smartStats.timeThreshold}s</p>` : ''}
            </div>
        `;
    }

    // Slowest problems accordion
    if (slowestFive.length > 0) {
        resultsHtml += `
            <div class="accordion">
                <button class="accordion-btn" onclick="toggleAccordion('slowest')">
                    Slowest ▼
                </button>
                <div class="accordion-content" id="slowest-content">
                    <div class="table-container">
                        <table>
                            <tr><th>Problem</th><th>Answer</th><th>Correct</th><th>Time</th><th>Source</th></tr>
                            ${slowestFive.map(p => {
                                // Determine source symbol
                                let sourceSymbol = '';
                                if (p.source === 'slow') {
                                    sourceSymbol = '⏱';  // Clock symbol for slow problems
                                } else if (p.source === 'mistake') {
                                    sourceSymbol = '❌';  // X symbol for mistake problems
                                }
                                return `
                                <tr class="${p.isCorrect ? 'correct' : 'incorrect'}">
                                    <td>${p.problem}</td>
                                    <td>${p.userAnswer}</td>
                                    <td>${p.answer}</td>
                                    <td>${formatTime(p.timeTaken)}</td>
                                    <td>${sourceSymbol}</td>
                                </tr>
                            `}).join('')}
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // Get all incorrect problems from problemHistory but exclude pending ones
    const allIncorrectProblems = validProblems.filter(p => !p.isCorrect);
    
    // Mistakes accordion
    if (allIncorrectProblems.length > 0) {
        resultsHtml += `
            <div class="accordion">
                <button class="accordion-btn" onclick="toggleAccordion('mistakes')">
                    Mistakes (${allIncorrectProblems.length}) ▼
                </button>
                <div class="accordion-content" id="mistakes-content">
                    <div class="table-container">
                        <table>
                            <tr><th>Problem</th><th>Answer</th><th>Correct</th><th>Time</th><th>Source</th></tr>
                            ${allIncorrectProblems.map(p => {
                                // Determine source symbol
                                let sourceSymbol = '';
                                if (p.source === 'slow') {
                                    sourceSymbol = '⏱';  // Clock symbol for slow problems
                                } else if (p.source === 'mistake') {
                                    sourceSymbol = '❌';  // X symbol for mistake problems
                                }
                                return `
                                <tr>
                                    <td>${p.problem}</td>
                                    <td>${p.userAnswer}</td>
                                    <td>${p.answer || p.correctAnswer}</td>
                                    <td>${formatTime(p.timeTaken)}</td>
                                    <td>${sourceSymbol}</td>
                                </tr>
                            `}).join('')}
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    document.getElementById('results').innerHTML = resultsHtml;
    
    // Automatically open the first accordion
    if (slowestFive.length > 0) {
        setTimeout(() => toggleAccordion('slowest'), 100);
    } else if (allIncorrectProblems.length > 0) {
        setTimeout(() => toggleAccordion('mistakes'), 100);
    }

    // Save score to IndexedDB
    const scores = await getAllFromIndexedDB(SCORES_STORE);
    
    // Create unique ID for this session
    const sessionId = `score-${new Date().toISOString()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newScore = {
        id: sessionId,
        mode: gameManager.currentModule?.name || '-',
        date: new Date().toISOString(),
        time: time,
        score: validScore,
        totalProblems: validTotal,
        mistakes: allIncorrectProblems,
        accuracy: accuracy,
        duration: selectedDuration,
        problems: validProblems,
        difficulty: gameManager.currentModule?.name === 'Multiplication' ? 
            gameManager.currentModule.difficulty : null
    };
    
    scores.push(newScore);
    saveToIndexedDB(SCORES_STORE, scores);
}

async function showHistory() {
    document.getElementById('mode-select-screen').style.display = 'none';
    document.getElementById('history-screen').style.display = 'block';
    
    // Get all scores from IndexedDB
    const scores = await getAllFromIndexedDB(SCORES_STORE);
    
    // Group scores by mode
    const scoresByMode = {};
    scores.forEach((score, index) => {
        // Add unique ID for deletion purposes if not already present
        score.id = score.id || `score-${score.date}-${index}`;
        
        // Ensure mode is not undefined
        const modeName = score.mode || '-';
        if (!scoresByMode[modeName]) {
            scoresByMode[modeName] = [];
        }
        scoresByMode[modeName].push(score);
    });
    
    // Save scores with IDs back to IndexedDB if any were missing IDs
    saveToIndexedDB(SCORES_STORE, scores);
    
    // Generate HTML for the history
    let historyHtml = '';
    
    // If no history, show message
    if (Object.keys(scoresByMode).length === 0) {
        historyHtml = '<p>No history yet.</p>';
    } else {
        // Create accordions for each mode
        for (const mode in scoresByMode) {
            const modeScores = scoresByMode[mode].sort((a, b) => new Date(b.date) - new Date(a.date));
            
            historyHtml += `
                <div class="accordion">
                    <button class="accordion-btn" onclick="toggleAccordion('history-${mode}')">
                        ${mode} (${modeScores.length})
                    </button>
                    <div class="accordion-content" id="history-${mode}-content">
                        ${modeScores.map((s, idx) => `
                            <div id="session-row-${s.id}" class="session-info">
                                <span>${formatDate(s.date)}</span>
                                <span>${Math.floor(s.duration/60)}m${mode === 'Multiplication' ? ` · ${s.difficulty || '3x3'}` : ''}</span>
                                <span>${s.score}/${s.totalProblems} (${s.accuracy}%)</span>
                                <div class="session-actions">
                                    <button class="action-button" 
                                            onclick="showSessionDetails('${s.id}')">
                                        View
                                    </button>
                                    <button class="action-button" 
                                            onclick="confirmDeleteSession('${s.id}')"
                                            style="background-color: #e74c3c;">
                                        ✕
                                    </button>
                                </div>
                            </div>
                            <div id="session-details-${s.id}" style="display: none; margin-bottom: 12px; margin-left: 8px;">
                                ${renderSessionDetails(s)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    document.getElementById('history-container').innerHTML = historyHtml;
    
    // Open first accordion by default
    if (Object.keys(scoresByMode).length > 0) {
        const firstMode = Object.keys(scoresByMode)[0];
        setTimeout(() => toggleAccordion(`history-${firstMode}`), 100);
    }
}

// Function to show session details
async function showSessionDetails(sessionId) {
    const detailsRow = document.getElementById(`session-details-${sessionId}`);
    
    if (detailsRow) {
        // Toggle display
        if (detailsRow.style.display === 'none') {
            // If opening, update content
            const scores = await getAllFromIndexedDB(SCORES_STORE);
            const session = scores.find(s => s.id === sessionId);
            
            if (session) {
                // Update the content
                detailsRow.innerHTML = renderSessionDetails(session);
            }
            
            // Show the row
            detailsRow.style.display = 'block';
        } else {
            // Hide the row
            detailsRow.style.display = 'none';
        }
    }
}

// Function to confirm deletion of a single session
function confirmDeleteSession(sessionId) {
    if (confirm('Delete this session?')) {
        deleteSession(sessionId);
    }
}

// Function to delete a single session
async function deleteSession(sessionId) {
    // Delete from IndexedDB
    await deleteScoreFromIndexedDB(sessionId);
    
    // Hide the session row immediately
    const row = document.getElementById(`session-row-${sessionId}`);
    const detailsRow = document.getElementById(`session-details-${sessionId}`);
    if (row) row.style.display = 'none';
    if (detailsRow) detailsRow.style.display = 'none';
    
    // Refresh the history view
    showHistory();
}

// Helper function to render details of a single session
function renderSessionDetails(session) {
    // Show session metrics in a grid
    let metricsHtml = `
        <div class="session-grid">
            <div class="metric">
                <span>Score</span>
                <span class="value">${session.score}/${session.totalProblems}</span>
            </div>
            <div class="metric">
                <span>Accuracy</span>
                <span class="value">${session.accuracy}%</span>
            </div>
            <div class="metric">
                <span>Speed</span>
                <span class="value">${session.averageTime ? formatTime(session.averageTime) : '-'}</span>
            </div>
            <div class="metric">
                <span>Problems</span>
                <span class="value">${session.totalProblems}</span>
            </div>
        </div>
    `;
    
    // Check if we have problems array and how many correct vs incorrect answers
    if (session.problems && session.problems.length > 0) {
        return metricsHtml + renderProblemTable(session.problems);
    }
    
    // If we don't have the problems array but we have mistakes
    if (session.mistakes && Array.isArray(session.mistakes) && session.mistakes.length > 0) {
        // Check if the mistakes array contains full problem records or just mistake info
        const hasProblemData = session.mistakes[0].hasOwnProperty('isCorrect');
        
        if (hasProblemData) {
            // This is already the full record, just use it
            return metricsHtml + renderProblemTable(session.mistakes);
        } else {
            // Convert older format mistakes to problem records
            const reconstructedProblems = session.mistakes.map(m => ({
                problem: m.problem,
                userAnswer: m.userAnswer,
                correctAnswer: m.correctAnswer || m.answer,
                answer: m.correctAnswer || m.answer,
                isCorrect: false,
                timeTaken: null
            }));
            
            return metricsHtml + renderProblemTable(reconstructedProblems);
        }
    }
    
    // No usable data
    return metricsHtml + '<p>No problem data available.</p>';
}

// Helper function to render a table of problems
function renderProblemTable(problems) {
    return `
        <div style="margin: 10px 0 5px 0;">
            <button onclick="sortSessionProblems(this, 'time')" class="action-button">
                Time
            </button>
            <button onclick="sortSessionProblems(this, 'correctness')" class="action-button">
                Mistakes
            </button>
            <button onclick="sortSessionProblems(this, 'default')" class="action-button">
                Default
            </button>
        </div>
        <div class="table-container">
            <table class="problem-table">
                <tr>
                    <th>Problem</th>
                    <th>Your</th>
                    <th>Correct</th>
                    <th></th>
                    <th>Time</th>
                    <th>Source</th>
                </tr>
                ${problems.map(p => {
                    // Determine source symbol
                    let sourceSymbol = '';
                    if (p.source === 'slow') {
                        sourceSymbol = '⏱';  // Clock symbol for slow problems
                    } else if (p.source === 'mistake') {
                        sourceSymbol = '❌';  // X symbol for mistake problems
                    }
                    
                    return `
                    <tr class="${p.isCorrect ? 'correct' : 'incorrect'}" 
                        data-time="${p.timeTaken || 0}"
                        data-correct="${p.isCorrect ? 'true' : 'false'}">
                        <td>${p.problem || p.question || ''}</td>
                        <td>${p.userAnswer || ''}</td>
                        <td>${p.answer || p.correctAnswer || ''}</td>
                        <td>${p.isCorrect ? '✓' : '✗'}</td>
                        <td>${p.timeTaken ? formatTime(p.timeTaken) : '-'}</td>
                        <td>${sourceSymbol}</td>
                    </tr>
                `}).join('')}
            </table>
        </div>
    `;
}

// Function to sort problems in a session
function sortSessionProblems(buttonElement, sortType) {
    // Find the parent table container
    const tableContainer = buttonElement.closest('div').nextElementSibling;
    const table = tableContainer.querySelector('table');
    
    if (!table) return;
    
    // Get all rows except the header
    const rows = Array.from(table.querySelectorAll('tr')).slice(1);
    const tbody = table.querySelector('tbody') || table;
    
    // Sort the rows
    rows.sort((a, b) => {
        if (sortType === 'time') {
            // Sort by time (numerically)
            const timeA = parseInt(a.getAttribute('data-time')) || 0;
            const timeB = parseInt(b.getAttribute('data-time')) || 0;
            return timeB - timeA; // Descending order - slowest first
        } else if (sortType === 'correctness') {
            // Show incorrect first, then correct
            const correctA = a.getAttribute('data-correct') === 'true';
            const correctB = b.getAttribute('data-correct') === 'true';
            if (correctA === correctB) return 0;
            return correctA ? 1 : -1; // Incorrect first
        } else {
            // Default sorting - preserve original order by using the row index
            return Array.from(tbody.children).indexOf(a) - Array.from(tbody.children).indexOf(b);
        }
    });
    
    // Remove all rows
    rows.forEach(row => row.parentNode.removeChild(row));
    
    // Add sorted rows back
    rows.forEach(row => tbody.appendChild(row));
}

function confirmClearHistory() {
    if (confirm('Clear all history?')) {
        clearHistory();
    }
}

async function clearHistory() {
    await clearScoresFromIndexedDB();
    showHistory(); // Refresh the history view
}

function goToModeSelect() {
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('duration-select-screen').style.display = 'none';
    document.getElementById('history-screen').style.display = 'none';
    document.getElementById('square-root-range-settings').style.display = 'none';
    document.getElementById('mode-select-screen').style.display = 'block';
}

async function resetGame() {
    document.getElementById('end-screen').style.display = 'none';
    await startGame();
}

function toggleAccordion(id) {
    const content = document.getElementById(`${id}-content`);
    if (content) {
        // Fix for initial empty display value
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        
        // Toggle active class on the button
        const button = content.previousElementSibling;
        if (button && button.classList.contains('accordion-btn')) {
            if (isOpen) {
                button.classList.remove('active');
            } else {
                button.classList.add('active');
            }
        }
    }
}

// Function to update smart generator settings
function updateSmartGeneratorSettings() {
    const useSmartGenerator = document.getElementById('use-smart-generator').checked;
    document.getElementById('smart-generator-settings').style.display = 
        useSmartGenerator ? 'block' : 'none';
}

// Function to update time filter settings
function updateTimeFilterSettings() {
    const useTimeFilter = document.getElementById('use-time-filter').checked;
    document.getElementById('time-filter-settings').style.display = 
        useTimeFilter ? 'block' : 'none';
}

// Function to update slider value displays
function updateSliderValue(sliderId, valueId) {
    const value = document.getElementById(sliderId).value;
    
    // Format the value display based on the slider type
    if (sliderId === 'lookback-days') {
        // For days slider - just show the number
        document.getElementById(valueId).textContent = value;
    } else if (sliderId.includes('prob')) {
        // For probability sliders - add % sign
        document.getElementById(valueId).textContent = `${value}%`;
    } else if (sliderId === 'time-threshold') {
        // For time threshold - add s for seconds
        document.getElementById(valueId).textContent = `${value}s`;
    } else {
        // Default formatting
        document.getElementById(valueId).textContent = value;
    }
}

// Function to toggle the display of multiplication options
function toggleMultiplyOptions() {
    const optionsDiv = document.getElementById('multiply-options');
    optionsDiv.style.display = optionsDiv.style.display === 'none' ? 'block' : 'none';
}

// Function to select multiplication mode with specific difficulty
async function selectMultiplyMode(difficulty) {
    currentMode = 'multiplication';
    gameManager.setModule(modules['multiplication']);
    
    // Set the difficulty level in the multiplication module
    modules['multiplication'].setDifficulty(difficulty);
    
    // Store selected multiplication difficulty
    saveSettingToIndexedDB('multiplicationDifficulty', difficulty);
    
    // Hide multiplication options
    document.getElementById('multiply-options').style.display = 'none';
    
    // Show duration select screen
    showDurationSelect();
}

// Function to check and migrate scores if needed
async function checkAndMigrateScores() {
    try {
        // Check if we have scores in IndexedDB
        const scores = await getAllFromIndexedDB(SCORES_STORE);
        
        if (scores.length === 0) {
            console.log('No scores found in IndexedDB, checking localStorage');
            
            // Check if we have scores in localStorage
            const localScores = JSON.parse(localStorage.getItem('mathScores') || '[]');
            
            if (localScores.length > 0) {
                console.log(`Found ${localScores.length} scores in localStorage, migrating to IndexedDB`);
                
                // Ensure each score has an ID
                localScores.forEach((score, index) => {
                    if (!score.id) {
                        score.id = `score-${score.date || new Date().toISOString()}-${index}`;
                    }
                });
                
                // Save to IndexedDB
                await saveToIndexedDB(SCORES_STORE, localScores);
                
                console.log('Migration complete');
                dbStatus = `Connected (v${DB_VERSION}) - Migrated ${localScores.length} scores from localStorage`;
                displayDBStatus();
                
                return true;
            } else {
                console.log('No scores found in localStorage either');
                return false;
            }
        } else {
            console.log(`Found ${scores.length} scores in IndexedDB`);
            return true;
        }
    } catch (error) {
        console.error('Error checking/migrating scores:', error);
        return false;
    }
}

// Function to initialize the leaderboard
function initializeLeaderboard() {
    console.log('Initializing leaderboard...');
    
    // Set the mode filter to the saved mode
    const modeFilter = document.getElementById('leaderboard-mode-filter');
    if (modeFilter && currentLeaderboardMode) {
        modeFilter.value = currentLeaderboardMode;
    }
    
    // Set the duration filter to the saved duration
    const durationFilter = document.getElementById('leaderboard-duration-filter');
    if (durationFilter && currentLeaderboardFilter) {
        durationFilter.value = currentLeaderboardFilter;
    }
    
    // Set the active tab based on the saved type
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.leaderboard-tab[onclick="switchLeaderboard('${currentLeaderboardType}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Pre-load the leaderboard data
    updateLeaderboard();
}

// Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize GameManager settings
    await gameManager.initializeSettings();
    
    // Load saved settings
    await loadSavedSettings();
    
    // Load debug mode setting
    await loadDebugModeSetting();
    
    // Only show status if debug mode is enabled
    if (debugMode) {
        displayDBStatus();
    }
    
    // Initialize the leaderboard
    initializeLeaderboard();
    
    // Check and migrate scores if needed
    try {
        // Check if we have scores in IndexedDB
        const scores = await getAllFromIndexedDB(SCORES_STORE);
        
        if (scores.length === 0) {
            console.log('No scores found in IndexedDB, checking localStorage');
            
            // Check if we have scores in localStorage
            const localScores = JSON.parse(localStorage.getItem('mathScores') || '[]');
            
            if (localScores.length > 0) {
                console.log(`Found ${localScores.length} scores in localStorage, migrating to IndexedDB`);
                
                // Ensure each score has an ID
                localScores.forEach((score, index) => {
                    if (!score.id) {
                        score.id = `score-${score.date || new Date().toISOString()}-${index}`;
                    }
                });
                
                // Save to IndexedDB
                await saveToIndexedDB(SCORES_STORE, localScores);
                
                console.log('Migration complete');
                dbStatus = `Connected (v${DB_VERSION}) - Migrated ${localScores.length} scores from localStorage`;
                
                // Only show status if debug mode is enabled
                if (debugMode) {
                    displayDBStatus();
                }
                
                // Update the leaderboard with the migrated scores
                updateLeaderboard();
                
                // Clear localStorage after migration
                localStorage.removeItem('mathScores');
            } else {
                console.log('No scores found in localStorage either');
            }
        } else {
            console.log(`Found ${scores.length} scores in IndexedDB`);
        }
    } catch (error) {
        console.error('Error checking/migrating scores:', error);
    }
});

// Export functions for use in HTML
window.selectMode = selectMode;
window.selectDuration = selectDuration;
window.startWithSettings = startWithSettings;
window.checkAnswer = checkAnswer;
window.goToModeSelect = goToModeSelect;
window.resetGame = resetGame;
window.toggleAccordion = toggleAccordion;
window.showHistory = showHistory;
window.confirmQuitGame = confirmQuitGame;
window.confirmClearHistory = confirmClearHistory;
window.showSessionDetails = showSessionDetails;
window.confirmDeleteSession = confirmDeleteSession;
window.sortSessionProblems = sortSessionProblems;
window.updateSmartGeneratorSettings = updateSmartGeneratorSettings;
window.updateTimeFilterSettings = updateTimeFilterSettings;
window.updateSliderValue = updateSliderValue;
window.toggleMultiplyOptions = toggleMultiplyOptions;
window.selectMultiplyMode = selectMultiplyMode;
window.toggleLeaderboard = toggleLeaderboard;
window.switchLeaderboard = switchLeaderboard;
window.updateLeaderboard = updateLeaderboard;
window.toggleCalendarOptions = toggleCalendarOptions;
window.toggleSquareRootOptions = toggleSquareRootOptions;
window.showSquareRootRangeSettings = showSquareRootRangeSettings;
window.updateMinRangeValue = updateMinRangeValue;
window.updateMaxRangeValue = updateMaxRangeValue;
window.startWithSquareRootRange = startWithSquareRootRange;
window.displayDBStatus = displayDBStatus;
window.showDebugInfo = showDebugInfo;
window.closeDebugModal = closeDebugModal;
window.refreshDebugInfo = refreshDebugInfo;
window.toggleLocalStorage = toggleLocalStorage;
window.clearLocalStorage = clearLocalStorage;
window.testIndexedDBWrite = testIndexedDBWrite;
window.toggleDebugMode = toggleDebugMode;
window.checkEnter = (e) => {
    if (e.key === 'Enter') {
        checkAnswer();
    }
};

// Leaderboard Functions
function toggleLeaderboard() {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const leaderboardToggle = document.getElementById('leaderboard-toggle');
    
    if (leaderboardContainer.style.display === 'none' || leaderboardContainer.style.display === '') {
        leaderboardContainer.style.display = 'block';
        leaderboardToggle.classList.add('active');
        
        // Set UI to match current settings
        const modeFilter = document.getElementById('leaderboard-mode-filter');
        if (modeFilter) {
            modeFilter.value = currentLeaderboardMode;
        }
        
        const durationFilter = document.getElementById('leaderboard-duration-filter');
        if (durationFilter) {
            durationFilter.value = currentLeaderboardFilter;
        }
        
        // Update active tab for leaderboard type
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`.leaderboard-tab[onclick="switchLeaderboard('${currentLeaderboardType}')"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Save current leaderboard settings to IndexedDB
        saveSettingToIndexedDB('currentLeaderboardMode', currentLeaderboardMode);
        saveSettingToIndexedDB('currentLeaderboardFilter', currentLeaderboardFilter);
        saveSettingToIndexedDB('currentLeaderboardType', currentLeaderboardType);
        
        updateLeaderboard();
    } else {
        leaderboardContainer.style.display = 'none';
        leaderboardToggle.classList.remove('active');
    }
}

function switchLeaderboard(type) {
    currentLeaderboardType = type;
    
    // Save to IndexedDB
    saveSettingToIndexedDB('currentLeaderboardType', type);
    
    // Update active tab
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.leaderboard-tab[onclick="switchLeaderboard('${type}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    updateLeaderboard();
}

function updateLeaderboard() {
    // Get filter values
    currentLeaderboardMode = document.getElementById('leaderboard-mode-filter').value;
    currentLeaderboardFilter = document.getElementById('leaderboard-duration-filter').value;
    
    // Save to IndexedDB
    saveSettingToIndexedDB('currentLeaderboardMode', currentLeaderboardMode);
    saveSettingToIndexedDB('currentLeaderboardFilter', currentLeaderboardFilter);
    
    // Show loading state
    document.getElementById('leaderboard-content').innerHTML = '<div class="leaderboard-row" style="justify-content: center; padding: 15px;">Loading...</div>';
    
    // Get all scores from IndexedDB
    getAllFromIndexedDB(SCORES_STORE).then(scores => {
        // Debug log to check scores
        console.log(`Found ${scores.length} scores in IndexedDB for leaderboard`);
        
        // Filter by mode first
        let filteredScores = scores.filter(s => s.mode === currentLeaderboardMode);
        console.log(`Filtered to ${filteredScores.length} scores for mode ${currentLeaderboardMode}`);
        
        // Then filter by duration if needed
        if (currentLeaderboardFilter !== 'all') {
            const durationFilter = parseInt(currentLeaderboardFilter);
            filteredScores = filteredScores.filter(s => s.duration === durationFilter);
            console.log(`Further filtered to ${filteredScores.length} scores for duration ${durationFilter}`);
        }
        
        // Calculate leaderboard based on type
        let leaderboard = [];
        
        if (currentLeaderboardType === 'speed') {
            // Problems per minute (scaled)
            leaderboard = calculateSpeedLeaderboard(filteredScores);
        } else if (currentLeaderboardType === 'percentile') {
            // 90th percentile speed
            leaderboard = calculatePercentileLeaderboard(filteredScores);
        } else {
            // Combined score
            leaderboard = calculateCombinedLeaderboard(filteredScores);
        }
        
        console.log(`Generated leaderboard with ${leaderboard.length} entries`);
        
        // Render leaderboard
        renderLeaderboard(leaderboard);
    }).catch(error => {
        console.error('Error loading scores for leaderboard:', error);
        document.getElementById('leaderboard-content').innerHTML = 
            '<div class="leaderboard-row" style="justify-content: center; padding: 15px;">Error loading scores</div>';
    });
}

function calculateSpeedLeaderboard(scores) {
    // Calculate time per problem in seconds for each session
    return scores.map(s => {
        // Only count sessions with problems
        if (!s.problems || s.problems.length === 0) return null;
        
        const sessionDuration = s.time || s.duration;
        
        // Calculate net score (correct - incorrect)
        const correctAnswers = s.score || 0;  // s.score already contains the count of correct answers
        const incorrectAnswers = s.totalProblems - correctAnswers;
        const netScore = correctAnswers - incorrectAnswers;
        
        // Avoid division by zero or negative values
        let secondsPerProblem = 0;
        if (netScore > 0) {
            secondsPerProblem = sessionDuration / netScore;
        } else {
            // If net score is zero or negative, assign a high value
            secondsPerProblem = 999.99;
        }
        
        return {
            id: s.id,
            mode: s.mode,
            date: s.date,
            duration: s.duration,
            difficulty: s.difficulty,
            score: Math.round(secondsPerProblem * 100) / 100, // Round to 2 decimal places
            displayScore: `${Math.round(secondsPerProblem * 100) / 100}s/prob`,
            secondsPerProblem: secondsPerProblem
        };
    })
    .filter(s => s !== null)
    .sort((a, b) => a.score - b.score) // Lower time is better
    .slice(0, 10); // Top 10
}

function calculatePercentileLeaderboard(scores) {
    // Calculate 90th percentile of problem times for each session
    return scores.map(s => {
        // Only include sessions with problems that have timeTaken
        if (!s.problems || s.problems.length === 0) return null;
        
        const problemTimes = s.problems
            .filter(p => p.timeTaken !== undefined && p.timeTaken !== null)
            .map(p => p.timeTaken);
        
        if (problemTimes.length === 0) return null;
        
        // Sort times in ascending order
        problemTimes.sort((a, b) => a - b);
        
        // Calculate 90th percentile index
        const index = Math.floor(problemTimes.length * 0.9);
        const percentileTime = problemTimes[index] || problemTimes[problemTimes.length - 1];
        
        return {
            id: s.id,
            mode: s.mode,
            date: s.date,
            duration: s.duration,
            difficulty: s.difficulty,
            score: percentileTime, // Lower is better
            displayScore: formatTime(percentileTime),
            percentileTime: percentileTime
        };
    })
    .filter(s => s !== null)
    .sort((a, b) => a.score - b.score) // Lower time is better
    .slice(0, 10); // Top 10
}

function calculateCombinedLeaderboard(scores) {
    // Calculate combined score based on speed and percentile
    const speedScores = calculateSpeedLeaderboard(scores);
    const percentileScores = calculatePercentileLeaderboard(scores);
    
    // Create lookup for percentile ranks
    const percentileRanks = {};
    percentileScores.forEach((s, idx) => {
        percentileRanks[s.id] = idx + 1;
    });
    
    // Calculate combined scores
    return speedScores.map(s => {
        const percentileRank = percentileRanks[s.id] || 11; // Default to lowest rank if not in top 10
        
        // For combined score, lower seconds per problem is better
        // And lower percentile rank is better
        // So we divide by seconds per problem to make higher values better
        const combinedScore = (11 - (percentileRank + 1) / 2) / (s.secondsPerProblem || 1);
        
        return {
            ...s,
            score: Math.round(combinedScore * 100) / 100,
            displayScore: `${Math.round(combinedScore * 100) / 100} pts`,
            percentileRank: percentileRank
        };
    })
    .sort((a, b) => b.score - a.score) // Higher combined score is better
    .slice(0, 10); // Top 10
}

function renderLeaderboard(leaderboard) {
    let html = '';
    
    if (leaderboard.length === 0) {
        html = `<div class="leaderboard-row" style="justify-content: center; padding: 15px;">No data available for ${currentLeaderboardMode}</div>`;
    } else {
        leaderboard.forEach((entry, idx) => {
            const formattedDate = formatShortDate(entry.date);
            const difficultyText = entry.difficulty ? ` (${entry.difficulty})` : '';
            const showDifficulty = currentLeaderboardMode === 'Multiplication' && entry.difficulty;
            
            html += `
                <div class="leaderboard-row">
                    <div class="leaderboard-rank">${idx + 1}.</div>
                    <div class="leaderboard-details">
                        ${showDifficulty ? `<div>${difficultyText}</div>` : ''}
                        <div style="font-size: 0.75rem; opacity: 0.7;">${formattedDate} · ${Math.floor(entry.duration/60)}m</div>
                    </div>
                    <div class="leaderboard-score">${entry.displayScore}</div>
                </div>
            `;
        });
    }
    
    document.getElementById('leaderboard-content').innerHTML = html;
}

// Helper function for short date format
function formatShortDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
        return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    }
}

// Function to toggle debug mode
function toggleDebugMode() {
    debugMode = !debugMode;
    
    // Update debug button text
    const debugButton = document.querySelector('button[onclick="toggleDebugMode()"]');
    if (debugButton) {
        debugButton.textContent = debugMode ? 'Debug: ON' : 'Debug';
        debugButton.style.backgroundColor = debugMode ? '#4CAF50' : '#555';
    }
    
    // Show/hide debug info button
    const debugInfoButton = document.getElementById('debug-info-button');
    if (debugInfoButton) {
        debugInfoButton.style.display = debugMode ? 'inline-block' : 'none';
    }
    
    // Show/hide debug status
    displayDBStatus();
    
    // Save debug mode setting to IndexedDB
    saveSettingToIndexedDB('debugMode', debugMode);
    
    return debugMode;
}

// Function to show debug info modal
function showDebugInfo() {
    // If debug mode is off, toggle it on first
    if (!debugMode) {
        toggleDebugMode();
        return;
    }
    
    // Otherwise, show the debug modal
    const modal = document.getElementById('debug-modal');
    modal.style.display = 'block';
    refreshDebugInfo();
}

// Load debug mode setting when the app starts
async function loadDebugModeSetting() {
    try {
        const savedDebugMode = await getSettingFromIndexedDB('debugMode', false);
        debugMode = savedDebugMode;
        
        // Update debug button text if debug mode is enabled
        if (debugMode) {
            const debugButton = document.querySelector('button[onclick="toggleDebugMode()"]');
            if (debugButton) {
                debugButton.textContent = 'Debug: ON';
                debugButton.style.backgroundColor = '#4CAF50';
            }
            
            // Show debug info button
            const debugInfoButton = document.getElementById('debug-info-button');
            if (debugInfoButton) {
                debugInfoButton.style.display = 'inline-block';
            }
            
            // Show debug status
            displayDBStatus();
        }
    } catch (error) {
        console.error('Error loading debug mode setting:', error);
    }
}

// Function to test writing to IndexedDB
async function testIndexedDBWrite() {
    const testKey = 'testWrite';
    const testValue = {
        timestamp: new Date().toISOString(),
        random: Math.random()
    };
    
    try {
        // Update status
        dbStatus = 'Testing write...';
        if (debugMode) {
            displayDBStatus();
        }
        
        // Try to write to IndexedDB
        await saveSettingToIndexedDB(testKey, testValue);
        
        // Read back the value to verify
        const readValue = await getSettingFromIndexedDB(testKey, null);
        
        // Check if the value was written correctly
        if (readValue && readValue.timestamp === testValue.timestamp) {
            dbStatus = `Write test successful at ${new Date().toLocaleTimeString()}`;
        } else {
            dbStatus = 'Write test failed - read value does not match';
        }
    } catch (error) {
        dbStatus = `Write test error: ${error.message}`;
    }
    
    // Update display
    if (debugMode) {
        displayDBStatus();
    }
    refreshDebugInfo();
}

// Function to toggle showing localStorage contents for debugging
function toggleLocalStorage() {
    const debugInfoContent = document.getElementById('debug-info-content');
    if (!debugInfoContent) return;
    
    // Check if we're already showing localStorage
    const isShowingLocalStorage = debugInfoContent.getAttribute('data-showing-localstorage') === 'true';
    
    if (isShowingLocalStorage) {
        // Switch back to showing IndexedDB info
        refreshDebugInfo();
        debugInfoContent.setAttribute('data-showing-localstorage', 'false');
        return;
    }
    
    // Show localStorage contents
    let html = '<h4>localStorage Contents:</h4>';
    
    if (localStorage.length === 0) {
        html += '<p>localStorage is empty.</p>';
    } else {
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr><th style="text-align: left; padding: 5px; border-bottom: 1px solid #ddd;">Key</th><th style="text-align: left; padding: 5px; border-bottom: 1px solid #ddd;">Value</th></tr>';
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            let value = localStorage.getItem(key);
            
            // Try to pretty-print JSON
            try {
                const parsed = JSON.parse(value);
                value = JSON.stringify(parsed, null, 2);
            } catch (e) {
                // Not JSON, use as is
            }
            
            html += `<tr>
                <td style="padding: 5px; border-bottom: 1px solid #333;">${key}</td>
                <td style="padding: 5px; border-bottom: 1px solid #333;"><pre style="margin: 0; white-space: pre-wrap;">${value}</pre></td>
            </tr>`;
        }
        
        html += '</table>';
    }
    
    // Add a note about migration
    html += '<p style="margin-top: 15px; color: #ff9800;">Note: All data should be migrated to IndexedDB. Any data here should be cleared.</p>';
    html += '<button onclick="clearLocalStorage()" style="margin-top: 10px; padding: 5px 10px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear localStorage</button>';
    
    debugInfoContent.innerHTML = html;
    debugInfoContent.setAttribute('data-showing-localstorage', 'true');
}

// Function to clear localStorage for debugging
function clearLocalStorage() {
    localStorage.clear();
    toggleLocalStorage(); // Refresh the view
}

// Function to start game with Square Root Range settings
async function startWithSquareRootRange() {
    const min = parseInt(document.getElementById('min-range').value);
    const max = parseInt(document.getElementById('max-range').value);

    // Select the mode and set the range
    currentMode = 'square-root-range';
    gameManager.setModule(modules['square-root-range']);
    modules['square-root-range'].setRange(min, max);

    // Hide settings screen and show duration select
    document.getElementById('square-root-range-settings').style.display = 'none';
    showDurationSelect();
}

// Function to show Square Root Range settings screen
function showSquareRootRangeSettings() {
    document.getElementById('mode-select-screen').style.display = 'none';
    document.getElementById('square-root-range-settings').style.display = 'block';
    
    // Setup range slider event listeners
    document.getElementById('min-range').addEventListener('input', updateMinRangeValue);
    document.getElementById('max-range').addEventListener('input', updateMaxRangeValue);
}

// Function to update min range value display
function updateMinRangeValue() {
    const value = document.getElementById('min-range').value;
    document.getElementById('min-range-value').textContent = value;
    
    // Ensure max is always >= min
    const maxRange = document.getElementById('max-range');
    if (parseInt(maxRange.value) < parseInt(value)) {
        maxRange.value = value;
        document.getElementById('max-range-value').textContent = value;
    }
}

// Function to update max range value display
function updateMaxRangeValue() {
    const value = document.getElementById('max-range').value;
    document.getElementById('max-range-value').textContent = value;
    
    // Ensure min is always <= max
    const minRange = document.getElementById('min-range');
    if (parseInt(minRange.value) > parseInt(value)) {
        minRange.value = value;
        document.getElementById('min-range-value').textContent = value;
    }
} 