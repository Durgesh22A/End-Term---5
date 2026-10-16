import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import ProtectedRoute from './routes/ProtectedRoute';
import PersistentPlayer from './components/layout/PersistentPlayer';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Player from './components/layout/Player';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import LikedSongsPage from './pages/LikedSongsPage';
import HistoryPage from './pages/HistoryPage';
import PlaylistPage from './pages/PlaylistPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';
import ArtistPage from './pages/ArtistPage';
import AlbumPage from './pages/AlbumPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * AppShell — uses useAuth() which requires AuthProvider to be above it.
 * BrowserRouter is outside so router hooks work in ALL children including
 * AuthProvider's callbacks (e.g., navigate after login).
 */
const AppShell = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:32, fontFamily:'var(--font-heading)', fontWeight:800, background:'var(--accent-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          VibeTube
        </div>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && <PersistentPlayer />}
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
        } />
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app-shell">
              <Sidebar />
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/liked" element={<LikedSongsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/downloads" element={<DownloadsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/artist/:name" element={<ArtistPage />} />
                  <Route path="/album/:name" element={<AlbumPage />} />
                  <Route path="/playlist/:id" element={<PlaylistPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              <Player />
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <PlayerProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <AppShell />
      </PlayerProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
