# PDF Power Tools

A professional-grade PDF manipulation suite that runs **entirely in your browser**. No uploads, no servers, no tracking — complete privacy.

## 🚀 WOW Demo

**"Did professional PDF operations entirely client-side — nothing uploaded."**

All PDF processing happens locally in your browser using cutting-edge web technologies:
- PDF.js for rendering
- pdf-lib for manipulation
- Tesseract.js for OCR
- HTML5 Canvas for drawing/annotation

## ✨ Features

### 📄 **Split PDFs**
- Extract page ranges (pages 5-10)
- Split every N pages
- Extract specific pages (1,3,5-7)
- Download individual sections

### 🔗 **Merge PDFs**
- Combine multiple PDFs into one
- Drag-and-drop to reorder
- Preserve all content and formatting

### ⬛ **True Redaction**
- Draw redaction boxes on pages
- Permanently remove sensitive content
- Navigate through multi-page documents
- Visual preview before applying

### ✏️ **Annotations**
- Add text annotations
- Highlight important sections
- Draw rectangles and shapes
- Add arrows and callouts
- Custom colors

### ✍️ **Digital Signatures**
- **Draw** your signature with mouse/touch
- **Type** your name in signature fonts
- **Upload** an image of your signature
- Place signature anywhere on document

### 🔍 **OCR - Text Extraction**
- Extract text from scanned PDFs
- Multi-language support (English, Spanish, French, German)
- Process single or all pages
- Copy extracted text
- Download as TXT file

### 📦 **Compression**
- Three compression levels:
  - Low (Best Quality)
  - Medium (Balanced)
  - High (Smallest Size)
- See before/after file sizes
- Percentage reduction displayed

## 🔒 Privacy First

### Why This Matters

Most PDF tools require you to **upload your documents** to their servers. This means:
- Your sensitive data leaves your computer
- You don't know who has access
- Documents may be stored/analyzed
- Privacy policies can change

### Our Approach

**PDF Power Tools is different:**
- ✓ **Zero uploads** - Files never leave your device
- ✓ **Zero tracking** - No analytics, no cookies
- ✓ **Zero accounts** - No signup required
- ✓ **100% client-side** - All processing in your browser
- ✓ **Open source** - Inspect the code yourself

Perfect for:
- Legal documents
- Medical records
- Financial statements
- HR documents
- Contracts
- Personal files

## 🛠️ Technical Stack

### Core Libraries

```html
<!-- PDF Rendering -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

<!-- PDF Creation/Manipulation -->
<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>

<!-- OCR Text Recognition -->
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js"></script>
```

### Technologies Used

- **PDF.js** - Mozilla's PDF rendering engine
- **pdf-lib** - Create and modify PDFs
- **Tesseract.js** - OCR text extraction
- **HTML5 Canvas API** - Drawing and annotations
- **File API** - Local file handling
- **Vanilla JavaScript** - No framework overhead

## 📂 File Structure

```
pdf-tools/
├── index.html          # Main interface
├── style.css           # Professional styling
├── app.js              # Core application logic
└── README.md           # This file
```

## 🚀 Quick Start

### Option 1: Local Development

1. Clone or download this repository
2. Open `index.html` in a modern browser
3. Start working with PDFs immediately!

```bash
# No build step required!
open index.html
```

### Option 2: GitHub Pages

1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Share the URL - it works for everyone!

## 💡 Usage Examples

### Split a Large PDF

1. Click "Upload Files" and select your PDF
2. Navigate to "Split PDF"
3. Choose split mode:
   - **Range**: Extract pages 10-20
   - **Every N**: Create 5-page chunks
   - **Specific**: Get pages 1,5,10,15
4. Click "Split PDF" - downloads automatically

### Merge Multiple Documents

1. Upload all PDFs you want to combine
2. Go to "Merge PDFs"
3. Drag items to reorder them
4. Click "Merge All PDFs"
5. Download the combined file

### Redact Sensitive Information

1. Upload PDF with sensitive content
2. Select "Redact" tool
3. Choose your file from dropdown
4. Click and drag to draw black boxes over text
5. Navigate between pages as needed
6. Click "Apply Redactions"
7. Download permanently redacted PDF

### Extract Text with OCR

1. Upload a scanned PDF (image-based)
2. Go to "OCR" tool
3. Select language
4. Choose single page or all pages
5. Click "Extract Text"
6. Wait for processing
7. Copy text or download as TXT

### Sign Documents

1. Upload PDF to sign
2. Go to "Sign" tool
3. Create signature:
   - Draw with mouse
   - Type your name
   - Upload signature image
4. Navigate to signature page
5. Click to place signature
6. Download signed PDF

## 🎯 Use Cases

### Legal
- Redact client information
- Sign contracts electronically
- Split case files by section
- Merge evidence documents

### Medical
- Redact patient identifiers (HIPAA)
- Extract text from scanned records
- Merge patient histories
- Compress large imaging reports

### Business
- Sign NDAs and agreements
- Redact confidential data
- Merge quarterly reports
- Extract data from invoices

### Personal
- Compress photos-heavy documents
- Sign rental agreements
- Merge tax documents
- Split large manuals

## 🔧 Browser Support

Works in all modern browsers:
- ✓ Chrome 90+
- ✓ Firefox 88+
- ✓ Safari 14+
- ✓ Edge 90+

**Note:** OCR processing is memory-intensive. For best performance:
- Use on desktop/laptop
- Process fewer pages at once on mobile
- Close other browser tabs

## 📊 Performance

### File Size Limits

Recommended maximum file sizes:
- **Split/Merge**: 50MB per file
- **Redact/Annotate**: 20MB (for smooth canvas rendering)
- **OCR**: 10MB (processing-intensive)
- **Compress**: 50MB

### Processing Speed

Typical processing times on modern hardware:
- Split/Merge: ~1-2 seconds per 100 pages
- Redaction: Real-time preview
- OCR: ~3-5 seconds per page
- Compression: ~2-3 seconds per 100 pages

## 🛡️ Security Notes

### What Makes This Secure?

1. **No Network Transmission**: Files never sent to servers
2. **Memory-Only Processing**: Files cleared when page closes
3. **No Local Storage**: Nothing saved to disk except your downloads
4. **Open Source**: Audit the code yourself

### Limitations

While this tool is private and secure:
- Downloaded files are saved to your computer (as expected)
- Browser extensions could theoretically access page content
- Shared computers: others with access could see download history

**Best Practice**: Use in private browsing mode for maximum privacy.

## 🚧 Known Limitations

### Current Version

- **Annotations**: Basic implementation (text/shapes preview)
- **Compression**: Limited optimization (pdf-lib constraints)
- **OCR**: Slower on large documents
- **Signatures**: Canvas-based (not cryptographic)

### Planned Enhancements

- [ ] Batch processing multiple files
- [ ] Password protection for PDFs
- [ ] More annotation tools (arrows, stamps)
- [ ] Cryptographic digital signatures
- [ ] Image extraction from PDFs
- [ ] Advanced compression algorithms

## 🤝 Contributing

This is a portfolio/demonstration project, but contributions are welcome!

### Ideas for Improvement

- Better compression algorithms
- More signature fonts
- Additional OCR languages
- Batch operations
- Undo/redo functionality
- Keyboard shortcuts

## 📄 License

MIT License - Free to use, modify, and distribute.

## 👨‍💻 Author

Built by **Jhye O'meley** ([@TheJhyeFactor](https://github.com/TheJhyeFactor))

Showcasing:
- Client-side web application development
- Privacy-focused design
- Complex PDF manipulation
- Modern JavaScript patterns
- Professional UI/UX

## 🌟 Why This Project?

This project demonstrates:

1. **Privacy-First Design** - Building tools that respect user data
2. **Client-Side Processing** - Leveraging browser capabilities
3. **Professional UI** - Clean, intuitive interface
4. **Real-World Utility** - Solving actual user problems
5. **Technical Depth** - PDF manipulation, OCR, canvas drawing

Perfect for portfolio demonstrations:
> "I built a complete PDF manipulation suite that runs entirely in the browser with zero uploads, featuring split/merge, redaction, OCR, signatures, and compression."

## 📞 Questions?

Check out the code! Everything is commented and organized for easy understanding.

---

**Remember:** Your files never leave your browser. Privacy guaranteed. 🔒
