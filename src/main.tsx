import {createRoot} from 'react-dom/client';
import './forcePublicLanding.ts';
import './communicationSanitizer.ts';
import './arborisUiFixes.ts';
import './botEntryFlow.ts';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);