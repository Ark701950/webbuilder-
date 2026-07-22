import React from 'react';
import { MainLayout } from '../components/MainLayout';
import { EmptyState, PageHeader } from '../components/ui-kit';
import { MessageSquare } from 'lucide-react';

export const Messages = () => (
  <MainLayout>
    <div className="space-y-6">
      <PageHeader title="Messages" description="Team chat and direct messaging" />
      <EmptyState
        icon={MessageSquare}
        title="Messaging Coming Soon"
        description="Real-time team chat with channels, direct messages, and video calls is under development."
      />
    </div>
  </MainLayout>
);
