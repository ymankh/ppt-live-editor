import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './fonts.css'
import App from './App.tsx'
import { strings } from "@/strings";
import '@/features/localization/locale';


const root = document.getElementById(strings.app.root);
if (!root) throw new Error(strings.app.applicationRootIsMissing);
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
