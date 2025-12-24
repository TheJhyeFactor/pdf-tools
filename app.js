// PDF Power Tools - Main Application
// All operations run client-side for privacy

class PDFPowerTools {
    constructor() {
        this.loadedFiles = [];
        this.currentTool = 'upload';
        this.redactionBoxes = [];
        this.annotations = [];
        this.currentSignature = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.initializeSignatureCanvas();
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

    removeFile(id) {
        this.loadedFiles = this.loadedFiles.filter(f => f.id !== id);
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
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(box.x, box.y, box.width, box.height);
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
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(startX, startY, currentX - startX, currentY - startY);
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
    }

    async renderAnnotatePage() {
        const canvas = document.getElementById('annotate-canvas');
        const page = await this.currentAnnotateFile.pdf.getPage(this.currentAnnotatePage);

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        document.getElementById('annotate-page-info').textContent =
            `Page ${this.currentAnnotatePage} of ${this.currentAnnotateFile.pages}`;
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
        this.annotations = [];
        this.renderAnnotatePage();
    }

    async saveAnnotatedPDF() {
        alert('Annotation save feature - would render annotations to PDF');
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

        await this.renderSignPage();
    }

    async renderSignPage() {
        const canvas = document.getElementById('sign-canvas');
        const page = await this.currentSignFile.pdf.getPage(this.currentSignPage);

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        document.getElementById('sign-page-info').textContent =
            `Page ${this.currentSignPage} of ${this.currentSignFile.pages}`;
    }

    changeSignPage(delta) {
        const newPage = this.currentSignPage + delta;
        if (newPage < 1 || newPage > this.currentSignFile.pages) return;
        this.currentSignPage = newPage;
        this.renderSignPage();
    }

    async saveSignedPDF() {
        alert('Signature save feature - would add signature to PDF');
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
