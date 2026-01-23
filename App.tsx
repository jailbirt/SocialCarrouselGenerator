import React, { useState, useRef, useEffect } from 'react';
import { Slide, Palette, ChatMessage, SlideElement } from './types';
import { generateCarouselStructure, generateSlideImage, editSlideImage, determineEditIntent, updateSlideContent, updateSpecificSlideField } from './services/geminiService';
import { SlideView } from './components/SlideView';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { 
  Send, 
  Download, 
  Loader2, 
  Palette as PaletteIcon, 
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  X,
  MousePointer2,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Trash2,
  Info,
  AlertCircle,
  Paintbrush,
  Images,
  FileDown,
  Maximize
} from 'lucide-react';

const INITIAL_PALETTE: Palette = {
  background: '#1a1a1a', // Dark background by default to show off the feature
  text: '#ffffff',       // White text
  accent: '#3b82f6'      // Blue accent
};

const STYLE_PRESETS = [
  "Corporate Vector (Default)",
  "Hyper-realistic Photo",
  "3D Render (Pixar Style)",
  "Minimalist Line Art",
  "Cyberpunk Neon",
  "Hand Drawn Sketch"
];

const App: React.FC = () => {
  // --- State ---
  const [topic, setTopic] = useState('');
  const [imageStyle, setImageStyle] = useState('Corporate Vector'); // New State for Image Style
  const [slides, setSlides] = useState<Slide[]>([]);
  const [palette, setPalette] = useState<Palette>(INITIAL_PALETTE);
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Selection State
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<SlideElement>(null);
  
  // Generation & Chat State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showPalette, setShowPalette] = useState(true); // Palette open by default
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  // UI Modals State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const slidesContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToSlide = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  useEffect(() => {
    if (selectedSlideId) {
      scrollToSlide(selectedSlideId);
    }
  }, [selectedSlideId]);

  // --- Navigation ---

  const handlePrevSlide = () => {
    if (!selectedSlideId || slides.length === 0) return;
    const currentIndex = slides.findIndex(s => s.id === selectedSlideId);
    if (currentIndex > 0) {
      const prevId = slides[currentIndex - 1].id;
      setSelectedSlideId(prevId);
      setSelectedElement(null); 
    }
  };

  const handleNextSlide = () => {
    if (!selectedSlideId || slides.length === 0) return;
    const currentIndex = slides.findIndex(s => s.id === selectedSlideId);
    if (currentIndex < slides.length - 1) {
      const nextId = slides[currentIndex + 1].id;
      setSelectedSlideId(nextId);
      setSelectedElement(null); 
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement || 
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') handlePrevSlide();
      if (e.key === 'ArrowRight') handleNextSlide();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlideId, slides]);

  // --- Core Actions ---

  const handleCreateNew = () => {
    // Replaced window.confirm with custom modal state
    setShowResetConfirm(true);
  };

  const performReset = () => {
    // Force reset of all states
    setSlides([]);
    setTopic('');
    setImageStyle('Corporate Vector'); // Reset style
    setChatHistory([]);
    setSelectedSlideId(null);
    setSelectedElement(null);
    setPalette(INITIAL_PALETTE);
    setChatInput('');
    setPendingImage(null);
    setIsGenerating(false);
    // Ensure sidebar is open to show the input form
    setIsSidebarOpen(true);
    setShowPalette(true); // Reset palette to open
    setShowResetConfirm(false);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    setLoadingMessage('Designing your carousel structure...');
    setSlides([]);
    setSelectedSlideId(null);
    setSelectedElement(null);
    setChatHistory([]);

    try {
      // Pass imageStyle to structure generator
      const rawSlides = await generateCarouselStructure(topic, imageStyle);
      
      const newSlides: Slide[] = rawSlides.map((s, index) => ({
        ...s,
        id: `slide-${Date.now()}-${index}`,
        imageBase64: null,
        isGeneratingImage: true,
        layout: s.layout || 'image-bottom',
        imageScale: 1.0 // Default scale
      }));

      setSlides(newSlides);
      if (newSlides.length > 0) setSelectedSlideId(newSlides[0].id);

      setLoadingMessage('Rendering illustrations...');
      generateImagesForSlides(newSlides);

    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to generate carousel. Please check API Key or try again.');
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const generateImagesForSlides = async (currentSlides: Slide[]) => {
    const updatedSlides = [...currentSlides];
    
    for (let i = 0; i < updatedSlides.length; i++) {
      if (updatedSlides[i].layout === 'text-only') {
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, isGeneratingImage: false } : s));
        continue;
      }

      try {
        // Pass global imageStyle
        const base64 = await generateSlideImage(updatedSlides[i].imagePrompt, imageStyle);
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, imageBase64: base64, isGeneratingImage: false } : s));
      } catch (e) {
        console.error(`Failed to generate image for slide ${i}`, e);
        setSlides(prev => prev.map(s => s.id === updatedSlides[i].id ? { ...s, isGeneratingImage: false } : s));
      }

      // Add a delay between requests to avoid hitting rate limits
      if (i < updatedSlides.length - 1) {
         await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  };

  const handleRegenerateImage = async (e: React.MouseEvent, slideId: string) => {
    e.stopPropagation();
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isGeneratingImage: true } : s));
    try {
      // Use the global imageStyle for regeneration
      const base64 = await generateSlideImage(slide.imagePrompt, imageStyle);
      setSlides(prev => prev.map(s => s.id === slideId ? { ...s, imageBase64: base64, isGeneratingImage: false } : s));
    } catch (error) {
       console.error(error);
       setSlides(prev => prev.map(s => s.id === slideId ? { ...s, isGeneratingImage: false } : s));
    }
  };

  const handleSlideContentUpdate = (id: string, newContent: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
  };

  const handleSlideTitleUpdate = (id: string, newTitle: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const handleImageScaleUpdate = (id: string, scale: number) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, imageScale: scale } : s));
  };

  // --- Image Upload & Chat Handlers ---

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setPendingImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault(); 
        }
      }
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !pendingImage) || isGenerating) return;

    const userMsg = chatInput;
    const uploadedImage = pendingImage;
    
    setChatInput('');
    setPendingImage(null);
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg, image: uploadedImage || undefined }]);

    if (!selectedSlideId) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Please select a slide to edit content or modify images." }]);
      return;
    }

    const currentSlide = slides.find(s => s.id === selectedSlideId);
    if (!currentSlide) return;

    // Logic: Image Selection
    if (selectedElement === 'image' || uploadedImage) {
      if (uploadedImage) {
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { 
          ...s, imageBase64: uploadedImage, isGeneratingImage: false 
        } : s));
        if (!userMsg.trim()) {
          setChatHistory(prev => [...prev, { role: 'model', text: "I've replaced the image." }]);
          return;
        }
      }
      if (userMsg.trim()) {
        if (!currentSlide.imageBase64 && !uploadedImage) {
          setLoadingMessage('Generating image...');
          setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: true } : s));
          try {
            // Pass style to generation
            const newImage = await generateSlideImage(userMsg, imageStyle);
            setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: newImage, isGeneratingImage: false } : s));
            setChatHistory(prev => [...prev, { role: 'model', text: "I've generated a new image." }]);
          } catch (err) {
            setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: false } : s));
          }
        } else {
           setLoadingMessage('Editing image...');
           setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: true } : s));
           try {
             const newImage = await editSlideImage(currentSlide.imageBase64!, userMsg, imageStyle);
             setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: newImage, isGeneratingImage: false } : s));
             setChatHistory(prev => [...prev, { role: 'model', text: "I've updated the image." }]);
           } catch (err) {
             setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: false } : s));
           }
        }
      }
      return;
    }

    // Logic: Text Selection
    if (selectedElement === 'title' || selectedElement === 'content') {
      if (!userMsg.trim()) return;
      const currentText = selectedElement === 'title' ? currentSlide.title : currentSlide.content;
      setChatHistory(prev => [...prev, { role: 'model', text: `Updating the ${selectedElement}...` }]);
      try {
        const newText = await updateSpecificSlideField(currentText, selectedElement, userMsg);
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, [selectedElement]: newText } : s));
        setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: `I've updated the ${selectedElement}.` }]);
      } catch (err) {
         setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Error updating text." }]);
      }
      return;
    }

    // Logic: General Update
    setChatHistory(prev => [...prev, { role: 'model', text: "Processing..." }]);
    try {
      const intent = await determineEditIntent(userMsg);
      if (intent === 'IMAGE') {
        if (!currentSlide.imageBase64 && !uploadedImage) {
           setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Wait for the image to finish generating first." }]);
           return;
        }
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: true } : s));
        const newImage = await editSlideImage(currentSlide.imageBase64!, userMsg, imageStyle);
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, imageBase64: newImage, isGeneratingImage: false } : s));
        setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Image updated." }]);
      } else {
        const updatedContent = await updateSlideContent(currentSlide, userMsg);
        setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, ...updatedContent } : s));
        setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Slide text updated." }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev.slice(0, -1), { role: 'model', text: "Error processing request." }]);
      setSlides(prev => prev.map(s => s.id === selectedSlideId ? { ...s, isGeneratingImage: false } : s));
    }
  };

  const handleExportPDF = async () => {
    if (slides.length === 0) return;
    setLoadingMessage('Exporting Optimized PDF...');
    setIsGenerating(true);

    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Font loading check failed", e);
    }
    
    // Slight delay to ensure DOM is stable
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1350] });
      
      for (let i = 0; i < slides.length; i++) {
        const slideElement = document.getElementById(`slide-render-${slides[i].id}`);
        if (slideElement) {
          // SWITCH TO JPEG AND LOWER QUALITY FOR SMALLER FILE SIZE
          const imgData = await toJpeg(slideElement, {
            quality: 0.80, // 80% quality (Good balance)
            pixelRatio: 1.0, // 1:1 pixel mapping (drastically reduces resolution from 2x retina)
            backgroundColor: palette.background, // USE PALETTE BACKGROUND
            cacheBust: true,
          });

          if (i > 0) pdf.addPage([1080, 1350]);
          // Use JPEG compression in PDF
          pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
        }
      }
      pdf.save('linkedin-carousel.pdf');
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to export PDF. Please check your browser settings or try again.");
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const handleExportZIP = async () => {
    if (slides.length === 0) return;
    setLoadingMessage('Zipping Images...');
    setIsGenerating(true);

    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Font loading check failed", e);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const zip = new JSZip();

    try {
      for (let i = 0; i < slides.length; i++) {
        const slideElement = document.getElementById(`slide-render-${slides[i].id}`);
        if (slideElement) {
          // Use JPEG for ZIP as well to keep file size reasonable
          const imgData = await toJpeg(slideElement, {
            quality: 0.90, // Slightly higher quality for individual images
            pixelRatio: 1.0, 
            backgroundColor: palette.background, // USE PALETTE BACKGROUND
            cacheBust: true,
          });
          
          // Remove the data URL prefix
          const base64Data = imgData.replace(/^data:image\/jpeg;base64,/, "");
          zip.file(`slide-${i + 1}.jpg`, base64Data, {base64: true});
        }
      }

      const content = await zip.generateAsync({type: "blob"});
      
      // Create download link
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'instagram-carousel-images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to export ZIP. Please try again.");
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const getChatPlaceholder = () => {
    if (!selectedSlideId) return "Select a slide first";
    if (selectedElement === 'title') return "Rewrite title...";
    if (selectedElement === 'content') return "Rewrite body...";
    if (selectedElement === 'image') return "Describe changes...";
    return "Type instructions...";
  };

  // Helper for palette tooltips
  const getPaletteTooltip = (key: string) => {
    switch(key) {
      case 'accent': return 'Color for highlights (**) and buttons';
      case 'text': return 'Color for all titles and body text';
      case 'background': return 'Main background color of the slides';
      default: return '';
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      
      {/* --- MODALS --- */}
      
      {/* 1. Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3 text-gray-900">
                 <div className="p-2 bg-red-100 rounded-full text-red-600">
                   <AlertCircle className="w-6 h-6" />
                 </div>
                 <h3 className="text-lg font-bold">Start New Carousel?</h3>
               </div>
               <p className="text-gray-600 text-sm leading-relaxed">
                 This action will <span className="font-bold text-gray-800">delete your current work</span> and reset all slides. This cannot be undone.
               </p>
               <div className="flex justify-end gap-3 mt-2">
                 <button 
                   onClick={() => setShowResetConfirm(false)}
                   className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={performReset}
                   className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-colors"
                 >
                   Yes, Create New
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* 2. Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border-l-4 border-red-500">
             <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                   <AlertCircle className="w-5 h-5 text-red-500" />
                   Error
                 </h3>
                 <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-gray-600">
                   <X className="w-5 h-5" />
                 </button>
               </div>
               <p className="text-gray-600 text-sm leading-relaxed">
                 {errorMessage}
               </p>
               <div className="flex justify-end mt-2">
                 <button 
                   onClick={() => setErrorMessage(null)}
                   className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                 >
                   Dismiss
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}


      {/* UNIFIED LEFT SIDEBAR */}
      <div 
        className={`bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-300 relative shadow-xl overflow-hidden
          ${isSidebarOpen ? 'w-96 opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 min-w-[24rem]">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="text-blue-600 w-5 h-5" />
            LinkeGen
          </h1>
        </div>

        {/* --- STATE A: CREATION MODE (No slides) --- */}
        {slides.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-in fade-in duration-300 min-w-[24rem]">
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-800 block">Topic or Description</label>
              <textarea
                className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-32 transition-all text-sm leading-relaxed"
                placeholder="e.g. 5 Tips for Remote Work Leadership..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />

              {/* IMAGE STYLE SELECTOR */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-blue-600" />
                  Visual Style
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="style-suggestions"
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="e.g. Hyper-realistic, 3D Render..."
                    disabled={isGenerating}
                  />
                  <datalist id="style-suggestions">
                    {STYLE_PRESETS.map(style => (
                      <option key={style} value={style} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STYLE_PRESETS.slice(0, 3).map((style) => (
                    <button
                      key={style}
                      onClick={() => setImageStyle(style)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                        imageStyle === style 
                        ? 'bg-blue-100 border-blue-200 text-blue-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {style.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || isGenerating}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-4"
              >
                {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                Generate Carousel
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
               <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowPalette(!showPalette)}>
                  <span className="text-sm font-semibold text-gray-700">Color Palette</span>
                  <PaletteIcon className="w-4 h-4 text-gray-400" />
               </div>
               
               <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${showPalette ? 'opacity-100' : 'hidden opacity-0'}`}>
                 {(Object.keys(palette) as Array<keyof Palette>).map((key) => (
                    <div key={key} className="flex flex-col gap-1 group/palette relative">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400">{key}</span>
                        <div className="relative group/tooltip">
                          <Info className="w-3 h-3 text-gray-300 hover:text-blue-500 cursor-help" />
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 text-center shadow-lg">
                            {getPaletteTooltip(key)}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                        <input 
                          type="color" 
                          value={palette[key]} 
                          onChange={(e) => setPalette(prev => ({...prev, [key]: e.target.value}))}
                          className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs text-gray-600 font-mono">{palette[key]}</span>
                      </div>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        ) : (
          // --- STATE B: EDIT MODE (Slides exist) ---
          <>
            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 min-w-[24rem]">
                {/* Intro Message */}
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Editor Assistant Active</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {selectedElement 
                        ? `Editing: ${selectedElement.toUpperCase()}. Type below to update.`
                        : "Select any text or image on the slide to edit it."}
                    </p>
                  </div>
                </div>

                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm space-y-2 shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      }`}>
                        {msg.image && (
                            <img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg border border-white/20" />
                        )}
                        {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                      </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* NEW: IMAGE RESIZE SLIDER (Appears only when image is selected) */}
            {selectedElement === 'image' && selectedSlideId && (
              <div className="p-4 bg-white border-t border-gray-200 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                    <Maximize className="w-3 h-3 text-blue-600" />
                    Image Size
                  </label>
                  <span className="text-xs font-mono text-gray-500">
                    {Math.round((slides.find(s => s.id === selectedSlideId)?.imageScale || 1) * 100)}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.1" 
                  value={slides.find(s => s.id === selectedSlideId)?.imageScale || 1}
                  onChange={(e) => handleImageScaleUpdate(selectedSlideId, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            )}

            {/* Chat Input Area */}
            <div className="p-4 bg-white border-t border-gray-200 min-w-[24rem]">
                {pendingImage && (
                  <div className="mb-3 flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100 animate-in slide-in-from-bottom-2">
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white">
                        <img src={pendingImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs text-blue-700 flex-1 truncate font-medium">Image attached</span>
                      <button onClick={() => setPendingImage(null)} className="p-1 hover:bg-blue-100 rounded-full text-blue-700">
                        <X className="w-4 h-4" />
                      </button>
                  </div>
                )}
                
                <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2">
                  <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Attach Image"
                  >
                      <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <div className="relative flex-1">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={getChatPlaceholder()}
                        className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={(!chatInput.trim() && !pendingImage) || isGenerating}
                    className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors shadow-sm"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </form>
            </div>

            {/* Footer Buttons: Export & New */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-3 min-w-[24rem]">
              <div className="grid grid-cols-2 gap-3">
                <button
                   type="button"
                   onClick={handleExportPDF}
                   disabled={isGenerating}
                   className="py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                   title="Download as PDF Document"
                 >
                   {isGenerating && loadingMessage.includes('PDF') ? <Loader2 className="animate-spin w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                   Export PDF
                 </button>
                 <button
                   type="button"
                   onClick={handleExportZIP}
                   disabled={isGenerating}
                   className="py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                   title="Download individual images (for Instagram)"
                 >
                   {isGenerating && loadingMessage.includes('ZIP') ? <Loader2 className="animate-spin w-4 h-4" /> : <Images className="w-4 h-4" />}
                   Export Images
                 </button>
              </div>

               <button
                 type="button"
                 onClick={handleCreateNew}
                 disabled={isGenerating}
                 className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
               >
                 <PlusCircle className="w-4 h-4" />
                 Create New
               </button>
            </div>
          </>
        )}
      </div>

      {/* MAIN PREVIEW AREA */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col h-full">
        {/* NEW TOP BAR: Navigation & Info */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 h-16 flex items-center justify-between shadow-sm z-20 shrink-0">
          
          {/* LEFT: Sidebar Toggle */}
          <div className="flex-1 flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </button>
          </div>

          {/* CENTER: Navigation Controls */}
          <div className="flex items-center gap-4">
             {slides.length > 0 && (
                <>
                  <button 
                    onClick={handlePrevSlide}
                    disabled={!selectedSlideId || slides.findIndex(s => s.id === selectedSlideId) === 0}
                    className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors text-gray-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <span className="text-sm font-bold text-gray-700 min-w-[3rem] text-center select-none font-mono">
                    {selectedSlideId 
                      ? `${slides.findIndex(s => s.id === selectedSlideId) + 1} / ${slides.length}` 
                      : '-'}
                  </span>

                  <button 
                    onClick={handleNextSlide}
                    disabled={!selectedSlideId || slides.findIndex(s => s.id === selectedSlideId) === slides.length - 1}
                    className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors text-gray-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
             )}
          </div>

          {/* RIGHT: Status Indicator */}
          <div className="flex-1 flex justify-end items-center">
            {isGenerating && (
              <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium animate-pulse">
                <Loader2 className="animate-spin w-3 h-3" />
                {loadingMessage || 'Working...'}
              </span>
            )}
          </div>
        </div>

        {/* Slides Container - Clean Padding */}
        <div 
          className={`flex-1 overflow-x-auto overflow-y-hidden p-8 flex items-center gap-12 snap-x snap-mandatory ${isGenerating ? 'pointer-events-none opacity-50' : ''}`}
          ref={slidesContainerRef}
          onClick={() => setSelectedElement(null)}
        >
           {slides.length === 0 ? (
             <div className="w-full flex flex-col items-center justify-center text-gray-400 gap-6 animate-in zoom-in-95 duration-500">
               <div className="w-32 h-32 rounded-3xl bg-white shadow-sm border border-gray-200 flex items-center justify-center">
                 <Sparkles className="w-12 h-12 text-blue-100" />
               </div>
               <div className="text-center">
                 <h3 className="text-lg font-semibold text-gray-600">Start Creating</h3>
                 <p className="text-sm text-gray-400 mt-1">Use the sidebar to generate your first carousel</p>
               </div>
             </div>
           ) : (
             slides.map((slide) => (
               <div key={slide.id} className="flex-shrink-0 snap-center">
                  <SlideView 
                    id={slide.id}
                    slide={slide}
                    palette={palette}
                    isSelected={selectedSlideId === slide.id}
                    selectedElement={selectedSlideId === slide.id ? selectedElement : null}
                    onSelect={() => setSelectedSlideId(slide.id)}
                    onElementSelect={(el) => {
                      setSelectedSlideId(slide.id);
                      setSelectedElement(el);
                      if (!isSidebarOpen) setIsSidebarOpen(true); // Auto-open sidebar when editing
                    }}
                    onRegenerateImage={(e) => handleRegenerateImage(e, slide.id)}
                    onTitleChange={(newTitle) => handleSlideTitleUpdate(slide.id, newTitle)}
                    onContentChange={(newContent) => handleSlideContentUpdate(slide.id, newContent)}
                    isEditable={true}
                    scale={0.36} 
                  />
                  {/* Hidden Render for PDF */}
                  <div className="absolute top-0 -left-[9999px] -z-50 pointer-events-none">
                     <div id={`slide-render-${slide.id}`}>
                        <SlideView 
                           slide={slide}
                           palette={palette}
                           isSelected={false}
                           onSelect={() => {}}
                           onRegenerateImage={() => {}}
                           isEditable={false} 
                           isExport={true} 
                           scale={1} 
                        />
                     </div>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

export default App;