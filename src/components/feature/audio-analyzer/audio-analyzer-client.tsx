
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label'; // Corrected import
import { useToast } from '@/hooks/use-toast';
import { AudioWaveform, UploadCloud, Music, Clock, BarChartHorizontalBig, Construction, Loader2, Play, Pause, RotateCcw, Volume2, Settings2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

interface AudioMetadata {
    fileName: string;
    fileSize: number; // in bytes
    fileType: string;
    duration: number; // in seconds
    sampleRate?: number; // Made optional as it might not always be available easily
    channels?: number; // Made optional
    // Add more metadata fields if extractable
    // e.g., bitrate, encoding details (requires more advanced parsing)
}

export default function AudioAnalyzerClient() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.5); // Default volume
    const waveformRef = useRef<HTMLDivElement>(null);
    const spectrogramRef = useRef<HTMLDivElement>(null); // Ref for future spectrogram
    const frequencyRef = useRef<HTMLDivElement>(null); // Ref for future frequency plot
    const { toast } = useToast();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
         // Cleanup wavesurfer instance on component unmount
        return () => {
            wavesurfer?.destroy();
        };
    }, []); // Removed wavesurfer dependency to prevent re-running cleanup unnecessarily

    // Initialize WaveSurfer
    useEffect(() => {
        if (isClient && waveformRef.current && !wavesurfer) { // Check isClient before initializing
            const ws = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: 'hsl(var(--primary))', // Use theme primary color
                progressColor: 'hsl(var(--accent))', // Use theme accent color
                cursorColor: 'hsl(var(--foreground))',
                height: 150, // Adjust height as needed
                barWidth: 3,
                barGap: 2,
                barRadius: 3,
                responsive: true,
                cursorWidth: 2,
                // url: '/placeholder.mp3', // Optional placeholder audio
            });
            setWavesurfer(ws);

             // Event listeners
             ws.on('ready', () => {
                if (ws) { // Check if ws is still valid inside async callback
                    setIsLoading(false);
                    const duration = ws.getDuration();

                    // Attempt to get more detailed info from the decoded data
                    const decodedData = ws.getDecodedData();
                    const sampleRate = decodedData?.sampleRate;
                    const channels = decodedData?.numberOfChannels;

                    setAudioMetadata(prev => {
                        if (!prev) return null; // Should not happen if file was selected
                        return {
                            ...prev, // Keep existing file info
                            duration: duration,
                            sampleRate: sampleRate, // May be undefined
                            channels: channels,   // May be undefined
                        };
                    });
                    setCurrentTime(0); // Reset time on new file load
                    toast({ title: "Audio Ready", description: `Duration: ${duration.toFixed(2)}s` });
                }
            });

             ws.on('loading', (percent) => {
                 // console.log('Loading audio:', percent);
                 // You could update a loading progress state here if needed
             });

            ws.on('play', () => setIsPlaying(true));
            ws.on('pause', () => setIsPlaying(false));
            ws.on('finish', () => setIsPlaying(false));
            ws.on('audioprocess', (time) => setCurrentTime(time)); // Update current time
            ws.on('seeking', (time) => setCurrentTime(time)); // Update time on seek

            ws.on('error', (err) => {
                console.error('WaveSurfer error:', err);
                setIsLoading(false);
                toast({ variant: 'destructive', title: 'Audio Load Error', description: typeof err === 'string' ? err : 'Could not load audio file.' });
                setAudioMetadata(null); // Clear metadata on error
                setSelectedFile(null); // Clear selected file on error
            });

             // Cleanup WaveSurfer instance when component using it unmounts or ws changes
             // Moved the main cleanup to the component unmount effect
        }
    }, [isClient, wavesurfer, toast]); // Add wavesurfer dependency back here to re-run setup if it changes


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && wavesurfer) {
            if (!['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/mp3'].includes(file.type)) {
                 toast({ variant: 'destructive', title: 'Unsupported Format', description: 'Please upload MP3, WAV, AAC, OGG, WebM, or FLAC.' });
                 return;
            }
            setSelectedFile(file);
            setAudioMetadata({ // Set initial metadata available from File object
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                duration: 0, // Will be updated on 'ready'
                // sampleRate and channels will be updated on 'ready'
            });
            const url = URL.createObjectURL(file);
            setIsLoading(true);
            setIsPlaying(false); // Stop playback when new file is selected
            wavesurfer.load(url).catch(err => {
                 // Handle potential load errors immediately
                 console.error("WaveSurfer load error:", err);
                 setIsLoading(false);
                 setAudioMetadata(null);
                 setSelectedFile(null);
                 toast({ variant: 'destructive', title: 'Audio Load Failed', description: typeof err === 'string' ? err : 'Could not load this audio file format or URL.' });
             });
        }
    };

     const formatTime = (seconds: number) => {
        const date = new Date(0);
        date.setSeconds(seconds || 0);
        return date.toISOString().substring(14, 19); // MM:SS format
    };

    const handlePlayPause = () => {
        if (wavesurfer && audioMetadata && audioMetadata.duration > 0) {
            wavesurfer.playPause();
        } else {
            toast({ title: 'No Audio Loaded', description: 'Please upload an audio file first.' });
        }
    };

     const handleStop = () => {
        if (wavesurfer) {
            wavesurfer.stop();
            setIsPlaying(false);
            setCurrentTime(0);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        if (wavesurfer) {
            wavesurfer.setVolume(newVolume);
            setVolume(newVolume);
        }
    };

    if (!isClient) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="ml-2 text-muted-foreground">Loading Audio Analyzer...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Upload & Controls */}
            <Card className="shadow-lg lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-primary flex items-center"><UploadCloud className="mr-2 h-5 w-5 text-accent" /> Upload & Control</CardTitle>
                    <CardDescription>Upload an audio file (MP3, WAV, AAC, OGG, FLAC) and control playback.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label htmlFor="audio-upload">Select Audio File</Label>
                        <Input
                            id="audio-upload"
                            type="file"
                            accept="audio/mpeg, audio/wav, audio/aac, audio/ogg, audio/webm, audio/flac, audio/mp3" // Added audio/mp3
                            onChange={handleFileChange}
                            className="mt-1"
                            disabled={isLoading}
                        />
                    </div>
                     {isLoading && (
                         <div className="flex items-center justify-center space-x-2 text-muted-foreground pt-4">
                             <Loader2 className="h-5 w-5 animate-spin text-accent" />
                             <span>Loading audio...</span>
                         </div>
                     )}
                    {audioMetadata && audioMetadata.duration > 0 && ( // Only show controls if audio is ready
                        <div className="space-y-4 pt-4 border-t">
                             <h4 className="font-semibold text-foreground flex items-center">
                                <Music className="mr-2 h-4 w-4 text-accent" />
                                Playback Controls
                            </h4>
                             <div className="flex items-center justify-between gap-4">
                                <Button onClick={handlePlayPause} size="icon" variant="outline" title={isPlaying ? "Pause" : "Play"} disabled={!audioMetadata || audioMetadata.duration === 0 || isLoading}>
                                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </Button>
                                <div className="flex-grow text-center font-mono text-sm">
                                    <span>{formatTime(currentTime)}</span> / <span>{formatTime(audioMetadata?.duration ?? 0)}</span>
                                </div>
                                <Button onClick={handleStop} size="icon" variant="outline" title="Stop" disabled={!audioMetadata || audioMetadata.duration === 0 || isLoading}>
                                    <RotateCcw className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Volume2 className="h-5 w-5 text-muted-foreground" />
                                <Slider
                                    value={[volume]}
                                    max={1}
                                    step={0.05}
                                    onValueChange={handleVolumeChange}
                                    className="flex-grow"
                                    disabled={!audioMetadata || audioMetadata.duration === 0 || isLoading}
                                    aria-label="Volume control"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
                 {/* Metadata Display */}
                 {audioMetadata && (
                    <CardFooter className="flex flex-col items-start space-y-1 text-xs pt-4 border-t bg-muted/30 p-4">
                        <h4 className="font-semibold text-foreground mb-2 text-sm">Audio Information</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full">
                             <p><span className="font-medium text-muted-foreground">Name:</span></p>
                             <p className="truncate" title={audioMetadata.fileName}>{audioMetadata.fileName}</p>

                             <p><span className="font-medium text-muted-foreground">Size:</span></p>
                             <p>{(audioMetadata.fileSize / 1024 / 1024).toFixed(2)} MB</p>

                             <p><span className="font-medium text-muted-foreground">Type:</span></p>
                             <p>{audioMetadata.fileType}</p>

                             {audioMetadata.duration > 0 ? (
                                <>
                                    <p><span className="font-medium text-muted-foreground">Duration:</span></p>
                                    <p>{audioMetadata.duration.toFixed(2)}s</p>

                                    <p><span className="font-medium text-muted-foreground">Sample Rate:</span></p>
                                    <p>{audioMetadata.sampleRate ? `${audioMetadata.sampleRate} Hz` : 'N/A'}</p>

                                    <p><span className="font-medium text-muted-foreground">Channels:</span></p>
                                    <p>{audioMetadata.channels ?? 'N/A'}</p>
                                </>
                            ) : (
                                <p className="text-muted-foreground italic col-span-2">Waiting for audio to load for full details...</p>
                            )}
                        </div>
                    </CardFooter>
                )}
                 {!audioMetadata && !isLoading && (
                     <CardFooter className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground italic">Upload an audio file to see its details.</p>
                    </CardFooter>
                )}
            </Card>

            {/* Right Panel: Visualizations */}
            <Card className="shadow-lg lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-primary flex items-center"><BarChartHorizontalBig className="mr-2 h-5 w-5 text-accent" /> Audio Analysis</CardTitle>
                    <CardDescription>Visualize the uploaded audio waveform and other metrics (Spectrogram/Frequency under development).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Waveform */}
                    <div>
                        <h3 className="font-semibold mb-2 text-foreground flex items-center">
                            <AudioWaveform className="mr-2 h-4 w-4 text-accent"/> Waveform (Amplitude vs. Time)
                        </h3>
                        <div ref={waveformRef} className="h-[150px] bg-muted rounded-md border">
                            {!selectedFile && !isLoading && (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    Upload an audio file to see the waveform.
                                </div>
                            )}
                            {isLoading && (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                     <Loader2 className="h-8 w-8 animate-spin text-accent" />
                                </div>
                            )}
                            {/* WaveSurfer initializes here when ready */}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">This shows the audio signal's amplitude (loudness) over time.</p>
                    </div>

                     {/* Spectrogram Placeholder */}
                    <div>
                        <h3 className="font-semibold mb-2 text-foreground flex items-center">
                             <Construction className="mr-2 h-4 w-4 text-accent" /> Spectrogram (Frequency vs. Time - TBD)
                        </h3>
                         <div ref={spectrogramRef} className="h-[150px] bg-muted rounded-md border flex items-center justify-center text-muted-foreground">
                            Spectrogram visualization requires advanced processing (Under Development).
                         </div>
                         <p className="text-xs text-muted-foreground mt-1">This will show the intensity of different frequencies over time (often used for detailed analysis).</p>
                    </div>

                    {/* Frequency Spectrum Placeholder */}
                    <div>
                        <h3 className="font-semibold mb-2 text-foreground flex items-center">
                            <Construction className="mr-2 h-4 w-4 text-accent" /> Frequency Spectrum (Intensity vs. Frequency - TBD)
                        </h3>
                        <div ref={frequencyRef} className="h-[150px] bg-muted rounded-md border flex items-center justify-center text-muted-foreground">
                            Frequency analysis graph requires advanced processing (Under Development).
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">This will show the intensity (loudness) of each frequency present in the audio at a point in time or averaged over a duration.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


    