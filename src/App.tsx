import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import VideoGenerator from "./pages/VideoGenerator";
import ResizeRebrand from "./pages/ResizeRebrand";
import ChunkedAudio from "./pages/ChunkedAudio";
import CharacterStudio from "./pages/CharacterStudio";
import CreationPage from "./pages/Creation";
import Navigation from "./components/Navigation";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/video-generator" element={<ProtectedRoute><VideoGenerator /></ProtectedRoute>} />
          <Route path="/resize-rebrand" element={<ProtectedRoute><ResizeRebrand /></ProtectedRoute>} />
          <Route path="/chunked-audio" element={<ProtectedRoute><ChunkedAudio /></ProtectedRoute>} />
          <Route path="/character-studio" element={<ProtectedRoute><CharacterStudio /></ProtectedRoute>} />
          <Route path="/creation/:characterId/:promptIndex" element={<ProtectedRoute><CreationPage /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
