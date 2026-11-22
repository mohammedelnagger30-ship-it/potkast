import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import PodcastsPage from '@/pages/PodcastsPage';
import PodcastDetailPage from '@/pages/PodcastDetailPage';
import HostsPage from '@/pages/HostsPage';
import HostProfilePage from '@/pages/HostProfilePage';
import MissionsPage from '@/pages/MissionsPage';
import ProgressPage from '@/pages/ProgressPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationSettingsPage from '@/pages/NotificationSettingsPage';
import JournalPage from '@/pages/JournalPage';
import LifeWheelPage from '@/pages/LifeWheelPage';
import LearningPathsPage from '@/pages/LearningPathsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import AchievementsPage from '@/pages/AchievementsPage';
import DownloadsPage from '@/pages/DownloadsPage';
import PlayerPage from '@/pages/PlayerPage';
import AuthPage from '@/pages/AuthPage';
import OnboardingPage from '@/pages/OnboardingPage';
import type { ReactNode } from 'react';

function OnboardingGuard({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="w-12 h-12 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (profile && !profile.onboarded) {
    return <OnboardingPage />;
  }

  return <>{children}</>;
}

function App() {
  return (
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
  );
}

export default App;
