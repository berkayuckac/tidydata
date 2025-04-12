"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const DEFAULT_ENDPOINT = "http://localhost:8000";
const DEFAULT_THRESHOLD = 0.5;
const ENDPOINT_STORAGE_KEY = "tidydata-server-endpoint";
const THRESHOLD_STORAGE_KEY = "tidydata-search-threshold";

export function ServerEndpointSettings() {
  const [savedEndpoint, setSavedEndpoint] = useState(DEFAULT_ENDPOINT);
  const [tempEndpoint, setTempEndpoint] = useState(DEFAULT_ENDPOINT);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  useEffect(() => {
    const storedEndpoint = localStorage.getItem(ENDPOINT_STORAGE_KEY);
    if (storedEndpoint) {
      setSavedEndpoint(storedEndpoint);
      setTempEndpoint(storedEndpoint);
    }

    const storedThreshold = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (storedThreshold) {
      setThreshold(parseFloat(storedThreshold));
    }
  }, []);

  const handleSave = () => {
    try {
      // Validate and format the URL
      let url;
      const formattedEndpoint = tempEndpoint
        .replace(/localhost([0-9]+)/, 'localhost:$1') 
        .replace(/([^:])\/\//, '$1/'); 

      try {
        url = new URL(formattedEndpoint);
        if (!url.protocol.startsWith('http')) {
          url = new URL(`http://${formattedEndpoint}`);
        }
      } catch (e) {
        try {
          url = new URL(`http://${formattedEndpoint}`);
        } catch (e) {
          toast.error("Invalid URL format", {
            description: "Please enter a valid URL (e.g., http://localhost:8000)"
          });
          return;
        }
      }

      // Store the normalized URL
      const normalizedUrl = url.toString().replace(/\/$/, '');
      setSavedEndpoint(normalizedUrl);
      localStorage.setItem(ENDPOINT_STORAGE_KEY, normalizedUrl);
      toast.success("Server endpoint updated", {
        description: normalizedUrl
      });
    } catch (error) {
      toast.error("Failed to save endpoint", {
        description: error instanceof Error ? error.message : "Please check the URL format"
      });
    }
  };

  const handleThresholdChange = (value: number[]) => {
    const newThreshold = value[0];
    setThreshold(newThreshold);
    localStorage.setItem(THRESHOLD_STORAGE_KEY, newThreshold.toString());
    // Dispatch custom event for threshold update
    window.dispatchEvent(new CustomEvent('thresholdUpdate', { detail: newThreshold }));
    toast.success("Search threshold updated", {
      description: `New threshold: ${newThreshold.toFixed(2)}`
    });
  };

  const hasChanges = savedEndpoint !== tempEndpoint;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="server-endpoint">Server Endpoint</Label>
        <div className="flex gap-2">
          <Input
            id="server-endpoint"
            value={tempEndpoint}
            onChange={(e) => setTempEndpoint(e.target.value)}
            placeholder="Enter server endpoint URL"
          />
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges}
            className="min-w-[80px]"
          >
            {hasChanges ? "Save" : <Check className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search Threshold</Label>
          <p className="text-sm text-muted-foreground">
            Adjust the minimum similarity score (0.0 - 1.0) for search results. Higher values mean stricter matching.
          </p>
        </div>
        <div className="space-y-2">
          <Slider
            value={[threshold]}
            onValueChange={handleThresholdChange}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
          <div className="text-sm text-muted-foreground text-center">
            Current: {threshold.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
} 