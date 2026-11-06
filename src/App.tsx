import React, { useState, useEffect, useCallback } from 'react';
import { useVaultAuth } from './hooks/useVaultAuth';
import { useWorkspace } from './hooks/useWorkspace';
import { Sidebar, type NavSection } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { LockOverlay } from './components/layout/LockOverlay';
import { OfflineBanner } from './components/common/OfflineBanner';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { DashboardView } from './features/dashboard/DashboardView';
import { DocumentsView } from './features/documents/DocumentsView';
import { CategoriesView } from './features/categories/CategoriesView';
import { AIIntelligenceView } from './features/ai/AIIntelligenceView';
import { SmartSearchView } from './features/search/SmartSearchView';
import { RemindersView } from './features/reminders/RemindersView';
import { DocumentTimelineView } from './features/timeline/DocumentTimelineView';
import { RelationshipsView } from './features/relationships/RelationshipsView';
import { ReportsView } from './features/reports/ReportsView';
import { WorkspaceMembersView } from './features/workspaces/WorkspaceMembersView';
import { SettingsView } from './features/settings/SettingsView';
import { UploadModal } from './features/documents/UploadModal';
import { DocumentPreviewDrawer } from './features/documents/DocumentPreviewDrawer';
import { db } from './services/database/db';
import type { DocumentRecord } from './types';

export default function App() {
  const {
    isLocked,
    isConfigured: isVaultConfigured,
    autoLockMinutes,
    isLoading: isAuthLoading,
    lock: lockVault,
    unlock: unlockVault,
    setupPassword,
    changePassword,
  } = useVaultAuth();

  const {
    workspace,
    workspaces,
    categories,
    user,
    isLoading: isWsLoading,
    needsOnboarding,
    refresh: refreshWorkspace,
    switchWorkspace,
    createWorkspace,
  } = useWorkspace();

  // Navigation states
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [subSection, setSubSection] = useState<string>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);

  // Real document counts for sidebar
  const [documentCounts, setDocumentCounts] = useState({
    all: 0,
    favorites: 0,
    archived: 0,
    trash: 0,
    reviewRequired: 0,
    pendingReminders: 0,
  });

  const loadCounts = useCallback(async () => {
    if (!workspace) return;
    try {
      const docs = await db.documents.where('workspaceId').equals(workspace.id).toArray();
      const allActive = docs.filter((d) => !d.isDeleted && !d.isArchived);
      const favs = docs.filter((d) => !d.isDeleted && d.isFavorite);
      const arch = docs.filter((d) => !d.isDeleted && d.isArchived);
      const trash = docs.filter((d) => d.isDeleted);
      const reviews = docs.filter((d) => !d.isDeleted && d.processingStatus === 'review_required');

      const reminders = await db.reminders
        .where('workspaceId')
        .equals(workspace.id)
        .and((r) => r.status === 'pending')
        .count();

      setDocumentCounts({
        all: allActive.length,
        favorites: favs.length,
        archived: arch.length,
        trash: trash.length,
        reviewRequired: reviews.length,
        pendingReminders: reminders,
      });
    } catch (err) {
      console.error('Failed to update counts:', err);
    }
  }, [workspace?.id]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setActiveSection('search');
        setSubSection('query');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (section: NavSection, sub: string = 'default') => {
    setActiveSection(section);
    setSubSection(sub);
  };

  if (isAuthLoading || isWsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading DocuMind vault...
      </div>
    );
  }

  // First-run Onboarding
  if (needsOnboarding || !workspace) {
    return (
      <OnboardingWizard
        onComplete={() => {
          refreshWorkspace();
          loadCounts();
        }}
        setupPassword={setupPassword}
      />
    );
  }

  // Vault Locked Overlay
  if (isLocked) {
    return <LockOverlay onUnlock={unlockVault} />;
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return 'Dashboard';
      case 'documents':
        return 'My Documents';
      case 'categories':
        return 'Categories';
      case 'ai':
        return 'AI Intelligence';
      case 'search':
        return 'Smart Search';
      case 'reminders':
        return 'Reminders';
      case 'timeline':
        return 'Document Timeline';
      case 'relationships':
        return 'Relationships';
      case 'reports':
        return 'Reports & Document Health';
      case 'workspaces':
        return 'Workspace & Members';
      case 'settings':
        return 'Settings';
      default:
        return 'DocuMind';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        subSection={subSection}
        onNavigate={handleNavigate}
        documentCounts={documentCounts}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar Header */}
        <TopBar
          currentWorkspace={workspace}
          workspaces={workspaces}
          onSelectWorkspace={(id) => {
            switchWorkspace(id);
            loadCounts();
          }}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onLockVault={lockVault}
          isVaultConfigured={isVaultConfigured}
          onNavigateToSearch={() => {
            setActiveSection('search');
            setSubSection('query');
          }}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          activeNavTitle={getSectionTitle()}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              workspaceId={workspace.id}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onNavigate={handleNavigate}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
            />
          )}

          {activeSection === 'documents' && (
            <DocumentsView
              workspaceId={workspace.id}
              subSection={subSection}
              categories={categories}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
            />
          )}

          {activeSection === 'categories' && (
            <CategoriesView
              workspaceId={workspace.id}
              selectedCategoryName={subSection}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />
          )}

          {activeSection === 'ai' && (
            <AIIntelligenceView
              workspaceId={workspace.id}
              subSection={subSection}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
            />
          )}

          {activeSection === 'search' && (
            <SmartSearchView
              workspaceId={workspace.id}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
            />
          )}

          {activeSection === 'reminders' && (
            <RemindersView
              workspaceId={workspace.id}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
            />
          )}

          {activeSection === 'timeline' && (
            <DocumentTimelineView
              workspaceId={workspace.id}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
            />
          )}

          {activeSection === 'relationships' && (
            <RelationshipsView
              workspaceId={workspace.id}
              onSelectDocument={(doc) => setSelectedDoc(doc)}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsView workspaceId={workspace.id} />
          )}

          {activeSection === 'workspaces' && (
            <WorkspaceMembersView
              currentWorkspace={workspace}
              workspaces={workspaces}
              onSelectWorkspace={(id) => {
                switchWorkspace(id);
                loadCounts();
              }}
              onCreateWorkspace={createWorkspace}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              workspace={workspace}
              subSection={subSection}
              onLockVault={lockVault}
              isVaultConfigured={isVaultConfigured}
              autoLockMinutes={autoLockMinutes}
              setupPassword={setupPassword}
              changePassword={changePassword}
            />
          )}
        </main>
      </div>

      {/* Slide-out Document Preview Drawer */}
      <DocumentPreviewDrawer
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        categories={categories}
        onDocumentUpdated={() => {
          loadCounts();
          if (selectedDoc) {
            db.documents.get(selectedDoc.id).then((d) => setSelectedDoc(d || null));
          }
        }}
      />

      {/* Multi-file Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        workspaceId={workspace.id}
        categories={categories}
        onUploadComplete={() => {
          loadCounts();
          setIsUploadModalOpen(false);
        }}
      />

      {/* Offline Connectivity Notification Banner */}
      <OfflineBanner />
    </div>
  );
}
