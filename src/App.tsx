import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLoading } from '@/components/AppLoading';
import HomePage from '@/pages/HomePage';
import AuthPage from '@/pages/AuthPage';
import OnboardingPage from '@/pages/OnboardingPage';
import type { ReactNode } from 'react';

// Everything that is not needed for the first paint is loaded on demand.
// This keeps the startup bundle small and the app responsive on low-end phones.
const PodcastsPage = lazy(() => import('@/pages/PodcastsPage'));
const PodcastDetailPage = lazy(() => import('@/pages/PodcastDetailPage'));
const HostsPage = lazy(() => import('@/pages/HostsPage'));
const HostProfilePage = lazy(() => import('@/pages/HostProfilePage'));
const MissionsPage = lazy(() => import('@/pages/MissionsPage'));
const ProgressPage = lazy(() => import('@/pages/ProgressPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/NotificationSettingsPage'));
const JournalPage = lazy(() => import('@/pages/JournalPage'));
const LifeWheelPage = lazy(() => import('@/pages/LifeWheelPage'));
const LearningPathsPage = lazy(() => import('@/pages/LearningPathsPage'));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'));
const DownloadsPage = lazy(() => import('@/pages/DownloadsPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const UpdatesPage = lazy(() => import('@/pages/UpdatesPage'));
const PlayerPage = lazy(() => import('@/pages/PlayerPage'));

function OnboardingGuard({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <AppLoading fullScreen label="جارٍ تجهيز رحلتك..." />;
  }

  if (profile && !profile.onboarded) {
    return <OnboardingPage />;
  }

  return <>{children}</>;
}

function RouteFallback() {
  return <AppLoading label="جارٍ فتح الصفحة..." />;
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Protected routes */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <HomePage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcasts"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PodcastsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcasts/:id"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PodcastDetailPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hosts"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <HostsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hosts/:slug"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <HostProfilePage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <MissionsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <ProgressPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/downloads"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <DownloadsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <FavoritesPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/player"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <PlayerPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <NotificationsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <ProfilePage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <SettingsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/updates"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <UpdatesPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/settings"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <NotificationSettingsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <JournalPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/life-wheel"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <LifeWheelPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning-paths"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <LearningPathsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <LeaderboardPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <AchievementsPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default App;
