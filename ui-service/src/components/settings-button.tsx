"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServerEndpointSettings } from "@/components/server-endpoint-settings";
import { ViewSettings } from "@/components/view-settings";
import { Separator } from "@/components/ui/separator";

export function SettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex items-center justify-center hover:bg-muted"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-5 w-5" />
        <span className="sr-only">Settings</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <ServerEndpointSettings />
            <Separator />
            <ViewSettings />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 