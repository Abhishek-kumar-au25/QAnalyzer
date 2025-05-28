'use client';

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import html2canvas from 'html2canvas'; // Import html2canvas
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Tablet, Laptop, Monitor, RotateCcw, ExternalLink, Search, Camera, Download, UploadCloud, Construction, AlertTriangle, Loader2, FileUp, X, AppWindow } from 'lucide-react'; // Added AppWindow, FileUp, X
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Image from 'next/image';

// Custom Apple Icon (Simple)
const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/>
    <path d="M10 2c1 .5 2 2 2 5"/>
  </svg>
);

// Custom Android Icon (Simple)
const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
        <path d="M12 18v.01"/>
        <path d="M8 6h8"/>
        <path d="M8 10h8"/>
    </svg>
);


// Define device categories and icons
const categories = {
  iOS: { label: 'iOS Phones', icon: Smartphone },
  Android: { label: 'Android Phones', icon: Smartphone },
  Tablet: { label: 'Tablets', icon: Tablet },
  Laptop: { label: 'Laptops', icon: Laptop },
  Desktop: { label: 'Desktops', icon: Monitor },
  TV: { label: 'TVs', icon: Monitor }, // Using Monitor icon for TV
};

type DeviceCategory = keyof typeof categories;

interface PredefinedSize {
  name: string;
  width: number;
  height: number;
  category: DeviceCategory;
  notch?: boolean; // Optional flag for phone notches
}

// Expanded list of predefined sizes
const predefinedSizes: PredefinedSize[] = [
  // iOS Phones
  { name: 'iPhone SE', width: 375, height: 667, category: 'iOS' },
  { name: 'iPhone XR', width: 414, height: 896, category: 'iOS', notch: true },
  { name: 'iPhone 12/13/14/15 Pro', width: 390, height: 844, category: 'iOS', notch: true },
  { name: 'iPhone 12/13 mini', width: 375, height: 812, category: 'iOS', notch: true },
  { name: 'iPhone 14/15 Plus', width: 428, height: 926, category: 'iOS', notch: true },
  { name: 'iPhone 14/15 Pro Max', width: 430, height: 932, category: 'iOS', notch: true },
  // Android Phones
  { name: 'Pixel 5/6a', width: 393, height: 851, category: 'Android' },
  { name: 'Pixel 7 Pro', width: 412, height: 892, category: 'Android' },
  { name: 'Pixel Fold (Unfolded)', width: 600, height: 750, category: 'Android' }, // Example unfolded state
  { name: 'Samsung Galaxy S20 Ultra', width: 412, height: 915, category: 'Android' },
  { name: 'Samsung Galaxy S21/S22/S23', width: 360, height: 800, category: 'Android' },
  { name: 'Samsung Galaxy Fold (Folded)', width: 280, height: 653, category: 'Android' },
  { name: 'Samsung Galaxy A51/71', width: 412, height: 914, category: 'Android' },
  // Tablets
  { name: 'iPad Mini', width: 768, height: 1024, category: 'Tablet' },
  { name: 'iPad Air', width: 820, height: 1180, category: 'Tablet' },
  { name: 'iPad Pro 11"', width: 834, height: 1194, category: 'Tablet' },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366, category: 'Tablet' },
  { name: 'Surface Pro 7', width: 912, height: 1368, category: 'Tablet' },
  { name: 'Surface Duo', width: 540, height: 720, category: 'Tablet' }, // Example Surface Duo single screen
  // Laptops
  { name: 'Laptop (1280x720)', width: 1280, height: 720, category: 'Laptop' },
  { name: 'Laptop (1366x768)', width: 1366, height: 768, category: 'Laptop' },
  { name: 'Laptop (1440x900)', width: 1440, height: 900, category: 'Laptop' },
  { name: 'Laptop (1536x864)', width: 1536, height: 864, category: 'Laptop' },
  { name: 'Laptop (1600x900)', width: 1600, height: 900, category: 'Laptop' },
  { name: 'Laptop (1920x1080)', width: 1920, height: 1080, category: 'Laptop' },
  // Desktops
  { name: 'Desktop HD (1920x1080)', width: 1920, height: 1080, category: 'Desktop' },
  { name: 'Desktop QHD (2560x1440)', width: 2560, height: 1440, category: 'Desktop' },
  { name: 'Desktop UWQHD (3440x1440)', width: 3440, height: 1440, category: 'Desktop' },
  { name: 'Desktop 4K (3840x2160)', width: 3840, height: 2160, category: 'Desktop' },
  // TVs
  { name: 'TV HD (1280x720)', width: 1280, height: 720, category: 'TV' },
  { name: 'TV Full HD (1920x1080)', width: 1920, height: 1080, category: 'TV' },
];


export default function ResponsiveTesterClient() {
  const [url, setUrl] = useState<string>('');
  const [iframeSrc, setIframeSrc] = useState<string>('');
  const [width, setWidth] = useState<number>(1280);
  const [height, setHeight] = useState<number>(720);
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | 'custom'>('Laptop'); // Default to laptop
  const [hasNotch, setHasNotch] = useState<boolean>(false);
  const [isRotated, setIsRotated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState<boolean>(false); // State for screenshot loading
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null); // State for screenshot preview dialog
  const [screenshotError, setScreenshotError] = useState<string | null>(null); // State for screenshot error message
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apkInputRef = useRef<HTMLInputElement>(null); // Ref for APK input
  const iosInputRef = useRef<HTMLInputElement>(null); // Ref for iOS input
  const [selectedApk, setSelectedApk] = useState<File | null>(null);
  const [selectedIosBuild, setSelectedIosBuild] = useState<File | null>(null);
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLoadUrl = () => {
    if (!url) {
      toast({
        variant: 'destructive',
        title: 'URL Required',
        description: 'Please enter a URL to test.',
      });
      return;
    }
    let formattedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      formattedUrl = `https://${url}`;
    }
    setIsLoading(true);
    setIframeSrc(formattedUrl);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const handleLoad = () => setIsLoading(false);
      const handleError = () => {
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: 'Error Loading URL',
          description: 'Could not load the specified URL. Check CORS policy, network, or if the site prevents embedding.',
        });
        setIframeSrc(''); // Clear src on error
      };
      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('error', handleError);
      return () => {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      };
    }
  }, [iframeSrc, toast]);


  const handleSizeChange = (sizeName: string) => {
    const selectedSize = predefinedSizes.find(s => s.name === sizeName);
    if (selectedSize) {
      setWidth(selectedSize.width);
      setHeight(selectedSize.height);
      setSelectedCategory(selectedSize.category);
      setHasNotch(!!selectedSize.notch);
      setIsRotated(false); // Reset rotation
    }
  };

  const handleRotate = () => {
    setIsRotated(!isRotated);
    const tempWidth = width;
    setWidth(height);
    setHeight(tempWidth);
  };

  const updateCustomDimensions = (newWidth: number, newHeight: number) => {
    setWidth(newWidth);
    setHeight(newHeight);
    setSelectedCategory('custom'); // Indicate custom size
    setHasNotch(false);
  };

  const handleScreenshot = async () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument?.body) {
       setScreenshotError('Cannot access iframe content. Taking screenshot of the current viewport instead.');
       // Fallback: Screenshot the viewport container if iframe access fails
       const viewportContainer = document.querySelector('.viewport-container'); // Assuming this class exists
        if (viewportContainer) {
             try {
                setIsTakingScreenshot(true);
                const canvas = await html2canvas(viewportContainer as HTMLElement, {
                    useCORS: true,
                    logging: false,
                    width: viewportContainer.clientWidth,
                    height: viewportContainer.clientHeight,
                    windowWidth: viewportContainer.scrollWidth,
                    windowHeight: viewportContainer.scrollHeight,
                });
                 const dataUrl = canvas.toDataURL('image/png');
                 setScreenshotPreviewUrl(dataUrl);
                 toast({ title: 'Viewport Screenshot Captured' });
             } catch (error) {
                 console.error('Error taking viewport screenshot:', error);
                 setScreenshotError('Failed to capture viewport screenshot.');
                 toast({ variant: 'destructive', title: 'Screenshot Failed' });
             } finally {
                 setIsTakingScreenshot(false);
             }
        } else {
            toast({ variant: 'destructive', title: 'Screenshot Failed', description: 'Cannot find viewport container.' });
        }
       return;
    }

    setIsTakingScreenshot(true);
    setScreenshotError(null); // Clear previous error

    try {
      // Attempt to capture iframe content
      const canvas = await html2canvas(iframe.contentDocument.body, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        width: iframe.contentDocument.body.scrollWidth,
        height: iframe.contentDocument.body.scrollHeight,
        windowWidth: iframe.contentDocument.documentElement.scrollWidth,
        windowHeight: iframe.contentDocument.documentElement.scrollHeight,
      });
      const dataUrl = canvas.toDataURL('image/png');
      setScreenshotPreviewUrl(dataUrl);
      toast({ title: 'Screenshot Captured', description: 'Screenshot taken successfully. Preview available.' });

    } catch (error: any) {
      console.error('Error taking screenshot:', error);
      let errorDescription = 'Could not capture screenshot. This might be due to cross-origin restrictions in the iframe.';
      if (error.message && error.message.includes('tainted canvases')) {
          errorDescription = 'Cannot capture screenshot due to cross-origin content (tainted canvas). Taking viewport screenshot as fallback.';
      }
      setScreenshotError(errorDescription);

      // Fallback to viewport screenshot on specific errors
       const viewportContainer = document.querySelector('.viewport-container');
       if (viewportContainer) {
           try {
               const canvas = await html2canvas(viewportContainer as HTMLElement, { useCORS: true, logging: false });
               const dataUrl = canvas.toDataURL('image/png');
               setScreenshotPreviewUrl(dataUrl);
               toast({ title: 'Viewport Screenshot Captured (Fallback)' });
           } catch (fallbackError) {
               console.error('Error taking viewport screenshot fallback:', fallbackError);
               toast({ variant: 'destructive', title: 'Screenshot Failed', description: 'Failed to capture both iframe and viewport.' });
           }
       } else {
            toast({ variant: 'destructive', title: 'Screenshot Failed', description: errorDescription });
       }
    } finally {
      setIsTakingScreenshot(false);
    }
  };

  // Handle file selection
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, type: 'apk' | 'ios') => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      if (type === 'apk') {
        if (!file.name.toLowerCase().endsWith('.apk')) {
          toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an .apk file for Android.' });
          setSelectedApk(null);
          if (apkInputRef.current) apkInputRef.current.value = '';
          return;
        }
        setSelectedApk(file);
      } else {
        if (!file.name.toLowerCase().endsWith('.ipa') && !file.name.toLowerCase().endsWith('.zip') && !file.name.toLowerCase().endsWith('.app')) {
           toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an .ipa, .zip, or .app file for iOS.' });
           setSelectedIosBuild(null);
           if (iosInputRef.current) iosInputRef.current.value = '';
           return;
        }
        setSelectedIosBuild(file);
      }
      toast({ title: `${type === 'apk' ? 'APK' : 'iOS Build'} Selected`, description: file.name });
    }
  };

  // Clear selected file
  const clearSelectedFile = (type: 'apk' | 'ios') => {
    if (type === 'apk') {
        setSelectedApk(null);
        if (apkInputRef.current) apkInputRef.current.value = ''; // Reset input
    } else {
        setSelectedIosBuild(null);
        if (iosInputRef.current) iosInputRef.current.value = ''; // Reset input
    }
    toast({ title: `${type === 'apk' ? 'APK' : 'iOS Build'} Cleared`, description: "File selection removed." });
  };

  // Placeholder for upload logic
  const handleUploadBuild = (type: 'apk' | 'ios') => {
    const file = type === 'apk' ? selectedApk : selectedIosBuild;
    if (!file) {
      toast({ variant: 'destructive', title: 'No File Selected', description: `Please select a${type === 'apk' ? 'n APK' : ' build'} file first.` });
      return;
    }
    
    console.log(`Simulating upload of ${type} file:`, file.name, file.size);
    toast({
      title: `Simulating Upload: ${type === 'apk' ? 'APK' : 'iOS Build'}`,
      description: `${file.name} would be uploaded to a device farm or testing service. Actual integration is required.`,
      duration: 5000,
    });
    // In a real app, you would initiate an API call here to upload the file
    // and trigger the testing process on a cloud-based device farm.
  };


  const displayWidth = isRotated ? height : width;
  const displayHeight = isRotated ? width : height;

  const frameClasses = cn(
    'device-frame',
    `device-frame-${selectedCategory?.toLowerCase()}`,
    {
      'device-frame-rotated': isRotated,
      'has-notch': hasNotch && !isRotated, // Apply notch class only if device has one and is not rotated
    }
  );

  const groupedSizes = predefinedSizes.reduce((acc, size) => {
    (acc[size.category] = acc[size.category] || []).push(size);
    return acc;
  }, {} as Record<DeviceCategory, PredefinedSize[]>);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Search className="h-8 w-8 animate-pulse text-accent" />
        <p className="ml-2 text-muted-foreground">Loading Responsive Tester...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Card */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Test Configuration</CardTitle>
          <CardDescription>Enter a URL and configure the testing environment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* URL Input */}
            <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-grow min-w-[250px] sm:max-w-md">
                    <Label htmlFor="url-input">Website URL</Label>
                    <div className="flex gap-2">
                    <Input
                        id="url-input"
                        type="text"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLoadUrl()}
                        className="flex-grow"
                    />
                    <Button onClick={handleLoadUrl} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                        {isLoading ? 'Loading...' : 'Load URL'}
                    </Button>
                    </div>
                </div>
            </div>

             {/* Device Selection & Dimensions */}
            <div className="flex flex-wrap gap-4 items-end">
                {/* Predefined Sizes Dropdown */}
                <div className="flex-grow min-w-[200px] sm:max-w-xs">
                    <Label htmlFor="device-select">Predefined Sizes</Label>
                    <Select onValueChange={handleSizeChange} value={predefinedSizes.find(s => s.width === width && s.height === height && !isRotated)?.name || predefinedSizes.find(s => s.height === width && s.width === height && isRotated)?.name || ''}>
                    <SelectTrigger id="device-select" className="bg-background hover:bg-muted/50 data-[state=open]:bg-muted">
                        <SelectValue placeholder="Select Device" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border">
                        {Object.entries(groupedSizes).map(([categoryKey, sizes]) => (
                        <SelectGroup key={categoryKey}>
                            <SelectLabel>{categories[categoryKey as DeviceCategory].label}</SelectLabel>
                            {sizes.map((size) => {
                            const CategoryIcon = categories[size.category].icon;
                            return (
                                <SelectItem key={size.name} value={size.name} className="hover:bg-accent/50 focus:bg-accent/50">
                                <div className="flex items-center">
                                    <CategoryIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {size.name} ({size.width}x{size.height})
                                </div>
                                </SelectItem>
                            );
                            })}
                        </SelectGroup>
                        ))}
                    </SelectContent>
                    </Select>
                </div>

                 {/* Custom Dimensions */}
                <div className="flex gap-2 items-end">
                    <div>
                    <Label htmlFor="custom-width">Width (px)</Label>
                    <Input
                        id="custom-width"
                        type="number"
                        value={width}
                        onChange={(e) => updateCustomDimensions(parseInt(e.target.value, 10) || 0, height)}
                        className="w-24"
                    />
                    </div>
                    <div>
                    <Label htmlFor="custom-height">Height (px)</Label>
                    <Input
                        id="custom-height"
                        type="number"
                        value={height}
                        onChange={(e) => updateCustomDimensions(width, parseInt(e.target.value, 10) || 0)}
                        className="w-24"
                    />
                    </div>
                </div>

                 {/* Action Buttons */}
                <div className="flex gap-2 items-end">
                    <Button onClick={handleRotate} variant="outline" title="Rotate Device" disabled={selectedCategory === 'Desktop' || selectedCategory === 'Laptop' || selectedCategory === 'TV'}>
                        <RotateCcw className="h-5 w-5" />
                    </Button>
                    <Button onClick={handleScreenshot} variant="outline" title="Take Screenshot" disabled={!iframeSrc || isLoading || isTakingScreenshot}>
                        {isTakingScreenshot ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    </Button>
                    {iframeSrc && (
                        <Button asChild variant="outline" title="Open in new tab">
                            <a href={iframeSrc} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Web Viewport Card */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="text-primary">Web Viewport</CardTitle>
          <CardDescription>Current dimensions: {displayWidth}px &times; {displayHeight}px</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="viewport-container w-full bg-muted flex justify-center items-center overflow-auto p-4 md:p-8" style={{ minHeight: 'calc(100vh - 350px)' }}> {/* Adjusted min height */}
            {isLoading && iframeSrc && (
              <div className="text-center text-muted-foreground">
                <Search className="h-12 w-12 animate-pulse mx-auto mb-2" />
                <p>Loading website...</p>
              </div>
            )}
            {!iframeSrc && !isLoading && (
                <div className="text-center text-muted-foreground p-8">
                    <Search className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg">Enter a URL above and click 'Load URL' to begin testing.</p>
                    <p className="text-sm mt-2">Choose predefined device sizes or enter custom dimensions.</p>
                </div>
            )}
            {iframeSrc && (
                <div
                  className={frameClasses}
                  style={{
                      width: `${displayWidth}px`,
                      height: `${displayHeight}px`,
                  }}
                >
                  {/* Notch element for phones */}
                  {(selectedCategory === 'iOS' || selectedCategory === 'Android') && hasNotch && !isRotated && <div className="device-notch"></div>}

                  <iframe
                    ref={iframeRef}
                    key={iframeSrc} // Force re-render on src change
                    src={iframeSrc}
                    title="Responsive Test Viewport"
                    className="device-screen"
                    style={{
                        width: `100%`, // Take full width of frame content area
                        height: `100%`, // Take full height of frame content area
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" // Security sandbox attributes
                    onError={() => setIsLoading(false)} // Handle load errors within iframe itself if possible
                ></iframe>
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Native App Testing Section (With Upload UI) */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-primary flex items-center"><AppWindow className="mr-2 h-5 w-5 text-accent"/>Test Native Apps (Integration Required)</CardTitle>
                <CardDescription>
                    Upload your app builds (.apk for Android, .ipa or build archive for iOS) to test on real devices or emulators using integrated cloud services.
                    <span className="block text-xs text-muted-foreground mt-1">Note: Native apps cannot be run directly in the browser. This section only handles the file upload UI.</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                {/* Android APK Upload */}
                <div className="border p-4 rounded-lg bg-muted/20 text-center space-y-3">
                    <AndroidIcon className="h-12 w-12 mx-auto mb-3 text-green-500"/>
                    <h3 className="font-semibold text-foreground">Android App (.apk)</h3>
                    {/* Hidden File Input */}
                    <Input
                        ref={apkInputRef}
                        id="apk-upload-input"
                        type="file"
                        accept=".apk"
                        onChange={(e) => handleFileChange(e, 'apk')}
                        className="hidden"
                    />
                    {/* Custom Button to Trigger Input */}
                    <Button variant="outline" onClick={() => apkInputRef.current?.click()} className="w-full">
                         <FileUp className="mr-2 h-4 w-4" /> Select APK File
                     </Button>
                     {/* Display Selected File */}
                     {selectedApk && (
                        <div className="text-sm text-muted-foreground flex justify-center items-center gap-2 border p-2 rounded-md bg-background">
                            <span className="truncate flex-grow text-left">{selectedApk.name}</span>
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => clearSelectedFile('apk')} title="Clear selection">
                                 <X className="h-4 w-4"/>
                             </Button>
                        </div>
                    )}
                    {/* Upload Button (Placeholder Action) */}
                    <Button onClick={() => handleUploadBuild('apk')} disabled={!selectedApk} className="w-full">
                        <UploadCloud className="mr-2 h-4 w-4" /> Upload & Test (TBD)
                    </Button>
                     <Image
                        src="https://picsum.photos/seed/native-android/300/150"
                        alt="Android app testing placeholder"
                        width={300}
                        height={150}
                        className="rounded-lg mt-4 shadow-sm mx-auto"
                        data-ai-hint="android logo device"
                    />
                </div>
                {/* iOS IPA/Build Upload */}
                <div className="border p-4 rounded-lg bg-muted/20 text-center space-y-3">
                     <AppleIcon className="h-12 w-12 mx-auto mb-3 text-gray-500"/>
                     <h3 className="font-semibold text-foreground">iOS App (.ipa / Build Archive)</h3>
                     {/* Hidden File Input */}
                    <Input
                        ref={iosInputRef}
                        id="ios-upload-input"
                        type="file"
                        accept=".ipa,.zip,.app" // Allow .zip and .app for iOS build archives
                        onChange={(e) => handleFileChange(e, 'ios')}
                        className="hidden"
                    />
                     {/* Custom Button to Trigger Input */}
                     <Button variant="outline" onClick={() => iosInputRef.current?.click()} className="w-full">
                         <FileUp className="mr-2 h-4 w-4" /> Select iOS Build
                     </Button>
                     {/* Display Selected File */}
                     {selectedIosBuild && (
                        <div className="text-sm text-muted-foreground flex justify-center items-center gap-2 border p-2 rounded-md bg-background">
                            <span className="truncate flex-grow text-left">{selectedIosBuild.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => clearSelectedFile('ios')} title="Clear selection">
                                 <X className="h-4 w-4"/>
                             </Button>
                        </div>
                    )}
                     {/* Upload Button (Placeholder Action) */}
                     <Button onClick={() => handleUploadBuild('ios')} disabled={!selectedIosBuild} className="w-full">
                        <UploadCloud className="mr-2 h-4 w-4" /> Upload & Test (TBD)
                     </Button>
                      <Image
                        src="https://picsum.photos/seed/native-ios/300/150"
                        alt="iOS app testing placeholder"
                        width={300}
                        height={150}
                        className="rounded-lg mt-4 shadow-sm mx-auto"
                        data-ai-hint="apple logo device"
                    />
                </div>
            </CardContent>
            <CardFooter>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                   <Construction className="h-4 w-4" />
                   Native app testing functionality requires external service integration (e.g., Firebase Test Lab, BrowserStack, LambdaTest).
                </p>
            </CardFooter>
        </Card>


       {/* Screenshot Preview Dialog */}
       <AlertDialog open={!!screenshotPreviewUrl || !!screenshotError} onOpenChange={(open) => {
           if (!open) {
             setScreenshotPreviewUrl(null);
             setScreenshotError(null);
           }
         }}>
         <AlertDialogContent className="max-w-3xl">
           <AlertDialogHeader>
             <AlertDialogTitle>{screenshotError ? 'Screenshot Error' : 'Screenshot Preview'}</AlertDialogTitle>
             <AlertDialogDescription>
               {screenshotError ? screenshotError : 'Review the captured screenshot. You can download it.'}
               {!screenshotError && <span className="block mt-1 text-xs">Saving to Defect/Test Case reports is under development.</span>}
             </AlertDialogDescription>
           </AlertDialogHeader>
           {screenshotPreviewUrl && (
             <div className="my-4 max-h-[60vh] overflow-auto border rounded">
               <img src={screenshotPreviewUrl} alt="Screenshot Preview" className="w-full h-auto" />
             </div>
           )}
           <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setScreenshotPreviewUrl(null); setScreenshotError(null); }}>Close</AlertDialogCancel>
              {screenshotPreviewUrl && !screenshotError && (
                <Button asChild>
                  <a href={screenshotPreviewUrl} download={`screenshot-${displayWidth}x${displayHeight}-${Date.now()}.png`}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </Button>
              )}
             <Button disabled>Save to Report (TBD)</Button>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>


       {/* Inline styles for device frames - Move to CSS/SCSS for better organization */}
      <style jsx>{`
        .viewport-container {
           min-height: 500px;
        }
        .device-frame {
          position: relative;
          border: 1px solid #aaa;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          overflow: hidden;
          transition: width 0.3s ease, height 0.3s ease;
          flex-shrink: 0;
          background-color: #555;
        }
        .device-screen {
          display: block;
          border: none;
          background-color: white;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100%; height: 100%;
        }

        .device-frame-ios, .device-frame-android {
          border: 10px solid #333;
          border-radius: 40px;
          padding: 0px;
        }
        .device-frame-ios .device-screen,
        .device-frame-android .device-screen {
             border-radius: 30px;
             overflow: hidden;
        }
        .device-frame-ios.device-frame-rotated,
        .device-frame-android.device-frame-rotated {
             border-radius: 15px;
        }
         .device-frame-ios.device-frame-rotated .device-screen,
         .device-frame-android.device-frame-rotated .device-screen {
            border-radius: 5px;
         }

        .device-frame.has-notch .device-notch {
           position: absolute;
           top: 0px;
           left: 50%;
           transform: translateX(-50%);
           width: 35%;
           min-width: 100px;
           height: 20px;
           background: #333;
           border-bottom-left-radius: 10px;
           border-bottom-right-radius: 10px;
           z-index: 2;
         }

        .device-frame-tablet {
          border: 12px solid #444;
          border-radius: 18px;
          padding: 0px;
        }
        .device-frame-tablet .device-screen {
            border-radius: 6px;
            overflow: hidden;
        }

        .device-frame-laptop {
          border: 15px solid #555;
          border-bottom-width: 40px;
          border-radius: 10px;
          background-color: #555;
          padding: 0px;
          position: relative;
          box-sizing: border-box;
        }
        .device-frame-laptop::before {
            content: '';
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 10px;
            background-color: #444;
            border-radius: 5px;
        }
        .device-frame-laptop .device-screen {
            border-radius: 2px;
             top: 10px;
             left: 10px;
             right: 10px;
             bottom: 10px;
             width: calc(100% - 20px);
             height: calc(100% - 20px);
             position: absolute;
        }

        .device-frame-desktop, .device-frame-tv {
          border: 1px solid #666;
          padding: 0;
           background-color: black;
        }

        .device-frame-custom {
           border: 2px dashed #ccc;
           padding: 0;
           background-color: transparent;
        }
      `}</style>
    </div>
  );
}
