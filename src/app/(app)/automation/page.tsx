
// src/app/(app)/automation/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, FileText, PlayCircle, PlusCircle, Construction, Pencil, FileCode, Edit, Eraser, Trash2, Download, Loader2 as LottieLoader } from "lucide-react";
import LottiePlayer from 'react-lottie-player';
import ScriptEditor from '@/components/feature/automation/script-editor';
import FeatureFileEditor from '@/components/feature/automation/feature-file-editor';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { db } from '@/lib/firebase/firebase.config';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface Script {
  id: string;
  name: string;
  description: string;
  content: string;
  userId?: string; // For Firestore
  createdAt?: Timestamp; // For Firestore
}

interface FeatureFile {
  id: string;
  name: string;
  content: string;
  userId?: string; // For Firestore
  createdAt?: Timestamp; // For Firestore
}

const lottieAnimationUrl = 'https://lottie.host/1f9a81be-97b8-4996-8879-224560f75e50/c3h22809YJ.json';

export default function AutomationPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [featureFiles, setFeatureFiles] = useState<FeatureFile[]>([]);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [editingFeatureFile, setEditingFeatureFile] = useState<FeatureFile | null>(null);
  const [runningScriptId, setRunningScriptId] = useState<string | null>(null);
  const [runningFeatureFileId, setRunningFeatureFileId] = useState<string | null>(null);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const { toast } = useToast();
  const [scriptToDelete, setScriptToDelete] = useState<Script | null>(null);
  const [showDeleteScriptConfirm, setShowDeleteScriptConfirm] = useState(false);
  const [featureFileToDelete, setFeatureFileToDelete] = useState<FeatureFile | null>(null);
  const [showDeleteFeatureFileConfirm, setShowDeleteFeatureFileConfirm] = useState(false);
  const [lottieAnimationData, setLottieAnimationData] = useState(null);
  const { user } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);


  useEffect(() => {
    fetch(lottieAnimationUrl)
      .then(response => response.json())
      .then(data => setLottieAnimationData(data))
      .catch(error => console.error('Error fetching Lottie animation:', error));
  }, []);

  // Fetch data from Firestore
  useEffect(() => {
    if (!user) {
      setIsLoadingData(false);
      setScripts([]); // Clear scripts if user logs out
      setFeatureFiles([]); // Clear feature files if user logs out
      return;
    }
    setIsLoadingData(true);
    const fetchAutomationData = async () => {
      try {
        // Fetch Scripts
        const scriptsQuery = query(collection(db, 'users', user.uid, 'automation_scripts'), orderBy('createdAt', 'desc'), limit(50));
        const scriptsSnapshot = await getDocs(scriptsQuery);
        const fetchedScripts: Script[] = scriptsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Script));
        setScripts(fetchedScripts);

        // Fetch Feature Files
        const featuresQuery = query(collection(db, 'users', user.uid, 'feature_files'), orderBy('createdAt', 'desc'), limit(50));
        const featuresSnapshot = await getDocs(featuresQuery);
        const fetchedFeatureFiles: FeatureFile[] = featuresSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as FeatureFile));
        setFeatureFiles(fetchedFeatureFiles);
      } catch (error) {
        console.error("Error fetching automation data:", error);
        toast({ title: "Error Loading Data", description: "Could not load automation scripts or feature files.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchAutomationData();
  }, [user, toast]);


  const addLog = (message: string) => {
    setScriptLogs(prevLogs => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prevLogs]);
  };

  const clearLogs = () => {
    setScriptLogs([]);
    toast({ title: "Logs Cleared", description: "Execution logs have been cleared." });
  };

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setEditingFeatureFile(null);
  };

  const handleRunScript = (script: Script) => {
    setRunningScriptId(script.id);
    addLog(`Simulating run for script: "${script.name}" (ID: ${script.id})`);
    toast({
      title: "Simulating Script Run",
      description: `Running "${script.name}"... This is a simulation.`,
    });

    setTimeout(() => {
      const success = Math.random() > 0.3;
      if (success) {
        addLog(`Simulation for script "${script.name}" completed successfully.`);
        addLog(`Log output: Navigated to /login.`);
        addLog(`Log output: Filled email field.`);
        addLog(`Log output: Filled password field.`);
        addLog(`Log output: Clicked login button.`);
        addLog(`Log output: Asserted dashboard welcome message.`);
        addLog(`Login test successful! (from script content)`);
        toast({
          title: "Script Run Successful (Simulated)",
          description: `"${script.name}" completed successfully. Check logs for details.`,
        });
      } else {
        addLog(`Simulation for script "${script.name}" failed.`);
        addLog(`ERROR: Could not find element '#login-button' (Simulated).`);
        toast({
          title: "Script Run Failed (Simulated)",
          description: `"${script.name}" encountered an error during simulation. Check logs.`,
          variant: "destructive",
        });
        console.error(`Simulation for script "${script.name}" failed.`);
      }
      setRunningScriptId(null);
    }, 3000);
  };

  const handleCreateNewScript = () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to create scripts.", variant: "destructive" });
      return;
    }
    const newScriptPlaceholder: Script = { // This is a placeholder, actual ID and createdAt set on save
      id: `temp-${Date.now()}`,
      name: "New Automation Script",
      description: "A new script to automate tasks.",
      content: `// Start writing your automation script here\n// Example: navigate_to('/home');\n// log('Script execution started.');`,
      userId: user.uid,
    };
    setEditingScript(newScriptPlaceholder);
    setEditingFeatureFile(null);
    addLog(`Opened editor for new script.`);
  };

   const handleSaveScript = async (scriptToSave: Script) => {
     if (!user) {
       toast({ title: "Save Failed", description: "You must be logged in to save scripts.", variant: "destructive" });
       return;
     }
     try {
       if (scriptToSave.id.startsWith('temp-')) { // New script
         const { id, ...scriptData } = scriptToSave; // Exclude temp id
         const docRef = await addDoc(collection(db, 'users', user.uid, 'automation_scripts'), {
           ...scriptData,
           userId: user.uid,
           createdAt: Timestamp.now(),
         });
         setScripts(prev => [{ ...scriptToSave, id: docRef.id, createdAt: Timestamp.now() }, ...prev]);
         addLog(`Created new script: "${scriptToSave.name}"`);
         toast({ title: "Script Created", description: `"${scriptToSave.name}" has been saved.` });
       } else { // Existing script
         const scriptRef = doc(db, 'users', user.uid, 'automation_scripts', scriptToSave.id);
         await updateDoc(scriptRef, { ...scriptToSave, updatedAt: Timestamp.now() });
         setScripts(prev => prev.map(s => s.id === scriptToSave.id ? { ...scriptToSave, updatedAt: Timestamp.now() } as Script : s));
         addLog(`Updated script: "${scriptToSave.name}"`);
         toast({ title: "Script Updated", description: `"${scriptToSave.name}" has been updated.` });
       }
     } catch (error) {
       console.error("Error saving script:", error);
       toast({ title: "Save Failed", description: "Could not save the script.", variant: "destructive" });
     }
     setEditingScript(null);
  };

  const handleDeleteScriptClick = (script: Script) => {
    setScriptToDelete(script);
    setShowDeleteScriptConfirm(true);
  };

  const confirmDeleteScript = async () => {
    if (scriptToDelete && user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'automation_scripts', scriptToDelete.id));
        setScripts(prevScripts => prevScripts.filter(s => s.id !== scriptToDelete.id));
        addLog(`Deleted script: "${scriptToDelete.name}" (ID: ${scriptToDelete.id})`);
        toast({ title: "Script Deleted", description: `"${scriptToDelete.name}" has been deleted.` });
      } catch (error) {
        console.error("Error deleting script:", error);
        toast({ title: "Delete Failed", description: "Could not delete the script.", variant: "destructive" });
      }
      setScriptToDelete(null);
    }
    setShowDeleteScriptConfirm(false);
  };

  const handleEditFeatureFile = (featureFile: FeatureFile) => {
    setEditingFeatureFile(featureFile);
    setEditingScript(null);
  };

  const handleCreateNewFeatureFile = () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to create feature files.", variant: "destructive" });
      return;
    }
    const newFeatureFilePlaceholder: FeatureFile = {
      id: `temp-feat-${Date.now()}`,
      name: "New Feature File",
      content: `Feature: New Feature Description\n  As a user\n  I want to ...\n  So that ...\n\n  Scenario: Example Scenario\n    Given a precondition\n    When an action occurs\n    Then an outcome is expected\n`,
      userId: user.uid,
    };
    setEditingFeatureFile(newFeatureFilePlaceholder);
    setEditingScript(null);
    addLog(`Opened editor for new feature file.`);
  };

  const handleSaveFeatureFile = async (fileToSave: FeatureFile) => {
    if (!user) {
      toast({ title: "Save Failed", description: "You must be logged in to save feature files.", variant: "destructive" });
      return;
    }
    try {
      if (fileToSave.id.startsWith('temp-feat-')) { // New feature file
        const { id, ...fileData } = fileToSave;
        const docRef = await addDoc(collection(db, 'users', user.uid, 'feature_files'), {
          ...fileData,
          userId: user.uid,
          createdAt: Timestamp.now(),
        });
        setFeatureFiles(prev => [{ ...fileToSave, id: docRef.id, createdAt: Timestamp.now() }, ...prev]);
        addLog(`Created new feature file: "${fileToSave.name}"`);
        toast({ title: "Feature File Created", description: `"${fileToSave.name}" has been saved.` });
      } else { // Existing feature file
        const fileRef = doc(db, 'users', user.uid, 'feature_files', fileToSave.id);
        await updateDoc(fileRef, { ...fileToSave, updatedAt: Timestamp.now() });
        setFeatureFiles(prev => prev.map(f => f.id === fileToSave.id ? { ...fileToSave, updatedAt: Timestamp.now() } as FeatureFile : f));
        addLog(`Updated feature file: "${fileToSave.name}"`);
        toast({ title: "Feature File Updated", description: `"${fileToSave.name}" has been updated.` });
      }
    } catch (error) {
      console.error("Error saving feature file:", error);
      toast({ title: "Save Failed", description: "Could not save the feature file.", variant: "destructive" });
    }
    setEditingFeatureFile(null);
  };

  const handleDeleteFeatureFileClick = (featureFile: FeatureFile) => {
    setFeatureFileToDelete(featureFile);
    setShowDeleteFeatureFileConfirm(true);
  };

  const confirmDeleteFeatureFile = async () => {
    if (featureFileToDelete && user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'feature_files', featureFileToDelete.id));
        setFeatureFiles(prevFiles => prevFiles.filter(f => f.id !== featureFileToDelete.id));
        addLog(`Deleted feature file: "${featureFileToDelete.name}" (ID: ${featureFileToDelete.id})`);
        toast({ title: "Feature File Deleted", description: `"${featureFileToDelete.name}" has been deleted.` });
      } catch (error) {
        console.error("Error deleting feature file:", error);
        toast({ title: "Delete Failed", description: "Could not delete the feature file.", variant: "destructive" });
      }
      setFeatureFileToDelete(null);
    }
    setShowDeleteFeatureFileConfirm(false);
  };

  const handleRunFeatureFile = (featureFile: FeatureFile) => {
    setRunningFeatureFileId(featureFile.id);
    addLog(`Simulating Cypress run for feature file: "${featureFile.name}" (ID: ${featureFile.id})`);
    toast({
      title: "Simulating Feature File Run",
      description: `Running "${featureFile.name}" with Cypress (simulation)...`,
    });

    setTimeout(() => {
       const success = Math.random() > 0.2;
      if (success) {
        addLog(`Cypress simulation for "${featureFile.name}" completed successfully.`);
        addLog(`Scenario "Successful login with valid credentials" - PASSED`);
        addLog(`Scenario "Failed login with invalid credentials" - PASSED`);
        toast({
          title: "Feature File Run Successful (Simulated)",
          description: `"${featureFile.name}" completed successfully with Cypress. Check logs.`,
        });
      } else {
        addLog(`Cypress simulation for "${featureFile.name}" failed.`);
        addLog(`Scenario "Successful login with valid credentials" - PASSED`);
        addLog(`Scenario "Failed login with invalid credentials" - FAILED: Expected error message "Invalid email or password." but not found.`);
        toast({
          title: "Feature File Run Failed (Simulated)",
          description: `"${featureFile.name}" encountered an error during Cypress simulation. Check logs.`,
          variant: "destructive",
        });
      }
      setRunningFeatureFileId(null);
    }, 4000);
  };

  const downloadFile = (content: string, filename: string, type: 'text/plain' | 'application/pdf') => {
    if (type === 'application/pdf') {
      const pdf = new jsPDF();
      const lines = pdf.splitTextToSize(content, pdf.internal.pageSize.getWidth() - 20);
      pdf.text(lines, 10, 10);
      pdf.save(filename);
    } else {
      const blob = new Blob([content], { type });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
    toast({ title: "Download Started", description: `${filename} is downloading.` });
  };

  const handleDownloadScript = (script: Script, format: 'txt' | 'pdf') => {
    const filename = `${script.name.replace(/ /g, '_')}_${script.id}.${format}`;
    downloadFile(script.content, filename, format === 'pdf' ? 'application/pdf' : 'text/plain');
  };

  const handleDownloadFeatureFile = (featureFile: FeatureFile, format: 'txt' | 'pdf') => {
    const filename = `${featureFile.name.replace(/ /g, '_')}_${featureFile.id}.${format}`;
    downloadFile(featureFile.content, filename, format === 'pdf' ? 'application/pdf' : 'text/plain');
  };

  const handleDownloadLogs = (formatType: 'txt' | 'pdf') => {
    if (scriptLogs.length === 0) {
      toast({ title: "No Logs", description: "There are no logs to download.", variant: "destructive" });
      return;
    }
    const logContent = scriptLogs.slice().reverse().join('\n');
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `ExecutionLogs_${timestamp}.${formatType}`;
    downloadFile(logContent, filename, formatType === 'pdf' ? 'application/pdf' : 'text/plain');
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center h-[calc(100vh-10rem)]">
        <LottieLoader className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {editingScript ? (
         <ScriptEditor
            script={editingScript}
            onSave={handleSaveScript}
            onCancel={() => setEditingScript(null)}
         />
      ) : editingFeatureFile ? (
        <FeatureFileEditor
            featureFile={editingFeatureFile}
            onSave={handleSaveFeatureFile}
            onCancel={() => setEditingFeatureFile(null)}
        />
      ) : (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary flex items-center"><FileText className="mr-2 h-5 w-5 text-accent"/> Available Automation Scripts</CardTitle>
              <CardDescription>
                View, edit, run, download, and delete predefined or custom automation scripts. Execution is simulated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scripts.length === 0 && (
                  <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
                      <FileText className="mx-auto h-12 w-12 mb-3 text-muted-foreground/50"/>
                      <p>No automation scripts available. Click "Create New Script" to add one.</p>
                  </div>
              )}
              {scripts.map((script) => (
                <Card key={script.id} className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{script.name}</CardTitle>
                    <CardDescription className="text-xs">{script.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditScript(script)} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Pencil className="mr-1 h-4 w-4" /> View/Edit
                    </Button>
                    <Button size="sm" onClick={() => handleRunScript(script)} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      {runningScriptId === script.id && lottieAnimationData ? (
                        <LottiePlayer
                          animationData={lottieAnimationData}
                          loop
                          play
                          style={{ width: 20, height: 20, marginRight: '0.25rem' }}
                        />
                      ) : (
                        <PlayCircle className="mr-1 h-4 w-4" />
                      )}
                      {runningScriptId === script.id ? 'Running...' : 'Run Script'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadScript(script, 'txt')} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Download className="mr-1 h-4 w-4" /> TXT
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadScript(script, 'pdf')} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Download className="mr-1 h-4 w-4" /> PDF
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteScriptClick(script)} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </CardContent>
             <CardFooter className="border-t pt-4">
                <Button variant="outline" onClick={handleCreateNewScript} disabled={!!runningScriptId || !!runningFeatureFileId}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Script
                </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary flex items-center"><FileCode className="mr-2 h-5 w-5 text-accent"/> Feature Files (BDD)</CardTitle>
              <CardDescription>
                Manage, download, and delete Gherkin feature files. Cypress execution is simulated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
             {featureFiles.length === 0 && (
                  <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg">
                     <FileCode className="mx-auto h-12 w-12 mb-3 text-muted-foreground/50"/>
                     <p>No feature files available. Click "Create New Feature File" to add one.</p>
                  </div>
              )}
              {featureFiles.map((featureFile) => (
                <Card key={featureFile.id} className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{featureFile.name}</CardTitle>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditFeatureFile(featureFile)} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Edit className="mr-1 h-4 w-4" /> View/Edit
                    </Button>
                    <Button size="sm" onClick={() => handleRunFeatureFile(featureFile)} disabled={!!runningScriptId || !!runningFeatureFileId}>
                       {runningFeatureFileId === featureFile.id && lottieAnimationData ? (
                        <LottiePlayer
                          animationData={lottieAnimationData}
                          loop
                          play
                          style={{ width: 20, height: 20, marginRight: '0.25rem' }}
                        />
                      ) : (
                        <PlayCircle className="mr-1 h-4 w-4" />
                      )}
                      {runningFeatureFileId === featureFile.id ? 'Running...' : 'Run with Cypress'}
                    </Button>
                     <Button variant="outline" size="sm" onClick={() => handleDownloadFeatureFile(featureFile, 'txt')} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Download className="mr-1 h-4 w-4" /> TXT
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadFeatureFile(featureFile, 'pdf')} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Download className="mr-1 h-4 w-4" /> PDF
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteFeatureFileClick(featureFile)} disabled={!!runningScriptId || !!runningFeatureFileId}>
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" onClick={handleCreateNewFeatureFile} disabled={!!runningScriptId || !!runningFeatureFileId}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Feature File
              </Button>
            </CardFooter>
          </Card>

           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary flex items-center"><PlayCircle className="mr-2 h-5 w-5 text-accent"/>Execution Logs</CardTitle>
              <CardDescription>
                View simulated logs from script and feature file executions. Download logs as TXT or PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px]">
              {scriptLogs.length === 0 ? (
                 <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
                    <Bot className="h-16 w-16 mb-4" />
                    <p>No logs yet. Run a script or feature file to see output here.</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] w-full rounded-md border p-3 bg-muted/20">
                  {scriptLogs.map((log, index) => (
                    <div key={index} className="text-xs font-mono mb-1 last:mb-0">
                      <span className={log.includes("ERROR") || log.includes("failed") ? "text-destructive" : log.includes("completed successfully") ? "text-green-600" : "text-foreground"}>
                        {log}
                      </span>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </CardContent>
            {scriptLogs.length > 0 && (
                <CardFooter className="border-t pt-4 flex flex-wrap justify-between items-center gap-2">
                    <Button variant="outline" onClick={clearLogs}>
                        <Eraser className="mr-2 h-4 w-4" /> Clear Logs
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadLogs('txt')}>
                            <Download className="mr-1 h-4 w-4" /> Download Logs (TXT)
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadLogs('pdf')}>
                            <Download className="mr-1 h-4 w-4" /> Download Logs (PDF)
                        </Button>
                    </div>
                </CardFooter>
            )}
          </Card>
        </>
      )}

      <AlertDialog open={showDeleteScriptConfirm} onOpenChange={setShowDeleteScriptConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete Script</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the script "{scriptToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteScriptConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteScript} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Script
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteFeatureFileConfirm} onOpenChange={setShowDeleteFeatureFileConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete Feature File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the feature file "{featureFileToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteFeatureFileConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFeatureFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Feature File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
