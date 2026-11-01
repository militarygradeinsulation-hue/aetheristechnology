import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GoldenStandaloneApp } from "./GoldenStandaloneApp";
import "@/index.css";

const element = document.getElementById("root");
if (!element) throw new Error("Golden Report mount element is missing");

const client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
createRoot(element).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <GoldenStandaloneApp />
        <Sonner />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
