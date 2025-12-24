// PDF Power Tools - Main Application
// All operations run client-side for privacy

class PDFPowerTools {
    constructor() {
        this.loadedFiles = [];
        this.currentTool = 'upload';
        this.redactionBoxes = [];
        this.annotations = [];
        this.currentSignature = null;
        this.editElements = [];
        this.selectedElement = null;
        this.editMode = 'select';
        this.isDragging = false;
        this.db = null;

        this.init();
    }

    async init() {
        await this.initIndexedDB();
        await this.loadCachedFiles();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.initializeSignatureCanvas();
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PDFPowerToolsDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('pdfs')) {
                    db.createObjectStore('pdfs', { keyPath: 'id' });
                }
            };
        });
    }

    async savePDFToCache(fileData) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['pdfs'], 'readwrite');
            const store = transaction.objectStore('pdfs');

            // Store the file data
            const cacheData = {
                id: fileData.id,
                name: fileData.name,
                size: fileData.size,
                pages: fileData.pages,
                arrayBuffer: fileData.arrayBuffer,
                timestamp: Date.now()
            };

            await store.put(cacheData);
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    }

    async loadCachedFiles() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['pdfs'], 'readonly');
            const store = transaction.objectStore('pdfs');
            const request = store.getAll();

            request.onsuccess = async () => {
                const cachedFiles = request.result;

                for (const cached of cachedFiles) {
                    try {
                        const pdf = await pdfjsLib.getDocument(cached.arrayBuffer).promise;

                        const fileData = {
                            id: cached.id,
                            name: cached.name,
                            size: cached.size,
                            pages: cached.pages,
                            arrayBuffer: cached.arrayBuffer,
                            pdf: pdf
                        };

                        this.loadedFiles.push(fileData);
                    } catch (error) {
                        console.error('Error loading cached PDF:', error);
                    }
                }

                this.updateFilesList();
                this.updateStats();
                this.updateFileSelectors();
            };
        } catch (error) {
            console.error('Error loading cached files:', error);
        }
    }

    async clearCache() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['pdfs'], 'readwrite');
            const store = transaction.objectStore('pdfs');
            await store.clear();

            this.loadedFiles = [];
            this.updateFilesList();
            this.updateStats();
            this.updateFileSelectors();

            alert('Cache cleared! All PDFs removed.');
        } catch (error) {
            console.error('Error clearing cache:', error);
            alert('Error clearing cache: ' + error.message);
        }
    }

    async removePDFFromCache(id) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['pdfs'], 'readwrite');
            const store = transaction.objectStore('pdfs');
            await store.delete(id);
        } catch (error) {
            console.error('Error removing from cache:', error);
        }
    }

    setupEventListeners() {
        // Tool navigation
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTool(btn.dataset.tool);
            });
        });

        // Upload
        document.getElementById('browse-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all cached PDFs? This cannot be undone.')) {
                this.clearCache();
            }
        });

        // Split
        document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateSplitInputs(e.target.value);
            });
        });
        document.getElementById('split-btn').addEventListener('click', () => {
            this.splitPDF();
        });

        // Merge
        document.getElementById('merge-btn').addEventListener('click', () => {
            this.mergePDFs();
        });

        // Redact
        document.getElementById('redact-file-select').addEventListener('change', (e) => {
            this.loadPDFForRedaction(e.target.value);
        });
        document.getElementById('redact-prev').addEventListener('click', () => {
            this.changeRedactPage(-1);
        });
        document.getElementById('redact-next').addEventListener('click', () => {
            this.changeRedactPage(1);
        });
        document.getElementById('apply-redactions-btn').addEventListener('click', () => {
            this.applyRedactions();
        });

        // Annotate
        document.getElementById('annotate-file-select').addEventListener('change', (e) => {
            this.loadPDFForAnnotation(e.target.value);
        });
        document.getElementById('annotate-prev').addEventListener('click', () => {
            this.changeAnnotatePage(-1);
        });
        document.getElementById('annotate-next').addEventListener('click', () => {
            this.changeAnnotatePage(1);
        });
        document.querySelectorAll('.annotation-toolbar .toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.dataset.tool) {
                    this.setAnnotationTool(btn.dataset.tool);
                }
            });
        });
        document.getElementById('clear-annotations').addEventListener('click', () => {
            this.clearAnnotations();
        });
        document.getElementById('save-annotated-btn').addEventListener('click', () => {
            this.saveAnnotatedPDF();
        });

        // Sign
        document.querySelectorAll('.signature-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSignatureTab(btn.dataset.tab);
            });
        });
        document.getElementById('clear-signature').addEventListener('click', () => {
            this.clearSignatureCanvas();
        });
        document.getElementById('sign-file-select').addEventListener('change', (e) => {
            this.loadPDFForSigning(e.target.value);
        });
        document.getElementById('sign-prev').addEventListener('click', () => {
            this.changeSignPage(-1);
        });
        document.getElementById('sign-next').addEventListener('click', () => {
            this.changeSignPage(1);
        });
        document.getElementById('save-signed-btn').addEventListener('click', () => {
            this.saveSignedPDF();
        });

        // OCR
        document.getElementById('ocr-btn').addEventListener('click', () => {
            this.performOCR();
        });
        document.getElementById('copy-ocr-text').addEventListener('click', () => {
            this.copyOCRText();
        });
        document.getElementById('download-ocr-text').addEventListener('click', () => {
            this.downloadOCRText();
        });

        // Compress
        document.getElementById('compress-btn').addEventListener('click', () => {
            this.compressPDF();
        });

        // Edit PDF
        document.getElementById('edit-file-select').addEventListener('change', (e) => {
            this.loadPDFForEditing(e.target.value);
        });
        document.querySelectorAll('.edit-toolbar .toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.dataset.tool) {
                    this.setEditMode(btn.dataset.tool);
                }
            });
        });
        document.getElementById('edit-prev').addEventListener('click', () => {
            this.changeEditPage(-1);
        });
        document.getElementById('edit-next').addEventListener('click', () => {
            this.changeEditPage(1);
        });
        document.getElementById('apply-element-changes').addEventListener('click', () => {
            this.applyElementChanges();
        });
        document.getElementById('delete-element').addEventListener('click', () => {
            this.deleteSelectedElement();
        });
        document.getElementById('save-edited-btn').addEventListener('click', () => {
            this.saveEditedPDF();
        });
        document.getElementById('edit-bold').addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('active');
        });
    }

    setupDragAndDrop() {
        const uploadZone = document.getElementById('upload-zone');

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    async handleFiles(files) {
        const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');

        for (const file of pdfFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            const fileData = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                pages: pdf.numPages,
                arrayBuffer: arrayBuffer,
                pdf: pdf
            };

            this.loadedFiles.push(fileData);

            // Save to cache
            await this.savePDFToCache(fileData);
        }

        this.updateFilesList();
        this.updateStats();
        this.updateFileSelectors();
    }

    updateFilesList() {
        const filesList = document.getElementById('files-list');
        filesList.innerHTML = '';

        this.loadedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <h3>${file.name}</h3>
                        <p class="file-meta">${file.pages} pages • ${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-remove" data-id="${file.id}">Remove</button>
                </div>
            `;

            fileItem.querySelector('.file-remove').addEventListener('click', (e) => {
                this.removeFile(file.id);
            });

            filesList.appendChild(fileItem);
        });
    }

    async removeFile(id) {
        this.loadedFiles = this.loadedFiles.filter(f => f.id !== id);
        await this.removePDFFromCache(id);
        this.updateFilesList();
        this.updateStats();
        this.updateFileSelectors();
    }

    updateStats() {
        document.getElementById('files-count').textContent = this.loadedFiles.length;
        const totalPages = this.loadedFiles.reduce((sum, f) => sum + f.pages, 0);
        document.getElementById('pages-count').textContent = totalPages;
    }

    updateFileSelectors() {
        const selectors = [
            'split-file-select',
            'redact-file-select',
            'annotate-file-select',
            'edit-file-select',
            'sign-file-select',
            'ocr-file-select',
            'compress-file-select'
        ];

        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            select.innerHTML = '<option value="">-- Select a file --</option>';

            this.loadedFiles.forEach((file, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${file.name} (${file.pages} pages)`;
                select.appendChild(option);
            });
        });

        // Update merge list
        this.updateMergeList();
    }

    updateMergeList() {
        const mergeList = document.getElementById('merge-list');

        if (this.loadedFiles.length === 0) {
            mergeList.innerHTML = '<p class="empty-state">Load PDFs to begin merging</p>';
            return;
        }

        mergeList.innerHTML = '';
        this.loadedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'merge-item';
            item.draggable = true;
            item.dataset.index = index;
            item.innerHTML = `
                <span><strong>${index + 1}.</strong> ${file.name} (${file.pages} pages)</span>
                <span>📋</span>
            `;

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', index);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = document.querySelector('.dragging');
                if (dragging !== item) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = index;
                this.reorderFiles(fromIndex, toIndex);
            });

            mergeList.appendChild(item);
        });
    }

    reorderFiles(fromIndex, toIndex) {
        const files = [...this.loadedFiles];
        const [movedFile] = files.splice(fromIndex, 1);
        files.splice(toIndex, 0, movedFile);
        this.loadedFiles = files;
        this.updateMergeList();
    }

    switchTool(tool) {
        this.currentTool = tool;

        // Update nav buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Update panels
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tool}-panel`).classList.add('active');
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // SPLIT PDF FUNCTIONALITY
    updateSplitInputs(mode) {
        document.getElementById('split-from').disabled = mode !== 'range';
        document.getElementById('split-to').disabled = mode !== 'range';
        document.getElementById('split-every').disabled = mode !== 'every';
        document.getElementById('split-pages').disabled = mode !== 'pages';
    }

    async splitPDF() {
        const fileIndex = document.getElementById('split-file-select').value;
        if (!fileIndex) {
            alert('Please select a PDF file');
            return;
        }

        const file = this.loadedFiles[fileIndex];
        const mode = document.querySelector('input[name="split-mode"]:checked').value;

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(file.arrayBuffer);
            let newPdfs = [];

            if (mode === 'range') {
                const from = parseInt(document.getElementById('split-from').value);
                const to = parseInt(document.getElementById('split-to').value);

                if (!from || !to || from > to || from < 1 || to > file.pages) {
                    alert('Invalid page range');
                    return;
                }

                const newPdf = await PDFLib.PDFDocument.create();
                for (let i = from - 1; i < to; i++) {
                    const [page] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(page);
                }
                newPdfs.push({ pdf: newPdf, name: `${file.name.replace('.pdf', '')}_pages_${from}-${to}.pdf` });

            } else if (mode === 'every') {
                const every = parseInt(document.getElementById('split-every').value);
                if (!every || every < 1) {
                    alert('Invalid page count');
                    return;
                }

                for (let i = 0; i < file.pages; i += every) {
                    const newPdf = await PDFLib.PDFDocument.create();
                    const end = Math.min(i + every, file.pages);

                    for (let j = i; j < end; j++) {
                        const [page] = await newPdf.copyPages(pdfDoc, [j]);
                        newPdf.addPage(page);
                    }

                    newPdfs.push({
                        pdf: newPdf,
                        name: `${file.name.replace('.pdf', '')}_part_${Math.floor(i / every) + 1}.pdf`
                    });
                }

            } else if (mode === 'pages') {
                const pagesInput = document.getElementById('split-pages').value;
                const pageRanges = this.parsePageRanges(pagesInput);

                if (pageRanges.length === 0) {
                    alert('Invalid page specification');
                    return;
                }

                const newPdf = await PDFLib.PDFDocument.create();
                for (const pageNum of pageRanges) {
                    if (pageNum < 1 || pageNum > file.pages) continue;
                    const [page] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                    newPdf.addPage(page);
                }
                newPdfs.push({ pdf: newPdf, name: `${file.name.replace('.pdf', '')}_extracted.pdf` });
            }

            // Download all split PDFs
            for (const { pdf, name } of newPdfs) {
                const pdfBytes = await pdf.save();
                this.downloadPDF(pdfBytes, name);
            }

            alert(`Split complete! Downloaded ${newPdfs.length} file(s)`);

        } catch (error) {
            console.error('Split error:', error);
            alert('Error splitting PDF: ' + error.message);
        }
    }

    parsePageRanges(input) {
        const pages = new Set();
        const parts = input.split(',').map(s => s.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(s => parseInt(s.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        pages.add(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    pages.add(num);
                }
            }
        }

        return Array.from(pages).sort((a, b) => a - b);
    }

    // MERGE PDF FUNCTIONALITY
    async mergePDFs() {
        if (this.loadedFiles.length < 2) {
            alert('Please load at least 2 PDF files to merge');
            return;
        }

        try {
            const mergedPdf = await PDFLib.PDFDocument.create();

            for (const file of this.loadedFiles) {
                const pdfDoc = await PDFLib.PDFDocument.load(file.arrayBuffer);
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            const pdfBytes = await mergedPdf.save();
            this.downloadPDF(pdfBytes, 'merged.pdf');

            alert('PDFs merged successfully!');

        } catch (error) {
            console.error('Merge error:', error);
            alert('Error merging PDFs: ' + error.message);
        }
    }

    // REDACTION FUNCTIONALITY
    async loadPDFForRedaction(fileIndex) {
        if (!fileIndex) return;

        const file = this.loadedFiles[fileIndex];
        this.currentRedactFile = file;
        this.currentRedactPage = 1;
        this.redactionBoxes = [];

        await this.renderRedactPage();
        this.setupRedactCanvas();
    }

    async renderRedactPage() {
        const canvas = document.getElementById('redact-canvas');
        const page = await this.currentRedactFile.pdf.getPage(this.currentRedactPage);

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Draw existing redaction boxes
        this.redactionBoxes
            .filter(box => box.page === this.currentRedactPage)
            .forEach(box => {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(box.x, box.y, box.width, box.height);
                // Draw border to make it more visible
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(box.x, box.y, box.width, box.height);
            });

        document.getElementById('redact-page-info').textContent =
            `Page ${this.currentRedactPage} of ${this.currentRedactFile.pages}`;
    }

    setupRedactCanvas() {
        const canvas = document.getElementById('redact-canvas');
        let isDrawing = false;
        let startX, startY;

        canvas.onmousedown = (e) => {
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            isDrawing = true;
        };

        canvas.onmousemove = (e) => {
            if (!isDrawing) return;

            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            this.renderRedactPage().then(() => {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(startX, startY, currentX - startX, currentY - startY);
                // Draw border for preview
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
            });
        };

        canvas.onmouseup = (e) => {
            if (!isDrawing) return;
            isDrawing = false;

            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;

            const width = endX - startX;
            const height = endY - startY;

            if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                this.redactionBoxes.push({
                    page: this.currentRedactPage,
                    x: Math.min(startX, endX),
                    y: Math.min(startY, endY),
                    width: Math.abs(width),
                    height: Math.abs(height)
                });
                this.renderRedactPage();
            }
        };
    }

    changeRedactPage(delta) {
        const newPage = this.currentRedactPage + delta;
        if (newPage < 1 || newPage > this.currentRedactFile.pages) return;
        this.currentRedactPage = newPage;
        this.renderRedactPage();
    }

    async applyRedactions() {
        if (this.redactionBoxes.length === 0) {
            alert('No redactions to apply');
            return;
        }

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(this.currentRedactFile.arrayBuffer);

            // For true redaction, we'd need to remove the actual content
            // This is a simplified version that draws black boxes
            for (const box of this.redactionBoxes) {
                const page = pdfDoc.getPage(box.page - 1);
                const { height } = page.getSize();

                page.drawRectangle({
                    x: box.x / 1.5,
                    y: height - (box.y / 1.5) - (box.height / 1.5),
                    width: box.width / 1.5,
                    height: box.height / 1.5,
                    color: PDFLib.rgb(0, 0, 0)
                });
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadPDF(pdfBytes, this.currentRedactFile.name.replace('.pdf', '_redacted.pdf'));

            alert('Redacted PDF saved!');

        } catch (error) {
            console.error('Redaction error:', error);
            alert('Error applying redactions: ' + error.message);
        }
    }

    // ANNOTATION FUNCTIONALITY
    async loadPDFForAnnotation(fileIndex) {
        if (!fileIndex) return;

        const file = this.loadedFiles[fileIndex];
        this.currentAnnotateFile = file;
        this.currentAnnotatePage = 1;
        this.annotations = [];
        this.currentAnnotationTool = 'text';

        await this.renderAnnotatePage();
        this.setupAnnotateCanvas();
    }

    async renderAnnotatePage() {
        const canvas = document.getElementById('annotate-canvas');
        const page = await this.currentAnnotateFile.pdf.getPage(this.currentAnnotatePage);

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Draw existing annotations for this page
        this.renderAnnotations();

        document.getElementById('annotate-page-info').textContent =
            `Page ${this.currentAnnotatePage} of ${this.currentAnnotateFile.pages}`;
    }

    renderAnnotations() {
        const canvas = document.getElementById('annotate-canvas');
        const ctx = canvas.getContext('2d');

        // Filter annotations for current page
        const pageAnnotations = this.annotations.filter(a => a.page === this.currentAnnotatePage);

        pageAnnotations.forEach(annot => {
            if (annot.type === 'rectangle') {
                ctx.strokeStyle = annot.color;
                ctx.lineWidth = 3;
                ctx.strokeRect(annot.x, annot.y, annot.width, annot.height);
            } else if (annot.type === 'highlight') {
                ctx.fillStyle = annot.color;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(annot.x, annot.y, annot.width, annot.height);
                ctx.globalAlpha = 1.0;
            } else if (annot.type === 'text') {
                ctx.font = '16px sans-serif';
                ctx.fillStyle = annot.color;
                ctx.fillText(annot.text, annot.x, annot.y);
            }
        });
    }

    setupAnnotateCanvas() {
        const canvas = document.getElementById('annotate-canvas');
        let isDrawing = false;
        let startX, startY;

        canvas.onmousedown = (e) => {
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            isDrawing = true;

            // For text annotation, prompt immediately
            if (this.currentAnnotationTool === 'text') {
                const text = prompt('Enter annotation text:');
                if (text) {
                    this.annotations.push({
                        page: this.currentAnnotatePage,
                        type: 'text',
                        text: text,
                        x: startX,
                        y: startY,
                        color: '#ff0000'
                    });
                    this.renderAnnotatePage();
                }
                isDrawing = false;
            }
        };

        canvas.onmousemove = (e) => {
            if (!isDrawing) return;

            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            // Preview the annotation
            this.renderAnnotatePage().then(() => {
                const ctx = canvas.getContext('2d');
                const width = currentX - startX;
                const height = currentY - startY;

                if (this.currentAnnotationTool === 'rectangle') {
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(startX, startY, width, height);
                } else if (this.currentAnnotationTool === 'highlight') {
                    ctx.fillStyle = '#ffff00';
                    ctx.globalAlpha = 0.3;
                    ctx.fillRect(startX, startY, width, height);
                    ctx.globalAlpha = 1.0;
                }
            });
        };

        canvas.onmouseup = (e) => {
            if (!isDrawing || this.currentAnnotationTool === 'text') return;
            isDrawing = false;

            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;

            const width = endX - startX;
            const height = endY - startY;

            // Only save if the annotation is large enough
            if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                const annotation = {
                    page: this.currentAnnotatePage,
                    type: this.currentAnnotationTool,
                    x: Math.min(startX, endX),
                    y: Math.min(startY, endY),
                    width: Math.abs(width),
                    height: Math.abs(height),
                    color: this.currentAnnotationTool === 'highlight' ? '#ffff00' : '#ff0000'
                };

                this.annotations.push(annotation);
                this.renderAnnotatePage();
            }
        };
    }

    setAnnotationTool(tool) {
        this.currentAnnotationTool = tool;
        document.querySelectorAll('.annotation-toolbar .toolbar-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    changeAnnotatePage(delta) {
        const newPage = this.currentAnnotatePage + delta;
        if (newPage < 1 || newPage > this.currentAnnotateFile.pages) return;
        this.currentAnnotatePage = newPage;
        this.renderAnnotatePage();
    }

    clearAnnotations() {
        this.annotations = this.annotations.filter(a => a.page !== this.currentAnnotatePage);
        this.renderAnnotatePage();
    }

    async saveAnnotatedPDF() {
        if (this.annotations.length === 0) {
            alert('No annotations to save');
            return;
        }

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(this.currentAnnotateFile.arrayBuffer);

            // Group annotations by page
            const annotsByPage = {};
            this.annotations.forEach(annot => {
                if (!annotsByPage[annot.page]) {
                    annotsByPage[annot.page] = [];
                }
                annotsByPage[annot.page].push(annot);
            });

            // Draw annotations on each page
            for (const [pageNum, annots] of Object.entries(annotsByPage)) {
                const page = pdfDoc.getPage(parseInt(pageNum) - 1);
                const { height } = page.getSize();

                for (const annot of annots) {
                    if (annot.type === 'rectangle') {
                        page.drawRectangle({
                            x: annot.x / 1.5,
                            y: height - (annot.y / 1.5) - (annot.height / 1.5),
                            width: annot.width / 1.5,
                            height: annot.height / 1.5,
                            borderColor: PDFLib.rgb(1, 0, 0),
                            borderWidth: 2
                        });
                    } else if (annot.type === 'highlight') {
                        page.drawRectangle({
                            x: annot.x / 1.5,
                            y: height - (annot.y / 1.5) - (annot.height / 1.5),
                            width: annot.width / 1.5,
                            height: annot.height / 1.5,
                            color: PDFLib.rgb(1, 1, 0),
                            opacity: 0.3
                        });
                    } else if (annot.type === 'text') {
                        page.drawText(annot.text, {
                            x: annot.x / 1.5,
                            y: height - (annot.y / 1.5),
                            size: 12,
                            color: PDFLib.rgb(1, 0, 0)
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadPDF(pdfBytes, this.currentAnnotateFile.name.replace('.pdf', '_annotated.pdf'));

            alert('Annotated PDF saved!');

        } catch (error) {
            console.error('Annotation save error:', error);
            alert('Error saving annotated PDF: ' + error.message);
        }
    }

    // SIGNATURE FUNCTIONALITY
    initializeSignatureCanvas() {
        const canvas = document.getElementById('signature-canvas');
        canvas.width = 400;
        canvas.height = 150;

        const ctx = canvas.getContext('2d');
        let isDrawing = false;

        canvas.onmousedown = () => isDrawing = true;
        canvas.onmouseup = () => isDrawing = false;
        canvas.onmouseleave = () => isDrawing = false;

        canvas.onmousemove = (e) => {
            if (!isDrawing) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000';

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        };
    }

    clearSignatureCanvas() {
        const canvas = document.getElementById('signature-canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    switchSignatureTab(tab) {
        document.querySelectorAll('.signature-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.querySelectorAll('.signature-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tab}-signature`).classList.add('active');
    }

    async loadPDFForSigning(fileIndex) {
        if (!fileIndex) return;

        const file = this.loadedFiles[fileIndex];
        this.currentSignFile = file;
        this.currentSignPage = 1;
        this.signaturePosition = null;

        await this.renderSignPage();
        this.setupSignCanvas();
    }

    async renderSignPage() {
        const canvas = document.getElementById('sign-canvas');
        const page = await this.currentSignFile.pdf.getPage(this.currentSignPage);

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Redraw signature if placed
        if (this.signaturePosition && this.signaturePosition.page === this.currentSignPage) {
            this.drawSignatureOnCanvas(ctx, this.signaturePosition.x, this.signaturePosition.y);
        }

        document.getElementById('sign-page-info').textContent =
            `Page ${this.currentSignPage} of ${this.currentSignFile.pages}`;
    }

    setupSignCanvas() {
        const canvas = document.getElementById('sign-canvas');

        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Get signature from canvas
            const sigCanvas = document.getElementById('signature-canvas');
            const sigText = document.getElementById('signature-text').value;

            if (sigCanvas.getContext('2d').getImageData(0, 0, sigCanvas.width, sigCanvas.height).data.some(channel => channel !== 0)) {
                // Has drawn signature
                this.signaturePosition = {
                    page: this.currentSignPage,
                    x: x,
                    y: y,
                    source: 'canvas'
                };
                this.renderSignPage();
            } else if (sigText) {
                // Has typed signature
                this.signaturePosition = {
                    page: this.currentSignPage,
                    x: x,
                    y: y,
                    source: 'text',
                    text: sigText,
                    font: document.getElementById('signature-font').value
                };
                this.renderSignPage();
            } else {
                alert('Please create a signature first (draw, type, or upload)');
            }
        };
    }

    drawSignatureOnCanvas(ctx, x, y) {
        if (!this.signaturePosition) return;

        if (this.signaturePosition.source === 'canvas') {
            const sigCanvas = document.getElementById('signature-canvas');
            ctx.drawImage(sigCanvas, x, y, 150, 50);
        } else if (this.signaturePosition.source === 'text') {
            ctx.font = `30px ${this.signaturePosition.font}`;
            ctx.fillStyle = '#000';
            ctx.fillText(this.signaturePosition.text, x, y);
        }
    }

    changeSignPage(delta) {
        const newPage = this.currentSignPage + delta;
        if (newPage < 1 || newPage > this.currentSignFile.pages) return;
        this.currentSignPage = newPage;
        this.renderSignPage();
    }

    async saveSignedPDF() {
        if (!this.signaturePosition) {
            alert('Please place a signature first');
            return;
        }

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(this.currentSignFile.arrayBuffer);
            const page = pdfDoc.getPage(this.signaturePosition.page - 1);
            const { height } = page.getSize();

            if (this.signaturePosition.source === 'canvas') {
                // Convert signature canvas to PNG
                const sigCanvas = document.getElementById('signature-canvas');
                const pngDataUrl = sigCanvas.toDataURL('image/png');
                const pngImageBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
                const pngImage = await pdfDoc.embedPng(pngImageBytes);

                page.drawImage(pngImage, {
                    x: this.signaturePosition.x / 1.5,
                    y: height - (this.signaturePosition.y / 1.5) - 33,
                    width: 100,
                    height: 33
                });
            } else if (this.signaturePosition.source === 'text') {
                page.drawText(this.signaturePosition.text, {
                    x: this.signaturePosition.x / 1.5,
                    y: height - (this.signaturePosition.y / 1.5),
                    size: 20,
                    color: PDFLib.rgb(0, 0, 0)
                });
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadPDF(pdfBytes, this.currentSignFile.name.replace('.pdf', '_signed.pdf'));

            alert('Signed PDF saved!');

        } catch (error) {
            console.error('Signature save error:', error);
            alert('Error saving signed PDF: ' + error.message);
        }
    }

    // OCR FUNCTIONALITY
    async performOCR() {
        const fileIndex = document.getElementById('ocr-file-select').value;
        if (!fileIndex) {
            alert('Please select a PDF file');
            return;
        }

        const file = this.loadedFiles[fileIndex];
        const language = document.getElementById('ocr-language').value;
        const allPages = document.getElementById('ocr-all-pages').checked;

        document.getElementById('ocr-progress').style.display = 'block';
        document.getElementById('ocr-result').style.display = 'none';

        try {
            let extractedText = '';
            const pagesToProcess = allPages ? file.pages : 1;

            for (let i = 1; i <= pagesToProcess; i++) {
                document.getElementById('ocr-status').textContent = `Processing page ${i} of ${pagesToProcess}...`;
                document.getElementById('ocr-progress-fill').style.width = `${(i / pagesToProcess) * 100}%`;

                const page = await file.pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                const { data: { text } } = await Tesseract.recognize(canvas, language);
                extractedText += `\n--- Page ${i} ---\n${text}\n`;
            }

            document.getElementById('ocr-text').value = extractedText.trim();
            document.getElementById('ocr-result').style.display = 'block';
            document.getElementById('ocr-progress').style.display = 'none';

        } catch (error) {
            console.error('OCR error:', error);
            alert('Error performing OCR: ' + error.message);
            document.getElementById('ocr-progress').style.display = 'none';
        }
    }

    copyOCRText() {
        const text = document.getElementById('ocr-text').value;
        navigator.clipboard.writeText(text);
        alert('Text copied to clipboard!');
    }

    downloadOCRText() {
        const text = document.getElementById('ocr-text').value;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extracted-text.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    // COMPRESS FUNCTIONALITY
    async compressPDF() {
        const fileIndex = document.getElementById('compress-file-select').value;
        if (!fileIndex) {
            alert('Please select a PDF file');
            return;
        }

        const file = this.loadedFiles[fileIndex];
        const level = document.querySelector('input[name="compress-level"]:checked').value;

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(file.arrayBuffer);

            // Compression settings (simplified)
            const pdfBytes = await pdfDoc.save({
                useObjectStreams: level !== 'low',
                addDefaultPage: false
            });

            // Show comparison
            document.getElementById('original-size').textContent = this.formatFileSize(file.size);
            document.getElementById('compressed-size').textContent = this.formatFileSize(pdfBytes.length);
            const reduction = ((1 - pdfBytes.length / file.size) * 100).toFixed(1);
            document.getElementById('reduction-percent').textContent = reduction + '%';
            document.getElementById('compress-info').style.display = 'block';

            this.downloadPDF(pdfBytes, file.name.replace('.pdf', '_compressed.pdf'));

            alert('PDF compressed successfully!');

        } catch (error) {
            console.error('Compression error:', error);
            alert('Error compressing PDF: ' + error.message);
        }
    }

    // EDIT PDF FUNCTIONALITY
    async loadPDFForEditing(fileIndex) {
        if (!fileIndex) return;

        const file = this.loadedFiles[fileIndex];
        this.currentEditFile = file;
        this.currentEditPage = 1;
        this.editElements = [];
        this.selectedElement = null;

        await this.renderEditPage();
        this.setupEditCanvas();
    }

    async renderEditPage() {
        const canvas = document.getElementById('edit-canvas');
        const page = await this.currentEditFile.pdf.getPage(this.currentEditPage);

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');

        // Render the PDF page as background
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Extract text items if not already done for this page
        if (!this.editElements.some(el => el.page === this.currentEditPage && el.extracted)) {
            const textContent = await page.getTextContent();

            textContent.items.forEach((item, index) => {
                if (!item.str || item.str.trim() === '') return;

                const tx = item.transform;
                // tx[0] = scaleX, tx[3] = scaleY, tx[4] = x, tx[5] = y
                const fontSize = Math.abs(tx[3]);
                const x = tx[4] * 1.5;
                const y = viewport.height - (tx[5] * 1.5);

                // Measure text width
                ctx.font = `${fontSize * 1.5}px sans-serif`;
                const textWidth = ctx.measureText(item.str).width;

                this.editElements.push({
                    id: `page${this.currentEditPage}-item${index}`,
                    page: this.currentEditPage,
                    type: 'text',
                    text: item.str,
                    x: x,
                    y: y,
                    originalX: x,  // Save original position immediately
                    originalY: y,
                    width: textWidth,
                    height: fontSize * 1.5,
                    fontSize: fontSize * 1.5,
                    color: '#000000',
                    fontWeight: 'normal',
                    extracted: true,
                    modified: false,
                    deleted: false
                });
            });
        }

        // Render all text elements
        this.renderEditElements();

        document.getElementById('edit-page-info').textContent =
            `Page ${this.currentEditPage} of ${this.currentEditFile.pages}`;
    }

    renderEditElements() {
        const canvas = document.getElementById('edit-canvas');
        const ctx = canvas.getContext('2d');

        // Get current page elements (exclude deleted)
        const pageElements = this.editElements.filter(el => el.page === this.currentEditPage && !el.deleted);

        pageElements.forEach(el => {
            if (el.type === 'text') {
                // Cover original text with white if modified
                if (el.modified && el.extracted) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(el.originalX - 2, el.originalY - el.height - 2, el.width + 4, el.height + 4);
                }

                // Draw text
                ctx.font = `${el.fontWeight} ${el.fontSize}px sans-serif`;
                ctx.fillStyle = el.color;
                ctx.fillText(el.text, el.x, el.y);

                // Draw selection box if selected
                if (this.selectedElement === el) {
                    ctx.strokeStyle = '#2563eb';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([8, 4]);
                    ctx.strokeRect(el.x - 4, el.y - el.height - 4, el.width + 8, el.height + 8);
                    ctx.setLineDash([]);

                    // Draw resize handles
                    const handles = [
                        { x: el.x - 4, y: el.y - el.height - 4 }, // top-left
                        { x: el.x + el.width + 4, y: el.y - el.height - 4 }, // top-right
                        { x: el.x - 4, y: el.y + 4 }, // bottom-left
                        { x: el.x + el.width + 4, y: el.y + 4 } // bottom-right
                    ];

                    ctx.fillStyle = '#2563eb';
                    handles.forEach(handle => {
                        ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
                    });
                }
            }
        });
    }

    setupEditCanvas() {
        const canvas = document.getElementById('edit-canvas');
        const overlay = document.getElementById('edit-overlay');

        let startX, startY, isDragging = false;

        canvas.onmousedown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.editMode === 'select') {
                // Check if clicking on an element
                const clicked = this.findElementAtPoint(x, y);
                if (clicked) {
                    this.selectElement(clicked);
                    startX = x;
                    startY = y;
                    isDragging = true;
                } else {
                    this.deselectElement();
                }
            } else if (this.editMode === 'text') {
                // Add new text element
                this.addTextElement(x, y);
            } else if (this.editMode === 'delete') {
                // Delete element at click point
                const clicked = this.findElementAtPoint(x, y);
                if (clicked) {
                    this.deleteElement(clicked);
                }
            }
        };

        canvas.onmousemove = (e) => {
            if (isDragging && this.selectedElement) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const dx = x - startX;
                const dy = y - startY;

                // Mark as modified and save original position if first move
                if (!this.selectedElement.modified) {
                    this.selectedElement.originalX = this.selectedElement.x;
                    this.selectedElement.originalY = this.selectedElement.y;
                    this.selectedElement.modified = true;
                }

                this.selectedElement.x += dx;
                this.selectedElement.y += dy;

                // Update width measurement
                const canvas = document.getElementById('edit-canvas');
                const ctx = canvas.getContext('2d');
                ctx.font = `${this.selectedElement.fontWeight} ${this.selectedElement.fontSize}px sans-serif`;
                this.selectedElement.width = ctx.measureText(this.selectedElement.text).width;

                startX = x;
                startY = y;

                // Clear and redraw
                this.renderEditPage();
            }
        };

        canvas.onmouseup = () => {
            isDragging = false;
        };

        canvas.onmouseleave = () => {
            isDragging = false;
        };
    }

    findElementAtPoint(x, y) {
        // Find element at click point (reverse order so top elements are checked first)
        const elements = this.editElements
            .filter(el => el.page === this.currentEditPage && !el.deleted)
            .reverse();

        for (const el of elements) {
            if (x >= el.x && x <= el.x + el.width &&
                y >= el.y - el.height && y <= el.y) {
                return el;
            }
        }
        return null;
    }

    selectElement(element) {
        this.selectedElement = element;
        this.showElementProperties(element);
        this.renderEditPage(); // Full re-render to show selection
    }

    deselectElement() {
        this.selectedElement = null;
        document.getElementById('selected-element-info').style.display = 'none';
        this.renderEditPage();
    }

    showElementProperties(element) {
        document.getElementById('selected-element-info').style.display = 'block';
        document.getElementById('element-text').value = element.text || '';
        document.getElementById('element-x').value = element.x.toFixed(1);
        document.getElementById('element-y').value = element.y.toFixed(1);
        document.getElementById('element-width').value = element.width.toFixed(1);
        document.getElementById('element-height').value = element.height.toFixed(1);
    }

    addTextElement(x, y) {
        const text = prompt('Enter text:', 'New Text');
        if (!text) return;

        const fontSize = parseInt(document.getElementById('edit-font-size').value);
        const color = document.getElementById('edit-color').value;

        const newElement = {
            id: `${this.currentEditPage}-new-${Date.now()}`,
            page: this.currentEditPage,
            type: 'text',
            text: text,
            x: x,
            y: y,
            width: text.length * fontSize * 0.6, // Approximate width
            height: fontSize,
            fontSize: fontSize,
            color: color,
            fontWeight: document.getElementById('edit-bold').classList.contains('active') ? 'bold' : 'normal'
        };

        this.editElements.push(newElement);

        // Recalculate accurate width
        const canvas = document.getElementById('edit-canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${newElement.fontWeight} ${newElement.fontSize}px sans-serif`;
        newElement.width = ctx.measureText(newElement.text).width;

        this.renderEditPage();
    }

    deleteElement(element) {
        // Mark as deleted instead of removing (so we can white-out in PDF)
        element.deleted = true;
        if (this.selectedElement === element) {
            this.deselectElement();
        } else {
            this.renderEditPage();
        }
    }

    deleteSelectedElement() {
        if (this.selectedElement) {
            this.deleteElement(this.selectedElement);
        }
    }

    applyElementChanges() {
        if (!this.selectedElement) return;

        // Mark as modified if not already
        if (!this.selectedElement.modified) {
            this.selectedElement.originalX = this.selectedElement.x;
            this.selectedElement.originalY = this.selectedElement.y;
            this.selectedElement.modified = true;
        }

        // Update from property inputs
        this.selectedElement.text = document.getElementById('element-text').value;
        this.selectedElement.x = parseFloat(document.getElementById('element-x').value);
        this.selectedElement.y = parseFloat(document.getElementById('element-y').value);

        // Update from toolbar controls
        const newFontSize = parseInt(document.getElementById('edit-font-size').value);
        const newColor = document.getElementById('edit-color').value;
        const isBold = document.getElementById('edit-bold').classList.contains('active');

        this.selectedElement.fontSize = newFontSize;
        this.selectedElement.color = newColor;
        this.selectedElement.fontWeight = isBold ? 'bold' : 'normal';

        // Recalculate width and height based on new font size and text
        const canvas = document.getElementById('edit-canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${this.selectedElement.fontWeight} ${this.selectedElement.fontSize}px sans-serif`;
        this.selectedElement.width = ctx.measureText(this.selectedElement.text).width;
        this.selectedElement.height = this.selectedElement.fontSize;

        // Update the property display
        document.getElementById('element-width').value = this.selectedElement.width.toFixed(1);
        document.getElementById('element-height').value = this.selectedElement.height.toFixed(1);

        this.renderEditPage();
    }

    setEditMode(mode) {
        this.editMode = mode;
        document.querySelectorAll('.edit-toolbar .toolbar-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === mode);
        });
    }

    changeEditPage(delta) {
        const newPage = this.currentEditPage + delta;
        if (newPage < 1 || newPage > this.currentEditFile.pages) return;
        this.currentEditPage = newPage;
        this.selectedElement = null;
        this.renderEditPage();
    }

    async saveEditedPDF() {
        if (this.editElements.length === 0) {
            alert('No changes to save');
            return;
        }

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(this.currentEditFile.arrayBuffer);

            // Group elements by page
            const elementsByPage = {};
            this.editElements.forEach(el => {
                if (!elementsByPage[el.page]) {
                    elementsByPage[el.page] = [];
                }
                elementsByPage[el.page].push(el);
            });

            // Process each page
            for (const [pageNum, elements] of Object.entries(elementsByPage)) {
                const page = pdfDoc.getPage(parseInt(pageNum) - 1);
                const { height } = page.getSize();

                // STEP 1: White-out original positions for modified/deleted extracted text
                for (const el of elements) {
                    if (el.type === 'text' && el.extracted && (el.modified || el.deleted)) {
                        // Draw white rectangle over original position
                        page.drawRectangle({
                            x: el.originalX / 1.5,
                            y: height - (el.originalY / 1.5),
                            width: (el.width + 8) / 1.5,
                            height: (el.height + 8) / 1.5,
                            color: PDFLib.rgb(1, 1, 1)  // White
                        });
                    }
                }

                // STEP 2: Draw new/modified text (skip deleted elements)
                for (const el of elements) {
                    if (el.type === 'text' && !el.deleted) {
                        // Convert hex color to RGB
                        const r = parseInt(el.color.substr(1, 2), 16) / 255;
                        const g = parseInt(el.color.substr(3, 2), 16) / 255;
                        const b = parseInt(el.color.substr(5, 2), 16) / 255;

                        page.drawText(el.text, {
                            x: el.x / 1.5,
                            y: height - (el.y / 1.5),
                            size: el.fontSize / 1.5,
                            color: PDFLib.rgb(r, g, b)
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadPDF(pdfBytes, this.currentEditFile.name.replace('.pdf', '_edited.pdf'));

            alert('Edited PDF saved!');

        } catch (error) {
            console.error('Edit save error:', error);
            alert('Error saving edited PDF: ' + error.message);
        }
    }

    // UTILITY FUNCTIONS
    downloadPDF(pdfBytes, filename) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize app
const app = new PDFPowerTools();
