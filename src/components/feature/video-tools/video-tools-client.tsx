
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Film, Trash2, Loader2, Info, Scissors, ListChecks, ChevronDown, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface VideoMetadata {
    name: string;
    size: number; // in bytes
    type: string;
    duration: number | null; // in seconds
}

interface VideoFileEntry {
    id: string;
    file: File;
    metadata: VideoMetadata | null;
    isLoadingMetadata: boolean;
    // isSelected: boolean; // Temporarily remove for simplicity, can be re-added with merge
}

const MAX_VIDEO_FILES = 12;

export default function VideoToolsClient() {
    const [videoFiles, setVideoFiles] = useState<VideoFileEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false); // General loading for operations
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const getVideoDuration = (file: File): Promise<number | null> => {
        return new Promise((resolve) => {
            if (!isClient) {
                resolve(null);
                return;
            }
            const videoElement = document.createElement('video');
            videoElement.preload = 'metadata';
            videoElement.onloadedmetadata = () => {
                window.URL.revokeObjectURL(videoElement.src);
                resolve(videoElement.duration);
            };
            videoElement.onerror = (e) => {
                console.error("Error loading video metadata for duration:", e);
                window.URL.revokeObjectURL(videoElement.src);
                resolve(null);
            };
            videoElement.src = URL.createObjectURL(file);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            if (videoFiles.length + files.length > MAX_VIDEO_FILES) {
                toast({
                    variant: "destructive",
                    title: "Upload Limit Exceeded",
                    description: `You can upload a maximum of ${MAX_VIDEO_FILES} videos.`,
                });
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            const newVideoFileEntries: VideoFileEntry[] = Array.from(files).map(file => ({
                id: crypto.randomUUID(),
                file,
                metadata: null,
                isLoadingMetadata: true,
                // isSelected: false,
            }));

            setVideoFiles(prev => [...prev, ...newVideoFileEntries]);

            for (const entry of newVideoFileEntries) {
                try {
                    const duration = await getVideoDuration(entry.file);
                    setVideoFiles(prev => prev.map(item =>
                        item.id === entry.id
                            ? {
                                ...item,
                                metadata: {
                                    name: entry.file.name,
                                    size: entry.file.size,
                                    type: entry.file.type,
                                    duration: duration,
                                },
                                isLoadingMetadata: false,
                            }
                            : item
                    ));
                } catch (error) {
                    console.error(`Failed to get duration for ${entry.file.name}`, error);
                    setVideoFiles(prev => prev.map(item =>
                        item.id === entry.id
                            ? {
                                ...item,
                                metadata: {
                                    name: entry.file.name,
                                    size: entry.file.size,
                                    type: entry.file.type,
                                    duration: null,
                                },
                                isLoadingMetadata: false,
                            }
                            : item
                    ));
                }
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeVideoFile = (id: string) => {
        setVideoFiles(prev => prev.filter(item => item.id !== id));
        toast({ title: "Video Removed", description: "The video has been removed from the list." });
    };

    // const toggleVideoSelection = (id: string) => {
    //     setVideoFiles(prev => prev.map(item =>
    //         item.id === id ? { ...item, isSelected: !item.isSelected } : item
    //     ));
    // };

    const handleMergeVideos = () => {
        // const selectedToMerge = videoFiles.filter(vf => vf.isSelected);
        // if (selectedToMerge.length < 2) {
        //     toast({
        //         variant: "destructive",
        //         title: "Not Enough Videos",
        //         description: "Please select at least two videos to merge.",
        //     });
        //     return;
        // }
        toast({
            title: "Merge Videos (TBD)",
            description: `Video merging requires backend processing and is under development.`,
            duration: 5000,
        });
        // console.log("Selected videos for merge:", selectedToMerge.map(vf => vf.metadata?.name || vf.file.name));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds: number | null): string => {
        if (seconds === null || isNaN(seconds)) return 'N/A';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [
            h > 0 ? String(h).padStart(2, '0') : null,
            String(m).padStart(2, '0'),
            String(s).padStart(2, '0'),
        ].filter(Boolean).join(':');
    };

    if (!isClient) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="ml-2 text-muted-foreground">Loading Video Tools...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-primary flex items-center"><UploadCloud className="mr-2 h-5 w-5 text-accent" /> Upload Videos</CardTitle>
                    <CardDescription>Select video files to upload. Metadata will be extracted. Max {MAX_VIDEO_FILES} files.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input
                        ref={fileInputRef}
                        id="video-upload"
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={handleFileChange}
                        disabled={isLoading || videoFiles.length >= MAX_VIDEO_FILES}
                    />
                     {videoFiles.length >= MAX_VIDEO_FILES && (
                        <p className="text-xs text-destructive mt-2">Maximum number of videos reached.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-primary flex items-center"><ListChecks className="mr-2 h-5 w-5 text-accent" /> Uploaded Videos & Metadata</CardTitle>
                    <CardDescription>Review metadata of uploaded videos. Expand to see details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {videoFiles.length === 0 ? (
                        <div className="text-center text-muted-foreground p-6 border border-dashed rounded-lg min-h-[150px] flex flex-col justify-center items-center">
                            <Film className="mx-auto h-12 w-12 mb-4" />
                            <p>No videos uploaded yet. Use the panel above to upload.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] pr-2">
                             <Accordion type="multiple" className="w-full space-y-2">
                                {videoFiles.map((item) => (
                                    <AccordionItem key={item.id} value={item.id} className="border rounded-lg bg-muted/20 overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline hover:bg-muted/30 data-[state=open]:bg-muted/40">
                                            <div className="flex items-center justify-between w-full gap-2">
                                                <div className="flex items-center gap-2 flex-grow min-w-0">
                                                    <Eye className="h-4 w-4 text-primary flex-shrink-0" />
                                                    <span className="truncate" title={item.file.name}>
                                                        {item.file.name}
                                                    </span>
                                                    {item.isLoadingMetadata && <Loader2 className="h-4 w-4 animate-spin text-accent flex-shrink-0" />}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
                                                    onClick={(e) => { e.stopPropagation(); removeVideoFile(item.id); }}
                                                    aria-label={`Remove ${item.file.name}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-3 pt-2 text-xs bg-background border-t">
                                            {item.isLoadingMetadata ? (
                                                <div className="flex items-center space-x-2 text-muted-foreground py-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Loading metadata...</span>
                                                </div>
                                            ) : item.metadata ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                                    <p><strong className="text-muted-foreground">Type:</strong> {item.metadata.type}</p>
                                                    <p><strong className="text-muted-foreground">Size:</strong> {formatFileSize(item.metadata.size)}</p>
                                                    <p className="sm:col-span-2"><strong className="text-muted-foreground">Duration:</strong> {formatDuration(item.metadata.duration)}</p>
                                                </div>
                                            ) : (
                                                <p className="text-destructive py-2">Could not load metadata for this file.</p>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-primary flex items-center"><Scissors className="mr-2 h-5 w-5 text-accent" /> Video Operations</CardTitle>
                    <CardDescription>Perform operations on uploaded videos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleMergeVideos}
                        // disabled={videoFiles.filter(vf => vf.isSelected).length < 2 || isLoading} // Re-enable selection logic if needed for merge
                        disabled={true || isLoading} // Merge is TBD, so disabled for now
                    >
                        <Scissors className="mr-2 h-4 w-4" /> Merge Videos (TBD)
                    </Button>
                     <p className="text-xs text-muted-foreground mt-2">
                        Note: Actual video merging is a complex process and typically requires backend processing. This feature is currently a placeholder.
                    </p>
                </CardContent>
            </Card>

             <Card className="shadow-lg mt-6">
                <CardHeader>
                    <CardTitle className="text-primary flex items-center"><Info className="mr-2 h-5 w-5 text-accent" /> Video Tools Module</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center py-12">
                    <Film className="h-16 w-16 text-accent mb-6" />
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Manage and Analyze Your Video Files</h2>
                    <p className="text-muted-foreground max-w-md">
                        This module allows you to upload videos and extract their metadata.
                        Future enhancements could include video merging, trimming, or format conversion (these would typically require backend processing).
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
