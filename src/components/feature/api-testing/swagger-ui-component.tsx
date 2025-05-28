'use client';

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components

interface SwaggerUIComponentProps {
  specUrlOrObject: string | object; // Can be a URL string or a spec object
}

export default function SwaggerUIComponent({ specUrlOrObject }: SwaggerUIComponentProps) {
  const [isClient, setIsClient] = useState(false);
  // Add a key to force re-render if specUrl changes to a new URL or object instance
  const [uiKey, setUiKey] = useState(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Update key when specUrlOrObject changes to ensure SwaggerUI re-initializes
    setUiKey(Date.now());
    setLoadError(null); // Reset error state when spec changes
  }, [specUrlOrObject]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="ml-2 text-muted-foreground">Loading Swagger UI...</p>
      </div>
    );
  }

  const isEmptySpec = (typeof specUrlOrObject === 'string' && specUrlOrObject.trim() === '') ||
                      (typeof specUrlOrObject === 'object' && Object.keys(specUrlOrObject).length === 0);

  const isExternalUrl = typeof specUrlOrObject === 'string' && specUrlOrObject.startsWith('http');

  const handleLoadError = (error: any) => {
    console.error("Swagger UI Load Error:", error);
    let message = "Failed to load the Swagger/OpenAPI specification.";
    if (isExternalUrl) {
      message += " This might be due to an invalid URL (ensure it's a direct link to a JSON/YAML spec file, not an HTML page), a network issue, or Cross-Origin Resource Sharing (CORS) restrictions on the server. Ensure the server at the specified URL is configured to allow requests from this domain.";
    }
    setLoadError(message);
  };

  return (
    <div className="swagger-ui-container bg-background p-2 md:p-4 rounded-md border mt-4 min-h-[400px]">
      {isEmptySpec ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <AlertTriangle className="w-10 h-10 mb-3 text-destructive" />
            <p className="font-semibold">No Swagger/OpenAPI Specification Loaded</p>
            <p className="text-sm">Enter a URL to a valid OpenAPI (v2 or v3) JSON or YAML file and click "Load Spec".</p>
        </div>
      ) : (
        <>
          {isExternalUrl && (
            <Alert variant="default" className="mb-4 bg-blue-500/10 border-blue-500/30 dark:bg-blue-900/20 dark:border-blue-700/40">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-700 dark:text-blue-300">Loading External Specification</AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-400 text-xs">
                Attempting to load specification from: <a href={specUrlOrObject as string} target="_blank" rel="noopener noreferrer" className="underline break-all hover:text-primary">{specUrlOrObject as string}</a>.
                <br />Ensure this URL points directly to a <strong>JSON or YAML specification file</strong>, not an HTML page that renders Swagger UI.
                <br />If loading fails (e.g., due to a "Failed to fetch" error in the console), please also ensure the server hosting the specification allows Cross-Origin Resource Sharing (CORS) from this domain. You may need to configure the 'Access-Control-Allow-Origin' header on the target server.
              </AlertDescription>
            </Alert>
          )}
          {loadError && ( 
             <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Specification</AlertTitle>
                <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          <SwaggerUI
              key={uiKey}
              url={typeof specUrlOrObject === 'string' ? specUrlOrObject : undefined}
              spec={typeof specUrlOrObject === 'object' ? specUrlOrObject : undefined}
              docExpansion="list"
              tryItOutEnabled={true}
              onFail={(err: any) => { 
                if (!loadError) { 
                    handleLoadError(err);
                }
              }}
          />
        </>
      )}
       {/* Global styles are necessary because SwaggerUI renders its own DOM structure that's hard to target with Tailwind alone */}
       <style jsx global>{`
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui { font-family: var(--font-geist-sans), sans-serif !important; color: hsl(var(--foreground)); }
        .swagger-ui .scheme-container { background-color: hsl(var(--card)) !important; box-shadow: none; padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;}
        .swagger-ui .opblock-tag-section { background-color: hsl(var(--card)) !important; border-radius: var(--radius); border: 1px solid hsl(var(--border)); margin-bottom: 1rem; }
        .swagger-ui .opblock-tag { color: hsl(var(--primary)) !important; font-size: 1.1rem !important; }
        
        .swagger-ui .opblock { background-color: hsl(var(--background)) !important; border: 1px solid hsl(var(--border)) !important; border-radius: var(--radius); margin-bottom: 1rem; box-shadow: none; }
        .swagger-ui .opblock.is-open .opblock-summary { border-bottom: 1px solid hsl(var(--border)); }

        .swagger-ui .opblock .opblock-summary-method { background-color: hsl(var(--accent)) !important; color: hsl(var(--accent-foreground)) !important; border-radius: calc(var(--radius) - 2px) 0 0 calc(var(--radius) - 2px); font-weight: 600; }
        .swagger-ui .opblock .opblock-summary-path, .swagger-ui .opblock .opblock-summary-path__deprecated { color: hsl(var(--foreground)) !important; font-weight: 600; }
        .swagger-ui .opblock .opblock-summary-description { color: hsl(var(--muted-foreground)) !important; }
        
        .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-title_normal { color: hsl(var(--foreground)) !important; }
        .swagger-ui .opblock-section-header h4 { color: hsl(var(--primary)) !important; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
        .swagger-ui .parameter__name, .swagger-ui .parameter__type, .swagger-ui .parameter__deprecated, .swagger-ui .parameter__in { color: hsl(var(--muted-foreground)) !important; font-size: 0.8rem; }
        .swagger-ui .parameter__name.required:after { content: "*"; color: hsl(var(--destructive)) !important; margin-left: 2px; }
        
        .swagger-ui .responses-table td, .swagger-ui .responses-table th { border-color: hsl(var(--border)) !important; color: hsl(var(--foreground)) !important; padding: 0.5rem; }
        .swagger-ui .response-col_status { color: hsl(var(--foreground)) !important; font-weight: 600; }
        .swagger-ui .response-col_description__inner div.markdown p { color: hsl(var(--foreground)) !important; }
        
        .swagger-ui .highlight-code .microlight { background-color: hsl(var(--muted)) !important; border-radius: var(--radius); border: 1px solid hsl(var(--border)); padding: 0.5rem; }
        .swagger-ui select { background-color: hsl(var(--input)) !important; border: 1px solid hsl(var(--border)) !important; color: hsl(var(--foreground)) !important; border-radius: var(--radius); padding: 0.5rem; }
        .swagger-ui input[type="text"], .swagger-ui input[type="password"], .swagger-ui input[type="search"], .swagger-ui textarea { background-color: hsl(var(--input)) !important; border: 1px solid hsl(var(--border)) !important; color: hsl(var(--foreground)) !important; border-radius: var(--radius); padding: 0.5rem; }
        .swagger-ui input[type="text"]:focus, .swagger-ui input[type="password"]:focus, .swagger-ui input[type="search"]:focus, .swagger-ui textarea:focus { border-color: hsl(var(--primary)) !important; box-shadow: 0 0 0 1px hsl(var(--primary)); }
        
        .swagger-ui .btn { border: 1px solid hsl(var(--primary)) !important; color: hsl(var(--primary)) !important; background: transparent; border-radius: var(--radius); padding: 0.4rem 0.8rem; font-weight: 500; }
        .swagger-ui .btn:hover { background-color: hsl(var(--primary)) !important; color: hsl(var(--primary-foreground)) !important; }
        .swagger-ui .btn.execute { background-color: hsl(var(--primary)) !important; color: hsl(var(--primary-foreground)) !important; border-color: hsl(var(--primary)) !important; }
        .swagger-ui .btn.authorize { border-color: hsl(var(--accent)) !important; color: hsl(var(--accent)) !important; }
        .swagger-ui .btn.authorize:hover { background-color: hsl(var(--accent)) !important; color: hsl(var(--accent-foreground)) !important; }

        .swagger-ui .dialog-ux .modal-ux-header h3 { color: hsl(var(--popover-foreground)) !important; }
        .swagger-ui .dialog-ux .modal-ux-content p, .swagger-ui .dialog-ux .modal-ux-content label { color: hsl(var(--popover-foreground)) !important; }
        .swagger-ui .dialog-ux .modal-ux { background-color: hsl(var(--popover)) !important; border: 1px solid hsl(var(--border)) !important; border-radius: var(--radius); }
        .swagger-ui .loading-container { background-color: hsla(var(--background), 0.8) !important; }
        .swagger-ui .loading-container .loading::after { border-color: hsl(var(--primary)) transparent hsl(var(--primary)) transparent !important;}
        .swagger-ui .info .title small pre { background-color: hsl(var(--muted)); color: hsl(var(--muted-foreground)); padding: 2px 4px; border-radius: calc(var(--radius) - 2px); font-size: 0.75rem; }
        .swagger-ui .info .base-url { color: hsl(var(--muted-foreground)); }
        .swagger-ui .info .link { color: hsl(var(--primary)) !important; }
      `}</style>
    </div>
  );
}

