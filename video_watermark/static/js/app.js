// Open Video Watermark - Frontend JavaScript
class VideoWatermarkApp {
    constructor() {
        this.socket = null;
        this.processingTasks = new Map();
        this.init();
    }

    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.loadFiles();

        // Theme toggle functionality
        this.initializeTheme();

        // Tooltips
        this.initializeTooltips();

        // Welcome tour
        this.initializeWelcomeTour();

        // Character counter for watermark input
        this.initializeCharacterCounter();
        
        // Initial state of processing options
        this.updateToggleButtonText();
    }

    // --- Socket Initialization ---
    initializeSocket() {
        // Assume the server is running on the same host and port
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showToast('error', 'Connection Lost', 'Lost connection to the server. Trying to reconnect...');
        });

        this.socket.on('processing_update', (data) => {
            console.log('Processing update received:', data);
            this.updateProcessingStatus(data);
        });
        
        this.socket.on('video_analyzed', (data) => {
            console.log('Video analysis received:', data);
            this.updateVideoAnalysis(data);
        });
    }

    // --- Event Listeners Setup ---
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // File upload form
        const uploadForm = document.getElementById('upload-form');
        uploadForm.addEventListener('submit', (e) => this.handleUpload(e));

        // File input handling
        const fileInput = document.getElementById('files');
        const fileInputDisplay = document.querySelector('.file-input-display');

        fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        fileInputDisplay.addEventListener('click', () => fileInput.click());

        // Drag and drop
        fileInputDisplay.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileInputDisplay.style.borderColor = 'var(--primary-color)';
            fileInputDisplay.style.background = 'rgba(37, 99, 235, 0.05)';
        });

        fileInputDisplay.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileInputDisplay.style.borderColor = 'var(--border-color)';
            fileInputDisplay.style.background = '';
        });

        fileInputDisplay.addEventListener('drop', (e) => {
            e.preventDefault();
            fileInputDisplay.style.borderColor = 'var(--border-color)';
            fileInputDisplay.style.background = '';

            const files = Array.from(e.dataTransfer.files);
            const videoFiles = files.filter(file => file.type.startsWith('video/'));

            if (videoFiles.length > 0) {
                fileInput.files = this.createFileList(videoFiles);
                this.handleFileSelection({ target: { files: videoFiles } });

                this.showToast('success', 'Files Added', `${videoFiles.length} video file(s) added successfully`);
            } else {
                this.showToast('warning', 'Invalid Files', 'Please drop video files only');
            }
        });

        // Watermark text preview
        const watermarkInput = document.getElementById('watermark-text');
        const previewText = document.getElementById('preview-text');

        if (watermarkInput && previewText) {
            watermarkInput.addEventListener('input', (e) => {
                const text = e.target.value.trim();
                previewText.textContent = text || 'Your watermark will appear here';
                previewText.className = text ? 'preview-text active' : 'preview-text';
                this.updateCharacterCounter(text.length);
            });
        }
        
        // Initial setup for preview text
        if (watermarkInput && previewText) {
            previewText.textContent = watermarkInput.value.trim() || 'Your watermark will appear here';
            this.updateCharacterCounter(watermarkInput.value.trim().length);
        }

        // Strength slider
        const strengthSlider = document.getElementById('strength');
        const strengthValue = document.querySelector('.strength-value');
        const indicators = document.querySelectorAll('.indicator-dot');

        strengthSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            strengthValue.textContent = value.toFixed(2);

            // Update indicator highlights
            indicators.forEach(dot => dot.style.opacity = '0.3');

            if (value <= 0.1) {
                indicators[0].style.opacity = '1';
            } else if (value <= 0.2) {
                indicators[1].style.opacity = '1';
            } else {
                indicators[2].style.opacity = '1';
            }
        });
        
        // Initial strength update
        strengthValue.textContent = parseFloat(strengthSlider.value).toFixed(2);
        
        // Refresh files button
        document.getElementById('refresh-files').addEventListener('click', () => {
            this.loadFiles();
        });

        // Processing options toggle
        const toggleButton = document.getElementById('toggle-processing-options');

        if (toggleButton) {
            toggleButton.addEventListener('click', () => this.toggleProcessingOptions());
        }
    }
    
    // --- File Handling and Upload ---
    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        const fileListContainer = document.getElementById('file-list');
        
        // Clear previous files and analysis
        fileListContainer.innerHTML = '';
        const existingAnalysis = document.querySelector('#embed-tab .video-analysis');
        if (existingAnalysis) {
            existingAnalysis.remove();
        }

        if (files.length === 0) return;
        
        // Show placeholder for video analysis
        this.showVideoAnalysisPlaceholder(files.length);

        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item enhanced';
            
            // Get video metadata
            const videoElement = document.createElement('video');
            videoElement.preload = 'metadata';
            
            videoElement.addEventListener('loadedmetadata', () => {
                const duration = this.formatDuration(videoElement.duration);
                const resolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
                
                fileItem.querySelector('.file-metadata').innerHTML = `
                    <span class="metadata-item">
                        <i class="fas fa-clock"></i> ${duration}
                    </span>
                    <span class="metadata-item">
                        <i class="fas fa-expand-arrows-alt"></i> ${resolution}
                    </span>
                    <span class="metadata-item">
                        <i class="fas fa-hdd"></i> ${this.formatFileSize(file.size)}
                    </span>
                `;
            });
            
            videoElement.src = URL.createObjectURL(file);
            
            fileItem.innerHTML = `
                <i class="fas fa-file-video file-icon"></i>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <div class="file-metadata">
                        <span class="metadata-item"><i class="fas fa-spinner fa-spin"></i> Analyzing...</span>
                    </div>
                </div>
                <button type="button" class="remove-file-btn" data-index="${index}" title="Remove file">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileListContainer.appendChild(fileItem);
        });
        
        // Set up remove buttons
        fileListContainer.querySelectorAll('.remove-file-btn').forEach(button => {
            button.addEventListener('click', (e) => this.removeFile(e.currentTarget.dataset.index));
        });
    }

    removeFile(index) {
        const fileInput = document.getElementById('files');
        const filesArray = Array.from(fileInput.files);
        
        // Remove the file at the specified index
        filesArray.splice(index, 1);
        
        // Update the file input's files property
        fileInput.files = this.createFileList(filesArray);
        
        // Rerender the file list and re-run analysis if files remain
        this.handleFileSelection({ target: { files: filesArray } });
        
        if (filesArray.length === 0) {
            // Clear analysis section if no files are left
            const existingAnalysis = document.querySelector('#embed-tab .video-analysis');
            if (existingAnalysis) existingAnalysis.remove();
        }
        
        this.showToast('info', 'File Removed', 'Video file removed from the list.');
    }
    
    async handleUpload(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const button = form.querySelector('button[type="submit"]');
        
        // Check for files
        if (formData.getAll('files').length === 0 || formData.get('watermark_text').trim() === "") {
            this.showToast('error', 'Missing Data', 'Please select video files and enter watermark text.');
            return;
        }

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Gather advanced options
        const options = {
            preserve_quality: document.getElementById('preserve-quality').checked,
            optimize_size: document.getElementById('optimize-size').checked,
            batch_processing: document.getElementById('batch-processing').checked,
            background_processing: document.getElementById('background-processing').checked,
            auto_delete: document.getElementById('auto-delete').checked,
            generate_preview: document.getElementById('generate-preview').checked,
            output_format: document.getElementById('output-format').value,
            compression_level: document.getElementById('compression-level').value,
            strength: parseFloat(document.getElementById('strength').value)
        };
        
        formData.append('options', JSON.stringify(options));

        try {
            const response = await fetch('/upload_and_process', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast('success', 'Upload Successful', 'Videos are now processing. See status below.');
                this.showProcessingStatus(result.tasks);
            } else {
                this.showToast('error', 'Processing Failed', result.error || 'An unknown error occurred during upload.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('error', 'Server Error', 'Could not connect to the server or a network error occurred.');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-magic"></i> Start Processing';
        }
    }
    
    // --- Processing Status and Updates ---
    showProcessingStatus(tasks) {
        const statusContainer = document.getElementById('processing-status');
        const processingList = document.getElementById('processing-list');
        
        if (!tasks || tasks.length === 0) return;
        
        statusContainer.style.display = 'block';
        
        tasks.forEach(task => {
            if (!this.processingTasks.has(task.task_id)) {
                this.processingTasks.set(task.task_id, task);
                const taskElement = this.createProcessingTaskElement(task);
                processingList.appendChild(taskElement);
            }
        });
        
        // Switch to the 'embed' tab and scroll to status
        this.switchTab('embed');
        statusContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    createProcessingTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `processing-task ${task.status}`;
        taskElement.dataset.taskId = task.task_id;
        
        let iconClass = 'fas fa-spinner fa-spin';
        if (task.status === 'completed') iconClass = 'fas fa-check-circle';
        if (task.status === 'failed') iconClass = 'fas fa-times-circle';
        
        taskElement.innerHTML = `
            <div class="task-header">
                <i class="${iconClass}"></i>
                <span class="task-file-name">${task.filename}</span>
                <span class="task-status ${task.status}">${task.status.toUpperCase()}</span>
            </div>
            <div class="task-progress-bar">
                <div class="progress-fill" style="width: ${task.progress || 0}%;"></div>
            </div>
            <div class="task-details">
                <span class="task-progress-value">${task.progress ? task.progress.toFixed(0) : 0}%</span>
                <button class="btn btn-sm btn-download" style="display: ${task.status === 'completed' ? 'inline-block' : 'none'};" 
                        data-file-path="${task.output_path || ''}">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        if (task.status === 'completed') {
            taskElement.querySelector('.btn-download').addEventListener('click', (e) => this.downloadFile(e.currentTarget.dataset.filePath));
        }

        return taskElement;
    }

    updateProcessingStatus(update) {
        const task = this.processingTasks.get(update.task_id);
        const taskElement = document.querySelector(`.processing-task[data-task-id="${update.task_id}"]`);

        if (!task || !taskElement) return;

        // Update task data
        Object.assign(task, update);
        taskElement.className = `processing-task ${task.status}`;

        // Update UI
        const progressBar = taskElement.querySelector('.progress-fill');
        const progressValue = taskElement.querySelector('.task-progress-value');
        const statusSpan = taskElement.querySelector('.task-status');
        const icon = taskElement.querySelector('.task-header i');
        const downloadButton = taskElement.querySelector('.btn-download');

        if (progressBar) progressBar.style.width = `${task.progress || 0}%`;
        if (progressValue) progressValue.textContent = `${task.progress ? task.progress.toFixed(0) : 0}%`;
        if (statusSpan) {
            statusSpan.className = `task-status ${task.status}`;
            statusSpan.textContent = task.status.toUpperCase();
        }

        // Update icon based on status
        if (icon) {
            icon.className = 'fas';
            if (task.status === 'pending') icon.classList.add('fa-hourglass-half');
            else if (task.status === 'processing') icon.classList.add('fa-spinner', 'fa-spin');
            else if (task.status === 'completed') icon.classList.add('fa-check-circle');
            else if (task.status === 'failed') icon.classList.add('fa-times-circle');
        }

        // Handle completion
        if (task.status === 'completed') {
            this.showToast('success', 'Processing Complete', `${task.filename} is ready for download.`);
            if (downloadButton) {
                downloadButton.style.display = 'inline-block';
                downloadButton.dataset.filePath = task.output_path;
                downloadButton.addEventListener('click', (e) => this.downloadFile(e.currentTarget.dataset.filePath));
            }
            // Trigger refresh in 'Manage Files' tab if active
            if (document.getElementById('manage-tab').classList.contains('active')) {
                this.loadFiles();
            }
        }
        
        if (task.status === 'failed') {
            this.showToast('error', 'Processing Failed', `${task.filename} failed to process.`);
        }
    }
    
    // --- File Management ---
    async loadFiles() {
        const filesListContainer = document.getElementById('files-list');
        filesListContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading files...
            </div>
        `;
        
        try {
            const response = await fetch('/files');
            const result = await response.json();
            
            if (response.ok) {
                this.renderFiles(result.files);
            } else {
                filesListContainer.innerHTML = `<div class="alert alert-error">Error loading files: ${result.error || 'Unknown error'}</div>`;
                this.showToast('error', 'File Load Error', 'Could not retrieve file list from the server.');
            }
        } catch (error) {
            console.error('File load error:', error);
            filesListContainer.innerHTML = `<div class="alert alert-error">Network error. Could not connect to the server.</div>`;
        }
    }
    
    renderFiles(files) {
        const filesListContainer = document.getElementById('files-list');
        filesListContainer.innerHTML = ''; // Clear loading state
        
        if (files.length === 0) {
            filesListContainer.innerHTML = `<div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>No processed files found. Start by embedding a watermark!</p>
            </div>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'files-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>File Name</th>
                    <th>Size</th>
                    <th>Watermark</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        files.forEach(file => {
            const row = tbody.insertRow();
            
            // File Name
            row.insertCell().innerHTML = `
                <i class="fas fa-file-video"></i> 
                <strong>${file.filename}</strong>
            `;
            
            // Size
            row.insertCell().textContent = this.formatFileSize(file.size);
            
            // Watermark (for watermarked files) or N/A
            const wmText = file.watermark_text ? `<span class="watermark-tag">${file.watermark_text}</span>` : 'N/A (Original)';
            row.insertCell().innerHTML = wmText;
            
            // Date
            row.insertCell().textContent = new Date(file.timestamp * 1000).toLocaleString();
            
            // Actions
            const actionCell = row.insertCell();
            
            // Download button
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn btn-sm btn-action btn-download';
            downloadBtn.title = 'Download';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            downloadBtn.addEventListener('click', () => this.downloadFile(file.relative_path));

            // Tamper Check button (only for watermarked files)
            const checkBtn = document.createElement('button');
            checkBtn.className = 'btn btn-sm btn-action btn-check';
            checkBtn.title = 'Tamper Check';
            checkBtn.innerHTML = '<i class="fas fa-shield-alt"></i>';
            if (file.watermarked) {
                 checkBtn.addEventListener('click', () => this.tamperCheck(file.relative_path, file.filename));
            } else {
                checkBtn.disabled = true;
                checkBtn.title = 'Tamper check only for watermarked files';
            }

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-action btn-delete';
            deleteBtn.title = 'Delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => this.handleDeleteFile(file.relative_path, file.filename));

            actionCell.appendChild(downloadBtn);
            actionCell.appendChild(checkBtn);
            actionCell.appendChild(deleteBtn);
        });

        filesListContainer.appendChild(table);
    }

    async downloadFile(relativePath) {
        try {
            const downloadUrl = `/download/${relativePath}`;
            window.open(downloadUrl, '_blank');
        } catch (error) {
            this.showToast('error', 'Download Failed', 'Could not initiate download.');
        }
    }
    
    async handleDeleteFile(relativePath, filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/delete_file/${relativePath}`, { method: 'DELETE' });
            const result = await response.json();

            if (response.ok) {
                this.showToast('success', 'File Deleted', `${filename} was successfully deleted.`);
                this.loadFiles(); // Refresh the file list
            } else {
                this.showToast('error', 'Deletion Failed', result.error || `Could not delete ${filename}.`);
            }
        } catch (error) {
            this.showToast('error', 'Server Error', 'A network error occurred during file deletion.');
        }
    }
    
    // --- Tamper Detection Integration ---
    async tamperCheck(relativePath, filename) {
        this.showToast('info', 'Starting Tamper Check', `Analyzing ${filename}... This may take a moment.`);
        
        try {
            const response = await fetch(`/check_tampering/${relativePath}`);
            const report = await response.json();
            
            if (response.ok) {
                this.showTamperReport(filename, report);
            } else {
                this.showToast('error', 'Check Failed', report.error || 'Failed to perform tamper detection.');
            }
        } catch (error) {
            this.showToast('error', 'Server Error', 'A network error occurred during the tamper check.');
        }
    }
    
    showTamperReport(filename, report) {
        let status = report.summary.ok ? 'OK' : 'TAMPERED';
        let statusClass = report.summary.ok ? 'success' : 'error';
        let icon = report.summary.ok ? 'fas fa-shield-alt' : 'fas fa-exclamation-triangle';
        
        let issuesList = '';
        if (report.issues.length > 0) {
            issuesList = '<h4>Detected Issues:</h4><ul>';
            report.issues.forEach(issue => {
                issuesList += `<li>
                    <i class="fas fa-bug"></i> 
                    <strong>${issue.type.replace(/_/g, ' ').toUpperCase()}</strong>: 
                    ${JSON.stringify(issue)}
                </li>`;
            });
            issuesList += '</ul>';
        } else {
            issuesList = '<p><i class="fas fa-thumbs-up"></i> No tampering signs detected.</p>';
        }

        const reportHtml = `
            <div class="tamper-report">
                <h3>Tamper Detection Report for: ${filename}</h3>
                <div class="report-summary report-summary-${statusClass}">
                    <i class="${icon}"></i>
                    <span>Status: <strong>${status}</strong> (${report.summary.issue_count} Issues)</span>
                </div>
                <div class="report-details">
                    <p><strong>Frames Analyzed:</strong> ${report.frames_analyzed}</p>
                    <p><strong>Video FPS:</strong> ${report.fps ? report.fps.toFixed(2) : 'N/A'}</p>
                    ${issuesList}
                    <small>Note: Detection uses heuristic methods (SSIM, ORB) and may contain false positives/negatives.</small>
                </div>
            </div>
        `;
        
        // Use a generic modal or toast to display the report
        this.showModal('Tamper Report', reportHtml);
    }
    
    // Placeholder for a generic modal function
    showModal(title, bodyHtml) {
        // Simple implementation: alert, but ideally a dedicated modal element
        // For this response, I'll use a placeholder for a rich display
        alert(`${title}\n\n${bodyHtml.replace(/<[^>]*>?/gm, '')}`);
    }
    
    // --- Helper & UI Methods ---
    initializeTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const currentTheme = localStorage.getItem('theme') || 'light';

        document.documentElement.setAttribute('data-theme', currentTheme);
        themeIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

        themeToggle.addEventListener('click', () => {
            let newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    initializeTooltips() {
        const tooltip = document.getElementById('tooltip');
        document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
            trigger.addEventListener('mouseenter', (e) => {
                const rect = e.target.getBoundingClientRect();
                const content = e.target.dataset.tooltip;
                
                tooltip.querySelector('.tooltip-content').textContent = content;
                tooltip.style.display = 'block';
                
                // Position tooltip
                const tooltipRect = tooltip.getBoundingClientRect();
                const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                const top = rect.top - tooltipRect.height - 10;

                tooltip.style.left = `${Math.max(10, left)}px`;
                tooltip.style.top = `${Math.max(10, top + window.scrollY)}px`;
            });

            trigger.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    initializeCharacterCounter() {
        const watermarkInput = document.getElementById('watermark-text');
        if (watermarkInput) {
            watermarkInput.addEventListener('input', (e) => this.updateCharacterCounter(e.target.value.length));
            this.updateCharacterCounter(watermarkInput.value.length);
        }
    }

    updateCharacterCounter(count) {
        const charCountSpan = document.getElementById('char-count');
        if (charCountSpan) {
            charCountSpan.textContent = count;
        }
    }

    toggleProcessingOptions() {
        const optionsContent = document.getElementById('processing-options-content');
        optionsContent.classList.toggle('expanded');
        this.updateToggleButtonText();
    }
    
    updateToggleButtonText() {
        const toggleButton = document.getElementById('toggle-processing-options');
        const optionsContent = document.getElementById('processing-options-content');
        if (toggleButton && optionsContent) {
            const toggleText = toggleButton.querySelector('.toggle-text');
            const icon = toggleButton.querySelector('.fas');
            if (optionsContent.classList.contains('expanded')) {
                toggleText.textContent = 'Hide Advanced Options';
                icon.className = 'fas fa-chevron-up';
            } else {
                toggleText.textContent = 'Show Advanced Options';
                icon.className = 'fas fa-chevron-down';
            }
        }
    }

    showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconClass = type === 'success' ? 'fas fa-check-circle' : 
                          type === 'error' ? 'fas fa-times-circle' : 
                          type === 'warning' ? 'fas fa-exclamation-triangle' : 
                          'fas fa-info-circle';

        toast.innerHTML = `
            <div class="toast-content">
                <i class="${iconClass}"></i>
                <div>
                    <strong>${title}</strong>
                    <p>${message}</p>
                </div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    // Dummy function for video analysis placeholder (to be replaced with server-side analysis)
    showVideoAnalysisPlaceholder(fileCount) {
        const embedTab = document.getElementById('embed-tab');
        const analysisContainer = document.createElement('div');
        analysisContainer.className = 'card video-analysis';
        analysisContainer.innerHTML = `
            <div class="card-header">
                <h2><i class="fas fa-microscope"></i> Pre-Processing Analysis</h2>
            </div>
            <div class="card-body">
                <p><i class="fas fa-spinner fa-spin"></i> Initializing video analysis for ${fileCount} file(s)...</p>
                <div id="analysis-results">
                    </div>
            </div>
        `;
        embedTab.insertBefore(analysisContainer, document.getElementById('processing-status'));
    }
    
    // Updates the analysis results based on server response (for single or batch analysis)
    updateVideoAnalysis(analysisData) {
        const resultsDiv = document.getElementById('analysis-results');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '';
        
        let html = '';
        
        if (Array.isArray(analysisData)) {
            // Batch analysis results
            analysisData.forEach(file => {
                const issues = file.issues.length > 0 ? `<span class="text-error"><i class="fas fa-exclamation-triangle"></i> ${file.issues.length} Issues Found</span>` : '<span class="text-success"><i class="fas fa-check-circle"></i> Clean</span>';
                html += `
                    <div class="analysis-item">
                        <strong>${file.filename}</strong>: 
                        <span>Resolution: ${file.resolution}</span>, 
                        <span>Duration: ${this.formatDuration(file.duration)}</span>, 
                        <span>FPS: ${file.fps.toFixed(2)}</span>.
                        ${issues}
                    </div>
                `;
            });
        } else if (analysisData) {
            // Single file analysis or summary of first file
            const issues = analysisData.issues && analysisData.issues.length > 0 ? `<span class="text-error"><i class="fas fa-exclamation-triangle"></i> ${analysisData.issues.length} Issues Found</span>` : '<span class="text-success"><i class="fas fa-check-circle"></i> Clean</span>';
            html = `
                <div class="analysis-item">
                    <strong>${analysisData.filename}</strong>: 
                    <span>Resolution: ${analysisData.resolution}</span>, 
                    <span>Duration: ${this.formatDuration(analysisData.duration)}</span>, 
                    <span>FPS: ${analysisData.fps.toFixed(2)}</span>.
                    ${issues}
                </div>
            `;
        } else {
            html = '<p>Analysis data not available.</p>';
        }
        
        resultsDiv.innerHTML = `<h4>Summary:</h4>${html}`;
    }

    // Dummy helper functions
    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':').replace(/^00:/, '');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // --- Welcome Tour Implementation ---
    initializeWelcomeTour() {
        const hasVisited = localStorage.getItem('hasVisited');
        const modal = document.getElementById('welcome-modal');
        const modalClose = document.getElementById('modal-close');
        const skipTourBtn = document.getElementById('skip-tour');
        const startTourBtn = document.getElementById('start-tour');
        const helpTourBtn = document.getElementById('help-tour');

        if (!hasVisited) {
            modal.style.display = 'flex';
        }

        const closeModal = () => {
            modal.style.display = 'none';
            localStorage.setItem('hasVisited', 'true');
        };

        modalClose.addEventListener('click', closeModal);
        skipTourBtn.addEventListener('click', closeModal);
        startTourBtn.addEventListener('click', () => {
            closeModal();
            this.startTour();
        });
        helpTourBtn.addEventListener('click', () => this.startTour());
    }

    startTour() {
        const tourSteps = [
            {
                element: document.querySelector('[data-tour="file-upload"]'),
                title: 'Step 1: Upload Videos',
                description: 'Select one or more video files using the upload button or drag and drop them here. Only video files are supported.',
                position: 'bottom'
            },
            {
                element: document.querySelector('[data-tour="watermark-text"]'),
                title: 'Step 2: Enter Watermark Text',
                description: 'Type the invisible watermark message you want to embed. Keep it concise (max 50 characters).',
                position: 'bottom'
            },
            {
                element: document.querySelector('[data-tour="strength"]'),
                title: 'Step 3: Adjust Strength',
                description: 'Adjust the embedding strength. Lower values are more invisible but less resistant to attacks. A balanced value is recommended.',
                position: 'top'
            },
            {
                element: document.getElementById('toggle-processing-options'),
                title: 'Step 4: Advanced Options',
                description: 'Click here to reveal advanced video and output settings, like compression and quality preservation.',
                position: 'top'
            },
            {
                element: document.querySelector('.btn-primary[type="submit"]'),
                title: 'Step 5: Start Processing',
                description: 'Once everything is set, click this button to upload your files and begin the invisible watermarking process.',
                position: 'top'
            }
        ];

        let currentStep = 0;
        const overlay = document.getElementById('tour-overlay');
        const spotlight = document.querySelector('.tour-spotlight');
        const popup = document.querySelector('.tour-popup');
        const titleEl = document.getElementById('tour-title');
        const descEl = document.getElementById('tour-description');
        const prevBtn = document.getElementById('tour-prev');
        const nextBtn = document.getElementById('tour-next');
        const skipBtn = document.getElementById('tour-skip');
        const currentProgress = document.getElementById('tour-current');
        const totalProgress = document.getElementById('tour-total');
        
        totalProgress.textContent = tourSteps.length;

        const positionPopup = (element, position) => {
            const rect = element.getBoundingClientRect();
            popup.style.display = 'block';
            
            // Calculate spotlight position
            spotlight.style.width = `${rect.width + 20}px`;
            spotlight.style.height = `${rect.height + 20}px`;
            spotlight.style.top = `${rect.top + window.scrollY - 10}px`;
            spotlight.style.left = `${rect.left + window.scrollX - 10}px`;
            
            // Calculate popup position
            let top = 0;
            let left = 0;
            const popupWidth = popup.offsetWidth;
            const popupHeight = popup.offsetHeight;

            if (position === 'bottom') {
                top = rect.bottom + 10 + window.scrollY;
                left = rect.left + rect.width / 2 - popupWidth / 2;
            } else if (position === 'top') {
                top = rect.top - popupHeight - 10 + window.scrollY;
                left = rect.left + rect.width / 2 - popupWidth / 2;
            } else if (position === 'left') {
                top = rect.top + rect.height / 2 - popupHeight / 2 + window.scrollY;
                left = rect.left - popupWidth - 10;
            } else if (position === 'right') {
                top = rect.top + rect.height / 2 - popupHeight / 2 + window.scrollY;
                left = rect.right + 10;
            }

            // Ensure popup is within viewport bounds
            left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
            top = Math.max(10 + window.scrollY, top);
            
            popup.style.top = `${top}px`;
            popup.style.left = `${left}px`;
        };

        const showStep = (stepIndex) => {
            if (stepIndex < 0 || stepIndex >= tourSteps.length) {
                overlay.style.display = 'none';
                return;
            }

            currentStep = stepIndex;
            const step = tourSteps[currentStep];

            if (!step.element) {
                console.error(`Tour element for step ${currentStep} not found!`);
                this.nextStep(); // Skip missing element
                return;
            }

            titleEl.textContent = step.title;
            descEl.textContent = step.description;
            currentProgress.textContent = currentStep + 1;

            prevBtn.disabled = currentStep === 0;
            nextBtn.textContent = currentStep === tourSteps.length - 1 ? 'Finish' : 'Next';

            overlay.style.display = 'block';
            
            // Ensure the element is visible
            step.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Allow time for scroll, then position
            setTimeout(() => positionPopup(step.element, step.position), 300);
        };
        
        const nextStep = () => {
            if (currentStep < tourSteps.length - 1) {
                showStep(currentStep + 1);
            } else {
                this.endTour();
            }
        };

        const prevStep = () => {
            showStep(currentStep - 1);
        };
        
        this.endTour = () => {
            overlay.style.display = 'none';
            this.showToast('info', 'Tour Complete', 'The guided tour has finished. Happy watermarking!');
            localStorage.setItem('hasVisited', 'true');
        };

        prevBtn.onclick = prevStep;
        nextBtn.onclick = nextStep;
        skipBtn.onclick = this.endTour;
        
        window.addEventListener('resize', () => {
            if (overlay.style.display !== 'none') {
                // Reposition on resize
                const step = tourSteps[currentStep];
                if (step && step.element) {
                     positionPopup(step.element, step.position);
                }
            }
        });

        showStep(0);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VideoWatermarkApp();
});    
