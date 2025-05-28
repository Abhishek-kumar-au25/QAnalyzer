// src/components/feature/automation/script-editor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label';
import { Save, XCircle, FileText } from 'lucide-react'; // Changed icon for title

interface Script {
  id: string;
  name: string;
  description: string;
  content: string;
}

interface ScriptEditorProps {
  script: Script;
  onSave: (updatedScript: Script) => void;
  onCancel: () => void;
}

export default function ScriptEditor({ script, onSave, onCancel }: ScriptEditorProps) {
  const [editedContent, setEditedContent] = useState(script.content);
  const [editedName, setEditedName] = useState(script.name);
  const [editedDescription, setEditedDescription] = useState(script.description);

  useEffect(() => {
    setEditedName(script.name);
    setEditedDescription(script.description);
    setEditedContent(script.content);
  }, [script]);

  const handleSaveClick = () => {
    const updatedScript: Script = {
      ...script,
      name: editedName,
      description: editedDescription,
      content: editedContent,
    };
    onSave(updatedScript);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-primary flex items-center">
            <FileText className="mr-2 h-5 w-5 text-accent" /> {/* Changed Icon */}
            Edit Script: {editedName}
        </CardTitle>
        <CardDescription>Modify the script details and content below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="script-name">Script Name</Label>
            <Input
                id="script-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter script name"
            />
        </div>
         <div className="space-y-2">
            <Label htmlFor="script-description">Description</Label>
            <Input
                id="script-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Enter script description"
            />
        </div>

        <div className="space-y-2">
           <Label htmlFor="script-content">Script Content</Label>
            <Textarea
                id="script-content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="// Enter your script commands here..."
                className="min-h-[400px] font-mono text-sm resize-y bg-muted/20 border"
            />
             <p className="text-xs text-muted-foreground">Note: This is a basic editor. Advanced syntax highlighting and IntelliSense require integration with a dedicated code editor component (e.g., Monaco Editor).</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
           <XCircle className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button onClick={handleSaveClick}>
           <Save className="mr-2 h-4 w-4" /> Save Script
        </Button>
      </CardFooter>
    </Card>
  );
}
