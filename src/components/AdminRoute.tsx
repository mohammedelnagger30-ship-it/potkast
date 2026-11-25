import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAdminStatus } from '@/lib/admin';
import { AppLoading } from './AppLoading';
import { Layout } from './layout';
import { Card } from './ui';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading, error } = useAdminStatus();

  if (loading) {
    return <AppLoading fullScreen label="جارٍ التحقق من صلاحيات الأدمن..." />;
  }

  // The RPC doesn't exist until the migration is run — show a useful setup hint
  // instead of silently bouncing the admin back to the home page.
  if (error) {
    return (
      <Layout title="لوحة الأدمن">
        <Card className="text-center py-12">
          <ShieldAlert size={40} className="mx-auto text-warning-500 mb-3" />
          <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-2">
            لوحة الأدمن غير مفعّلة بعد
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto mb-4">
            شغّل الملف <code dir="ltr" className="text-primary-600">supabase/migrations/20261125190000_admin_dashboard.sql</code>{' '}
            في Supabase SQL Editor، ثم أعد فتح هذه الصفحة.
          </p>
          <p className="text-xs text-neutral-400" dir="ltr">{error}</p>
        </Card>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
