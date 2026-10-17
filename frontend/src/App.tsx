import { Component, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Editor } from "@/features/editor/Editor";
import { Home } from '@/features/home/Home';
import { Player } from '@/features/presenter/Player';
import { PresenterView } from '@/features/presenter/PresenterView';
import { strings } from "@/strings";
import { useLocale, useTranslation } from '@/features/localization/locale';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error) return <AppError error={this.state.error} />;
    return this.props.children;
  }
}

function AppError({ error }: { error: string }) {
  const t = useTranslation();
  return (
    <div className={strings.app.p12}>
      <h1 className={strings.app.textXlFontSemibold}>{t(strings.app.errorTitle)}</h1>
      <p className={strings.app.my4TextMutedForeground}>{error}</p>
      <button className={strings.app.roundedBgPrimaryP3TextPrimaryForeground} onClick={() => location.reload()}>
        {t(strings.app.reload)}
      </button>
    </div>
  );
}

export default function App() {
  const locale = useLocale((state) => state.locale);
  return (
    <ErrorBoundary>
      <DirectionProvider direction={locale === 'ar' ? 'rtl' : 'ltr'}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path={strings.common.symbol_8a5edab2} element={<Editor />} />
            <Route path={strings.common.projects} element={<Home />} />
            <Route path={strings.app.editProjectId} element={<Editor />} />
            <Route path={strings.app.presentId} element={<Player />} />
            <Route path={strings.app.presenterId} element={<PresenterView />} />
          </Routes>
        </BrowserRouter>
        <Toaster position={strings.app.bottomRight} />
      </TooltipProvider>
      </DirectionProvider>
    </ErrorBoundary>
  );
}
