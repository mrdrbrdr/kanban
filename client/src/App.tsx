import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/useTheme';
import { AppShell } from './components/layout/AppShell';
import { BoardView } from './components/board/BoardView';
import { ListView } from './components/list/ListView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/boards" replace />} />
              <Route path="/boards" element={<BoardView />} />
              <Route path="/boards/:boardId" element={<BoardView />} />
              <Route path="/boards/:boardId/cards/:cardId" element={<ListView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
