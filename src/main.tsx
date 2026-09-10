import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// 생성 이미지(public/art) 경로: GitHub Pages 하위 경로에서도 맞게 (src/remotion/art.tsx 참고)
window.__PSG_ART_BASE = import.meta.env.BASE_URL;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
