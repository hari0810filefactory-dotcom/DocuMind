import React, { useState } from 'react';
import {
  LayoutDashboard,
  Files,
  FolderTree,
  Sparkles,
  Search,
  Bell,
  Clock,
  Network,
  Activity,
  Users,
  Settings,
  ChevronRight,
  ChevronDown,
  Star,
  Archive,
  Trash2,
  FileCheck,
  Bot,
  FileSearch,
  FileText,
  ListTodo,
  User,
  ShieldCheck,
  HardDrive,
  DatabaseBackup,
  Cpu,
  Info,
  X,
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'documents'
  | 'categories'
  | 'ai'
  | 'search'
  | 'reminders'
  | 'timeline'
  | 'relationships'
  | 'reports'
  | 'workspaces'
  | 'settings';

interface SidebarProps {
  activeSection: NavSection;
  subSection: string;
  onNavigate: (section: NavSection, subSection?: string) => void;
  documentCounts: {
    all: number;
    favorites: number;
    archived: number;
    trash: number;
    reviewRequired: number;
    pendingReminders: number;
  };
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  subSection,
  onNavigate,
  documentCounts,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleNav = (section: NavSection, sub: string = 'default') => {
    onNavigate(section, sub);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                DocuMind
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight mt-0.5">
                Offline Document Vault
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs">
          {/* 1. Dashboard */}
          <button
            onClick={() => handleNav('dashboard', 'overview')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'dashboard'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="truncate">Dashboard</span>
          </button>

          {/* 2. My Documents with sub-items */}
          <div>
            <button
              onClick={() => {
                setDocumentsOpen(!documentsOpen);
                handleNav('documents', 'all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
                activeSection === 'documents'
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Files className="w-4 h-4 shrink-0" />
                <span className="truncate">My Documents</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                  {documentCounts.all}
                </span>
                {documentsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {documentsOpen && (
              <div className="ml-5 pl-2 mt-0.5 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                <button
                  onClick={() => handleNav('documents', 'all')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'documents' && subSection === 'all'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Documents
                </button>
                <button
                  onClick={() => handleNav('documents', 'recent')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'documents' && subSection === 'recent'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => handleNav('documents', 'favorites')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'documents' && subSection === 'favorites'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>Favorites</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                    {documentCounts.favorites}
                  </span>
                </button>
                <button
                  onClick={() => handleNav('documents', 'shared')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'documents' && subSection === 'shared'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Shared with Me
                </button>
                <button
                  onClick={() => handleNav('documents', 'archived')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'documents' && subSection === 'archived'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Archive className="w-3 h-3" />
                    <span>Archived</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                    {documentCounts.archived}
                  </span>
                </button>
                <button
                  onClick={() => handleNav('documents', 'trash')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'documents' && subSection === 'trash'
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Trash</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                    {documentCounts.trash}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Categories */}
          <div>
            <button
              onClick={() => {
                setCategoriesOpen(!categoriesOpen);
                handleNav('categories', 'all');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
                activeSection === 'categories'
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FolderTree className="w-4 h-4 shrink-0" />
                <span className="truncate">Categories</span>
              </div>
              {categoriesOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {categoriesOpen && (
              <div className="ml-5 pl-2 mt-0.5 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                {[
                  'Identity',
                  'Education',
                  'Employment',
                  'Finance',
                  'Insurance',
                  'Property',
                  'Vehicle',
                  'Business',
                  'Other',
                ].map((catName) => (
                  <button
                    key={catName}
                    onClick={() => handleNav('categories', catName.toLowerCase())}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] truncate transition-colors ${
                      activeSection === 'categories' && subSection === catName.toLowerCase()
                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {catName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. AI Intelligence */}
          <div>
            <button
              onClick={() => {
                setAiOpen(!aiOpen);
                handleNav('ai', 'assistant');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
                activeSection === 'ai'
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Bot className="w-4 h-4 shrink-0 text-indigo-500" />
                <span className="truncate">AI Intelligence</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {documentCounts.reviewRequired > 0 && (
                  <span className="text-[10px] font-mono text-amber-500 font-bold">
                    {documentCounts.reviewRequired}
                  </span>
                )}
                {aiOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {aiOpen && (
              <div className="ml-5 pl-2 mt-0.5 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                <button
                  onClick={() => handleNav('ai', 'assistant')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'ai' && subSection === 'assistant'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Document Assistant
                </button>
                <button
                  onClick={() => handleNav('ai', 'extraction')}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'ai' && subSection === 'extraction'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>OCR &amp; Extraction</span>
                  {documentCounts.reviewRequired > 0 && (
                    <span className="text-[9px] text-amber-500 font-mono">Review</span>
                  )}
                </button>
                <button
                  onClick={() => handleNav('ai', 'summaries')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'ai' && subSection === 'summaries'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Summaries
                </button>
                <button
                  onClick={() => handleNav('ai', 'queue')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'ai' && subSection === 'queue'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Processing Queue
                </button>
              </div>
            )}
          </div>

          {/* 5. Smart Search */}
          <button
            onClick={() => handleNav('search', 'query')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'search'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="truncate">Smart Search</span>
          </button>

          {/* 6. Reminders */}
          <button
            onClick={() => handleNav('reminders', 'all')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'reminders'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Bell className="w-4 h-4 shrink-0" />
              <span className="truncate">Reminders</span>
            </div>
            {documentCounts.pendingReminders > 0 && (
              <span className="font-mono text-[10px] text-amber-500 tabular-nums">
                {documentCounts.pendingReminders}
              </span>
            )}
          </button>

          {/* 7. Document Timeline */}
          <button
            onClick={() => handleNav('timeline', 'chronological')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'timeline'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">Document Timeline</span>
          </button>

          {/* 8. Relationships */}
          <button
            onClick={() => handleNav('relationships', 'overview')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'relationships'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4 shrink-0" />
            <span className="truncate">Relationships</span>
          </button>

          {/* 9. Reports & Document Health */}
          <button
            onClick={() => handleNav('reports', 'health')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'reports'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span className="truncate">Reports &amp; Health</span>
          </button>

          {/* 10. Workspace and Members */}
          <button
            onClick={() => handleNav('workspaces', 'members')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'workspaces'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Workspace &amp; Members</span>
          </button>

          {/* 11. Settings with sub-items */}
          <div>
            <button
              onClick={() => {
                setSettingsOpen(!settingsOpen);
                handleNav('settings', 'profile');
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium transition-colors ${
                activeSection === 'settings'
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Settings className="w-4 h-4 shrink-0" />
                <span className="truncate">Settings</span>
              </div>
              {settingsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {settingsOpen && (
              <div className="ml-5 pl-2 mt-0.5 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                <button
                  onClick={() => handleNav('settings', 'profile')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'settings' && subSection === 'profile'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => handleNav('settings', 'security')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'settings' && subSection === 'security'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Privacy &amp; Security
                </button>
                <button
                  onClick={() => handleNav('settings', 'storage')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'settings' && subSection === 'storage'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Offline Storage
                </button>
                <button
                  onClick={() => handleNav('settings', 'backup')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'settings' && subSection === 'backup'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Backup &amp; Restore
                </button>
                <button
                  onClick={() => handleNav('settings', 'ai')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'settings' && subSection === 'ai'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  AI Preferences
                </button>
                <button
                  onClick={() => handleNav('settings', 'about')}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    activeSection === 'settings' && subSection === 'about'
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  About
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info: Local vault status */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Local Vault Active</span>
          </div>
          <span className="font-mono text-[10px]">v1.0</span>
        </div>
      </aside>
    </>
  );
};
