import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Download, 
  Image as ImageIcon, 
  ChevronDown, 
  RefreshCw,
  Printer,
  FileCheck
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const LetterheadGenerator: React.FC = () => {
  // 1. State for editable letterhead fields
  const [date, setDate] = useState('20 August 2026');
  const [subject, setSubject] = useState('Subject of the Letter');
  const [body, setBody] = useState(
    `Dear Recipient,\n\nWrite your letter content here. You can write multiple paragraphs, and they will be formatted properly with clean line spacing. This editor is fully responsive, and the live preview on the right updates instantly.\n\nSheshaan Global supports international trade by connecting global markets with high-quality Indian export products, including fresh agricultural goods, spices, oilseeds, and processed foods. We ensure end-to-end supply chain reliability, quality checks, and timely shipments.\n\nPlease let us know if you require any specific product samples, CIF pricing sheets, or shipping schedule details.\n\nThank you for your trust and partnership.`
  );
  const [senderName, setSenderName] = useState('Sana Zeba Bakshi');
  const [senderPosition, setSenderPosition] = useState('CEO');

  // Generation status states
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingPng, setGeneratingPng] = useState(false);
  const [generatingJpg, setGeneratingJpg] = useState(false);

  // Ref to the A4 preview element
  const previewRef = useRef<HTMLDivElement>(null);

  // 2. Clear / Reset Form to default values
  const handleReset = () => {
    if (confirm('Are you sure you want to reset the letter content to defaults?')) {
      setDate('20 August 2026');
      setSubject('Subject of the Letter');
      setBody(
        `Dear Recipient,\n\nWrite your letter content here. You can write multiple paragraphs, and they will be formatted properly with clean line spacing. This editor is fully responsive, and the live preview on the right updates instantly.\n\nSheshaan Global supports international trade by connecting global markets with high-quality Indian export products, including fresh agricultural goods, spices, oilseeds, and processed foods. We ensure end-to-end supply chain reliability, quality checks, and timely shipments.\n\nPlease let us know if you require any specific product samples, CIF pricing sheets, or shipping schedule details.\n\nThank you for your trust and partnership.`
      );
      setSenderName('Sana Zeba Bakshi');
      setSenderPosition('CEO');
    }
  };

  // 3. Export PDF Handler
  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 3, // Ultra-high resolution capture for printing
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`Sheshaan_Letterhead_${senderName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 4. Export PNG Handler
  const handleDownloadPNG = async () => {
    if (!previewRef.current) return;
    setGeneratingPng(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `Sheshaan_Letterhead_${senderName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('PNG generation failed:', error);
      alert('Failed to generate PNG image.');
    } finally {
      setGeneratingPng(false);
    }
  };

  // 5. Export JPG Handler
  const handleDownloadJPG = async () => {
    if (!previewRef.current) return;
    setGeneratingJpg(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `Sheshaan_Letterhead_${senderName.replace(/\s+/g, '_')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
    } catch (error) {
      console.error('JPG generation failed:', error);
      alert('Failed to generate JPG image.');
    } finally {
      setGeneratingJpg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-sky-300">Document Hub</p>
            <h3 className="text-xl font-black">Letterhead Generator</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Recreate formal business letters dynamically with corporate branding. Type on the left and see print-ready A4 preview updates on the right.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white/10 border border-white/15 text-white rounded-lg font-bold hover:bg-white/15 transition text-xs"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white/10 border border-white/15 text-white rounded-lg font-bold hover:bg-white/15 transition text-xs"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Settings & Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Side: Settings Form */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">Letter Content</h4>
            
            {/* Date Input */}
            <div>
              <label htmlFor="letterhead-date" className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Letter Date
              </label>
              <input
                id="letterhead-date"
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 20 August 2026"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {/* Subject Input */}
            <div>
              <label htmlFor="letterhead-subject" className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Letter Subject
              </label>
              <input
                id="letterhead-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line of the letter"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {/* Letter Body Textarea */}
            <div>
              <label htmlFor="letterhead-body" className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Letter Body Content</span>
                <span className="text-[10px] text-slate-400 font-bold normal-case">Supports line breaks</span>
              </label>
              <textarea
                id="letterhead-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder="Start typing your letter body here..."
                className="w-full p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 resize-y leading-relaxed"
              />
            </div>

            {/* Sender Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="letterhead-sender-name" className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Sender Name
                </label>
                <input
                  id="letterhead-sender-name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Sana Zeba Bakshi"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Sender Designation */}
              <div>
                <label htmlFor="letterhead-sender-pos" className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Designation
                </label>
                <input
                  id="letterhead-sender-pos"
                  type="text"
                  value={senderPosition}
                  onChange={(e) => setSenderPosition(e.target.value)}
                  placeholder="e.g. CEO"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>
          </div>

          {/* Export Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">Export Document</h4>
            
            {/* PDF Download Button */}
            <button
              type="button"
              disabled={generatingPdf || !senderName}
              onClick={handleDownloadPDF}
              className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-black uppercase text-xs flex items-center justify-center gap-2 transition disabled:opacity-55 shadow-sm tracking-wider"
            >
              {generatingPdf ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Letterhead PDF
                </>
              )}
            </button>

            {/* PNG/JPG Download Options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={generatingPng}
                onClick={handleDownloadPNG}
                className="h-10 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {generatingPng ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                Download PNG
              </button>
              <button
                type="button"
                disabled={generatingJpg}
                onClick={handleDownloadJPG}
                className="h-10 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {generatingJpg ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                Download JPG
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Live A4 Preview */}
        <div className="xl:col-span-7 space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold px-1 uppercase tracking-wider">
            <span>A4 Document Preview</span>
            <span>794px × 1123px (Print-Ready)</span>
          </div>

          <div className="w-full overflow-auto border border-slate-200 rounded-xl p-4 bg-slate-100/60 shadow-inner flex justify-center max-h-[85vh]">
            {/* The Locked A4 Page Container */}
            <div 
              ref={previewRef}
              id="letterhead-a4-page" 
              className="w-[794px] h-[1123px] bg-white shadow-2xl relative flex flex-col shrink-0 text-slate-800 text-left font-serif"
              style={{ minWidth: '794px', minHeight: '1123px' }}
            >
              {/* TOP HEADER ACCENT BAND */}
              <div className="absolute top-0 left-0 right-0 h-[14px] bg-blue-900 z-10">
                <div className="absolute right-0 top-0 h-full w-[45%] bg-orange-500" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)' }} />
              </div>

              {/* HEADER AREA */}
              <div className="px-12 pt-12 pb-5 flex justify-between items-start flex-none z-10 relative">
                {/* Logo and Brand Text */}
                <div className="flex items-center gap-4">
                  {/* Sheshaan Logo Container */}
                  <div className="shrink-0">
                    <svg viewBox="0 0 100 100" className="h-16 w-16 select-none">
                      {/* Globe Grid lines */}
                      <circle cx="50" cy="45" r="30" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                      <ellipse cx="50" cy="45" rx="30" ry="10" fill="none" stroke="#cbd5e1" strokeWidth="0.75" />
                      <ellipse cx="50" cy="45" rx="15" ry="30" fill="none" stroke="#cbd5e1" strokeWidth="0.75" />
                      <line x1="20" y1="45" x2="80" y2="45" stroke="#cbd5e1" strokeWidth="0.75" />
                      <line x1="50" y1="15" x2="50" y2="75" stroke="#cbd5e1" strokeWidth="0.75" />

                      {/* Swirls */}
                      <path d="M 17 45 A 33 28 0 1 1 83 45" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M 83 45 A 33 28 0 0 1 17 45" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />

                      {/* Cargo Container Ship */}
                      <path d="M 22 64 L 78 64 L 73 72 L 27 72 Z" fill="#1e3a8a" />
                      <path d="M 22 64 L 30 64 L 28 60 L 24 60 Z" fill="#f97316" />
                      <line x1="25" y1="68" x2="75" y2="68" stroke="#dc2626" strokeWidth="1.25" />

                      {/* Containers */}
                      <rect x="32" y="55" width="6" height="9" fill="#f97316" />
                      <rect x="39" y="52" width="6" height="12" fill="#0284c7" />
                      <rect x="46" y="49" width="8" height="15" fill="#10b981" />
                      <rect x="55" y="52" width="6" height="12" fill="#eab308" />
                      <rect x="62" y="57" width="6" height="7" fill="#ec4899" />

                      {/* Waves */}
                      <path d="M 12 74 Q 26 71 40 74 T 68 74 T 88 74" fill="none" stroke="#38bdf8" strokeWidth="1.75" strokeLinecap="round" />
                      <path d="M 16 77 Q 30 75 44 77 T 72 77 T 84 77" fill="none" stroke="#0284c7" strokeWidth="1.25" strokeLinecap="round" />

                      {/* Airplane */}
                      <path d="M 76 26 L 87 20 L 85 25 L 91 24 L 89 28 L 78 29 Z" fill="#1d4ed8" />
                      <path d="M 82 22 L 84 15 L 83 24 L 74 29 L 72 28 L 78 25 Z" fill="#1d4ed8" />
                    </svg>
                  </div>

                  {/* Brand Typography */}
                  <div className="flex flex-col items-start select-none">
                    <h1 className="text-[25px] font-black tracking-tight text-blue-900 leading-none" style={{ fontFamily: 'sans-serif' }}>
                      SHESHAAN
                    </h1>
                    <div className="flex items-center w-full justify-between gap-1 mt-0.5">
                      <div className="h-[2px] bg-orange-500 flex-grow"></div>
                      <span className="text-[13px] font-black tracking-[0.24em] text-orange-500 uppercase leading-none" style={{ fontFamily: 'sans-serif' }}>
                        GLOBAL
                      </span>
                      <div className="h-[2px] bg-orange-500 flex-grow"></div>
                    </div>
                    <p className="text-[6.5px] font-black text-slate-500 tracking-[0.16em] mt-1 select-none" style={{ fontFamily: 'sans-serif' }}>
                      CONNECTING MARKETS, DELIVERING TRUST
                    </p>
                  </div>
                </div>

                {/* Right Top Contact Details */}
                <div className="flex items-center gap-4 h-16 select-none" style={{ fontFamily: 'sans-serif' }}>
                  <div className="w-[1.5px] h-full bg-slate-200" />
                  <div className="flex flex-col gap-1.5 justify-center">
                    {/* CEO */}
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <User className="h-3 w-3" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-wide">CEO</p>
                        <p className="text-[9px] font-black text-slate-800">Sana Zeba Bakshi</p>
                      </div>
                    </div>
                    {/* Email */}
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Mail className="h-3 w-3" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-wide">EMAIL</p>
                        <p className="text-[9px] font-black text-slate-800">info@sheshaanglobal.com</p>
                      </div>
                    </div>
                    {/* Phone */}
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Phone className="h-3 w-3" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[6.5px] font-black text-slate-400 uppercase tracking-wide">PHONE</p>
                        <p className="text-[9px] font-black text-slate-800">+91 81499 09546</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Header Divider Line */}
              <div className="px-12 flex-none select-none relative z-10">
                <div className="relative w-full h-[2.5px] bg-blue-900">
                  <div className="absolute right-0 top-0 h-full w-[28%] bg-orange-500" />
                </div>
              </div>

              {/* BODY AREA */}
              <div className="px-12 py-10 flex-1 relative flex flex-col z-0">
                {/* 1. Dotted World Map Watermark in Center */}
                <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none select-none z-0">
                  <svg viewBox="0 0 1000 500" className="w-[85%] h-auto opacity-[0.035]">
                    {/* North America */}
                    <path d="M 120 150 C 100 120, 60 110, 40 130 C 20 150, 30 190, 50 220 C 70 250, 90 240, 110 240 C 130 240, 160 220, 180 190 C 200 160, 220 170, 240 150 C 260 130, 260 90, 240 80 C 220 70, 160 70, 120 150 Z" fill="#1d4ed8" />
                    {/* South America */}
                    <path d="M 210 250 C 190 270, 200 310, 210 340 C 220 370, 230 400, 240 440 C 250 460, 260 460, 270 430 C 280 400, 300 330, 290 290 C 280 250, 260 240, 230 240 C 220 240, 215 245, 210 250 Z" fill="#1d4ed8" />
                    {/* Greenland */}
                    <path d="M 230 30 C 260 30, 280 40, 280 60 C 260 80, 240 70, 220 60 C 200 50, 210 30, 230 30 Z" fill="#1d4ed8" />
                    {/* Africa */}
                    <path d="M 440 200 C 420 210, 410 230, 410 250 C 410 270, 430 310, 450 340 C 470 370, 490 390, 500 410 C 510 390, 530 350, 540 310 C 550 270, 540 240, 530 220 C 510 190, 460 190, 440 200 Z" fill="#1d4ed8" />
                    {/* Eurasia */}
                    <path d="M 380 110 C 360 130, 370 170, 400 170 C 430 170, 450 160, 480 160 C 510 160, 560 140, 600 150 C 640 160, 680 150, 730 170 C 780 190, 830 160, 860 140 C 880 120, 860 90, 830 70 C 780 50, 680 40, 580 50 C 480 60, 400 90, 380 110 Z" fill="#1d4ed8" />
                    <path d="M 580 170 C 600 190, 630 210, 660 220 C 690 230, 730 210, 760 240 C 780 260, 810 240, 830 190 C 780 180, 680 170, 580 170 Z" fill="#1d4ed8" />
                    {/* Australia */}
                    <path d="M 760 330 C 740 340, 730 370, 750 390 C 770 410, 810 410, 830 390 C 850 370, 840 340, 810 320 C 780 310, 770 320, 760 330 Z" fill="#1d4ed8" />
                  </svg>
                </div>

                {/* 2. Abstract Swoop watermark bottom-right */}
                <div className="absolute -bottom-20 -right-20 w-[350px] h-[350px] opacity-[0.035] pointer-events-none select-none z-0 rotate-45">
                  <svg viewBox="0 0 100 100" fill="none" stroke="#1d4ed8" strokeWidth="1.25">
                    <circle cx="50" cy="50" r="40" />
                    <ellipse cx="50" cy="50" rx="40" ry="12" />
                    <ellipse cx="50" cy="50" rx="12" ry="40" />
                    <path d="M 12 50 Q 50 20 88 50" stroke="#f97316" strokeWidth="2" />
                  </svg>
                </div>

                {/* Actual Text Elements */}
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  {/* Date & Subject */}
                  <div>
                    <div className="text-right text-[11px] font-bold text-slate-600 mb-6">
                      Date: {date || 'N/A'}
                    </div>

                    {subject && (
                      <div className="text-[12.5px] font-black text-slate-800 uppercase tracking-wide mb-8 underline decoration-blue-900 decoration-2 underline-offset-4">
                        Subject: {subject}
                      </div>
                    )}

                    {/* Letter Body paragraphs */}
                    <div className="text-[11.5px] text-slate-700 leading-relaxed space-y-4 whitespace-pre-line text-justify pr-2">
                      {body || 'Start writing letter body content...'}
                    </div>
                  </div>

                  {/* Sign-off details block */}
                  <div className="mt-12 text-left self-start">
                    <p className="text-[11.5px] text-slate-600 mb-10">Yours sincerely,</p>
                    <p className="text-[12px] font-black text-slate-900 leading-none">{senderName || 'Sana Zeba Bakshi'}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1.5">{senderPosition || 'CEO'}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 select-none">Sheshaan Global</p>
                  </div>
                </div>
              </div>

              {/* FOOTER DIVIDER LINE */}
              <div className="px-12 flex-none select-none relative z-10">
                <div className="relative w-full h-[2px] bg-blue-900">
                  <div className="absolute right-0 top-0 h-full w-[35%] bg-orange-500" />
                </div>
              </div>

              {/* FOOTER DETAILS */}
              <div className="px-12 py-3 flex items-center justify-between flex-none z-10 relative select-none" style={{ fontFamily: 'sans-serif' }}>
                {/* Office Address */}
                <div className="flex items-start gap-2.5 max-w-[65%]">
                  <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <MapPin className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[7.5px] font-black text-slate-900 uppercase tracking-wider leading-none">Office Address</p>
                    <p className="text-[8px] font-extrabold text-slate-500 mt-1 leading-normal">
                      Office No. Plot no.1459, Opp.M.A.K Azad Urdu School, Aasinagar, Nagpur, India-440017
                    </p>
                  </div>
                </div>

                <div className="w-[1px] h-7 bg-slate-200 shrink-0" />

                {/* GST */}
                <div className="flex items-start gap-2.5 min-w-[28%]">
                  <div className="h-6 w-6 rounded-full bg-blue-900 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <FileText className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[7.5px] font-black text-slate-900 uppercase tracking-wider leading-none">GST No.</p>
                    <p className="text-[8px] font-extrabold text-slate-500 mt-1 leading-normal">
                      27DCTPB6192N1ZS
                    </p>
                  </div>
                </div>
              </div>

              {/* BOTTOM BAND WITH CORNER SKED STRIPES */}
              <div className="relative w-full h-8 bg-blue-900 flex-none overflow-hidden select-none z-10">
                {/* Left diagonal stripes */}
                <div className="absolute left-0 top-0 h-full w-9 bg-orange-500 -skew-x-[28deg] -translate-x-3.5" />
                <div className="absolute left-9 top-0 h-full w-[3px] bg-white -skew-x-[28deg] -translate-x-2" />
                <div className="absolute left-11 top-0 h-full w-[5px] bg-blue-900 -skew-x-[28deg] -translate-x-2" />
                <div className="absolute left-13 top-0 h-full w-[4px] bg-orange-500 -skew-x-[28deg] -translate-x-2" />

                {/* Right diagonal slash */}
                <div className="absolute right-0 top-0 h-full w-28 bg-orange-500 -skew-x-[28deg] translate-x-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
