
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider"; 
import type { CanvasElement } from '@/app/(app)/figma-integration/page'; 
import { Palette, Link as LinkIconLucide } from 'lucide-react'; // Added LinkIconLucide
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'; // Import Select components

interface StyleEditorPanelProps {
  element: CanvasElement | null;
  onStyleChange: (elementId: string, newStyles: Partial<CanvasElement>) => void;
}

const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_FONT_SIZE = 16;

export default function StyleEditorPanel({ element, onStyleChange }: StyleEditorPanelProps) {
  if (!element) {
    return null;
  }

  const handleInputChange = (styleKey: keyof CanvasElement, value: any) => {
    let processedValue = value;
    if (styleKey === 'opacity' || styleKey === 'strokeWidth' || styleKey === 'fontSize') {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) {
        if (styleKey === 'opacity') processedValue = 1;
        else if (styleKey === 'strokeWidth') processedValue = DEFAULT_STROKE_WIDTH;
        else if (styleKey === 'fontSize') processedValue = DEFAULT_FONT_SIZE;
      }
    }
    onStyleChange(element.id, { [styleKey]: processedValue });
  };

  const commonStyles = (
    <>
      <div className="space-y-1">
        <Label htmlFor={`opacity-${element.id}`} className="text-xs">Opacity</Label>
        <div className="flex items-center gap-2">
            <Slider
                id={`opacity-${element.id}`}
                min={0}
                max={1}
                step={0.05}
                value={[element.opacity]}
                onValueChange={(val) => handleInputChange('opacity', val[0])}
                className="flex-grow"
            />
            <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={element.opacity}
                onChange={(e) => handleInputChange('opacity', e.target.value)}
                className="w-16 h-8 text-xs p-1"
            />
        </div>
      </div>
    </>
  );

  const shapeStyles = (
    <>
      <div className="space-y-1">
        <Label htmlFor={`fillColor-${element.id}`} className="text-xs">Fill Color</Label>
        <Input
          id={`fillColor-${element.id}`}
          type="color"
          value={element.fillColor || '#ffffff'}
          onChange={(e) => handleInputChange('fillColor', e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`strokeColor-${element.id}`} className="text-xs">Stroke Color</Label>
        <Input
          id={`strokeColor-${element.id}`}
          type="color"
          value={element.strokeColor || '#000000'}
          onChange={(e) => handleInputChange('strokeColor', e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`strokeWidth-${element.id}`} className="text-xs">Stroke Width (px)</Label>
        <Input
          id={`strokeWidth-${element.id}`}
          type="number"
          min={0}
          value={element.strokeWidth ?? DEFAULT_STROKE_WIDTH}
          onChange={(e) => handleInputChange('strokeWidth', e.target.value)}
          className="h-8"
        />
      </div>
    </>
  );

  const textStyles = (
    <>
      <div className="space-y-1">
        <Label htmlFor={`textColor-${element.id}`} className="text-xs">Text Color</Label>
        <Input
          id={`textColor-${element.id}`}
          type="color"
          value={element.textColor || element.strokeColor || '#000000'} // Fallback logic
          onChange={(e) => handleInputChange('textColor', e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`fontSize-${element.id}`} className="text-xs">Font Size (px)</Label>
        <Input
          id={`fontSize-${element.id}`}
          type="number"
          min={1}
          value={element.fontSize || DEFAULT_FONT_SIZE}
          onChange={(e) => handleInputChange('fontSize', e.target.value)}
          className="h-8"
        />
      </div>
    </>
  );

   const lineStyles = (
    <>
      <div className="space-y-1">
        <Label htmlFor={`strokeColor-${element.id}`} className="text-xs">Line Color</Label>
        <Input
          id={`strokeColor-${element.id}`}
          type="color"
          value={element.strokeColor || '#000000'}
          onChange={(e) => handleInputChange('strokeColor', e.target.value)}
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`strokeWidth-${element.id}`} className="text-xs">Line Width (px)</Label>
        <Input
          id={`strokeWidth-${element.id}`}
          type="number"
          min={0}
          value={element.strokeWidth ?? DEFAULT_STROKE_WIDTH}
          onChange={(e) => handleInputChange('strokeWidth', e.target.value)}
          className="h-8"
        />
      </div>
    </>
  );

  const framePrototypingStyles = (
    <div className="space-y-3 pt-3 border-t mt-3">
        <h5 className="text-xs font-semibold text-muted-foreground flex items-center"><LinkIconLucide size={14} className="mr-1.5"/>Prototyping</h5>
         <div className="space-y-1">
            <Label htmlFor={`linkToFrameId-${element.id}`} className="text-xs">Link to Frame ID</Label>
            <Input
            id={`linkToFrameId-${element.id}`}
            type="text"
            placeholder="Enter Frame ID (e.g., frame-123)"
            value={element.linkToFrameId || ''}
            onChange={(e) => handleInputChange('linkToFrameId', e.target.value)}
            className="h-8 text-xs"
            />
        </div>
        <div className="space-y-1">
            <Label htmlFor={`interactionType-${element.id}`} className="text-xs">Interaction Type</Label>
            <Select
                value={element.interactionType || 'onClick'}
                onValueChange={(value) => handleInputChange('interactionType', value as CanvasElement['interactionType'])}
            >
                <SelectTrigger id={`interactionType-${element.id}`} className="h-8 text-xs">
                    <SelectValue placeholder="Select interaction" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="onClick">On Click</SelectItem>
                    <SelectItem value="onHover" disabled>On Hover (TBD)</SelectItem>
                    <SelectItem value="onDrag" disabled>On Drag (TBD)</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
  );


  return (
    <Card className="shadow-md sticky top-6">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base text-primary flex items-center">
            <Palette size={18} className="mr-2 text-accent" />
            Element Styles
        </CardTitle>
        <CardDescription className="text-xs">Selected: {element.type} ({element.id.slice(-6)})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm p-4 max-h-[calc(100vh-200px)] overflow-y-auto"> {/* Added max-height and overflow */}
        {element.type === 'rect' && shapeStyles}
        {element.type === 'frame' && shapeStyles}
        {element.type === 'line' && lineStyles}
        {element.type === 'text' && textStyles}
        {/* Image only has common styles for now */}
        {commonStyles}

        {element.type === 'frame' && framePrototypingStyles}
      </CardContent>
    </Card>
  );
}

