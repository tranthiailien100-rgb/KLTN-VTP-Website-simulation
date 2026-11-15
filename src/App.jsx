import { useMemo } from 'react';
import { ToastProvider } from './state/ToastContext.jsx';
import { SessionProvider, useSession } from './state/SessionContext.jsx';
import { SimProvider } from './state/SimContext.jsx';
import { NoticeStrip } from './components/layout/NoticeStrip.jsx';
import { Header } from './components/layout/Header.jsx';
import { MainMenu } from './components/layout/MainMenu.jsx';
import { Banner, Breadcrumb } from './components/layout/Banner.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { FloatingToolbar, ChatAndTop } from './components/layout/FloatingUI.jsx';
import { TrackingScreen } from './components/tracking/TrackingScreen.jsx';
import { NotificationBridge } from './components/tracking/NotificationBridge.jsx';
import { EvaluationScreen, ThanksScreen } from './components/eval/EvaluationScreen.jsx';
import { AdminPanel } from './components/admin/AdminPanel.jsx';

const BANNERS = {
  tracking: { title: 'TRA CỨU HÀNH TRÌNH ĐƠN HÀNG', subtitle: '“Mạng chuyển phát nhanh rộng khắp"', crumb: 'Tra cứu hành trình đơn hàng' },
  evaluation: { title: 'ĐÁNH GIÁ TRẢI NGHIỆM', subtitle: 'Cảm ơn bạn đã trải nghiệm hai giao diện', crumb: 'Đánh giá trải nghiệm' },
  thanks: { title: 'CẢM ƠN BẠN', subtitle: 'Khảo sát đã hoàn tất', crumb: 'Đánh giá trải nghiệm' },
};

function Shell({ admin, initialCode }) {
  const { session, mode } = useSession();
  const isNew = mode === 'new';
  const b = BANNERS[session.screen] || BANNERS.tracking;

  return (
    <div className="min-h-screen bg-white">
      <NoticeStrip />
      <Header showBell={isNew} />
      <MainMenu />
      <Banner title={b.title} subtitle={b.subtitle} />
      <Breadcrumb current={b.crumb} />

      <main>
        {session.screen === 'tracking' && <TrackingScreen initialCode={initialCode} />}
        {session.screen === 'evaluation' && <EvaluationScreen />}
        {session.screen === 'thanks' && <ThanksScreen />}
      </main>

      <Footer />
      <FloatingToolbar />
      <ChatAndTop />
      <NotificationBridge active={isNew} />
      {admin && <AdminPanel />}
    </div>
  );
}

export default function App() {
  const { admin, initialCode } = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return { admin: p.get('admin') === '1', initialCode: p.get('code') || '' };
  }, []);

  return (
    <ToastProvider>
      <SessionProvider>
        <SimProvider>
          <Shell admin={admin} initialCode={initialCode} />
        </SimProvider>
      </SessionProvider>
    </ToastProvider>
  );
}
