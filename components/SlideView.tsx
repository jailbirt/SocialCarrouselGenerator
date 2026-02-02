import React from 'react';
import { Slide, Palette, SlideElement } from '../types';
import { RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface SlideViewProps {
  slide: Slide;
  palette: Palette;
  isSelected: boolean;
  selectedElement?: SlideElement;
  onSelect: () => void;
  onElementSelect?: (element: SlideElement) => void;
  onRegenerateImage: (e: React.MouseEvent) => void;
  onTitleChange?: (newTitle: string) => void;
  onContentChange?: (newContent: string) => void;
  isEditable?: boolean;
  isExport?: boolean; 
  scale?: number;
  id?: string;
  onCursorChange?: (index: number) => void;
}

// Helper to get caret offset relative to text content
function getCaretCharacterOffsetWithin(element: HTMLElement) {
    let caretOffset = 0;
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || window;
    let sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    }
    return caretOffset;
}

export const SlideView: React.FC<SlideViewProps> = ({ 
  slide, 
  palette, 
  isSelected, 
  selectedElement = null,
  onSelect, 
  onElementSelect,
  onRegenerateImage,
  onTitleChange,
  onContentChange,
  isEditable = false,
  isExport = false,
  scale = 1,
  id,
  onCursorChange
}) => {
  // 1080 x 1350 is the target.
  const width = 1080;
  const height = 1350;

  // Helper to handle element clicks
  const handleElementClick = (e: React.MouseEvent, element: SlideElement) => {
    e.stopPropagation(); 
    onSelect();
    if (onElementSelect) {
      onElementSelect(element);
    }
    
    // Attempt to track cursor if clicked
    if (onCursorChange && e.target instanceof HTMLElement) {
       // Using small timeout to allow selection to update
       setTimeout(() => {
         const pos = getCaretCharacterOffsetWithin(e.target as HTMLElement);
         onCursorChange(pos);
       }, 0);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
      if (onCursorChange && e.target instanceof HTMLElement) {
         const pos = getCaretCharacterOffsetWithin(e.target as HTMLElement);
         onCursorChange(pos);
      }
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
      // Save final cursor position on blur
      if (onCursorChange) {
         const pos = getCaretCharacterOffsetWithin(e.target);
         onCursorChange(pos);
      }
      // Trigger update
      if (e.target.dataset.type === 'title') {
         onTitleChange?.(e.target.innerText);
      } else if (e.target.dataset.type === 'content') {
         onContentChange?.(e.target.innerText);
      }
  };


  // Helper to render text with highlighting
  const renderRichText = (text: string, isTitle: boolean = false) => {
    if (!text) return null;
    
    const cleanText = text.replace(/\\n/g, '\n');
    // Regex splits text by **highlight** OR [[box]]
    const parts = cleanText.split(/(\*\*[\s\S]*?\*\*|\[\[[\s\S]*?\]\])/g);
    
    return parts.map((part, i) => {
      // HIGHLIGHTED TEXT (**text**) -> Background is Accent, Text is Background Color (High Contrast)
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        
        return (
          <span key={i} style={{ 
            backgroundColor: palette.accent,
            color: palette.background, // Contrast against accent
            padding: '0.1em 0.15em',
            borderRadius: '0.1em',
            display: 'inline',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
            position: 'relative',
            zIndex: 20
          }}>
            {content}
          </span>
        );
      }
      
      // BOXED TEXT ([[text]]) -> Background is Main Text Color, Text is Background Color (Inverted)
      if (part.startsWith('[[') && part.endsWith(']]')) {
        return (
          <span key={i} className="inline-block" style={{ 
            backgroundColor: palette.text,
            color: palette.background,
            padding: '0.25em 0.8em',
            borderRadius: '999px',
            fontWeight: '600',
            fontSize: '0.80em',
            verticalAlign: 'middle',
            margin: '0 0.15em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            textDecoration: 'none',
            border: 'none',
            position: 'relative', 
            zIndex: 20
          }}>
            {part.slice(2, -2)}
          </span>
        );
      }

      return <span key={i} style={{ position: 'relative', zIndex: 20 }}>{part}</span>;
    });
  };

  // Common Image Component - Floating Style
  const SlideImage = () => {
    // Apply position transform to wrapper
    const transformStyle = {
       transform: `translate(${slide.imagePos?.x || 0}px, ${slide.imagePos?.y || 0}px)`,
       transition: isExport ? 'none' : 'transform 0.1s ease-out'
    };

    return (
      <div 
        className={`w-full h-full relative group/image flex items-center justify-center z-10
          ${selectedElement === 'image' && !isExport ? 'ring-4 ring-blue-500 ring-offset-4' : ''}`}
        style={transformStyle}
        onClick={(e) => handleElementClick(e, 'image')}
      >
        {slide.isGeneratingImage ? (
          <div className="w-full h-full flex items-center justify-center animate-pulse bg-gray-50/50 rounded-3xl">
            <ImageIcon className="w-24 h-24 text-gray-300" />
          </div>
        ) : slide.error ? (
          <div className="w-full h-full flex items-center justify-center flex-col gap-3 bg-red-50 rounded-3xl border-2 border-dashed border-red-200/80 p-4 text-center cursor-default">
              <AlertCircle className="w-16 h-16 text-red-300" />
              <div>
                <p className="text-red-500 font-bold text-lg mb-1">Image Generation Failed</p>
                {!isExport && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRegenerateImage(e); }}
                    className="mt-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" /> Try Again
                  </button>
                )}
              </div>
          </div>
        ) : slide.imageBase64 ? (
            <div className="relative w-full h-full flex items-center justify-center z-10">
              <img 
                src={slide.imageBase64.startsWith('data:') ? slide.imageBase64 : `data:image/png;base64,${slide.imageBase64}`} 
                alt="Slide visual" 
                className="max-w-full max-h-full object-contain drop-shadow-xl relative z-10 transition-transform duration-200"
                style={{
                  transform: `scale(${slide.imageScale || 1})`
                }}
              />
              {!isExport && (
                <div 
                  className={`absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer z-20
                    ${selectedElement === 'image' ? 'opacity-100' : 'opacity-0 group-hover/image:opacity-100'}`}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRegenerateImage(e); }}
                    className="bg-white/90 backdrop-blur text-gray-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg border border-gray-200 hover:bg-white transform scale-90 hover:scale-100 transition-transform"
                  >
                      <RefreshCw className="w-5 h-5" /> Regenerate
                  </button>
                </div>
              )}
            </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-2 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200/50">
              <ImageIcon className="w-16 h-16 opacity-50" />
              <span>Select to Add Image</span>
          </div>
        )}
      </div>
    );
  };

  const getElementStyle = (element: SlideElement) => {
    const baseStyle = {
      cursor: isEditable && !isExport ? 'pointer' : 'default',
    };
    
    // Selection ring
    const selectionStyle = selectedElement === element && isEditable && !isExport
      ? { outline: '4px solid #3b82f6', outlineOffset: '8px', borderRadius: '4px', cursor: 'text' }
      : {};

    // Position Transform
    const pos = element === 'title' ? slide.titlePos : element === 'content' ? slide.contentPos : {x:0, y:0};
    const transformStyle = {
        transform: `translate(${pos?.x || 0}px, ${pos?.y || 0}px)`,
        transition: isExport ? 'none' : 'transform 0.1s ease-out'
    };

    return { ...baseStyle, ...selectionStyle, ...transformStyle };
  };

  const renderContent = () => {
    const showRawTitle = isEditable && selectedElement === 'title';
    const showRawContent = isEditable && selectedElement === 'content';

    // Default font sizes if undefined
    const titleFontSize = slide.titleFontSize || 120;
    const contentFontSize = slide.contentFontSize || 60;

    // Standard leading for consistency
    const leadingClass = 'leading-tight';
    
    // Base classes without Tailwind font sizes
    const titleClass = `font-bold ${leadingClass} outline-none whitespace-pre-line tracking-tight py-4 relative z-20`;
    const contentClass = `leading-normal font-medium outline-none whitespace-pre-line py-2 relative z-20`;

    // DYNAMIC FONT STYLES (Apply Font Size Here)
    const titleStyle = { 
        color: palette.text, 
        fontFamily: slide.fontPair?.title || "'Space Grotesk', sans-serif",
        fontSize: `${titleFontSize}px`
    };
    const contentStyle = { 
        color: palette.text, 
        fontFamily: slide.fontPair?.body || "'Inter', sans-serif",
        fontSize: `${contentFontSize}px`
    };
    
    // Alignment Class
    const alignClass = slide.textAlign === 'left' ? 'text-left items-start' : slide.textAlign === 'right' ? 'text-right items-end' : 'text-center items-center';
    const flexAlignClass = slide.textAlign === 'left' ? 'items-start' : slide.textAlign === 'right' ? 'items-end' : 'items-center';


    switch (slide.layout) {
      case 'text-only':
        return (
          <div className={`flex-1 flex flex-col justify-center p-20 gap-16 ${alignClass}`}>
             <div className="w-full relative z-20" style={getElementStyle('title')} onClick={(e) => handleElementClick(e, 'title')}>
                <h2 
                  data-type="title"
                  className={titleClass}
                  style={titleStyle}
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawTitle ? slide.title : renderRichText(slide.title, true)}
                </h2>
             </div>
             <div className="w-full max-w-4xl relative z-20" style={getElementStyle('content')} onClick={(e) => handleElementClick(e, 'content')}>
                <div 
                  data-type="content"
                  className={contentClass}
                  style={contentStyle}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawContent ? slide.content : renderRichText(slide.content)}
                </div>
             </div>
          </div>
        );
      
      case 'text-image-text':
          return (
            <div className="flex-1 flex flex-col h-full p-16 gap-6">
              <div className={`flex-none pt-4 flex justify-center relative z-20 ${alignClass}`} style={getElementStyle('title')} onClick={(e) => handleElementClick(e, 'title')}>
                <h2 
                  data-type="title"
                  className={`${titleClass} max-w-4xl py-2`}
                  style={titleStyle}
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawTitle ? slide.title : renderRichText(slide.title, true)}
                </h2>
              </div>
              
              {/* Reduced image height for this layout to prioritize text */}
              <div className="flex-1 min-h-0 w-full px-12 flex justify-center relative z-10 max-h-[35%]">
                 <div className="w-full h-full">
                   <SlideImage />
                 </div>
              </div>

              <div className={`flex-none pb-8 flex justify-center relative z-20 ${alignClass}`} style={getElementStyle('content')} onClick={(e) => handleElementClick(e, 'content')}>
                <div 
                  data-type="content"
                  className={`${contentClass} max-w-3xl py-2`}
                  style={contentStyle}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawContent ? slide.content : renderRichText(slide.content)}
                </div>
              </div>
            </div>
          );

      case 'image-top':
        return (
          <div className="flex-1 flex flex-col h-full">
            {/* Reduced from 50% to 38% */}
            <div className="h-[38%] w-full p-12 pb-4 flex justify-center items-end relative z-10">
               <div className="w-[85%] h-[90%]">
                 <SlideImage />
               </div>
            </div>
            {/* Increased from 50% to 62% */}
            <div className={`h-[62%] w-full p-16 flex flex-col gap-10 justify-start relative z-20 ${flexAlignClass} ${alignClass}`}>
              <div className="w-full" style={getElementStyle('title')} onClick={(e) => handleElementClick(e, 'title')}>
                <h2 
                  data-type="title"
                  className={`${titleClass} py-2`}
                  style={titleStyle}
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawTitle ? slide.title : renderRichText(slide.title, true)}
                </h2>
              </div>
              <div className="w-full max-w-3xl" style={getElementStyle('content')} onClick={(e) => handleElementClick(e, 'content')}>
                <div 
                  data-type="content"
                  className={`${contentClass} py-2`}
                  style={contentStyle}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawContent ? slide.content : renderRichText(slide.content)}
                </div>
              </div>
            </div>
          </div>
        );

      case 'image-bottom':
      default:
        return (
          <div className="flex-1 flex flex-col h-full">
            {/* Increased from 45% to 62% */}
            <div className={`h-[62%] w-full p-16 flex flex-col gap-10 justify-end relative z-20 ${flexAlignClass} ${alignClass}`}>
              <div className="w-full" style={getElementStyle('title')} onClick={(e) => handleElementClick(e, 'title')}>
                <h2 
                  data-type="title"
                  className={`${titleClass} py-2`}
                  style={titleStyle}
                  contentEditable={isEditable && selectedElement === 'title'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawTitle ? slide.title : renderRichText(slide.title, true)}
                </h2>
              </div>
              <div className="w-full max-w-3xl" style={getElementStyle('content')} onClick={(e) => handleElementClick(e, 'content')}>
                <div 
                  data-type="content"
                  className={`${contentClass} py-2`}
                  style={contentStyle}
                  contentEditable={isEditable && selectedElement === 'content'}
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  onKeyUp={handleKeyUp}
                  onClick={(e) => {
                     if (onCursorChange) {
                        const pos = getCaretCharacterOffsetWithin(e.currentTarget);
                        onCursorChange(pos);
                     }
                  }}
                >
                  {showRawContent ? slide.content : renderRichText(slide.content)}
                </div>
              </div>
            </div>
             {/* Reduced from 55% to 38% */}
            <div className="h-[38%] w-full p-12 pt-4 flex justify-center items-start relative z-10">
               <div className="w-[85%] h-[90%]">
                 <SlideImage />
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div 
      id={id}
      className={`relative group transition-all duration-300 ${isSelected && !isExport ? 'ring-4 ring-offset-2 ring-blue-500 shadow-xl' : isExport ? '' : 'shadow-md hover:shadow-lg'}`}
      style={{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        cursor: isExport ? 'default' : 'pointer'
      }}
      onClick={(e) => {
        if (!isExport) {
          onSelect();
          if (onElementSelect) onElementSelect(null); 
        }
      }}
    >
      <div 
        className="w-full h-full flex flex-col overflow-hidden relative"
        style={{
          backgroundColor: palette.background, // DYNAMIC BACKGROUND COLOR
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${width}px`,
          height: `${height}px`
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
};