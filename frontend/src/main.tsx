import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter, Route, Routes } from 'react-router';
import UserProfileRoute from './components/UserProfileRoute.tsx';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';

createRoot(document.getElementById('root')!).render(
<ApolloProvider client={client}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/uid/:id" element={<UserProfileRoute />} />
      </Routes>
    </BrowserRouter>
  </ApolloProvider>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/uid/:id" element={<UserProfileRoute />} />
    </Routes>
  </BrowserRouter>
);
