import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from './Layout.tsx';;
import { AgendaRoute } from './routes/AgendaRoute.tsx';
import { AgendaDetailsRoute } from './routes/AgendaDetailsRoute.tsx';


createRoot(document.getElementById('root')!).render(
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route path="/" element={<AgendaRoute />} />
                <Route path="/:id" element={<AgendaDetailsRoute />} />
              </Route>
            </Routes>
          </BrowserRouter>
);
