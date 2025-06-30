/**
 * LD2450 Zone Manager - Professional mmWave Configuration
 * Advanced standalone web application for LD2450 sensor zone management
 */

class LD2450ZoneManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        
        // Configuration - clear any malformed URLs from cache
        const storedUrl = localStorage.getItem('ld2450_ha_url') || '';
        const cleanUrl = storedUrl.includes('http://http:') ? '' : storedUrl;
        if (storedUrl !== cleanUrl) {
            localStorage.removeItem('ld2450_ha_url');
        }
        
        this.config = {
            haUrl: cleanUrl,
            haToken: localStorage.getItem('ld2450_ha_token') || '',
            refreshRate: parseInt(localStorage.getItem('ld2450_refresh_rate')) || 500,
            showGrid: localStorage.getItem('ld2450_show_grid') !== 'false',
            enablePersistence: localStorage.getItem('ld2450_persistence') === 'true',
            theme: localStorage.getItem('ld2450_theme') || 'light'
        };
        
        // State
        this.selectedDevice = null;
        this.entities = new Map();
        this.zones = new Map();
        this.exclusionZones = new Map();
        this.targets = [];
        this.targetTrail = [];
        this.isEditMode = false;
        this.currentEditZone = null;
        this.isDragging = false;
        this.dragStart = null;
        
        // WebSocket connection
        this.websocket = null;
        this.connectionStatus = 'disconnected';
        this.refreshInterval = null;
        
        // Canvas settings
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.scale = 0.1; // mm to pixel scale
        this.centerX = this.canvasWidth / 2;
        this.centerY = this.canvasHeight - 50; // Sensor at bottom center
        
        this.init();
    }
    
    async init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.applyTheme();
        this.createZoneCards();
        
        if (this.config.haUrl && this.config.haToken) {
            await this.connect();
        } else {
            this.showSettings();
        }
        
        this.startVisualizationLoop();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('radarCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.previewCanvas = document.getElementById('zonePreviewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Set up canvas event listeners
        this.canvas.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleCanvasMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', this.toggleTheme.bind(this));
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', this.showSettings.bind(this));
        document.getElementById('closeSettingsBtn').addEventListener('click', this.hideSettings.bind(this));
        document.getElementById('saveSettingsBtn').addEventListener('click', this.saveSettings.bind(this));
        document.getElementById('resetSettingsBtn').addEventListener('click', this.resetSettings.bind(this));
        
        // Device selection
        document.getElementById('deviceSelect').addEventListener('change', this.handleDeviceSelect.bind(this));
        
        // Canvas controls
        document.getElementById('gridToggle').addEventListener('click', this.toggleGrid.bind(this));
        document.getElementById('persistenceToggle').addEventListener('click', this.togglePersistence.bind(this));
        document.getElementById('fullscreenBtn').addEventListener('click', this.toggleFullscreen.bind(this));
        
        // Zone management
        document.getElementById('editModeBtn').addEventListener('click', this.toggleEditMode.bind(this));
        document.getElementById('saveZonesBtn').addEventListener('click', this.saveAllZones.bind(this));
        document.getElementById('clearTrailBtn').addEventListener('click', this.clearTargetTrail.bind(this));
        
        // Zone tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.handleTabClick.bind(this));
        });
        
        // Zone editor
        document.getElementById('closeZoneEditorBtn').addEventListener('click', this.hideZoneEditor.bind(this));
        document.getElementById('cancelZoneEditBtn').addEventListener('click', this.hideZoneEditor.bind(this));
        document.getElementById('saveZoneBtn').addEventListener('click', this.saveZone.bind(this));
        document.getElementById('deleteZoneBtn').addEventListener('click', this.deleteZone.bind(this));
    }
    
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.config.theme);
        const themeIcon = document.querySelector('.theme-icon path');
        if (this.config.theme === 'dark') {
            themeIcon.setAttribute('d', 'M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z');
        } else {
            themeIcon.setAttribute('d', 'M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z');
        }
    }
    
    toggleTheme() {
        this.config.theme = this.config.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('ld2450_theme', this.config.theme);
        this.applyTheme();
    }
    
    normalizeUrl(url) {
        if (!url) return '';
        
        // Clean up the URL
        url = url.trim();
        
        // Remove any existing protocol prefixes first
        url = url.replace(/^https?:\/\//, '');
        
        // Remove trailing slash
        url = url.replace(/\/+$/, '');
        
        // Add http:// prefix
        return 'http://' + url;
    }

    async connect() {
        this.updateConnectionStatus('connecting');
        
        try {
            // Normalize the URL before using it
            const normalizedUrl = this.normalizeUrl(this.config.haUrl);
            console.log('Original URL:', this.config.haUrl);
            console.log('Normalized URL:', normalizedUrl);
            
            // Test connection
            const response = await fetch(`${normalizedUrl}/api/`, {
                headers: {
                    'Authorization': `Bearer ${this.config.haToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // Update config with normalized URL
                this.config.haUrl = normalizedUrl;
                localStorage.setItem('ld2450_ha_url', normalizedUrl);
                
                this.updateConnectionStatus('connected');
                await this.discoverDevices();
                this.startDataRefresh();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateConnectionStatus('disconnected');
            this.showConnectionError(error.message);
        }
    }
    
    updateConnectionStatus(status) {
        this.connectionStatus = status;
        const statusElement = document.getElementById('connectionStatus');
        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('span');
        
        statusElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                text.textContent = 'Connected';
                break;
            case 'connecting':
                text.textContent = 'Connecting...';
                break;
            case 'disconnected':
                text.textContent = 'Disconnected';
                break;
        }
    }
    
    async discoverDevices() {
        try {
            const normalizedUrl = this.normalizeUrl(this.config.haUrl);
            const response = await fetch(`${normalizedUrl}/api/states`, {
                headers: {
                    'Authorization': `Bearer ${this.config.haToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch states');
            
            const states = await response.json();
            const ld2450Entities = states.filter(entity => 
                entity.entity_id.includes('ld2450') || 
                entity.entity_id.includes('mmwave') ||
                (entity.attributes && entity.attributes.device_class === 'presence')
            );
            
            this.populateDeviceSelect(ld2450Entities);
            
        } catch (error) {
            console.error('Device discovery failed:', error);
        }
    }
    
    populateDeviceSelect(entities) {
        const select = document.getElementById('deviceSelect');
        select.innerHTML = '<option value="">Select a device...</option>';
        
        // Group entities by device
        const devices = new Map();
        
        entities.forEach(entity => {
            const deviceName = this.extractDeviceName(entity.entity_id);
            if (!devices.has(deviceName)) {
                devices.set(deviceName, []);
            }
            devices.get(deviceName).push(entity);
        });
        
        devices.forEach((entityList, deviceName) => {
            const option = document.createElement('option');
            option.value = deviceName;
            option.textContent = this.formatDeviceName(deviceName);
            select.appendChild(option);
        });
    }
    
    extractDeviceName(entityId) {
        // Extract device name from entity ID
        const parts = entityId.split('.');
        if (parts.length > 1) {
            return parts[1].split('_').slice(0, -1).join('_');
        }
        return entityId;
    }
    
    formatDeviceName(deviceName) {
        return deviceName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    handleDeviceSelect(event) {
        const deviceName = event.target.value;
        if (deviceName) {
            this.selectedDevice = deviceName;
            document.getElementById('deviceInfo').style.display = 'block';
            this.loadDeviceData();
        } else {
            this.selectedDevice = null;
            document.getElementById('deviceInfo').style.display = 'none';
        }
    }
    
    async loadDeviceData() {
        if (!this.selectedDevice) return;
        
        try {
            const normalizedUrl = this.normalizeUrl(this.config.haUrl);
            const response = await fetch(`${normalizedUrl}/api/states`, {
                headers: {
                    'Authorization': `Bearer ${this.config.haToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch device data');
            
            const states = await response.json();
            const deviceEntities = states.filter(entity => 
                entity.entity_id.includes(this.selectedDevice)
            );
            
            this.processDeviceEntities(deviceEntities);
            this.updateDeviceInfo();
            
        } catch (error) {
            console.error('Failed to load device data:', error);
        }
    }
    
    processDeviceEntities(entities) {
        this.entities.clear();
        this.zones.clear();
        this.exclusionZones.clear();
        this.targets = [];
        
        entities.forEach(entity => {
            this.entities.set(entity.entity_id, entity);
            
            // Process zones
            if (entity.entity_id.includes('zone_') && entity.entity_id.includes('_begin_')) {
                this.processZoneEntity(entity);
            }
            
            // Process exclusion zones
            if (entity.entity_id.includes('occupancy_mask_') && entity.entity_id.includes('_begin_')) {
                this.processExclusionZoneEntity(entity);
            }
            
            // Process targets
            if (entity.entity_id.includes('target_') && entity.entity_id.includes('_active')) {
                this.processTargetEntity(entity);
            }
        });
    }
    
    processZoneEntity(entity) {
        const match = entity.entity_id.match(/zone_(\d+)_begin_([xy])/);
        if (match) {
            const zoneNum = parseInt(match[1]);
            const coord = match[2];
            
            if (!this.zones.has(zoneNum)) {
                this.zones.set(zoneNum, { id: zoneNum, x1: 0, y1: 0, x2: 0, y2: 0, active: false });
            }
            
            const zone = this.zones.get(zoneNum);
            const value = parseFloat(entity.state) || 0;
            
            if (coord === 'x') {
                zone.x1 = value;
            } else {
                zone.y1 = value;
            }
            
            // Get end coordinates
            const endEntityId = entity.entity_id.replace('_begin_', '_end_');
            const endEntity = Array.from(this.entities.values()).find(e => e.entity_id === endEntityId);
            if (endEntity) {
                const endValue = parseFloat(endEntity.state) || 0;
                if (coord === 'x') {
                    zone.x2 = endValue;
                } else {
                    zone.y2 = endValue;
                }
            }
            
            // Check if zone is active
            zone.active = zone.x1 !== 0 || zone.y1 !== 0 || zone.x2 !== 0 || zone.y2 !== 0;
        }
    }
    
    processExclusionZoneEntity(entity) {
        const match = entity.entity_id.match(/occupancy_mask_(\d+)_begin_([xy])/);
        if (match) {
            const zoneNum = parseInt(match[1]);
            const coord = match[2];
            
            if (!this.exclusionZones.has(zoneNum)) {
                this.exclusionZones.set(zoneNum, { id: zoneNum, x1: 0, y1: 0, x2: 0, y2: 0, active: false });
            }
            
            const zone = this.exclusionZones.get(zoneNum);
            const value = parseFloat(entity.state) || 0;
            
            if (coord === 'x') {
                zone.x1 = value;
            } else {
                zone.y1 = value;
            }
            
            // Get end coordinates
            const endEntityId = entity.entity_id.replace('_begin_', '_end_');
            const endEntity = Array.from(this.entities.values()).find(e => e.entity_id === endEntityId);
            if (endEntity) {
                const endValue = parseFloat(endEntity.state) || 0;
                if (coord === 'x') {
                    zone.x2 = endValue;
                } else {
                    zone.y2 = endValue;
                }
            }
            
            zone.active = zone.x1 !== 0 || zone.y1 !== 0 || zone.x2 !== 0 || zone.y2 !== 0;
        }
    }
    
    processTargetEntity(entity) {
        const match = entity.entity_id.match(/target_(\d+)_active/);
        if (match) {
            const targetNum = parseInt(match[1]);
            const active = entity.state === 'on';
            
            if (active) {
                // Get target coordinates and other data
                const baseName = entity.entity_id.replace('_active', '');
                const xEntity = this.entities.get(`${baseName}_x`);
                const yEntity = this.entities.get(`${baseName}_y`);
                const speedEntity = this.entities.get(`${baseName}_speed`);
                const distanceEntity = this.entities.get(`${baseName}_distance`);
                const angleEntity = this.entities.get(`${baseName}_angle`);
                
                const target = {
                    id: targetNum,
                    active: true,
                    x: parseFloat(xEntity?.state) || 0,
                    y: parseFloat(yEntity?.state) || 0,
                    speed: parseFloat(speedEntity?.state) || 0,
                    distance: parseFloat(distanceEntity?.state) || 0,
                    angle: parseFloat(angleEntity?.state) || 0
                };
                
                this.targets.push(target);
                
                // Add to trail if persistence is enabled
                if (this.config.enablePersistence) {
                    this.targetTrail.push({ x: target.x, y: target.y, timestamp: Date.now() });
                    
                    // Limit trail length
                    if (this.targetTrail.length > 1000) {
                        this.targetTrail.shift();
                    }
                }
            }
        }
    }
    
    updateDeviceInfo() {
        // Update device info display
        document.getElementById('deviceModel').textContent = 'LD2450';
        
        const maxDistanceEntity = Array.from(this.entities.values()).find(e => 
            e.entity_id.includes('max_distance')
        );
        if (maxDistanceEntity) {
            document.getElementById('deviceRange').textContent = `${maxDistanceEntity.state} cm`;
        }
        
        const angleEntity = Array.from(this.entities.values()).find(e => 
            e.entity_id.includes('installation_angle')
        );
        if (angleEntity) {
            document.getElementById('deviceAngle').textContent = `${angleEntity.state}°`;
        }
        
        this.updateTargetTracking();
        this.updateZoneDisplay();
    }
    
    updateTargetTracking() {
        for (let i = 1; i <= 3; i++) {
            const target = this.targets.find(t => t.id === i);
            const card = document.getElementById(`target${i}`);
            const status = card.querySelector('.target-status');
            const details = card.querySelectorAll('.detail-value');
            
            if (target && target.active) {
                status.textContent = 'Active';
                status.className = 'target-status active';
                
                details[0].textContent = `${target.x.toFixed(0)}, ${target.y.toFixed(0)} mm`;
                details[1].textContent = `${target.speed.toFixed(1)} mm/s`;
                details[2].textContent = `${target.distance.toFixed(0)} mm`;
            } else {
                status.textContent = 'Inactive';
                status.className = 'target-status inactive';
                
                details[0].textContent = '—';
                details[1].textContent = '—';
                details[2].textContent = '—';
            }
        }
    }
    
    createZoneCards() {
        const detectionContainer = document.getElementById('detectionZones');
        const exclusionContainer = document.getElementById('exclusionZones');
        
        // Create detection zone cards
        for (let i = 1; i <= 4; i++) {
            const card = this.createZoneCard(i, 'detection');
            detectionContainer.appendChild(card);
        }
        
        // Create exclusion zone cards
        for (let i = 1; i <= 2; i++) {
            const card = this.createZoneCard(i, 'exclusion');
            exclusionContainer.appendChild(card);
        }
    }
    
    createZoneCard(zoneNum, type) {
        const card = document.createElement('div');
        card.className = 'zone-card';
        card.setAttribute('data-zone', zoneNum);
        card.setAttribute('data-type', type);
        
        card.innerHTML = `
            <div class="zone-card-header">
                <h4>${type === 'detection' ? 'Zone' : 'Exclusion'} ${zoneNum}</h4>
                <div class="zone-status inactive">Inactive</div>
            </div>
            <div class="zone-coordinates">
                <div class="coord-pair">
                    <span class="coord-label">X1:</span>
                    <span class="coord-value">—</span>
                </div>
                <div class="coord-pair">
                    <span class="coord-label">Y1:</span>
                    <span class="coord-value">—</span>
                </div>
                <div class="coord-pair">
                    <span class="coord-label">X2:</span>
                    <span class="coord-value">—</span>
                </div>
                <div class="coord-pair">
                    <span class="coord-label">Y2:</span>
                    <span class="coord-value">—</span>
                </div>
            </div>
            <div class="zone-actions">
                <button class="btn btn-sm btn-secondary edit-zone-btn">Edit</button>
                <button class="btn btn-sm btn-danger clear-zone-btn">Clear</button>
            </div>
        `;
        
        // Add event listeners
        card.querySelector('.edit-zone-btn').addEventListener('click', () => {
            this.editZone(zoneNum, type);
        });
        
        card.querySelector('.clear-zone-btn').addEventListener('click', () => {
            this.clearZone(zoneNum, type);
        });
        
        return card;
    }
    
    updateZoneDisplay() {
        // Update detection zones
        for (let i = 1; i <= 4; i++) {
            const zone = this.zones.get(i);
            const card = document.querySelector(`[data-zone="${i}"][data-type="detection"]`);
            this.updateZoneCard(card, zone);
        }
        
        // Update exclusion zones
        for (let i = 1; i <= 2; i++) {
            const zone = this.exclusionZones.get(i);
            const card = document.querySelector(`[data-zone="${i}"][data-type="exclusion"]`);
            this.updateZoneCard(card, zone);
        }
    }
    
    updateZoneCard(card, zone) {
        if (!card) return;
        
        const status = card.querySelector('.zone-status');
        const coords = card.querySelectorAll('.coord-value');
        
        if (zone && zone.active) {
            status.textContent = 'Active';
            status.className = 'zone-status active';
            
            coords[0].textContent = zone.x1.toString();
            coords[1].textContent = zone.y1.toString();
            coords[2].textContent = zone.x2.toString();
            coords[3].textContent = zone.y2.toString();
        } else {
            status.textContent = 'Inactive';
            status.className = 'zone-status inactive';
            
            coords.forEach(coord => coord.textContent = '—');
        }
    }
    
    startDataRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.selectedDevice && this.connectionStatus === 'connected') {
                this.loadDeviceData();
            }
        }, this.config.refreshRate);
    }
    
    startVisualizationLoop() {
        const render = () => {
            this.drawVisualization();
            requestAnimationFrame(render);
        };
        render();
    }
    
    drawVisualization() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw background
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim();
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw grid if enabled
        if (this.config.showGrid) {
            this.drawGrid();
        }
        
        // Draw sensor position
        this.drawSensor();
        
        // Draw zones
        this.drawZones();
        
        // Draw exclusion zones
        this.drawExclusionZones();
        
        // Draw targets
        this.drawTargets();
        
        // Draw target trail
        if (this.config.enablePersistence) {
            this.drawTargetTrail();
        }
        
        // Draw edit overlay if in edit mode
        if (this.isEditMode && this.currentEditZone) {
            this.drawEditZone();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim();
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        
        // Draw 1m grid lines
        const gridSize = 1000 * this.scale; // 1000mm = 1m
        
        // Vertical lines
        for (let x = this.centerX % gridSize; x < this.canvasWidth; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvasHeight; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvasWidth, y);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
    }
    
    drawSensor() {
        // Draw sensor as a triangle at bottom center
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY + 20);
        this.ctx.lineTo(this.centerX - 15, this.centerY + 5);
        this.ctx.lineTo(this.centerX + 15, this.centerY + 5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Label
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
        this.ctx.font = '12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LD2450', this.centerX, this.centerY + 40);
    }
    
    drawZones() {
        this.zones.forEach(zone => {
            if (zone.active) {
                this.drawZone(zone, getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), 0.3);
            }
        });
    }
    
    drawExclusionZones() {
        this.exclusionZones.forEach(zone => {
            if (zone.active) {
                this.drawZone(zone, getComputedStyle(document.documentElement).getPropertyValue('--error').trim(), 0.2);
            }
        });
    }
    
    drawZone(zone, color, alpha = 0.3) {
        // Convert mm coordinates to canvas coordinates
        const x1 = this.centerX + (zone.x1 * this.scale);
        const y1 = this.centerY - (zone.y1 * this.scale);
        const x2 = this.centerX + (zone.x2 * this.scale);
        const y2 = this.centerY - (zone.y2 * this.scale);
        
        // Draw filled rectangle
        this.ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        this.ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        // Draw border
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        // Draw zone label
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Zone ${zone.id}`, (x1 + x2) / 2, (y1 + y2) / 2);
    }
    
    drawTargets() {
        this.targets.forEach(target => {
            if (target.active) {
                const x = this.centerX + (target.x * this.scale);
                const y = this.centerY - (target.y * this.scale);
                
                // Draw target as a circle
                this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
                this.ctx.beginPath();
                this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // Draw target ID
                this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-inverse').trim();
                this.ctx.font = 'bold 10px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(target.id.toString(), x, y + 3);
            }
        });
    }
    
    drawTargetTrail() {
        if (this.targetTrail.length < 2) return;
        
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() + '40';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        
        this.ctx.beginPath();
        
        for (let i = 0; i < this.targetTrail.length; i++) {
            const point = this.targetTrail[i];
            const x = this.centerX + (point.x * this.scale);
            const y = this.centerY - (point.y * this.scale);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
    
    drawEditZone() {
        if (!this.currentEditZone) return;
        
        const zone = this.currentEditZone;
        const x1 = this.centerX + (zone.x1 * this.scale);
        const y1 = this.centerY - (zone.y1 * this.scale);
        const x2 = this.centerX + (zone.x2 * this.scale);
        const y2 = this.centerY - (zone.y2 * this.scale);
        
        // Draw preview zone
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() + '40';
        this.ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        this.ctx.setLineDash([]);
    }
    
    // Canvas interaction handlers
    handleCanvasMouseDown(event) {
        if (!this.isEditMode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        this.isDragging = true;
        this.dragStart = { x, y };
        
        // Convert to mm coordinates
        const mmX = (x - this.centerX) / this.scale;
        const mmY = (this.centerY - y) / this.scale;
        
        this.currentEditZone = {
            x1: mmX,
            y1: mmY,
            x2: mmX,
            y2: mmY
        };
        
        document.getElementById('editOverlay').style.display = 'block';
    }
    
    handleCanvasMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Update coordinate display
        const mmX = Math.round((x - this.centerX) / this.scale);
        const mmY = Math.round((this.centerY - y) / this.scale);
        document.getElementById('mouseCoordinates').textContent = `X: ${mmX}mm, Y: ${mmY}mm`;
        
        if (this.isDragging && this.currentEditZone) {
            const mmX2 = (x - this.centerX) / this.scale;
            const mmY2 = (this.centerY - y) / this.scale;
            
            this.currentEditZone.x2 = mmX2;
            this.currentEditZone.y2 = mmY2;
            
            document.getElementById('editStatusText').textContent = 
                `Zone: (${Math.round(this.currentEditZone.x1)}, ${Math.round(this.currentEditZone.y1)}) to (${Math.round(mmX2)}, ${Math.round(mmY2)})`;
        }
    }
    
    handleCanvasMouseUp(event) {
        if (!this.isDragging || !this.currentEditZone) return;
        
        this.isDragging = false;
        
        // Show zone editor with current zone data
        this.showZoneEditor(this.currentEditZone);
        
        document.getElementById('editOverlay').style.display = 'none';
    }
    
    handleCanvasClick(event) {
        // Handle zone selection for editing
    }
    
    // Zone management
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const btn = document.getElementById('editModeBtn');
        const saveBtn = document.getElementById('saveZonesBtn');
        
        if (this.isEditMode) {
            btn.textContent = 'Exit Edit Mode';
            btn.className = 'btn btn-warning';
            saveBtn.disabled = false;
            this.canvas.style.cursor = 'crosshair';
            document.getElementById('editStatusText').textContent = 'Click and drag to create a zone';
        } else {
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>Edit Zones';
            btn.className = 'btn btn-primary';
            saveBtn.disabled = true;
            this.canvas.style.cursor = 'default';
            this.currentEditZone = null;
        }
    }
    
    editZone(zoneNum, type) {
        const zoneMap = type === 'detection' ? this.zones : this.exclusionZones;
        const zone = zoneMap.get(zoneNum) || { id: zoneNum, x1: 0, y1: 0, x2: 0, y2: 0, active: false };
        
        this.showZoneEditor(zone, type);
    }
    
    showZoneEditor(zone, type = 'detection') {
        const modal = document.getElementById('zoneEditorModal');
        const title = document.getElementById('zoneEditorTitle');
        
        title.textContent = `Edit ${type === 'detection' ? 'Detection' : 'Exclusion'} Zone`;
        
        // Populate form fields
        document.getElementById('zoneName').value = `${type === 'detection' ? 'Zone' : 'Exclusion'} ${zone.id || ''}`;
        document.getElementById('zoneType').value = type;
        document.getElementById('zoneX1').value = Math.round(zone.x1) || 0;
        document.getElementById('zoneY1').value = Math.round(zone.y1) || 0;
        document.getElementById('zoneX2').value = Math.round(zone.x2) || 0;
        document.getElementById('zoneY2').value = Math.round(zone.y2) || 0;
        
        // Store current edit context
        this.currentEditZone = { ...zone, type };
        
        modal.style.display = 'flex';
        this.updateZonePreview();
    }
    
    hideZoneEditor() {
        document.getElementById('zoneEditorModal').style.display = 'none';
        this.currentEditZone = null;
    }
    
    updateZonePreview() {
        if (!this.previewCtx || !this.currentEditZone) return;
        
        const canvas = this.previewCanvas;
        const ctx = this.previewCtx;
        
        // Clear and setup preview canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim();
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale for preview
        const previewScale = 0.05;
        const previewCenterX = canvas.width / 2;
        const previewCenterY = canvas.height - 20;
        
        // Draw sensor
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        ctx.beginPath();
        ctx.moveTo(previewCenterX, previewCenterY + 10);
        ctx.lineTo(previewCenterX - 8, previewCenterY);
        ctx.lineTo(previewCenterX + 8, previewCenterY);
        ctx.closePath();
        ctx.fill();
        
        // Draw zone preview
        const x1 = previewCenterX + (this.currentEditZone.x1 * previewScale);
        const y1 = previewCenterY - (this.currentEditZone.y1 * previewScale);
        const x2 = previewCenterX + (this.currentEditZone.x2 * previewScale);
        const y2 = previewCenterY - (this.currentEditZone.y2 * previewScale);
        
        const color = this.currentEditZone.type === 'detection' ? 
            getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() : 
            getComputedStyle(document.documentElement).getPropertyValue('--error').trim();
        
        ctx.fillStyle = color + '40';
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    }
    
    saveZone() {
        if (!this.currentEditZone) return;
        
        // Get form values
        const x1 = parseInt(document.getElementById('zoneX1').value) || 0;
        const y1 = parseInt(document.getElementById('zoneY1').value) || 0;
        const x2 = parseInt(document.getElementById('zoneX2').value) || 0;
        const y2 = parseInt(document.getElementById('zoneY2').value) || 0;
        const type = document.getElementById('zoneType').value;
        
        // Update zone data
        this.currentEditZone.x1 = x1;
        this.currentEditZone.y1 = y1;
        this.currentEditZone.x2 = x2;
        this.currentEditZone.y2 = y2;
        this.currentEditZone.active = x1 !== 0 || y1 !== 0 || x2 !== 0 || y2 !== 0;
        
        // Save to appropriate zone map
        const zoneMap = type === 'detection' ? this.zones : this.exclusionZones;
        zoneMap.set(this.currentEditZone.id, this.currentEditZone);
        
        this.hideZoneEditor();
        this.updateZoneDisplay();
    }
    
    deleteZone() {
        if (!this.currentEditZone) return;
        
        const zoneMap = this.currentEditZone.type === 'detection' ? this.zones : this.exclusionZones;
        zoneMap.delete(this.currentEditZone.id);
        
        this.hideZoneEditor();
        this.updateZoneDisplay();
    }
    
    clearZone(zoneNum, type) {
        const zoneMap = type === 'detection' ? this.zones : this.exclusionZones;
        zoneMap.delete(zoneNum);
        this.updateZoneDisplay();
    }
    
    async saveAllZones() {
        if (!this.selectedDevice || this.connectionStatus !== 'connected') {
            alert('Please connect to Home Assistant and select a device first.');
            return;
        }
        
        try {
            // Save detection zones
            for (const [zoneNum, zone] of this.zones) {
                await this.saveZoneToHA(zoneNum, zone, 'detection');
            }
            
            // Save exclusion zones
            for (const [zoneNum, zone] of this.exclusionZones) {
                await this.saveZoneToHA(zoneNum, zone, 'exclusion');
            }
            
            alert('All zones saved successfully!');
            
        } catch (error) {
            console.error('Failed to save zones:', error);
            alert('Failed to save zones. Please check the connection and try again.');
        }
    }
    
    async saveZoneToHA(zoneNum, zone, type) {
        const prefix = type === 'detection' ? 'zone' : 'occupancy_mask';
        const entityPrefix = `number.${this.selectedDevice}_${prefix}_${zoneNum}`;
        
        // Save coordinates
        await this.setEntityValue(`${entityPrefix}_begin_x`, zone.x1);
        await this.setEntityValue(`${entityPrefix}_begin_y`, zone.y1);
        await this.setEntityValue(`${entityPrefix}_end_x`, zone.x2);
        await this.setEntityValue(`${entityPrefix}_end_y`, zone.y2);
    }
    
    async setEntityValue(entityId, value) {
        const normalizedUrl = this.normalizeUrl(this.config.haUrl);
        const response = await fetch(`${normalizedUrl}/api/services/number/set_value`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.haToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                entity_id: entityId,
                value: value
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to set ${entityId} to ${value}`);
        }
    }
    
    // UI helpers
    toggleGrid() {
        this.config.showGrid = !this.config.showGrid;
        localStorage.setItem('ld2450_show_grid', this.config.showGrid);
        
        const btn = document.getElementById('gridToggle');
        btn.classList.toggle('active', this.config.showGrid);
    }
    
    togglePersistence() {
        this.config.enablePersistence = !this.config.enablePersistence;
        localStorage.setItem('ld2450_persistence', this.config.enablePersistence);
        
        const btn = document.getElementById('persistenceToggle');
        btn.classList.toggle('active', this.config.enablePersistence);
        
        if (!this.config.enablePersistence) {
            this.targetTrail = [];
        }
    }
    
    clearTargetTrail() {
        this.targetTrail = [];
    }
    
    toggleFullscreen() {
        const wrapper = document.getElementById('canvasWrapper');
        
        if (!document.fullscreenElement) {
            wrapper.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    handleTabClick(event) {
        const tabName = event.target.getAttribute('data-tab');
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}Panel`).classList.add('active');
    }
    
    // Settings management
    showSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
        
        // Populate current settings
        document.getElementById('haUrl').value = this.config.haUrl;
        document.getElementById('haToken').value = this.config.haToken;
        document.getElementById('refreshRate').value = this.config.refreshRate;
        document.getElementById('showGrid').checked = this.config.showGrid;
        document.getElementById('enablePersistence').checked = this.config.enablePersistence;
    }
    
    hideSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }
    
    async saveSettings() {
        const haUrl = document.getElementById('haUrl').value.trim();
        const haToken = document.getElementById('haToken').value.trim();
        const refreshRate = parseInt(document.getElementById('refreshRate').value) || 500;
        const showGrid = document.getElementById('showGrid').checked;
        const enablePersistence = document.getElementById('enablePersistence').checked;
        
        // Validate settings
        if (!haUrl || !haToken) {
            alert('Please provide both Home Assistant URL and access token.');
            return;
        }
        
        // Save to localStorage
        localStorage.setItem('ld2450_ha_url', haUrl);
        localStorage.setItem('ld2450_ha_token', haToken);
        localStorage.setItem('ld2450_refresh_rate', refreshRate.toString());
        localStorage.setItem('ld2450_show_grid', showGrid.toString());
        localStorage.setItem('ld2450_persistence', enablePersistence.toString());
        
        // Update config
        this.config.haUrl = haUrl;
        this.config.haToken = haToken;
        this.config.refreshRate = refreshRate;
        this.config.showGrid = showGrid;
        this.config.enablePersistence = enablePersistence;
        
        this.hideSettings();
        
        // Reconnect with new settings
        await this.connect();
    }
    
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings?')) {
            localStorage.removeItem('ld2450_ha_url');
            localStorage.removeItem('ld2450_ha_token');
            localStorage.removeItem('ld2450_refresh_rate');
            localStorage.removeItem('ld2450_show_grid');
            localStorage.removeItem('ld2450_persistence');
            localStorage.removeItem('ld2450_theme');
            
            location.reload();
        }
    }
    
    showConnectionError(message) {
        alert(`Connection failed: ${message}\n\nPlease check your Home Assistant URL and access token in the settings.`);
        this.showSettings();
    }
}

// Add zone card styles
const additionalStyles = `
.zone-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

.zone-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
}

.zone-card-header h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.zone-status {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
}

.zone-status.active {
    background: var(--success);
    color: white;
}

.zone-status.inactive {
    background: var(--border-medium);
    color: var(--text-muted);
}

.zone-coordinates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
}

.coord-pair {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
}

.coord-label {
    color: var(--text-muted);
    font-weight: 500;
}

.coord-value {
    color: var(--text-primary);
    font-weight: 600;
}

.zone-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.btn.active {
    background: var(--primary);
    color: white;
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new LD2450ZoneManager();
});