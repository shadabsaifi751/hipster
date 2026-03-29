import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Header } from '../components/layout/Header';
import { SubHeader } from '../components/layout/SubHeader';
import { VirtualCalendar } from '../components/calendar/VirtualCalendar';
import { BookingPanel } from '../components/forms/BookingPanel';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export default function Dashboard() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-sm">
      <Helmet>
        <title>Spa Booking Management</title>
        <meta name="description" content="Spa and wellness booking management for outlet operations." />
      </Helmet>

      <Header />
      <SubHeader />

      <main className="flex flex-1 overflow-hidden relative">
        <ErrorBoundary>
          <div className="flex-1 h-full overflow-hidden bg-white border-r border-gray-200">
            <VirtualCalendar />
          </div>
        </ErrorBoundary>

        <BookingPanel />
      </main>
    </div>
  );
}
