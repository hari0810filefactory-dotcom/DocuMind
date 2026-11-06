import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  FileText,
  Star,
  Archive,
  Trash2,
  FolderTree,
  Sparkles,
  Bell,
  Clock,
  GitBranch,
  BarChart3,
  Users,
  Settings,
  Upload,
  Moon,
  Sun,
  Lock,
  Download,
  ArrowRight,
  Shield,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { db } from '../../services/database/db';
import type { NavSection } from '../layout/Sidebar';
import type { DocumentRecord } from '../../types';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: 'Navigation' | 'Actions' | 'Documents';
  icon: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: NavSection, subSection?: string) => void;
  onOpenUpload: () => void;
  onLockVault: () => void;
  onSelectDocument: (doc: DocumentRecord) => void;
  workspaceId: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenUpload,
  onLockVault,
  onSelectDocument,
  workspaceId,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [matchingDocs, setMatchingDocs] = useState<DocumentRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Query workspace documents dynamically when typing
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    if (!query.trim()) {
      setMatchingDocs([]);
      return;
    }

    const q = query.toLowerCase().trim();
    db.documents
      .where('workspaceId')
      .equals(workspaceId)
      .filter(
        (d) =>
          !d.isDeleted &&
          (d.title.toLowerCase().includes(q) ||
            d.documentType.toLowerCase().includes(q) ||
            d.originalFileName.toLowerCase().includes(q))
      )
      .limit(5)
      .toArray()
      .then((docs) => setMatchingDocs(docs))
      .catch((err) => console.error('Failed to query docs in palette:', err));
  }, [query, isOpen, workspaceId]);

  // Toggle Theme handler
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('documind_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('documind_theme', 'dark');
    }
  };

  // Base command list
  const baseCommands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'System metrics, quick stats, and recent vault activities',
      category: 'Navigation',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-500" />,
      action: () => onNavigate('dashboard', 'overview'),
    },
    {
      id: 'nav-all-docs',
      title: 'All Documents',
      description: 'Browse, filter, and organize all stored documents',
      category: 'Navigation',
      icon: <FileText className="w-4 h-4 text-slate-400" />,
      action: () => onNavigate('documents', 'all'),
    },
    {
      id: 'nav-recent-docs',
      title: 'Recent Documents',
      description: 'View the most recently ingested documents',
      category: 'Navigation',
      icon: <Clock className="w-4 h-4 text-blue-400" />,
      action: () => onNavigate('documents', 'recent'),
    },
    {
      id: 'nav-favorite-docs',
      title: 'Favorites',
      description: 'Quickly access starred and prioritized documents',
      category: 'Navigation',
      icon: <Star className="w-4 h-4 text-amber-400" />,
      action: () => onNavigate('documents', 'favorites'),
    },
    {
      id: 'nav-archived-docs',
      title: 'Archived Documents',
      description: 'View historical and archived records',
      category: 'Navigation',
      icon: <Archive className="w-4 h-4 text-slate-400" />,
      action: () => onNavigate('documents', 'archived'),
    },
    {
      id: 'nav-trash',
      title: 'Trash Bin',
      description: 'Manage deleted documents or restore them',
      category: 'Navigation',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      action: () => onNavigate('documents', 'trash'),
    },
    {
      id: 'nav-categories',
      title: 'Categories & Schemas',
      description: 'Manage folder taxonomies and document types',
      category: 'Navigation',
      icon: <FolderTree className="w-4 h-4 text-indigo-400" />,
      action: () => onNavigate('categories'),
    },
    {
      id: 'nav-ai',
      title: 'AI Intelligence',
      description: 'Ask questions, summarize, and extract insights',
      category: 'Navigation',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      action: () => onNavigate('ai', 'qa'),
    },
    {
      id: 'nav-search',
      title: 'Smart Search',
      description: 'Full-text OCR search and metadata filtering',
      category: 'Navigation',
      icon: <Search className="w-4 h-4 text-blue-500" />,
      shortcut: 'Ctrl+K',
      action: () => onNavigate('search', 'query'),
    },
    {
      id: 'nav-reminders',
      title: 'Reminders & Expirations',
      description: 'Track document expiration alerts and deadlines',
      category: 'Navigation',
      icon: <Bell className="w-4 h-4 text-amber-500" />,
      action: () => onNavigate('reminders'),
    },
    {
      id: 'nav-timeline',
      title: 'Document Timeline',
      description: 'Visual chronological lifecycle of your vault',
      category: 'Navigation',
      icon: <Clock className="w-4 h-4 text-indigo-400" />,
      action: () => onNavigate('timeline'),
    },
    {
      id: 'nav-relationships',
      title: 'Cross-Document Relationships',
      description: 'Parent-child hierarchies, contracts, and renewals',
      category: 'Navigation',
      icon: <GitBranch className="w-4 h-4 text-cyan-400" />,
      action: () => onNavigate('relationships'),
    },
    {
      id: 'nav-reports',
      title: 'Audit Reports & Health Score',
      description: 'Completeness rating, compliance, and gap analysis',
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4 text-emerald-400" />,
      action: () => onNavigate('reports'),
    },
    {
      id: 'nav-workspaces',
      title: 'Workspace Management',
      description: 'Switch vaults and manage local workspace profiles',
      category: 'Navigation',
      icon: <Users className="w-4 h-4 text-slate-400" />,
      action: () => onNavigate('workspaces'),
    },
    {
      id: 'nav-settings-backup',
      title: 'Settings: Backup & Restore',
      description: 'Export full ZIP archives, raw files, or JSON metadata',
      category: 'Navigation',
      icon: <Download className="w-4 h-4 text-blue-400" />,
      action: () => onNavigate('settings', 'backup'),
    },
    {
      id: 'nav-settings-security',
      title: 'Settings: Privacy & Security',
      description: 'Master password setup and auto-lock preferences',
      category: 'Navigation',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      action: () => onNavigate('settings', 'security'),
    },
    {
      id: 'nav-settings-storage',
      title: 'Settings: Offline Storage',
      description: 'Origin Private File System (OPFS) and quota statistics',
      category: 'Navigation',
      icon: <HardDrive className="w-4 h-4 text-indigo-400" />,
      action: () => onNavigate('settings', 'storage'),
    },
    {
      id: 'nav-settings-ai',
      title: 'Settings: AI Preferences',
      description: 'Configure online Gemini AI opt-in and privacy',
      category: 'Navigation',
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
      action: () => onNavigate('settings', 'ai'),
    },

    // Actions
    {
      id: 'act-upload',
      title: 'Upload Document',
      description: 'Ingest PDF, image, or document into local vault',
      category: 'Actions',
      icon: <Upload className="w-4 h-4 text-emerald-500" />,
      shortcut: 'U',
      action: () => onOpenUpload(),
    },
    {
      id: 'act-theme',
      title: 'Toggle Color Theme',
      description: 'Switch between dark mode and light mode',
      category: 'Actions',
      icon: <Sun className="w-4 h-4 text-amber-400" />,
      shortcut: 'T',
      action: () => toggleTheme(),
    },
    {
      id: 'act-lock',
      title: 'Lock Vault Now',
      description: 'Purge derived keys from RAM immediately',
      category: 'Actions',
      icon: <Lock className="w-4 h-4 text-amber-500" />,
      shortcut: 'L',
      action: () => onLockVault(),
    },
    {
      id: 'act-export-backup',
      title: 'Export Full Backup Package',
      description: 'Jump to backup export to download ZIP archive',
      category: 'Actions',
      icon: <Download className="w-4 h-4 text-blue-500" />,
      action: () => onNavigate('settings', 'backup'),
    },
  ];

  // Map document search hits into items
  const docCommands: CommandItem[] = matchingDocs.map((doc) => ({
    id: `doc-${doc.id}`,
    title: doc.title,
    description: `${doc.documentType} · ${doc.originalFileName}`,
    category: 'Documents',
    icon: <FileText className="w-4 h-4 text-blue-400" />,
    action: () => onSelectDocument(doc),
  }));

  // Filter commands by query
  const q = query.toLowerCase().trim();
  const filteredCommands: CommandItem[] = [
    ...docCommands,
    ...baseCommands.filter((cmd) => {
      if (!q) return true;
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchDesc = cmd.description?.toLowerCase().includes(q);
      const matchCategory = cmd.category.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCategory;
    }),
  ];

  // Handle keyboard events (ArrowUp, ArrowDown, Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Keep selected item scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-850">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search documents, or jump to section..."
            className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden text-sm"
          />
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Command Items List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching commands or documents found for &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  data-selected={isSelected}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {cmd.title}
                      </div>
                      {cmd.description && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-200 dark:border-slate-700">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Navigation Help */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400 select-none">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300">
                &uarr;&darr;
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300">
                &crarr;
              </kbd>{' '}
              Select
            </span>
          </div>
          <span>DocuMind Global Command Center</span>
        </div>
      </div>
    </div>
  );
};
