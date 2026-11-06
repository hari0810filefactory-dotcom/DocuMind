import React, { useState, useEffect } from 'react';
import {
  Lock,
  Sun,
  Moon,
  Plus,
  Search,
  ChevronDown,
  Shield,
  Layers,
  Menu,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import type { Workspace } from '../../types';

interface TopBarProps {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  onSelectWorkspace: (id: string) => void;
  onOpenUpload: () => void;
  onLockVault: () => void;
  isVaultConfigured: boolean;
  onNavigateToSearch: () => void;
  onToggleMobileSidebar: () => void;
  activeNavTitle: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentWorkspace,
  workspaces,
  onSelectWorkspace,
  onOpenUpload,
  onLockVault,
  isVaultConfigured,
  onNavigateToSearch,
  onToggleMobileSidebar,
  activeNavTitle,
}) => {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState<boolean>(false);

  // Sync theme with html class
  useEffect(() => {
    const saved = localStorage.getItem('documind_theme');
    const prefersDark = saved ? saved === 'dark' : true;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('documind_theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-4 md:px-6 flex items-center justify-between gap-4 select-none shrink-0 z-30 transition-colors">
      {/* Zone 1: Mobile Hamburger + Workspace Wordmark & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-md"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 px-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60"
            title="Switch workspace"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span className="truncate max-w-[130px] font-medium">
              {currentWorkspace?.name || 'Workspace'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showWorkspaceMenu && (
            <div
              className="absolute left-0 mt-1 w-52 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 text-xs"
              onMouseLeave={() => setShowWorkspaceMenu(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setShowWorkspaceMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    ws.id === currentWorkspace?.id
                      ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-950/30'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{ws.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
        <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">
          {activeNavTitle}
        </span>
      </div>

      {/* Zone 2: Quick Search Input */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
        <button
          onClick={onNavigateToSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search documents, extracted text, metadata...</span>
          </div>
          <kbd className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Actions (PWA install, Lock, Theme toggle, Upload Document CTA) */}
      <div className="flex items-center gap-2 shrink-0">
        <PWAInstallButton />

        {isVaultConfigured && (
          <button
            onClick={onLockVault}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Lock Local Vault"
            aria-label="Lock Vault"
          >
            <Lock className="w-4 h-4 text-amber-500" />
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle color theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors shadow-xs whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>
    </header>
  );
};
