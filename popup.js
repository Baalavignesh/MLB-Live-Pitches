class PopupPitchTracker {
    constructor() {
        this.gamePk = null;
        this.currentAtBat = null;
        this.lastPlayEventCount = 0;
        this.dataQueue = []; // Queue to store delayed data
        this.delayTime = 6000; // 6 seconds delay
        // Better detection: check if we're in an extension popup context vs content script
        this.isContentScript = !chrome.extension || window.location.hostname.includes('mlb.com');
        console.log('MLB Pitch Tracker: isContentScript =', this.isContentScript);
        this.init();
    }

    async init() {
        if (this.isContentScript) {
            this.extractGamePkFromCurrentPage();
            // Wait 5 seconds for page to load before injecting
            console.log('MLB Pitch Tracker: Waiting 5 seconds for page to load...');
            setTimeout(() => {
                this.injectUIOnPage();
                this.setupUI();
                this.startTracking();
                // Set up periodic re-injection in case content gets overwritten
                this.setupPersistentInjection();
            }, 5000);
        } else {
            await this.getCurrentTab();
            this.extractGamePk();
            this.setupUI();
            this.startTracking();
        }
    }

    async getCurrentTab() {
        if (this.isContentScript) {
            // In content script, we're already on the page
            this.currentTab = { url: window.location.href };
            return;
        }
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
        } catch (error) {
            console.log('MLB Pitch Tracker: Could not get current tab');
        }
    }

    extractGamePk() {
        if (!this.currentTab?.url) {
            this.updateStatus('error', 'No active MLB.com tab found');
            return;
        }

        const url = this.currentTab.url;
        console.log('MLB Pitch Tracker: Extracting game PK from URL:', url);
        
        // Check if we're on an MLB.com page
        if (!url.includes('mlb.com')) {
            this.updateStatus('error', 'Not on MLB.com');
            return;
        }

        // Try multiple patterns for game PK extraction
        const patterns = [
            /\/g(\d+)/, // Standard pattern: /g776380
            /game=(\d+)/, // URL parameter: game=776380
            /gamePk[=:](\d+)/, // Alternative parameter: gamePk=776380
            /gameday\/(\d+)/ // Gameday URL: gameday/776380
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                this.gamePk = match[1];
                console.log(`MLB Pitch Tracker: Found game PK:`, this.gamePk);
                return;
            }
        }
        
        this.updateStatus('error', 'No game found on this page');
    }

    extractGamePkFromCurrentPage() {
        const url = window.location.href;
        console.log('MLB Pitch Tracker: Extracting game PK from current page URL:', url);
        
        // Check if we're on an MLB.com page
        if (!url.includes('mlb.com')) {
            console.log('MLB Pitch Tracker: Not on MLB.com');
            return;
        }

        // Try multiple patterns for game PK extraction
        const patterns = [
            /\/g(\d+)/, // Standard pattern: /g776380
            /game=(\d+)/, // URL parameter: game=776380
            /gamePk[=:](\d+)/, // Alternative parameter: gamePk=776380
            /gameday\/(\d+)/ // Gameday URL: gameday/776380
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                this.gamePk = match[1];
                console.log(`MLB Pitch Tracker: Found game PK:`, this.gamePk);
                return;
            }
        }
        
        console.log('MLB Pitch Tracker: No game found on this page');
    }

    injectUIOnPage() {
        // First, let's try a simple test injection
        console.log('MLB Pitch Tracker: Starting injection...');
        
        // Check if we already injected
        if (document.getElementById('mlb-pitch-tracker-overlay')) {
            console.log('MLB Pitch Tracker: Already injected');
            return;
        }
        
        // Find the target element for injection
        const targetElement = document.querySelector('.ViewController.GamePanelStateViewController.live');
        console.log('MLB Pitch Tracker: Target element found:', targetElement);
        
        if (!targetElement) {
            console.log('MLB Pitch Tracker: Target element not found, trying alternative selectors');
            // Try alternative selectors for different MLB page layouts
            const alternatives = [
                '.GamePanelStateViewController',
                '[class*="GamePanel"]',
                '[class*="game-panel"]',
                '.game-center-content',
                '#game-panel'
            ];
            
            for (const selector of alternatives) {
                const altElement = document.querySelector(selector);
                if (altElement) {
                    console.log('MLB Pitch Tracker: Found alternative target:', selector);
                    this.createPitchTable(altElement);
                    return;
                }
            }
            
            console.log('MLB Pitch Tracker: No suitable target found, using body');
            this.createPitchTable(document.body);
            return;
        }

        // Inject into the found target element
        this.createPitchTable(targetElement);
    }

    createPitchTable(parentElement) {
        const container = document.createElement('div');
        container.id = 'mlb-pitch-tracker-overlay';
        container.innerHTML = `
            <div style="
                margin: 15px 0;
                padding: 15px 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="text-align: left; margin-bottom: 15px;">
                    <h2 style="margin: 0 0 4px 0; font-size: 16px; color: #ffffff;">MLB Pitch Tracker</h2>
                    <p id="delay-status" style="margin: 0; font-size: 11px; color: #aaa;">Live pitch tracking with 6s delay</p>
                    <div style="margin-top: 12px; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="font-size: 12px; color: #ccc; margin-bottom: 8px; font-weight: 500;">Pitch Delay</div>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 12px;"> 
                            <button id="delay-minus" style="
                                width: 30px; 
                                height: 30px; 
                                background: #4a90e2;
                                border: none;
                                border-radius: 6px; 
                                color: white;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                user-select: none;
                                line-height: 1;
                            ">−</button>
                            <input type="number" id="delay-input" value="6" min="1" max="10" step="1" style="
                                width: 50px;
                                height: 32px;
                                padding: 0 8px;
                                background: rgba(255,255,255,0.1);
                                border: 1px solid rgba(255,255,255,0.2);
                                border-radius: 6px;
                                color: white;
                                font-size: 12px;
                                font-weight: 500;
                                text-align: center;
                            ">
                            <button id="delay-plus" style="
                                width: 30px; 
                                height: 30px; 
                                background: #4a90e2;
                                border: none;
                                border-radius: 6px; 
                                color: white;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                user-select: none;
                                line-height: 1;
                            ">+</button>
                        </div>
                    </div>
                                       
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div id="game-status" class="status loading" style="
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 8px 12px;
                        border-radius: 5px;
                        font-size: 11px;
                        margin-bottom: 8px;
                        background: rgba(255, 170, 0, 0.1);
                        border: 1px solid #ffaa00;
                    ">
                        <div class="status-dot" style="
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background: #ffaa00;
                            animation: pulse 2s infinite;
                        "></div>
                        <span>Loading game data...</span>
                    </div>
                    <div id="current-matchup" style="font-size: 11px; text-align: left; color: #ccc;"></div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div id="strike-zone-container" style="
                        width: 240px;
                        height: 240px;
                        position: relative;
                        background: #1a1a2e;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    ">
                        <div id="strike-zone-box" style="
                            position: absolute;
                            border: 2px solid #ffffff;
                            background: rgba(255, 255, 255, 0.05);
                        "></div>
                    </div>
                </div>
                    <table style="
                        width: 100%;
                        border-collapse: collapse;
                        background: rgba(255, 255, 255, 0.02);
                        border-radius: 8px;
                        overflow: hidden;
                    ">
                        <thead style="background: rgba(0, 102, 204, 0.2);">
                            <tr>
                                <th style="padding: 6px 10px; text-align: left; font-weight: 600; font-size: 11px; color: #ffffff; border-bottom: 2px solid #0066cc;">#</th>
                                <th style="padding: 6px 10px; text-align: left; font-weight: 600; font-size: 11px; color: #ffffff; border-bottom: 2px solid #0066cc;">Type</th>
                                <th style="padding: 6px 10px; text-align: left; font-weight: 600; font-size: 11px; color: #ffffff; border-bottom: 2px solid #0066cc;">Speed</th>
                            </tr>
                        </thead>
                        <tbody id="pitch-list">
                            <tr>
                                <td colspan="3" style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: left; color: #888;">No pitch data available</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <style>
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    
                    #mlb-pitch-tracker-overlay .status.loading {
                        background: rgba(255, 170, 0, 0.1) !important;
                        border: 1px solid #ffaa00 !important;
                    }
                    
                    #mlb-pitch-tracker-overlay .status.live {
                        background: rgba(0, 255, 136, 0.1) !important;
                        border: 1px solid #00ff88 !important;
                    }
                    
                    #mlb-pitch-tracker-overlay .status.live .status-dot {
                        background: #00ff88 !important;
                    }
                    
                    #mlb-pitch-tracker-overlay .status.error {
                        background: rgba(255, 68, 68, 0.1) !important;
                        border: 1px solid #ff4444 !important;
                    }
                    
                    #mlb-pitch-tracker-overlay .status.error .status-dot {
                        background: #ff4444 !important;
                    }
                    
                    #mlb-pitch-tracker-overlay tbody tr:hover {
                        background: rgba(255, 255, 255, 0.05) !important;
                    }
                    
                    #mlb-pitch-tracker-overlay tbody tr:last-child {
                        background: rgba(0, 102, 204, 0.1) !important;
                        font-weight: 500 !important;
                    }
                    
                    #mlb-pitch-tracker-overlay tbody tr:last-child td {
                        border-bottom: none !important;
                    }
                    
                    #mlb-pitch-tracker-overlay #delay-input:focus {
                        outline: none !important;
                        border-color: #4a90e2 !important;
                    }
                    
                    /* Remove number input arrows */
                    #mlb-pitch-tracker-overlay #delay-input::-webkit-outer-spin-button,
                    #mlb-pitch-tracker-overlay #delay-input::-webkit-inner-spin-button {
                        -webkit-appearance: none !important;
                        margin: 0 !important;
                    }
                    
                    #mlb-pitch-tracker-overlay #delay-input[type=number] {
                        -moz-appearance: textfield !important;
                    }
                    
                    .pitch-dot {
                        position: absolute;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        border: 2px solid #ffffff;
                        font-size: 9px;
                        font-weight: bold;
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10;
                    }
                    
                    .pitch-dot.strike {
                        background: #ff4444;
                    }
                    
                    .pitch-dot.ball {
                        background: #4444ff;
                    }
                </style>
            </div>
        `;

        // Insert at the beginning of the target element (above existing content)
        parentElement.insertBefore(container, parentElement.firstChild);
        
        // Set up delay controls after injection
        this.setupDelayControls();
        
        
        console.log('MLB Pitch Tracker: Pitch table injected');
    }

    setupDelayControls() {
        const delayInput = document.getElementById('delay-input');
        const delayMinus = document.getElementById('delay-minus');
        const delayPlus = document.getElementById('delay-plus');
        const delayStatus = document.getElementById('delay-status');
        
        if (!delayInput || !delayMinus || !delayPlus || !delayStatus) {
            console.log('MLB Pitch Tracker: Delay controls not found');
            return;
        }
        
        // Load saved delay preference
        this.loadDelayPreference();
        
        // + button click handler
        delayPlus.addEventListener('click', () => {
            const currentValue = parseInt(delayInput.value);
            const newValue = Math.min(currentValue + 1, 10);
            delayInput.value = newValue;
            this.updateDelay(newValue * 1000); // Convert to milliseconds
        });
        
        // - button click handler  
        delayMinus.addEventListener('click', () => {
            const currentValue = parseInt(delayInput.value);
            const newValue = Math.max(currentValue - 1, 1);
            delayInput.value = newValue;
            this.updateDelay(newValue * 1000); // Convert to milliseconds
        });
        
        // Input change handler
        delayInput.addEventListener('input', () => {
            let value = parseInt(delayInput.value);
            
            // Validate and clamp the value (in seconds)
            if (isNaN(value)) value = 6;
            value = Math.max(1, Math.min(10, value));
            
            delayInput.value = value;
            this.updateDelay(value * 1000); // Convert to milliseconds
        });
        
        console.log('MLB Pitch Tracker: Delay controls set up');
    }
    
    
    updateDelay(newDelay) {
        this.delayTime = newDelay;
        const delayStatus = document.getElementById('delay-status');
        const delayInSeconds = (newDelay / 1000).toFixed(1);
        
        if (delayStatus) {
            delayStatus.textContent = `Live pitch tracking with ${delayInSeconds}s delay`;
        }
        
        // Save the preference
        this.saveDelayPreference(newDelay);
        
        console.log(`MLB Pitch Tracker: Delay updated to ${newDelay}ms`);
    }
    
    saveDelayPreference(delay) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 'mlb-pitch-tracker-delay': delay });
        }
    }
    
    loadDelayPreference() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['mlb-pitch-tracker-delay'], (result) => {
                const savedDelay = result['mlb-pitch-tracker-delay'];
                if (savedDelay && savedDelay >= 1000 && savedDelay <= 10000) {
                    const delayInput = document.getElementById('delay-input');
                    if (delayInput) {
                        delayInput.value = savedDelay / 1000; // Convert to seconds for display
                        this.updateDelay(savedDelay);
                    }
                }
            });
        }
    }

    setupPersistentInjection() {
        // Check every 10 seconds if our UI is still there, re-inject if needed
        this.persistenceInterval = setInterval(() => {
            if (!document.getElementById('mlb-pitch-tracker-overlay')) {
                console.log('MLB Pitch Tracker: UI disappeared, re-injecting...');
                this.injectUIOnPage();
            }
        }, 10000);
    }

    setupUI() {
        // Wait a bit for injected UI to be available in content script mode
        if (this.isContentScript) {
            setTimeout(() => {
                this.statusElement = document.getElementById('game-status');
                this.matchupElement = document.getElementById('current-matchup');
                this.pitchListElement = document.getElementById('pitch-list');
            }, 100);
        } else {
            this.statusElement = document.getElementById('game-status');
            this.matchupElement = document.getElementById('current-matchup');
            this.pitchListElement = document.getElementById('pitch-list');
        }
    }

    async fetchGameData() {
        if (!this.gamePk) return null;

        try {
            const response = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${this.gamePk}/feed/live`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('MLB Pitch Tracker: Error fetching game data:', error);
            return null;
        }
    }

    startTracking() {
        if (!this.gamePk) {
            return;
        }

        this.updateStatus('loading', 'Connecting to game...');
        this.updateGameData();
        
        // Update every 5 seconds
        this.updateInterval = setInterval(() => {
            this.updateGameData();
        }, 5000);

        // Check delayed data queue every second
        this.delayInterval = setInterval(() => {
            this.processDelayedData();
        }, 1000);
    }

    async updateGameData() {
        const gameData = await this.fetchGameData();
        if (!gameData) {
            this.updateStatus('error', 'Error loading game data');
            return;
        }

        const liveData = gameData.liveData;
        if (!liveData || !liveData.plays) {
            this.updateStatus('error', 'Game not live');
            return;
        }

        const currentPlay = liveData.plays.currentPlay;
        if (!currentPlay) {
            this.updateStatus('error', 'No current play');
            return;
        }

        this.updateCurrentPlay(currentPlay, gameData);
    }

    updateCurrentPlay(currentPlay, gameData) {
        const playEvents = currentPlay.playEvents || [];
        
        if (this.currentAtBat?.atBatIndex !== currentPlay.atBatIndex || 
            this.lastPlayEventCount !== playEvents.length) {
            
            // Add current data to queue with timestamp
            const dataWithTimestamp = {
                currentPlay: currentPlay,
                gameData: gameData,
                timestamp: Date.now()
            };
            
            this.dataQueue.push(dataWithTimestamp);
            
            // Process delayed data
            this.processDelayedData();
        }

        this.updateStatus('live', 'Live game data');
    }

    processDelayedData() {
        const now = Date.now();
        
        // Find data that should be displayed (older than delay time)
        while (this.dataQueue.length > 0) {
            const oldestData = this.dataQueue[0];
            
            if (now - oldestData.timestamp >= this.delayTime) {
                // Remove from queue and display
                const dataToDisplay = this.dataQueue.shift();
                
                this.currentAtBat = dataToDisplay.currentPlay;
                this.lastPlayEventCount = dataToDisplay.currentPlay.playEvents?.length || 0;
                this.renderCurrentAtBat(dataToDisplay.currentPlay, dataToDisplay.gameData);
            } else {
                // No more data ready to display
                break;
            }
        }
    }

    renderCurrentAtBat(currentPlay, gameData) {
        const matchup = currentPlay.matchup || {};
        const playEvents = currentPlay.playEvents || [];
        const inning = gameData.liveData?.linescore?.currentInning || 'N/A';
        const inningHalf = gameData.liveData?.linescore?.inningHalf || '';

        // Update matchup info
        this.matchupElement.innerHTML = `
            ${inningHalf.charAt(0).toUpperCase() + inningHalf.slice(1)} ${inning} - 
            ${matchup.pitcher?.fullName || 'Unknown'} vs ${matchup.batter?.fullName || 'Unknown'}
        `;

        // Update pitch table
        const pitchRows = playEvents
            .filter(event => event.isPitch)
            .map((event, index) => this.renderPitchRow(event, index + 1));

        if (pitchRows.length === 0) {
            this.pitchListElement.innerHTML = `
                <tr>
                    <td colspan="3" style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: left; color: #888;">No pitches yet this at-bat</td>
                </tr>
            `;
        } else {
            this.pitchListElement.innerHTML = pitchRows.join('');
        }
        
        // Update simple strike zone
        this.updateStrikeZone(playEvents.filter(event => event.isPitch));
    }
    
    updateStrikeZone(pitchEvents) {
        const container = document.getElementById('strike-zone-container');
        const strikeBox = document.getElementById('strike-zone-box');
        
        if (!container || !strikeBox) return;
        
        // Clear existing pitch dots
        const existingDots = container.querySelectorAll('.pitch-dot');
        existingDots.forEach(dot => dot.remove());
        
        if (pitchEvents.length === 0) return;
        
        // Get strike zone dimensions from first pitch (MLB official data)
        const firstPitchData = pitchEvents[0].pitchData || {};
        const strikeZoneTop = firstPitchData.strikeZoneTop || 3.5;    // feet above ground
        const strikeZoneBottom = firstPitchData.strikeZoneBottom || 1.5; // feet above ground
        
        // Set up the coordinate system based on MLB PITCHf/x documentation:
        // pX: horizontal distance from center of home plate (feet) - catcher's perspective
        // pZ: vertical distance above ground (feet)
        // Strike zone: 17 inches wide (1.417 feet) = ±0.708 feet from center
        
        const containerSize = 240; // 240x240 pixel container
        const margin = 20;         // 20px margin on all sides
        const plotArea = containerSize - (margin * 2); // 200x200 pixel plot area
        
        // Define the view area in feet (what we show in the 200x200 plot)
        const viewWidth = 3.0;   // Show -1.5 to +1.5 feet horizontally
        const viewHeight = 4.0;  // Show 1.0 to 5.0 feet vertically
        const viewLeft = -1.5;
        const viewBottom = 1.0;
        
        // Calculate strike zone position in pixels
        const strikeZoneWidth = 17.0 / 12.0; // 1.417 feet
        const strikeZoneHalf = strikeZoneWidth / 2; // ±0.708 feet
        
        // Map strike zone to pixel coordinates  
        const szLeftPx = margin + ((-strikeZoneHalf - viewLeft) / viewWidth) * plotArea;
        const szRightPx = margin + ((strikeZoneHalf - viewLeft) / viewWidth) * plotArea;
        const szTopPx = margin + ((viewHeight - (strikeZoneTop - viewBottom)) / viewHeight) * plotArea;
        const szBottomPx = margin + ((viewHeight - (strikeZoneBottom - viewBottom)) / viewHeight) * plotArea;
        
        // Position the strike zone box
        strikeBox.style.left = `${szLeftPx}px`;
        strikeBox.style.top = `${szTopPx}px`;
        strikeBox.style.width = `${szRightPx - szLeftPx}px`;
        strikeBox.style.height = `${szBottomPx - szTopPx}px`;
        
        // Add pitch dots
        pitchEvents.forEach((pitchEvent, index) => {
            const pitchData = pitchEvent.pitchData || {};
            const coordinates = pitchData.coordinates || {};
            const details = pitchEvent.details || {};
            
            if (coordinates.pX !== undefined && coordinates.pZ !== undefined) {
                this.addSimplePitchDot(container, coordinates.pX, coordinates.pZ, details, 
                    index + 1, viewLeft, viewBottom, viewWidth, viewHeight, margin, plotArea);
            }
        });
    }
    
    addSimplePitchDot(container, pX, pZ, pitchDetails, pitchNumber, viewLeft, viewBottom, viewWidth, viewHeight, margin, plotArea) {
        const dot = document.createElement('div');
        dot.className = 'pitch-dot';
        dot.textContent = pitchNumber;
        
        // Determine pitch type
        const isStrike = pitchDetails.isStrike || false;
        const isBall = pitchDetails.isBall || false;
        
        if (isStrike) {
            dot.classList.add('strike');
        } else if (isBall) {
            dot.classList.add('ball');
        }
        
        // Map MLB coordinates to pixel position
        // pX: -1.5 to +1.5 feet maps to 20px to 220px
        // pZ: 1.0 to 5.0 feet maps to 220px to 20px (inverted Y)
        const dotX = margin + ((pX - viewLeft) / viewWidth) * plotArea - 8;
        const dotY = margin + ((viewHeight - (pZ - viewBottom)) / viewHeight) * plotArea - 8;
        
        // Position the dot
        dot.style.left = `${Math.max(0, Math.min(224, dotX))}px`; // Keep within container
        dot.style.top = `${Math.max(0, Math.min(224, dotY))}px`;
        
        // Add tooltip
        const pitchType = pitchDetails.type?.description || 'Unknown';
        const callDescription = pitchDetails.call?.description || pitchDetails.description || '';
        
        dot.title = `Pitch ${pitchNumber}: ${pitchType} - ${callDescription}
Location: pX=${pX.toFixed(2)}ft, pZ=${pZ.toFixed(2)}ft`;
        
        container.appendChild(dot);
    }

    renderPitchRow(pitchEvent, pitchNumber) {
        const details = pitchEvent.details || {};
        const pitchData = pitchEvent.pitchData || {};
        
        const pitchType = details.type?.description || 'Unknown';
        const speed = pitchData.startSpeed ? `${pitchData.startSpeed.toFixed(1)}` : 'N/A';

        return `
            <tr>
                <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${pitchNumber}</td>
                <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${pitchType}</td>
                <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${speed}</td>
            </tr>
        `;
    }

    updateStatus(type, message) {
        if (!this.statusElement) return;
        
        this.statusElement.className = `status ${type}`;
        this.statusElement.querySelector('span').textContent = message;
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.delayInterval) {
            clearInterval(this.delayInterval);
        }
        if (this.persistenceInterval) {
            clearInterval(this.persistenceInterval);
        }
    }
}

// Initialize based on context
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PopupPitchTracker();
    });
} else {
    // Document already loaded (content script context)
    new PopupPitchTracker();
}

console.log('MLB Pitch Tracker: Script loaded');