
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player/lazy'; // Lazy load for better performance
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PlusCircle, Play, Pause, Trash2, Loader2, AlertCircle, Video, CloudUpload, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const MAX_PLAYERS = 12;

interface PlayerState {
  url: string;
  id: string; // Unique ID for React key
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  loadedUrl: string | null;
}

export default function VideoPlayerClient() {
  const [players, setPlayers] = useState<PlayerState[]>([{ url: '', id: crypto.randomUUID(), isLoading: false, isReady: false, error: null, loadedUrl: null }]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUrlInputs, setShowUrlInputs] = useState(true);
  const playerRefs = useRef<(ReactPlayer | null)[]>([]);
  const { toast } = useToast();
  const isSeekingProgrammaticallyRef = useRef(false); // Guard for synchronized seeking

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    playerRefs.current = playerRefs.current.slice(0, players.length);
  }, [players.length]);


  const handleUrlChange = (index: number, newUrl: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { ...updatedPlayers[index], url: newUrl, error: null, loadedUrl: null, isReady: false }; // Reset loadedUrl and isReady on URL change
    setPlayers(updatedPlayers);
  };

  const addPlayer = () => {
    if (players.length < MAX_PLAYERS) {
      setPlayers([...players, { url: '', id: crypto.randomUUID(), isLoading: false, isReady: false, error: null, loadedUrl: null }]);
    } else {
      toast({
        title: 'Limit Reached',
        description: `You can add a maximum of ${MAX_PLAYERS} players.`,
        variant: 'destructive',
      });
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      const updatedPlayers = players.filter((_, i) => i !== index);
      setPlayers(updatedPlayers);
    } else {
       toast({
        title: 'Cannot Remove',
        description: `At least one player input is required.`,
        variant: 'destructive',
      });
    }
  };

  const loadAllVideos = () => {
    setIsPlaying(false); 
    let urlsToLoadCount = 0;
    const updatedPlayers = players.map(player => {
      if (player.url.trim()) {
        urlsToLoadCount++;
        return {
          ...player,
          loadedUrl: player.url, 
          isLoading: true,
          isReady: false,
          error: null,
        };
      } else {
        return { 
          ...player,
          loadedUrl: null,
          isLoading: false,
          isReady: false,
          error: null,
        };
      }
    });
    setPlayers(updatedPlayers);

    if (urlsToLoadCount > 0) {
        setShowUrlInputs(false);
        toast({ title: 'Loading Videos', description: 'Attempting to load all valid URLs...' });
    } else {
        toast({ title: 'No URLs', description: 'Please enter at least one valid video URL.', variant: 'destructive' });
    }
  };


  const togglePlayPause = () => {
    if (players.some(p => p.isReady && !p.error && p.loadedUrl)) {
        setIsPlaying(!isPlaying);
    } else {
        toast({ title: 'No Videos Ready', description: 'Load some videos first before playing.', variant: 'default' });
    }
  };

  const handleReady = useCallback((index: number) => {
    setPlayers(prev => {
        const updated = prev.map((p, i) => i === index ? { ...p, isLoading: false, isReady: true, error: null } : p);
        return updated;
    });
  }, []);

  const handleError = useCallback((index: number, error: any) => {
     if (typeof error === 'object' && error !== null) {
         console.error(`Player ${index + 1} encountered an error. Full error object:`, JSON.stringify(error, null, 2));
         if (error.data && error.data.type && error.data.details) {
             console.error(`Player ${index + 1} HLS.js error details: Type: ${error.data.type}, Details: ${error.data.details}, Fatal: ${error.data.fatal}`);
         } else if (error.type && error.details) {
              console.error(`Player ${index + 1} HLS error details: Type: ${error.type}, Details: ${error.details}${error.fatal ? ', Fatal: ' + error.fatal : ''}`);
         }
     } else {
         console.error(`Player ${index + 1} error:`, String(error));
     }

     let errorDetailsMessage = 'Unknown Error';
     if (error) {
       if (typeof error === 'string') { 
         errorDetailsMessage = error;
       } else if (error.data && error.data.type && error.data.details) { 
         errorDetailsMessage = `HLS Error - Type: ${error.data.type}, Details: ${error.data.details}, Fatal: ${error.data.fatal}`;
       } else if (error.type && error.details) { 
         errorDetailsMessage = `HLS Error - Type: ${error.type}, Details: ${error.details}${error.fatal ? ', Fatal: ' + error.fatal : ''}`;
       } else if (error.message) { 
         errorDetailsMessage = error.message;
       } else if (typeof error === 'object' && Object.keys(error).length > 0) {
         try {
            errorDetailsMessage = `Player error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
         } catch (e) {
            errorDetailsMessage = `Player error (unserializable object)`;
         }
       } else if (typeof error === 'object') {
          errorDetailsMessage = 'Player error (empty object received)';
       }
     }

     setPlayers(prev => {
        const updated = prev.map((p, i) => i === index ? { ...p, isLoading: false, isReady: false, error: `Load failed: ${errorDetailsMessage}` } : p);
        return updated;
    });

     toast({
        title: `Player ${index + 1} Error`,
        description: `Could not load video. ${errorDetailsMessage}. Check URL, network, or CORS.`,
        variant: 'destructive',
        duration: 7000,
      });
  }, [toast]);

  const handleBuffer = useCallback((index: number) => {
    setPlayers(prev => {
      const updated = prev.map((p, i) => (i === index && p.isReady) ? { ...p, isLoading: true } : p);
      return updated;
    });
  }, []);

  const handleBufferEnd = useCallback((index: number) => {
    setPlayers(prev => {
      const updated = prev.map((p, i) => i === index ? { ...p, isLoading: false } : p);
      return updated;
    });
  }, []);

  const handleSeek = useCallback((seekTimeSeconds: number, originatingPlayerIndex: number) => {
    if (isSeekingProgrammaticallyRef.current) {
        return;
    }

    isSeekingProgrammaticallyRef.current = true;

    playerRefs.current.forEach((playerInstance, index) => {
        if (playerInstance && index !== originatingPlayerIndex) {
            const playerState = players[index]; 
            if (playerState && playerState.isReady && !playerState.error && typeof playerInstance.seekTo === 'function') {
                try {
                    playerInstance.seekTo(seekTimeSeconds, 'seconds');
                } catch (e) {
                    console.error(`Error seeking player ${index + 1} to ${seekTimeSeconds}s:`, e);
                }
            }
        }
    });
    
    setTimeout(() => {
        isSeekingProgrammaticallyRef.current = false;
    }, 200); 
  }, [players]); 

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="ml-2 text-muted-foreground">Loading Video Players...</p>
      </div>
    );
  }

  const validUrlsEntered = players.some(p => p.url.trim() !== '');
  const anyVideoReadyAndLoaded = players.some(p => p.isReady && !p.error && p.loadedUrl);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-primary">Video URLs</CardTitle>
                <CardDescription>Enter up to {MAX_PLAYERS} video URLs (MP4, M3U8, etc.) to test simultaneously.</CardDescription>
            </div>
            <div className="flex gap-2">
                 {!showUrlInputs && players.some(p => p.loadedUrl) && ( 
                    <Button onClick={() => setShowUrlInputs(true)} variant="outline" size="sm" title="Edit URLs">
                        <Pencil className="mr-2 h-4 w-4" /> Edit URLs
                    </Button>
                 )}
                <Button onClick={loadAllVideos} disabled={!validUrlsEntered} variant="secondary">
                    <CloudUpload className="mr-2 h-4 w-4" /> Load All Videos
                </Button>
            </div>
        </CardHeader>

        {showUrlInputs && (
            <>
                <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-4">
                    {players.map((player, index) => (
                        <div key={player.id} className="flex items-end gap-2">
                        <div className="flex-grow">
                            <Label htmlFor={`url-${index}`}>Video URL {index + 1}</Label>
                            <Input
                            id={`url-${index}`}
                            type="text"
                            placeholder="https://example.com/video.mp4 or .m3u8"
                            value={player.url}
                            onChange={(e) => handleUrlChange(index, e.target.value)}
                            className="w-full px-4 py-3 h-12"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePlayer(index)}
                            disabled={players.length <= 1}
                            className="text-destructive hover:bg-destructive/10"
                            aria-label="Remove Player"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
                </CardContent>
                <CardFooter className="flex justify-start pt-4 border-t">
                    <Button type="button" variant="outline" onClick={addPlayer} disabled={players.length >= MAX_PLAYERS}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Player
                    </Button>
                </CardFooter>
            </>
        )}
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-primary">Video Players</CardTitle>
                <CardDescription>Videos will appear here once loaded. Click 'Load All Videos' first.</CardDescription>
            </div>
            <Button onClick={togglePlayPause} disabled={!anyVideoReadyAndLoaded} className="min-w-[120px]">
                {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {isPlaying ? 'Pause All' : 'Play All'}
            </Button>
        </CardHeader>
        <CardContent>
          {!players.some(p => p.loadedUrl) ? (
             <div className="text-center text-muted-foreground p-8 border border-dashed rounded-lg min-h-[200px] flex flex-col justify-center items-center">
                <Video className="mx-auto h-16 w-16 mb-4" />
                <p>Enter video URLs above and click 'Load All Videos' to start testing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((playerState, index) => playerState.loadedUrl ? (
                <div key={playerState.id} className="aspect-video relative bg-black rounded-lg overflow-hidden shadow-md border-4 border-neutral-700 p-1">
                  <div className="absolute inset-0 border-[6px] border-black rounded-md pointer-events-none z-10"></div>
                   {(playerState.isLoading || playerState.error) && (
                      <div className="absolute inset-[6px] flex items-center justify-center bg-black/80 z-20 rounded-[1px]">
                          {playerState.isLoading && <Loader2 className="h-8 w-8 animate-spin text-accent" />}
                          {playerState.error && !playerState.isLoading && (
                             <div className="text-center p-2">
                                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-1" title={playerState.error} />
                                <p className="text-xs text-destructive break-all">{playerState.error}</p>
                             </div>
                          )}
                      </div>
                   )}
                    {playerState.loadedUrl && !playerState.error && (
                        <ReactPlayer
                        ref={el => playerRefs.current[index] = el}
                        url={playerState.loadedUrl}
                        playing={isPlaying && playerState.isReady}
                        controls
                        width="100%"
                        height="100%"
                        className="absolute top-0 left-0 z-0 rounded-sm"
                        playsinline
                        onReady={() => handleReady(index)}
                        onError={(e, data, hlsInstance) => handleError(index, e)} 
                        onBuffer={() => handleBuffer(index)}
                        onBufferEnd={() => handleBufferEnd(index)}
                        onSeek={(seconds) => handleSeek(seconds, index)}
                        config={{
                            file: {
                                forceHLS: playerState.loadedUrl?.includes('.m3u8'),
                                hlsOptions: {},
                                attributes: {}
                            }
                        }}
                        />
                    )}
                </div>
              ) : null)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
