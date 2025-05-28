
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Construction, Layers, Link as LinkIcon, MousePointer2, Square, Pencil, Type, Eraser, ZoomIn, ZoomOut, Undo, Redo, UploadCloud, DownloadCloud, Move, Frame, MessageSquare, Image as ImageIconLucide } from "lucide-react"; // Added Frame icon
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef, useEffect, useCallback } from 'react'; // Import React hooks

// Custom Figma-like icon
const FigmaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12H7C5.34315 12 4 13.3431 4 15V19C4 20.6569 5.34315 22 7 22H12V12Z" fill="#0ACF83"/>
    <path d="M12 2H7C5.34315 2 4 3.34315 4 5V9C4 10.6569 5.34315 12 7 12H12V2Z" fill="#A259FF"/>
    <path d="M17 2H12V12H17C18.6569 12 20 10.6569 20 9V5C20 3.34315 18.6569 2 17 2Z" fill="#F24E1E"/>
    <path d="M17 12H12V22H17C18.6569 22 20 20.6569 20 19V15C20 13.3431 18.6569 12 17 12Z" fill="#FF7262"/>
    <path d="M12 12C10.3431 12 9 10.6569 9 9V5C9 3.34315 10.3431 2 12 2V12Z" fill="#1ABCFE" transform="rotate(90 12 12)"/>
  </svg>
);

// Simple type for canvas elements (extend as needed)
interface CanvasElement {
  id: string;
  type: 'rect' | 'text' | 'image' | 'line'; // Add more types
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  imageUrl?: string;
  color: string;
  // For lines
  points?: {x: number, y: number}[];
}

const ZOOM_FACTOR = 1.1;
const MIN_ZOOM_DIMENSION = 20;
const MAX_ZOOM_DIMENSION = 2000;
const GRID_SIZE = 20; // Size of the grid squares


export default function FigmaIntegrationPage() {
  const { toast } = useToast();
  const canvasRef = useRef<SVGSVGElement>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<'select' | 'rect' | 'text' | 'line' | 'image'>('select');
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);
  const [currentColor, setCurrentColor] = useState('#000000'); // Default drawing color

  const handleToolClick = (toolName: string) => {
    setSelectedTool(toolName as any); // Cast for now, improve with specific tool types
    toast({
      title: "Tool Selected",
      description: `${toolName} tool is now active. Click and drag on the canvas (or click for text).`,
    });
  };

   const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!canvasRef.current || selectedTool === 'select') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawing(true);
    setStartPoint({ x, y });

    if (selectedTool === 'rect' || selectedTool === 'text' || selectedTool === 'line') {
      const newElement: CanvasElement = {
        id: `el-${Date.now()}`,
        type: selectedTool,
        x,
        y,
        width: 0,
        height: 0,
        text: selectedTool === 'text' ? 'Text' : undefined, // Default text if text tool
        color: currentColor,
        points: selectedTool === 'line' ? [{x,y}, {x,y}] : undefined,
      };
      setCurrentElement(newElement); // Set the element being drawn
      setElements(prev => [...prev, newElement]); // Add to elements array immediately
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing || !startPoint || !currentElement || !canvasRef.current || selectedTool === 'select') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setElements(prevElements => prevElements.map(el => {
      if (el.id === currentElement.id) {
        if (el.type === 'rect' || el.type === 'text') {
          return {
            ...el,
            width: Math.abs(mouseX - startPoint.x),
            height: Math.abs(mouseY - startPoint.y),
            x: Math.min(mouseX, startPoint.x),
            y: Math.min(mouseY, startPoint.y),
          };
        } else if (el.type === 'line' && el.points) {
            return {
                ...el,
                points: [el.points[0], {x: mouseX, y: mouseY}],
            };
        }
      }
      return el;
    }));
  };

  const handleMouseUp = () => {
    const elementBeingDrawn = currentElement; // Capture before resetting

    setDrawing(false);
    setStartPoint(null);
    // setCurrentElement(null); // Delay reset until after prompt for text tool

    if (selectedTool === 'text' && elementBeingDrawn) {
        const newText = prompt("Enter text:", elementBeingDrawn.text || "New Text");
        if (newText !== null) {
            setElements(prevElements =>
                prevElements.map(el =>
                    el.id === elementBeingDrawn.id ? { ...el, text: newText } : el
                )
            );
        } else {
            // If user cancels prompt, remove the placeholder text element
            setElements(prevElements => prevElements.filter(el => el.id !== elementBeingDrawn.id));
        }
    }
    setCurrentElement(null); // Reset current element after all operations
  };

   const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && canvasRef.current) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newElement: CanvasElement = {
                    id: `img-${Date.now()}`,
                    type: 'image',
                    x: 50, // Default position
                    y: 50,
                    width: 100, // Default size
                    height: 100,
                    imageUrl: reader.result as string,
                    color: 'transparent' 
                };
                setElements(prev => [...prev, newElement]);
                toast({ title: "Image Added", description: "Image uploaded to canvas." });
            };
            reader.readAsDataURL(file);
        }
        if (event.target) {
            event.target.value = ''; // Reset file input
        }
    };

    const handleZoomIn = () => {
        setElements(prevElements =>
            prevElements.map(el => {
            if (el.type === 'image' && el.width && el.height) {
                const newWidth = Math.min(MAX_ZOOM_DIMENSION, el.width * ZOOM_FACTOR);
                const newHeight = Math.min(MAX_ZOOM_DIMENSION, el.height * ZOOM_FACTOR);
                return { ...el, width: newWidth, height: newHeight };
            }
            return el;
            })
        );
        toast({ title: "Zoomed In", description: "All images on canvas enlarged." });
    };

    const handleZoomOut = () => {
        setElements(prevElements =>
            prevElements.map(el => {
            if (el.type === 'image' && el.width && el.height) {
                const newWidth = Math.max(MIN_ZOOM_DIMENSION, el.width / ZOOM_FACTOR);
                const newHeight = Math.max(MIN_ZOOM_DIMENSION, el.height / ZOOM_FACTOR);
                return { ...el, width: newWidth, height: newHeight };
            }
            return el;
            })
        );
        toast({ title: "Zoomed Out", description: "All images on canvas shrunk." });
    };


  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Collaborative Whiteboard Section */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-primary flex items-center">
            <Palette className="mr-3 h-6 w-6 text-accent" />
            Collaborative Whiteboard
          </CardTitle>
          <CardDescription>
            Design prototypes, wireframes, and diagrams. (Basic drawing implemented)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/30 items-center">
            <Button variant={selectedTool === 'select' ? "default" : "outline"} size="icon" title="Select Tool" onClick={() => handleToolClick('Select')}>
              <MousePointer2 className="h-5 w-5" />
            </Button>
            <Button variant={selectedTool === 'rect' ? "default" : "outline"} size="icon" title="Draw Rectangle" onClick={() => handleToolClick('Rect')}>
              <Square className="h-5 w-5" />
            </Button>
             <Button variant={selectedTool === 'line' ? "default" : "outline"} size="icon" title="Draw Line" onClick={() => handleToolClick('Line')}>
              <Move className="h-5 w-5 rotate-45" />
            </Button>
            <Button variant={selectedTool === 'text' ? "default" : "outline"} size="icon" title="Text Tool" onClick={() => handleToolClick('Text')}>
              <Type className="h-5 w-5" />
            </Button>
            <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} className="h-9 w-9 p-1 border rounded-md cursor-pointer" title="Select Color"/>
            
            <Button asChild variant="outline" size="icon" title="Upload Image">
                <label htmlFor="image-upload-whiteboard" className="cursor-pointer flex items-center justify-center h-9 w-9"> {/* Ensure label acts like button */}
                    <ImageIconLucide className="h-5 w-5" />
                    <input id="image-upload-whiteboard" type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
                </label>
            </Button>

            <Button variant="outline" size="icon" title="Eraser Tool (TBD)" onClick={() => handleToolClick('Eraser')} disabled>
              <Eraser className="h-5 w-5" />
            </Button>
             <div className="flex-grow"></div> {/* Spacer */}
            <Button variant="outline" size="icon" title="Undo (TBD)" onClick={() => handleToolClick('Undo')} disabled>
              <Undo className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" title="Redo (TBD)" onClick={() => handleToolClick('Redo')} disabled>
              <Redo className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" title="Export Frame (TBD)" onClick={() => alert("Export Frame functionality is under development.")} disabled>
              <Frame className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" title="Export Canvas (TBD)" onClick={() => alert("Export Canvas functionality is under development.")} disabled>
              <DownloadCloud className="h-5 w-5" />
            </Button>
             <Button variant="outline" size="icon" title="Zoom In Images" onClick={handleZoomIn}>
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" title="Zoom Out Images" onClick={handleZoomOut}>
              <ZoomOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Canvas Area */}
          <div className="w-full h-[600px] border-2 border-dashed border-border bg-white rounded-lg overflow-hidden"> {/* Changed bg-background to bg-white */}
             <svg
                ref={canvasRef}
                width="100%"
                height="100%"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves canvas
                className="cursor-crosshair select-none" // Add select-none to prevent text selection issues
             >
                {/* Grid Pattern Definition */}
                <defs>
                    <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                        <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                {/* Grid Background Rectangle */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {elements.map(el => {
                    if (el.type === 'rect') {
                        return <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} fill={el.color} stroke={el.color === '#ffffff' || el.color === 'white' ? '#cccccc' : 'transparent'} strokeWidth="1"/>
                    }
                    if (el.type === 'text' && el.text && el.width != null && el.height != null) { // Ensure width/height are defined
                        return (
                            <foreignObject key={el.id} x={el.x} y={el.y} width={Math.max(el.width, 20)} height={Math.max(el.height, 20)}> {/* Ensure min size for foreignObject */}
                                <div xmlns="http://www.w3.org/1999/xhtml" style={{ 
                                    color: el.color, 
                                    width: '100%', 
                                    height: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    overflow: 'hidden', 
                                    wordBreak: 'break-word', // Changed to break-word for better text wrapping
                                    fontSize: '14px', // Default font size
                                    padding: '2px', // Padding within the text box
                                    textAlign: 'center', // Center text
                                    boxSizing: 'border-box'
                                }}>
                                  {el.text}
                                </div>
                            </foreignObject>
                        );
                    }
                    if (el.type === 'line' && el.points && el.points.length === 2) {
                         return <line key={el.id} x1={el.points[0].x} y1={el.points[0].y} x2={el.points[1].x} y2={el.points[1].y} stroke={el.color} strokeWidth="2" />;
                    }
                    if (el.type === 'image' && el.imageUrl && el.width && el.height) {
                        return <image key={el.id} href={el.imageUrl} x={el.x} y={el.y} width={el.width} height={el.height} />;
                    }
                    return null;
                })}
             </svg>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                Basic drawing for rectangles, lines, text, and image uploads implemented. Image zoom affects all images. Advanced features like element selection, moving, individual resizing, eraser, undo/redo, canvas/frame export, and real-time collaboration require significant further development.
            </p>
        </CardFooter>
      </Card>


      {/* Existing Figma File Management Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-accent"/>Connect Figma Account</CardTitle>
            <CardDescription>
              Securely link your Figma account to access your design files and projects for import or comparison.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-10">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Figma connection wizard is under development.</p>
             <Image
                src="https://picsum.photos/seed/figma-connect/400/200"
                alt="Figma connect placeholder"
                width={400}
                height={200}
                className="rounded-lg mt-6 shadow-sm"
                data-ai-hint="api key"
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><Layers className="mr-2 h-5 w-5 text-accent"/>View & Compare Designs</CardTitle>
            <CardDescription>
              Browse your linked Figma files, view versions, and compare designs with live implementation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-10">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Design viewing and comparison tools are coming soon.</p>
            <Image
                src="https://picsum.photos/seed/figma-view/400/200"
                alt="Figma view placeholder"
                width={400}
                height={200}
                className="rounded-lg mt-6 shadow-sm"
                data-ai-hint="design layers"
            />
          </CardContent>
        </Card>
      </div>

      {/* Figma Integration Status Card */}
      <Card className="mt-6 shadow-lg">
        <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
                <FigmaIcon /> Figma Integration & Whiteboarding
            </CardTitle>
            <CardDescription>
              Bridging the gap between design and development, with creative tools!
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center py-12">
            <div className="flex items-center justify-center gap-6 mb-6">
             <Palette className="h-20 w-20 text-accent" />
             <FigmaIcon /> {/* Using the custom icon */}
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Seamless Design Workflow & Creation Tools Coming Soon!</h2>
            <p className="text-muted-foreground max-w-md">
            This module aims to provide both a collaborative whiteboarding space and tools to integrate with your existing Figma designs for a streamlined design-to-development process.
            </p>
        </CardContent>
      </Card>

    </div>
  );
}
