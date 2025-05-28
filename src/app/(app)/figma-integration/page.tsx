
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Layers, Link as LinkIconLucide, MousePointer2, Square, Pencil, Type, Eraser, UploadCloud, DownloadCloud, Move, Frame as FrameIcon, MessageSquare, Image as ImageIconLucide, LogIn, LogOut, Eye, Users, ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Undo, Redo, Group, Ungroup, Component, Play, Loader2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StyleEditorPanel from '@/components/feature/figma-integration/style-editor-panel';
import { db } from '@/lib/firebase/firebase.config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

const FigmaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12H7C5.34315 12 4 13.3431 4 15V19C4 20.6569 5.34315 22 7 22H12V12Z" fill="#0ACF83"/>
    <path d="M12 2H7C5.34315 2 4 3.34315 4 5V9C4 10.6569 5.34315 12 7 12H12V2Z" fill="#A259FF"/>
    <path d="M17 2H12V12H17C18.6569 12 20 10.6569 20 9V5C20 3.34315 18.6569 2 17 2Z" fill="#F24E1E"/>
    <path d="M17 12H12V22H17C18.6569 22 20 20.6569 20 19V15C20 13.3431 18.6569 12 17 12Z" fill="#FF7262"/>
    <path d="M12 12C10.3431 12 9 10.6569 9 9V5C9 3.34315 10.3431 2 12 2V12Z" fill="#1ABCFE" transform="rotate(90 12 12)"/>
  </svg>
);

export interface CanvasElement {
  id: string;
  type: 'rect' | 'text' | 'image' | 'line' | 'frame';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  imageUrl?: string;
  fillColor?: string;
  strokeColor: string;
  textColor?: string;
  strokeWidth: number;
  fontSize?: number;
  opacity: number;
  points?: {x: number, y: number}[];
  userId?: string;
  isMaster?: boolean;
  masterId?: string;
  componentName?: string;
  instanceOverrides?: Partial<Omit<CanvasElement, 'id' | 'masterId' | 'isMaster' | 'componentName' | 'instanceOverrides'>>;
  isGroup?: boolean;
  linkToFrameId?: string;
  interactionType?: 'onClick' | 'onHover' | 'onDrag';
}

type WhiteboardTool = 'select' | 'rect' | 'text' | 'line' | 'image' | 'eraser' | 'frame';

const INITIAL_VIEWBOX_WIDTH = 800;
const INITIAL_VIEWBOX_HEIGHT = 600;
const ZOOM_STEP_FACTOR = 1.2;
const PAN_STEP_AMOUNT = 50;
const GRID_SIZE = 20;
const SELECTED_STROKE_WIDTH = 2;
const SELECTED_STROKE_COLOR = 'hsl(var(--ring))';
const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_FONT_SIZE = 16;


export default function FigmaIntegrationPage() {
  const { toast } = useToast();
  const canvasRef = useRef<SVGSVGElement>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<WhiteboardTool>('select');
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);
  const [currentStrokeColor, setCurrentStrokeColor] = useState('#000000');
  const [isFigmaConnected, setIsFigmaConnected] = useState<boolean>(false);
  const [figmaUserName, setFigmaUserName] = useState<string | null>(null);
  const [figmaFileUrl, setFigmaFileUrl] = useState<string>('');
  const [embeddedFigmaUrl, setEmbeddedFigmaUrl] = useState<string | null>(null);
  const [isLoadingFigmaConnection, setIsLoadingFigmaConnection] = useState<boolean>(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: INITIAL_VIEWBOX_WIDTH, height: INITIAL_VIEWBOX_HEIGHT });
  const [historyStack, setHistoryStack] = useState<CanvasElement[][]>([[]]);
  const [historyPointer, setHistoryPointer] = useState<number>(0);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const [isDraggingElement, setIsDraggingElement] = useState<boolean>(false);
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [initialElementsPositions, setInitialElementsPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const { user } = useAuth();
  const [isLoadingWhiteboard, setIsLoadingWhiteboard] = useState(true);

  const whiteboardDocId = 'default_whiteboard'; // Or dynamically generate/select

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedIsFigmaConnected = localStorage.getItem('isFigmaConnected');
      const storedFigmaUserName = localStorage.getItem('figmaUserName');
      if (storedIsFigmaConnected === 'true' && storedFigmaUserName) {
        setIsFigmaConnected(true);
        setFigmaUserName(storedFigmaUserName);
      }
    }
  }, []);

  const singleSelectedElement = useMemo(() => {
    if (selectedElementIds.size === 1) {
      const selectedId = selectedElementIds.values().next().value;
      return elements.find(el => el.id === selectedId) || null;
    }
    return null;
  }, [elements, selectedElementIds]);

  const saveWhiteboardStateToFirestore = useCallback(async (currentElements: CanvasElement[]) => {
    if (!user) return;
    try {
      const whiteboardRef = doc(db, 'users', user.uid, 'whiteboards', whiteboardDocId);
      await setDoc(whiteboardRef, { elements: currentElements, updatedAt: Timestamp.now() });
    } catch (error) {
      console.error("Error saving whiteboard state to Firestore:", error);
      toast({ title: "Save Error", description: "Could not save whiteboard to cloud.", variant: "destructive" });
    }
  }, [user, toast]);

  const saveHistory = useCallback(() => {
    setHistoryStack(prevStack => {
      const newStack = prevStack.slice(0, historyPointer + 1);
      newStack.push(JSON.parse(JSON.stringify(elements))); 
      return newStack;
    });
    setHistoryPointer(prevPointer => prevPointer + 1);
    saveWhiteboardStateToFirestore(elements);
  }, [elements, historyPointer, saveWhiteboardStateToFirestore]);

  useEffect(() => {
    if (!user) {
      setIsLoadingWhiteboard(false);
      setElements([]); // Clear elements if user logs out
      setHistoryStack([[]]);
      setHistoryPointer(0);
      return;
    }
    setIsLoadingWhiteboard(true);
    const loadWhiteboardState = async () => {
      try {
        const whiteboardRef = doc(db, 'users', user.uid, 'whiteboards', whiteboardDocId);
        const docSnap = await getDoc(whiteboardRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setElements(data.elements || []);
          setHistoryStack([data.elements || []]); // Initialize history with loaded state
          setHistoryPointer(0);
        } else {
          setElements([]); // No existing whiteboard for this user, start fresh
          setHistoryStack([[]]);
          setHistoryPointer(0);
        }
      } catch (error) {
        console.error("Error loading whiteboard state from Firestore:", error);
        toast({ title: "Load Error", description: "Could not load whiteboard from cloud.", variant: "destructive" });
      } finally {
        setIsLoadingWhiteboard(false);
      }
    };
    loadWhiteboardState();
  }, [user, toast]);

  const handleUndo = useCallback(() => {
    if (historyPointer > 0) {
      setHistoryPointer(prevPointer => {
        const newPointer = prevPointer - 1;
        const stateToRestore = JSON.parse(JSON.stringify(historyStack[newPointer]));
        setElements(stateToRestore);
        setSelectedElementIds(new Set()); 
        saveWhiteboardStateToFirestore(stateToRestore);
        return newPointer;
      });
    }
  }, [historyPointer, historyStack, saveWhiteboardStateToFirestore]);

  const handleRedo = useCallback(() => {
    if (historyPointer < historyStack.length - 1) {
      setHistoryPointer(prevPointer => {
        const newPointer = prevPointer + 1;
        const stateToRestore = JSON.parse(JSON.stringify(historyStack[newPointer]));
        setElements(stateToRestore);
        setSelectedElementIds(new Set()); 
        saveWhiteboardStateToFirestore(stateToRestore);
        return newPointer;
      });
    }
  }, [historyPointer, historyStack, saveWhiteboardStateToFirestore]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const undoKeyPressed = (isMac ? event.metaKey : event.ctrlKey) && event.key === 'z' && !event.shiftKey;
      const redoKeyPressed = (isMac ? event.metaKey : event.ctrlKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey));

      if (undoKeyPressed) { event.preventDefault(); handleUndo(); }
      else if (redoKeyPressed) { event.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const sendDrawingAction = (actionType: string, payload: any) => {
    console.log('[Whiteboard] Sending Action:', actionType, payload);
  };
  const handleIncomingAction = (action: any) => {
    console.log('[Whiteboard] Received Action (Mock):', action);
  };

  const getSVGCoordinates = (clientX: number, clientY: number): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const CTM = canvasRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    const svgPoint = canvasRef.current.createSVGPoint();
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const { x, y } = svgPoint.matrixTransform(CTM.inverse());
    return { x, y };
  };

  const isPointInElement = (point: { x: number; y: number }, element: CanvasElement): boolean => {
    if (element.type === 'rect' || element.type === 'text' || element.type === 'image' || element.type === 'frame') {
        if (element.width === undefined || element.height === undefined) return false;
        return point.x >= element.x && point.x <= element.x + element.width &&
               point.y >= element.y && point.y <= element.y + element.height;
    }
    if (element.type === 'line' && element.points && element.points.length === 2) {
        const [p1, p2] = element.points;
        const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
            const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
            if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2); 
            let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projectionX = x1 + t * (x2 - x1);
            const projectionY = y1 + t * (y2 - y1);
            return Math.sqrt((px - projectionX) ** 2 + (py - projectionY) ** 2);
        };
        const tolerance = (element.strokeWidth || DEFAULT_STROKE_WIDTH) + 5;
        return distToSegment(point.x, point.y, p1.x, p1.y, p2.x, p2.y) < tolerance;
    }
    return false;
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = getSVGCoordinates(e.clientX, e.clientY);

    if (selectedTool === 'select') {
        let hitElement: CanvasElement | null = null;
        for (let i = elements.length - 1; i >= 0; i--) {
            if (isPointInElement({ x, y }, elements[i])) {
                hitElement = elements[i];
                break;
            }
        }

        let newSelectedIds = new Set(selectedElementIds);
        if (hitElement) {
            if (e.shiftKey) {
                if (newSelectedIds.has(hitElement.id)) {
                    newSelectedIds.delete(hitElement.id);
                } else {
                    newSelectedIds.add(hitElement.id);
                }
            } else {
                if (!newSelectedIds.has(hitElement.id)) {
                    newSelectedIds = new Set([hitElement.id]);
                }
            }
            setSelectedElementIds(newSelectedIds);
            setIsDraggingElement(true);
            setDragStartPoint({ x, y });
            const currentInitialPositions = new Map<string, { x: number; y: number }>();
            newSelectedIds.forEach(id => {
                const elToDrag = elements.find(elem => elem.id === id);
                if (elToDrag) {
                    currentInitialPositions.set(elToDrag.id, { x: elToDrag.x, y: elToDrag.y });
                }
            });
            setInitialElementsPositions(currentInitialPositions);
        } else {
            setSelectedElementIds(new Set());
            setIsDraggingElement(false);
        }
        setCurrentElement(null);
        setDrawing(false);
        return; 
    }

    if (selectedTool === 'eraser') return; 

    setDrawing(true);
    setStartPoint({ x, y });
    setSelectedElementIds(new Set());

    let newElement: CanvasElement | null = null;
    const newElementBase = {
        id: `el-${Date.now()}`, x, y, strokeColor: currentStrokeColor,
        strokeWidth: DEFAULT_STROKE_WIDTH, opacity: 1, userId: user?.uid || 'localUser',
    };

    if (selectedTool === 'rect') {
        newElement = { ...newElementBase, type: 'rect', width: 0, height: 0, fillColor: 'rgba(200, 200, 200, 0.5)' };
    } else if (selectedTool === 'frame') {
        newElement = { ...newElementBase, type: 'frame', width: 0, height: 0, fillColor: 'rgba(0, 0, 0, 0.05)' };
    } else if (selectedTool === 'line') {
        newElement = { ...newElementBase, type: 'line', points: [{x,y}, {x,y}] };
    } else if (selectedTool === 'text') {
        newElement = { ...newElementBase, type: 'text', width: 0, height: 0, text: 'Text', textColor: currentStrokeColor, fontSize: DEFAULT_FONT_SIZE };
    }

    if (newElement) {
        setCurrentElement(newElement);
        setElements(prev => [...prev, newElement!]);
        sendDrawingAction('startDrawingElement', { ...newElement }); 
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x: mouseX, y: mouseY } = getSVGCoordinates(e.clientX, e.clientY);

    if (isDraggingElement && selectedElementIds.size > 0 && dragStartPoint && initialElementsPositions.size > 0) {
        const dx = mouseX - dragStartPoint.x;
        const dy = mouseY - dragStartPoint.y;
        setElements(prevElements => prevElements.map(el => {
            if (selectedElementIds.has(el.id)) {
                const initialPos = initialElementsPositions.get(el.id);
                if (!initialPos) return el;
                const newX = initialPos.x + dx;
                const newY = initialPos.y + dy;
                if (el.type === 'line' && el.points) {
                    const updatedPoints = el.points.map(p => ({ x: p.x + dx, y: p.y + dy })); // This logic was simplified, needs to use original points + delta
                    return { ...el, x: updatedPoints[0].x, y: updatedPoints[0].y, points: updatedPoints };
                } else {
                    return { ...el, x: newX, y: newY };
                }
            }
            return el;
        }));
        sendDrawingAction('cursorMove', { x: mouseX, y: mouseY, userId: user?.uid || 'localUser', dragging: Array.from(selectedElementIds) });
        return;
    }

    if (!drawing || !startPoint || !currentElement) return;

    setElements(prevElements => prevElements.map(el => {
      if (el.id === currentElement.id) {
        if (el.type === 'rect' || el.type === 'text' || el.type === 'frame') {
          const updatedEl = {
            ...el,
            width: Math.abs(mouseX - startPoint.x),
            height: Math.abs(mouseY - startPoint.y),
            x: Math.min(mouseX, startPoint.x),
            y: Math.min(mouseY, startPoint.y),
          };
          sendDrawingAction('updateDrawingElement', { id: el.id, changes: updatedEl });
          return updatedEl;
        } else if (el.type === 'line' && el.points) {
            const updatedEl = { ...el, points: [{x: el.x, y: el.y}, {x: mouseX, y: mouseY}] };
            sendDrawingAction('updateDrawingElement', { id: el.id, changes: updatedEl });
            return updatedEl;
        }
      }
      return el;
    }));
    sendDrawingAction('cursorMove', { x: mouseX, y: mouseY, userId: user?.uid || 'localUser' }); 
  };

  const handleMouseUp = () => {
    if (isDraggingElement) {
        setIsDraggingElement(false);
        setDragStartPoint(null);
        if(selectedElementIds.size > 0) {
            let moved = false;
            selectedElementIds.forEach(id => {
                const currentEl = elements.find(e => e.id === id);
                const initialPos = initialElementsPositions.get(id);
                if (currentEl && initialPos && (currentEl.x !== initialPos.x || currentEl.y !== initialPos.y)) {
                    moved = true;
                }
            });
            if (moved) saveHistory();
        }
        sendDrawingAction('endMoveElement', { ids: Array.from(selectedElementIds) });
        return;
    }

    const elementBeingDrawn = currentElement; 
    setDrawing(false);
    setStartPoint(null);

    let actionTaken = false;
    if (selectedTool === 'text' && elementBeingDrawn) {
        const finalWidth = Math.max(elementBeingDrawn.width || 0, 80); 
        const finalHeight = Math.max(elementBeingDrawn.height || 0, (elementBeingDrawn.fontSize || DEFAULT_FONT_SIZE) * 1.5); 
        const newText = prompt("Enter text:", elementBeingDrawn.text || "New Text");
        if (newText !== null) {
            const updatedTextElement = { ...elementBeingDrawn, text: newText, width: finalWidth, height: finalHeight };
            setElements(prevElements => prevElements.map(el => el.id === elementBeingDrawn.id ? updatedTextElement : el));
            sendDrawingAction('finalizeElement', updatedTextElement);
            actionTaken = true;
        } else { 
            setElements(prevElements => prevElements.filter(el => el.id !== elementBeingDrawn.id));
            sendDrawingAction('cancelElement', { id: elementBeingDrawn.id });
        }
    } else if (elementBeingDrawn) {
        if ((elementBeingDrawn.type === 'rect' || elementBeingDrawn.type === 'frame' || elementBeingDrawn.type === 'image') &&
            ((elementBeingDrawn.width || 0) < 5 || (elementBeingDrawn.height || 0) < 5)) {
            const finalElement = { ...elementBeingDrawn, width: Math.max(elementBeingDrawn.width || 0, 10), height: Math.max(elementBeingDrawn.height || 0, 10) };
            setElements(prevElements => prevElements.map(el => el.id === elementBeingDrawn.id ? finalElement : el));
            sendDrawingAction('finalizeElement', finalElement);
        } else {
            sendDrawingAction('finalizeElement', elementBeingDrawn);
        }
        actionTaken = true;
    }

    if (actionTaken) saveHistory(); 
    setCurrentElement(null); 
  };

  const handleCreateComponent = () => {
    const currentSelectedIds = Array.from(selectedElementIds);
    if (currentSelectedIds.length === 0) {
      toast({ title: "No elements selected", description: "Please select one or more elements to create a component.", variant: "destructive" });
      return;
    }
    const componentName = prompt("Enter component name:");
    if (!componentName) return;

    if (currentSelectedIds.length === 1) {
      const selectedId = currentSelectedIds[0];
      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, isMaster: true, componentName } : el));
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.filter(el => currentSelectedIds.includes(el.id)).forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || (el.type === 'line' && el.points ? Math.abs(el.points[1].x - el.points[0].x) : 0) ));
        maxY = Math.max(maxY, el.y + (el.height || (el.type === 'line' && el.points ? Math.abs(el.points[1].y - el.points[0].y) : 0) ));
      });
      const newFrame: CanvasElement = {
        id: `comp-master-${Date.now()}`,
        type: 'frame',
        x: minX - 10, 
        y: minY - 10,
        width: (maxX - minX) + 20,
        height: (maxY - minY) + 20,
        fillColor: 'rgba(0, 100, 255, 0.05)',
        strokeColor: 'rgba(0, 100, 255, 0.5)',
        strokeWidth: 1,
        opacity: 1,
        isMaster: true,
        componentName,
        userId: user?.uid || 'localUser',
      };
      setElements(prev => [...prev, newFrame]);
      setSelectedElementIds(new Set([newFrame.id]));
    }
    toast({ title: "Component Created", description: `Component "${componentName}" (master) created.` });
    saveHistory();
  };

  const handleGroupElements = () => {
    const currentSelectedIds = Array.from(selectedElementIds);
    if (currentSelectedIds.length < 2) {
      toast({ title: "Not enough elements", description: "Select at least two elements to group.", variant: "destructive" });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.filter(el => currentSelectedIds.includes(el.id)).forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || (el.type === 'line' && el.points ? Math.abs(el.points[1].x - el.points[0].x) : 0) ));
      maxY = Math.max(maxY, el.y + (el.height || (el.type === 'line' && el.points ? Math.abs(el.points[1].y - el.points[0].y) : 0) ));
    });
    const groupFrame: CanvasElement = {
      id: `group-${Date.now()}`,
      type: 'frame',
      x: minX - 10,
      y: minY - 10,
      width: (maxX - minX) + 20,
      height: (maxY - minY) + 20,
      fillColor: 'rgba(100, 100, 100, 0.05)',
      strokeColor: '#888888',
      strokeWidth: 1,
      opacity: 1,
      isGroup: true,
      userId: user?.uid || 'localUser',
    };
    setElements(prev => [...prev, groupFrame]);
    toast({ title: "Elements Grouped", description: "A frame has been created around the selected elements." });
    saveHistory();
    setSelectedElementIds(new Set([groupFrame.id])); 
  };

  const handleUngroupElements = () => {
    if (singleSelectedElement && singleSelectedElement.type === 'frame' && singleSelectedElement.isGroup) {
      setElements(prev => prev.filter(el => el.id !== singleSelectedElement.id));
      toast({ title: "Group Ungrouped", description: `Frame "${singleSelectedElement.id}" removed.` });
      saveHistory();
      setSelectedElementIds(new Set());
    } else {
      toast({ title: "Cannot Ungroup", description: "Please select a single group frame to ungroup.", variant: "destructive" });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && canvasRef.current) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const { x: centerX, y: centerY } = getSVGCoordinates(viewBox.x + viewBox.width / 2, viewBox.y + viewBox.height / 2); 
            const img = new window.Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                let newWidth = 100; 
                let newHeight = 100 / aspectRatio;
                if (newHeight > 100) { 
                    newHeight = 100;
                    newWidth = 100 * aspectRatio;
                }
                const newElement: CanvasElement = {
                    id: `img-${Date.now()}`, type: 'image',
                    x: centerX - newWidth / 2, 
                    y: centerY - newHeight / 2,
                    width: newWidth, height: newHeight,
                    imageUrl: reader.result as string,
                    strokeColor: 'transparent', strokeWidth: 0, opacity: 1, userId: user?.uid || 'localUser',
                };
                setElements(prev => [...prev, newElement]);
                saveHistory();
                sendDrawingAction('addImageElement', newElement);
                toast({ title: "Image Added", description: "Image uploaded to canvas." });
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    }
    if (event.target) event.target.value = ''; 
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setViewBox(prev => {
      const factor = direction === 'in' ? 1 / ZOOM_STEP_FACTOR : ZOOM_STEP_FACTOR;
      const newWidth = prev.width * factor;
      const newHeight = prev.height * factor;
      const newX = prev.x + (prev.width - newWidth) / 2;
      const newY = prev.y + (prev.height - newHeight) / 2;
      sendDrawingAction('zoomAction', { type: direction, factor: ZOOM_STEP_FACTOR }); 
      return { x: newX, y: newY, width: newWidth, height: newHeight };
    });
  };

  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    setViewBox(prev => {
      let newX = prev.x;
      let newY = prev.y;
      const panAmount = PAN_STEP_AMOUNT * (prev.width / INITIAL_VIEWBOX_WIDTH);
      if (direction === 'up') newY -= panAmount;
      if (direction === 'down') newY += panAmount;
      if (direction === 'left') newX -= panAmount;
      if (direction === 'right') newX += panAmount;
      sendDrawingAction('panAction', { direction, amount: panAmount }); 
      return { ...prev, x: newX, y: newY };
    });
  };

  const handleConnectFigma = () => {
    setIsLoadingFigmaConnection(true);
    setTimeout(() => {
      const mockUser = "Mock Figma User";
      setIsFigmaConnected(true);
      setFigmaUserName(mockUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('isFigmaConnected', 'true');
        localStorage.setItem('figmaUserName', mockUser);
      }
      sendDrawingAction('userConnected', { userId: 'figmaUser', name: mockUser }); 
      setIsLoadingFigmaConnection(false);
      toast({ title: "Figma Connected", description: "Successfully linked your Figma account (simulation)." });
    }, 2000);
  };

  const handleDisconnectFigma = () => {
    setIsFigmaConnected(false);
    setFigmaUserName(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isFigmaConnected');
      localStorage.removeItem('figmaUserName');
    }
    setEmbeddedFigmaUrl(null);
    sendDrawingAction('userDisconnected', { userId: 'figmaUser' }); 
    toast({ title: "Figma Disconnected", description: "Your Figma account has been unlinked." });
  };

  const handleViewFigmaUrl = () => {
      if (!figmaFileUrl) {
          toast({ variant: "destructive", title: "URL Required", description: "Please enter a Figma file URL." });
          return;
      }
      try {
          const parsedUrl = new URL(figmaFileUrl);
          if (parsedUrl.hostname !== 'www.figma.com' && parsedUrl.hostname !== 'figma.com') {
              toast({ variant: "destructive", title: "Invalid Figma URL", description: "Please enter a URL from figma.com." }); return;
          }
          if (!figmaFileUrl.includes("/file/") && !figmaFileUrl.includes("/proto/") && !figmaFileUrl.includes("/design/")) {
               toast({ variant: "default", title: "Embedding Unusual Figma URL", description: "This URL might not be a standard Figma file/prototype/design link. Embedding may not work as expected." });
          }
      } catch (e) {
           toast({ variant: "destructive", title: "Invalid URL Format", description: "The entered text is not a valid URL." }); return;
      }
      setEmbeddedFigmaUrl(`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(figmaFileUrl)}`);
      toast({ title: "Loading Figma File", description: "Attempting to embed Figma file. Note: Embedding requires the file to have appropriate sharing permissions." });
  };

  const handleElementStyleChange = (elementId: string, newStyles: Partial<CanvasElement>) => {
    setElements(prevElements =>
      prevElements.map(el =>
        el.id === elementId ? { ...el, ...newStyles, opacity: newStyles.opacity ?? el.opacity } : el
      )
    );
    saveHistory(); 
    sendDrawingAction('styleElement', { id: elementId, changes: newStyles });
  };

  if (isLoadingWhiteboard) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow lg:w-3/4">
          <Card className="shadow-xl h-full flex flex-col">
            <CardHeader className="px-2 py-4 md:px-6">
              <CardTitle className="text-primary flex items-center"><Palette className="mr-3 h-6 w-6 text-accent" /> Collaborative Whiteboard</CardTitle>
              <CardDescription>Design prototypes, wireframes, and diagrams. (Multi-select &amp; Group Move functional. Basic styling and component/group operations implemented. Undo/Redo active.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow flex flex-col w-full p-0">
              <div className="flex flex-wrap gap-2 p-2 border-b rounded-t-lg bg-muted/30 items-center">
                <Button variant={selectedTool === 'select' ? "default" : "outline"} size="icon" title="Select" onClick={() => setSelectedTool('select')}><MousePointer2 className="h-5 w-5" /></Button>
                <Button variant={selectedTool === 'rect' ? "default" : "outline"} size="icon" title="Rectangle" onClick={() => setSelectedTool('rect')}><Square className="h-5 w-5" /></Button>
                <Button variant={selectedTool === 'line' ? "default" : "outline"} size="icon" title="Line" onClick={() => setSelectedTool('line')}><Move className="h-5 w-5 rotate-45" /></Button>
                <Button variant={selectedTool === 'text' ? "default" : "outline"} size="icon" title="Text" onClick={() => setSelectedTool('text')}><Type className="h-5 w-5" /></Button>
                <Button variant={selectedTool === 'frame' ? "default" : "outline"} size="icon" title="Frame" onClick={() => setSelectedTool('frame')}><FrameIcon className="h-5 w-5" /></Button>
                <input type="color" value={currentStrokeColor} onChange={(e) => setCurrentStrokeColor(e.target.value)} className="h-9 w-9 p-1 border rounded-md cursor-pointer" title="Stroke Color"/>
                <Button asChild variant="outline" size="icon" title="Upload Image"><label htmlFor="image-upload-whiteboard" className="cursor-pointer flex items-center justify-center h-9 w-9"><ImageIconLucide className="h-5 w-5" /><input id="image-upload-whiteboard" type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/></label></Button>
                <Button variant="outline" size="icon" title="Eraser (TBD)" onClick={() => setSelectedTool('eraser')} disabled><Eraser className="h-5 w-5" /></Button>
                <div className="mx-1 border-l h-6"></div> 
                 <Button variant="outline" size="icon" title="Create Component" onClick={handleCreateComponent} disabled={selectedElementIds.size === 0}><Component className="h-5 w-5"/></Button>
                 <Button variant="outline" size="icon" title="Group Elements" onClick={handleGroupElements} disabled={selectedElementIds.size < 2}><Group className="h-5 w-5"/></Button>
                 <Button variant="outline" size="icon" title="Ungroup Elements" onClick={handleUngroupElements} disabled={!(singleSelectedElement && singleSelectedElement.type === 'frame' && singleSelectedElement.isGroup)}><Ungroup className="h-5 w-5"/></Button>
                 <div className="mx-1 border-l h-6"></div> 
                <div className="flex-grow"></div> 
                <Button variant="outline" size="icon" title="Pan Left" onClick={() => handlePan('left')}><ArrowLeft className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Pan Right" onClick={() => handlePan('right')}><ArrowRight className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Pan Up" onClick={() => handlePan('up')}><ArrowUp className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Pan Down" onClick={() => handlePan('down')}><ArrowDown className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Zoom In" onClick={() => handleZoom('in')}><ZoomIn className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Zoom Out" onClick={() => handleZoom('out')}><ZoomOut className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Undo Canvas (Ctrl+Z)" onClick={handleUndo} disabled={historyPointer === 0}><Undo className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Redo Canvas (Ctrl+Y)" onClick={handleRedo} disabled={historyPointer === historyStack.length - 1}><Redo className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon" title="Present Prototype (TBD)" disabled><Play className="h-5 w-5"/></Button>
                <Button variant="outline" size="icon" title="Export Canvas (TBD)" disabled><DownloadCloud className="h-5 w-5" /></Button>
              </div>
              <div className="w-full h-[600px] border-t border-b border-border bg-white rounded-b-lg overflow-hidden flex-grow">
                 <svg
                    ref={canvasRef}
                    width="100%"
                    height="100%"
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp} 
                    className="cursor-crosshair select-none" 
                 >
                    <defs>
                        <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                            <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="hsl(var(--border))" strokeOpacity="0.5" strokeWidth="0.5"/>
                        </pattern>
                    </defs>
                    <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#grid)" />
                    {elements.map(el => {
                        const isSelected = selectedElementIds.has(el.id);
                        const selectionStrokeScale = Math.sqrt(viewBox.width / INITIAL_VIEWBOX_WIDTH); 
                        const highlightStrokeWidth = SELECTED_STROKE_WIDTH / selectionStrokeScale;
                        const baseStrokeWidth = el.strokeWidth ?? DEFAULT_STROKE_WIDTH; 
                        const displayStrokeWidth = isSelected ? Math.max(baseStrokeWidth, highlightStrokeWidth * 0.75) : baseStrokeWidth; 
                        const displayStrokeColor = isSelected ? SELECTED_STROKE_COLOR : el.strokeColor;
                        let masterComponentIndicator = null;
                        if (el.isMaster) {
                            masterComponentIndicator = (
                                <rect 
                                    x={el.x - 5 / selectionStrokeScale} 
                                    y={el.y - 5 / selectionStrokeScale} 
                                    width={(el.width || 0) + 10 / selectionStrokeScale} 
                                    height={(el.height || 0) + 10 / selectionStrokeScale}
                                    fill="none"
                                    stroke="purple" 
                                    strokeWidth={2 / selectionStrokeScale}
                                    strokeDasharray={`${4 / selectionStrokeScale} ${2 / selectionStrokeScale}`}
                                />
                            );
                        }
                        if (el.type === 'rect') {
                            return <g key={el.id}>{masterComponentIndicator}<rect x={el.x} y={el.y} width={el.width} height={el.height} fill={el.fillColor || 'transparent'} stroke={displayStrokeColor} strokeWidth={displayStrokeWidth} opacity={el.opacity}/></g>
                        }
                        if (el.type === 'frame') {
                             const frameStrokeDashArray = el.isMaster ? "6 3" : (el.isGroup ? "4 2" : "none"); 
                            return <g key={el.id}>{masterComponentIndicator}<rect x={el.x} y={el.y} width={el.width} height={el.height} fill={el.fillColor || 'rgba(0,0,0,0.05)'} stroke={displayStrokeColor} strokeWidth={displayStrokeWidth} strokeDasharray={isSelected ? "none" : frameStrokeDashArray} opacity={el.opacity}/></g>
                        }
                        if (el.type === 'text' && el.text && el.width != null && el.height != null) {
                            const fontSize = (el.fontSize || DEFAULT_FONT_SIZE);
                             return (
                                <g key={el.id} opacity={el.opacity}>
                                     {masterComponentIndicator}
                                     <foreignObject x={el.x} y={el.y} width={Math.max(el.width || 0, 20)} height={Math.max(el.height || 0, 20)} opacity={el.opacity}>
                                        <div xmlns="http://www.w3.org/1999/xhtml" style={{
                                            color: el.textColor || el.strokeColor, 
                                            fontSize: `${fontSize}px`,
                                            width: '100%', height: '100%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden', wordBreak: 'break-word', textAlign: 'center',
                                            boxSizing: 'border-box'
                                        }}>
                                          {el.text}
                                        </div>
                                    </foreignObject>
                                    {isSelected && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="none" stroke={SELECTED_STROKE_COLOR} strokeWidth={highlightStrokeWidth} strokeDasharray="3 3" />}
                                 </g>
                            );
                        }
                        if (el.type === 'line' && el.points && el.points.length === 2) {
                             return <g key={el.id}>{masterComponentIndicator}<line x1={el.points[0].x} y1={el.points[0].y} x2={el.points[1].x} y2={el.points[1].y} stroke={displayStrokeColor} strokeWidth={displayStrokeWidth} opacity={el.opacity} /></g>;
                        }
                        if (el.type === 'image' && el.imageUrl && el.width && el.height) {
                            return (
                                 <g key={el.id} opacity={el.opacity}>
                                    {masterComponentIndicator}
                                    <image href={el.imageUrl} x={el.x} y={el.y} width={el.width} height={el.height} />
                                    {isSelected && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="none" stroke={SELECTED_STROKE_COLOR} strokeWidth={highlightStrokeWidth} strokeDasharray="3 3" />}
                                 </g>
                            );
                        }
                        return null;
                    })}
                 </svg>
              </div>
            </CardContent>
            <CardFooter className="px-2 py-2 md:px-6 md:py-4 border-t">
                <p className="text-xs text-muted-foreground">
                    Multi-select &amp; group move functional. Basic styling for selected elements available. Undo/Redo functional. Component &amp; Grouping operations implemented. Advanced features (instancing, overrides, auto-layout, advanced export) are TBD. Data saved to Firestore.
                </p>
            </CardFooter>
          </Card>
        </div>
        <div className="lg:w-1/4 space-y-6">
            {singleSelectedElement && (
                <StyleEditorPanel
                    element={singleSelectedElement}
                    onStyleChange={(elementId, newStyles) => handleElementStyleChange(elementId, newStyles)}
                />
            )}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><LinkIconLucide className="mr-2 h-5 w-5 text-accent"/>Connect Figma Account</CardTitle>
             <CardDescription>{isFigmaConnected ? `Your Figma account is linked. You can now proceed to view your designs or disconnect.` : `Securely link your Figma account to access your design files and projects.`}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center text-center py-10 space-y-4">
             {isLoadingFigmaConnection ? (
                 <Loader2 className="h-16 w-16 text-accent animate-spin mb-4"/>
             ) : isFigmaConnected ? (
                <><FigmaIcon /><p className="font-semibold text-foreground">Connected as: {figmaUserName || "Figma User"}</p><Button onClick={handleDisconnectFigma} variant="destructive" className="w-full max-w-xs"><LogOut className="mr-2 h-4 w-4" /> Disconnect Figma</Button></>
             ) : (
                <><Layers className="h-16 w-16 text-muted-foreground mb-4" /><p className="text-muted-foreground">Figma connection wizard is under development (simulation).</p><Button onClick={handleConnectFigma} className="w-full max-w-xs"><FigmaIcon/> <span className="ml-2">Connect to Figma (Simulate)</span></Button><Image data-ai-hint="api key" src="https://placehold.co/400x200.png" alt="Figma connect placeholder" width={400} height={200} className="rounded-lg mt-6 shadow-sm" /></>
             )}
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center"><Layers className="mr-2 h-5 w-5 text-accent"/>View & Compare Designs</CardTitle>
             <CardDescription>{isFigmaConnected ? "Browse linked Figma files, or enter a Figma file URL below to view designs and compare with live implementation." : "Link your Figma account, or enter a Figma file URL below, to enable design viewing and comparison features."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Label htmlFor="figma-file-url">Figma File URL</Label><Input id="figma-file-url" type="url" placeholder="https://www.figma.com/file/your-file-key/File-Name" value={figmaFileUrl} onChange={(e) => setFigmaFileUrl(e.target.value)}/></div>
            <Button onClick={handleViewFigmaUrl} className="w-full"><Eye className="mr-2 h-4 w-4" /> View File by URL</Button>
            {embeddedFigmaUrl && (<div className="mt-4 border-t pt-4"><h3 className="font-semibold text-foreground mb-2">Embedded Figma File (Placeholder)</h3><div className="bg-muted rounded-lg p-4 min-h-[300px] flex items-center justify-center"><p className="text-muted-foreground text-center">Figma file embedding is a complex feature and requires proper integration.<br />This area would display the embedded content from: <br /><a href={figmaFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{figmaFileUrl}</a></p></div></div>)}
            {!embeddedFigmaUrl && (<div className="flex flex-col items-center justify-center text-center py-10 pt-6 border-t"><Layers className="h-16 w-16 text-muted-foreground mb-4" /><p className="text-muted-foreground">{isFigmaConnected ? "Or, browse files from your connected account (TBD)." : "Enter a Figma URL above to view."}</p><Image src="https://placehold.co/400x200.png" alt="Figma view placeholder" width={400} height={200} className="rounded-lg mt-6 shadow-sm" data-ai-hint="design layers"/></div>)}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6 shadow-lg">
        <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2"><FigmaIcon /> Figma Integration & Whiteboarding</CardTitle>
            <CardDescription>Bridging the gap between design and development, with creative tools!</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center py-12">
            <div className="flex items-center justify-center gap-6 mb-6"><Palette className="h-20 w-20 text-accent" /><FigmaIcon /></div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Seamless Design Workflow &amp; Creation Tools</h2>
            <p className="text-muted-foreground max-w-md">This module provides a collaborative whiteboarding space with foundational design tools, along with options to integrate with your existing Figma designs for a streamlined design-to-development process.</p>
        </CardContent>
      </Card>
    </div>
  );
}
