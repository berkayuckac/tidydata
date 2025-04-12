import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const VIEW_STORAGE_KEY = "tidydata-view-settings";

export type ViewMode = "grid" | "list" | "compact";
export type ViewSize = "small" | "medium" | "large";

export interface ViewSettings {
  mode: ViewMode;
  size: ViewSize;
  columns: number;
}

const DEFAULT_SETTINGS: ViewSettings = {
  mode: "grid",
  size: "medium",
  columns: 2
};

export function ViewSettings() {
  const [settings, setSettings] = useState<ViewSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse view settings:", e);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<ViewSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(updated));
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('viewSettingsUpdate', { detail: updated }));
    toast.success("View settings updated");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>View Mode</Label>
          <RadioGroup
            value={settings.mode}
            onValueChange={(value: ViewMode) => updateSettings({ mode: value })}
            className="grid grid-cols-3 gap-4 mt-2"
          >
            <div>
              <RadioGroupItem value="grid" id="grid" className="peer sr-only" />
              <Label
                htmlFor="grid"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <svg
                  className="mb-2 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid
              </Label>
            </div>
            <div>
              <RadioGroupItem value="list" id="list" className="peer sr-only" />
              <Label
                htmlFor="list"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <svg
                  className="mb-2 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                List
              </Label>
            </div>
            <div>
              <RadioGroupItem value="compact" id="compact" className="peer sr-only" />
              <Label
                htmlFor="compact"
                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <svg
                  className="mb-2 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Compact
              </Label>
            </div>
          </RadioGroup>
        </div>

        {settings.mode === "grid" && (
          <div className="space-y-2">
            <Label>Size</Label>
            <RadioGroup
              value={settings.size}
              onValueChange={(value: ViewSize) => updateSettings({ size: value })}
              className="grid grid-cols-3 gap-4 mt-2"
            >
              <div>
                <RadioGroupItem value="small" id="small" className="peer sr-only" />
                <Label
                  htmlFor="small"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Small
                </Label>
              </div>
              <div>
                <RadioGroupItem value="medium" id="medium" className="peer sr-only" />
                <Label
                  htmlFor="medium"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Medium
                </Label>
              </div>
              <div>
                <RadioGroupItem value="large" id="large" className="peer sr-only" />
                <Label
                  htmlFor="large"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  Large
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {settings.mode === "grid" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grid Columns</Label>
              <p className="text-sm text-muted-foreground">
                Adjust the number of columns in the grid view
              </p>
            </div>
            <div className="space-y-2">
              <Slider
                value={[settings.columns]}
                onValueChange={(value) => updateSettings({ columns: value[0] })}
                min={1}
                max={4}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">
                {settings.columns} {settings.columns === 1 ? "Column" : "Columns"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 