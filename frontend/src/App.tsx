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
import { PresentationFontGate } from '@/features/fonts/PresentationFontGate';
import { userMessage } from '@/features/errors/userMessage';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  // React logs the technical error to the console; people see a friendly explanation.
  static getDerivedStateFromError(error: unknown) {
    return { error: userMessage(error, strings.errors.unexpected) };
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
      <p className={strings.app.my4TextMutedForeground}>{t(error)}</p>
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
            <Route path={strings.common.symbol_8a5edab2} element={<PresentationFontGate><Editor /></PresentationFontGate>} />
            <Route path={strings.common.projects} element={<Home />} />
            <Route path={strings.app.editProjectId} element={<PresentationFontGate><Editor /></PresentationFontGate>} />
            <Route path={strings.app.presentId} element={<PresentationFontGate><Player /></PresentationFontGate>} />
            <Route path={strings.app.presenterId} element={<PresentationFontGate><PresenterView /></PresentationFontGate>} />
          </Routes>
        </BrowserRouter>
        {/* Notifications sit at the inline end: bottom right in English, bottom left in Arabic. */}
        <Toaster position={locale === 'ar' ? strings.app.bottomLeft : strings.app.bottomRight} />
      </TooltipProvider>
      </DirectionProvider>
    </ErrorBoundary>
  );
}
