import { Component, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Editor } from "@/features/editor/Editor";
import { Home } from '@/features/home/Home';
import { Player } from '@/features/presenter/Player';
import { PresenterView } from '@/features/presenter/PresenterView';
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error)
      return (
        <div className="p-12">
          <h1 className="text-xl font-semibold">
            Something interrupted your workspace.
          </h1>
          <p className="my-4 text-muted-foreground">{this.state.error}</p>
          <button
            className="rounded bg-primary p-3 text-primary-foreground"
            onClick={() => location.reload()}
          >
            Reload presentation
          </button>
        </div>
      );
    return this.props.children;
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Editor />} />
            <Route path="/projects" element={<Home />} />
            <Route path="/edit/:projectId" element={<Editor />} />
            <Route path="/present/:id" element={<Player />} />
            <Route path="/presenter/:id" element={<PresenterView />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
