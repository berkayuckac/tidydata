"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState, useRef, useEffect } from "react";
import { Search, Image, FileText, X, Loader2, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import { addTextContent, addImage } from "@/lib/api";
import { Toaster, toast } from 'sonner';
import { Slider } from "@/components/ui/slider";
import type { ViewSettings, ViewMode, ViewSize } from "@/components/view-settings";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SearchResult = {
  type: "text" | "image";
  score: number;
  text?: string;
  image_data?: string;
  content_type?: string;
  filename?: string;
  description?: string;
};

const getSizeClass = (size: ViewSize) => {
  switch (size) {
    case "small":
      return "h-16";
    case "large":
      return "h-32";
    default:
      return "h-24";
  }
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchThreshold, setSearchThreshold] = useState(0.5);
  const [showThreshold, setShowThreshold] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    mode: "grid",
    size: "medium",
    columns: 2
  });
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);

  // Load default threshold from settings on mount and listen for updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedThreshold = window.localStorage.getItem("tidydata-search-threshold");
      if (storedThreshold) {
        setSearchThreshold(parseFloat(storedThreshold));
      }

      const handleThresholdUpdate = (event: CustomEvent<number>) => {
        setSearchThreshold(event.detail);
      };

      window.addEventListener('thresholdUpdate', handleThresholdUpdate as EventListener);
      return () => window.removeEventListener('thresholdUpdate', handleThresholdUpdate as EventListener);
    }
  }, []);

  // Load view settings
  useEffect(() => {
    const stored = localStorage.getItem("tidydata-view-settings");
    if (stored) {
      try {
        setViewSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse view settings:", e);
      }
    }

    const handleViewUpdate = (event: CustomEvent<ViewSettings>) => {
      setViewSettings(event.detail);
    };

    window.addEventListener('viewSettingsUpdate', handleViewUpdate as EventListener);
    return () => window.removeEventListener('viewSettingsUpdate', handleViewUpdate as EventListener);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
      }
      if ((e.key === "i" || e.key === "I") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowAddContent(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Get and validate endpoint
      const endpoint = localStorage.getItem("tidydata-server-endpoint") || "http://localhost:8000";
      
      // Format and validate the endpoint URL
      let formattedEndpoint = endpoint
        .replace(/localhost([0-9]+)/, 'localhost:$1')
        .replace(/([^:])\/\//, '$1/');

      // Ensure the endpoint is a valid URL
      let url;
      try {
        url = new URL(formattedEndpoint);
        // Make sure we have http:// or https://
        if (!url.protocol.startsWith('http')) {
          url = new URL(`http://${formattedEndpoint}`);
        }
      } catch (e) {
        // If URL parsing fails, try adding http:// and try again
        try {
          url = new URL(`http://${formattedEndpoint}`);
        } catch (e) {
          throw new Error(`Invalid server endpoint: ${endpoint}. Please check your settings and ensure the URL is in the format http://localhost:8000`);
        }
      }

      // Remove trailing slash if present
      const baseUrl = url.toString().replace(/\/$/, '');
      
      // Construct the search URL
      const searchUrl = new URL('/search', baseUrl);
      searchUrl.searchParams.append('query', searchQuery);
      searchUrl.searchParams.append('limit', '10');
      searchUrl.searchParams.append('score_threshold', searchThreshold.toString());

      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(
        data.results.map((result: any) => ({
          type: result.source_type,
          score: result.score,
          text: result.source_type === "text" ? result.content.text : undefined,
          image_data: result.source_type === "image" ? result.content.image_data : undefined,
          content_type: result.source_type === "image" ? result.content.metadata.content_type : undefined,
          filename: result.source_type === "image" ? result.content.metadata.filename : undefined,
          description: result.source_type === "image" ? result.content.metadata.description : undefined,
        }))
      );
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed', {
        description: error instanceof Error ? error.message : 'Please check your connection and try again'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleAddContent = async () => {
    if (!newContent && selectedFiles.length === 0) return;
    
    setIsAdding(true);
    try {
      // Add text content if present
      if (newContent) {
        await addTextContent(newContent);
      }

      // Add images if present
      if (selectedFiles.length > 0) {
        await Promise.all(selectedFiles.map(file => addImage(file)));
      }
      
      // Reset form
      setNewContent("");
      setSelectedFiles([]);
      setShowAddContent(false);

      toast.success('Content added', {
        description: "Successfully added to your knowledge base"
      });
    } catch (error) {
      toast.error('Failed to add content', {
        description: error instanceof Error ? error.message : "Failed to add content to knowledge base"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const renderSearchResults = () => {
    if (!searchResults.length) return null;

    const imageSize = getSizeClass(viewSettings.size);

    switch (viewSettings.mode) {
      case "grid":
        return (
          <div 
            className={`grid gap-4`}
            style={{ 
              gridTemplateColumns: `repeat(${viewSettings.columns}, minmax(0, 1fr))`
            }}
          >
            {searchResults.map((result, index) => (
              <Card 
                key={index} 
                className="overflow-hidden cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => {
                  setSelectedResult(result);
                  setShowDetailView(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    {result.type === "image" && (
                      <div className={`bg-muted rounded-lg overflow-hidden ${imageSize}`}>
                        {result.image_data && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={`data:${result.content_type};base64,${result.image_data}`} 
                            alt={result.description || "No description"} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}
                    <div>
                      <p className="font-medium line-clamp-3">
                        {result.type === "text" ? result.text : result.description || "No description"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Score: {result.score.toFixed(2)} • Type: {result.type}
                        {result.type === "image" && result.filename && ` • ${result.filename}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "list":
        return (
          <div className="flex flex-col gap-4">
            {searchResults.map((result, index) => (
              <Card 
                key={index}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => {
                  setSelectedResult(result);
                  setShowDetailView(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {result.type === "image" && (
                      <div className={`shrink-0 bg-muted rounded-lg overflow-hidden w-${imageSize} ${imageSize}`}>
                        {result.image_data && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={`data:${result.content_type};base64,${result.image_data}`} 
                            alt={result.description || "No description"} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {result.type === "text" ? result.text : result.description || "No description"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Score: {result.score.toFixed(2)} • Type: {result.type}
                        {result.type === "image" && result.filename && ` • ${result.filename}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "compact":
        return (
          <div className="flex flex-col divide-y">
            {searchResults.map((result, index) => (
              <div 
                key={index} 
                className="py-2 first:pt-0 last:pb-0 cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => {
                  setSelectedResult(result);
                  setShowDetailView(true);
                }}
              >
                <div className="flex gap-4 items-center">
                  {result.type === "image" && result.image_data && (
                    <div className="shrink-0 bg-muted rounded-lg overflow-hidden w-12 h-12">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`data:${result.content_type};base64,${result.image_data}`} 
                        alt={result.description || "No description"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">
                      {result.type === "text" ? result.text : result.description || "No description"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Score: {result.score.toFixed(2)} • Type: {result.type}
                      {result.type === "image" && result.filename && ` • ${result.filename}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  const renderDetailView = () => {
    if (!selectedResult) return null;

    return (
      <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedResult.type === "image" ? "Image Details" : "Text Content"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedResult.type === "image" ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${selectedResult.content_type};base64,${selectedResult.image_data}`}
                    alt={selectedResult.description || "No description"}
                    className="w-full h-auto object-contain"
                  />
                </div>
                {selectedResult.description && (
                  <p className="text-muted-foreground">{selectedResult.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Score: {selectedResult.score.toFixed(2)}</span>
                  {selectedResult.filename && (
                    <>
                      <span>•</span>
                      <span>{selectedResult.filename}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="whitespace-pre-wrap">{selectedResult.text}</p>
                <p className="text-sm text-muted-foreground">
                  Score: {selectedResult.score.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Search Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              ref={searchInputRef}
              placeholder="Search your knowledge base... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip open={!showThreshold ? undefined : false}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowThreshold(!showThreshold)}
                      className={showThreshold ? "bg-muted" : ""}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust similarity threshold</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out flex items-center gap-2 ${
                  showThreshold ? "w-[200px] opacity-100" : "w-0 opacity-0"
                }`}
              >
                <Slider
                  value={[searchThreshold]}
                  onValueChange={(value) => setSearchThreshold(value[0])}
                  min={0}
                  max={1}
                  step={0.05}
                  className="flex-1"
                />
                <div className="text-sm text-muted-foreground w-8 text-right">
                  {(searchThreshold).toFixed(2)}
                </div>
              </div>
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} results found
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newSettings = { ...viewSettings, mode: "grid" as ViewMode };
                    setViewSettings(newSettings);
                    localStorage.setItem("tidydata-view-settings", JSON.stringify(newSettings));
                  }}
                  className={viewSettings.mode === "grid" ? "bg-muted" : ""}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newSettings = { ...viewSettings, mode: "list" as ViewMode };
                    setViewSettings(newSettings);
                    localStorage.setItem("tidydata-view-settings", JSON.stringify(newSettings));
                  }}
                  className={viewSettings.mode === "list" ? "bg-muted" : ""}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {renderSearchResults()}
          </div>
        )}
      </div>

      {/* Command Palette */}
      <CommandDialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setShowCommandPalette(false);
                setShowAddContent(true);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Add Content
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setShowCommandPalette(false);
                fileInputRef.current?.click();
              }}
            >
              <Image className="mr-2 h-4 w-4" />
              Upload Images
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Add Content Dialog */}
      <Dialog open={showAddContent} onOpenChange={setShowAddContent}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Add to Knowledge Base</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Textarea
              placeholder="Add text content..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[200px]"
            />
            
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
                  >
                    <Image className="h-4 w-4" />
                    <span>{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-4 w-4 mr-2" />
                Add Images
              </Button>
              <Button
                variant="default"
                onClick={handleAddContent}
                className="flex-1"
                disabled={(!newContent && selectedFiles.length === 0) || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Add to Knowledge Base
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      {renderDetailView()}

      <Toaster />
    </>
  );
}
