// src/components/feature/automation/feature-file-editor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, XCircle, FileCode } from 'lucide-react';

interface FeatureFile {
  id: string;
  name: string;
  content: string;
}

interface FeatureFileEditorProps {
  featureFile: FeatureFile;
  onSave: (updatedFeatureFile: FeatureFile) => void;
  onCancel: () => void;
}

export default function FeatureFileEditor({ featureFile, onSave, onCancel }: FeatureFileEditorProps) {
  const [editedName, setEditedName] = useState(featureFile.name);
  const [editedContent, setEditedContent] = useState(featureFile.content);

  useEffect(() => {
    setEditedName(featureFile.name);
    setEditedContent(featureFile.content);
  }, [featureFile]);

  const handleSaveClick = () => {
    const updatedFeatureFile: FeatureFile = {
      ...featureFile,
      name: editedName,
      content: editedContent,
    };
    onSave(updatedFeatureFile);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-primary flex items-center">
          <FileCode className="mr-2 h-5 w-5 text-accent" />
          Edit Feature File: {editedName}
        </CardTitle>
        <CardDescription>Modify the feature file name and Gherkin content below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="feature-file-name">Feature File Name</Label>
          <Input
            id="feature-file-name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            placeholder="e.g., login.feature or user-registration.feature"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feature-file-content">Feature Content (Gherkin)</Label>
          <Textarea
            id="feature-file-content"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder={`Feature: Brief description of the feature
  Scenario: A specific scenario
    Given some precondition
    When an action is performed
    Then an outcome is expected`}
            className="min-h-[400px] font-mono text-sm resize-y bg-muted/20 border"
          />
          <p className="text-xs text-muted-foreground">
            Use Gherkin syntax (Feature, Scenario, Given, When, Then, And, But).
            Advanced syntax highlighting requires integration with a dedicated code editor component.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <XCircle className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button onClick={handleSaveClick}>
          <Save className="mr-2 h-4 w-4" /> Save Feature File
        </Button>
      </CardFooter>
    </Card>
  );
}
