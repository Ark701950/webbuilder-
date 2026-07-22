import React from 'react';
import { MainLayout } from '../components/MainLayout';
import { EmptyState, PageHeader } from '../components/ui-kit';
import { HeadphonesIcon } from 'lucide-react';

export const Support = () => (
  <MainLayout>
    <div className="space-y-6">
      <PageHeader title="Customer Support" description="Manage tickets, knowledge base, and customer inquiries" />
      <EmptyState
        icon={HeadphonesIcon}
        title="Support Center Coming Soon"
        description="Full ticket management, knowledge base, and customer portal are under development."
      />
    </div>
  </MainLayout>
);
