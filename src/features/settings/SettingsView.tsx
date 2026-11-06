import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Shield,
  HardDrive,
  DatabaseBackup,
  Cpu,
  Info,
  Lock,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { db, logActivity } from '../../services/database/db';
import { BackupService, type BackupManifest } from '../../services/backup/backupService';
import { FileStorageService } from '../../services/storage/fileStorage';
import { AiClientService } from '../../services/ai/aiClient';
import type { Workspace, User as UserType } from '../../types';

interface SettingsViewProps {
  workspace: Workspace | null;
  subSection: string; // 'profile' | 'security' | 'storage' | 'backup' | 'ai' | 'about'
  onLockVault: () => void;
  isVaultConfigured: boolean;
  autoLockMinutes: number;
  setupPassword: (password: string, minutes: number) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<boolean>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  workspace,
  subSection,
  onLockVault,
  isVaultConfigured,
  autoLockMinutes,
  setupPassword,
  changePassword,
}) => {
  const [activeTab, setActiveTab] = useState<
    'profile' | 'security' | 'storage' | 'backup' | 'ai' | 'about'
  >((subSection as any) || 'profile');

  // Profile states
  const [user, setUser] = useState<UserType | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Security password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [inactivityMinutes, setInactivityMinutes] = useState(autoLockMinutes || 15);

  // Storage states
  const [storageEstimate, setStorageEstimate] = useState<{
    usedBytes: number;
    quotaBytes: number;
    opfsActive: boolean;
  }>({ usedBytes: 0, quotaBytes: 0, opfsActive: false });

  // Backup states
  const [isExporting, setIsExporting] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // AI settings
  const [aiEnabled, setAiEnabled] = useState(true);

  useEffect(() => {
    if (subSection) {
      setActiveTab(subSection as any);
    }
  }, [subSection]);

  useEffect(() => {
    async function loadInitial() {
      const u = await db.users.toCollection().first();
      if (u) {
        setUser(u);
        setDisplayName(u.displayName);
      }
      const estimate = await FileStorageService.getStorageEstimate();
      setStorageEstimate(estimate);

      if (workspace) {
        const backups = await db.backups
          .where('workspaceId')
          .equals(workspace.id)
          .reverse()
          .toArray();
        setBackupHistory(backups);
      }

      setAiEnabled(AiClientService.isAiEnabledLocally());
    }
    loadInitial();
  }, [workspace?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setIsSavingProfile(true);
    await db.users.update(user.id, { displayName: displayName.trim() });
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
    setIsSavingProfile(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (isVaultConfigured) {
      const success = await changePassword(oldPassword, newPassword);
      if (!success) {
        setPasswordMsg({ type: 'error', text: 'Current password was incorrect.' });
        return;
      }
    } else {
      await setupPassword(newPassword, inactivityMinutes);
    }

    setPasswordMsg({ type: 'success', text: 'Master password updated successfully.' });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleExportBackup = async () => {
    if (!workspace) return;
    setIsExporting(true);
    try {
      const result = await BackupService.exportWorkspace(workspace.id, backupPassword);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);

      const backups = await db.backups.where('workspaceId').equals(workspace.id).reverse().toArray();
      setBackupHistory(backups);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileForRestore = async (file: File) => {
    setRestoreFile(file);
    setRestorePreview(null);
    setRestoreSuccess(null);
    const preview = await BackupService.previewBackup(file, restorePassword);
    setRestorePreview(preview);
  };

  const handleExecuteRestore = async () => {
    if (!workspace || !restorePreview || !restorePreview.manifest) return;
    setIsRestoring(true);
    try {
      const result = await BackupService.restore(restorePreview, workspace.id, 'merge');
      setRestoreSuccess(
        `Successfully restored ${result.restoredDocs} documents (${result.skippedDuplicates} duplicates skipped).`
      );
      setRestorePreview(null);
      setRestoreFile(null);
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleAiPreference = (checked: boolean) => {
    setAiEnabled(checked);
    AiClientService.setAiEnabledLocally(checked);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Platform Settings</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure security credentials, local storage quotas, backups, and privacy parameters.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
            activeTab === 'security'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Privacy &amp; Security
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
            activeTab === 'storage'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Offline Storage
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
            activeTab === 'backup'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Backup &amp; Restore
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
            activeTab === 'ai'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          AI Preferences
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`py-2 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
            activeTab === 'about'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          About
        </button>
      </div>

      {/* TAB 1: Profile */}
      {activeTab === 'profile' && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white">Local User Profile</h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 space-y-1 text-[11px] text-slate-500">
                <div>
                  User ID: <span className="font-mono text-slate-400">{user?.id}</span>
                </div>
                <div>
                  Created:{' '}
                  <span className="font-mono text-slate-400">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>

              {profileSuccess && (
                <div className="text-emerald-500 text-xs font-medium">
                  Profile updated successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Privacy & Security */}
      {activeTab === 'security' && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Master Vault Password</span>
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              {isVaultConfigured && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Current Master Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  New Master Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              {passwordMsg && (
                <div
                  className={`text-xs font-medium ${
                    passwordMsg.type === 'error' ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {passwordMsg.text}
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs"
              >
                {isVaultConfigured ? 'Update Master Password' : 'Set Master Password'}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-500" />
              <span>Instant Manual Lock</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Manually lock the vault now to purge derived cryptographic keys from RAM immediately.
            </p>
            <button
              onClick={onLockVault}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
            >
              Lock Vault Now
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Offline Storage */}
      {activeTab === 'storage' && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>Local Storage Engine</span>
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                <span className="text-slate-600 dark:text-slate-400">File Storage Driver</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {storageEstimate.opfsActive
                    ? 'Origin Private File System (OPFS)'
                    : 'IndexedDB Blob Vault'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                <span className="text-slate-600 dark:text-slate-400">Browser Estimated Usage</span>
                <span className="font-mono text-slate-900 dark:text-white tabular-nums">
                  {formatBytes(storageEstimate.usedBytes)} / {formatBytes(storageEstimate.quotaBytes)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Important: Browsers can evict local IndexedDB / OPFS data if device storage runs critically low or if site data is cleared. Always export regular encrypted backups.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="max-w-2xl space-y-6">
          {/* Export Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-500" />
              <span>Export Full Workspace Package</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Creates a self-contained ZIP archive containing all document files, versions, categories, OCR text, and cryptographic checksums.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Package Encryption Password (Optional)
                </label>
                <input
                  type="password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  placeholder="Leave empty for unencrypted ZIP or enter a password for .dmbackup"
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isExporting ? 'Generating Package...' : 'Export Backup File'}</span>
                </button>

                <button
                  onClick={async () => {
                    if (!workspace) return;
                    const json = await BackupService.exportMetadataJson(workspace.id);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `documind-metadata-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                >
                  Export Metadata (JSON)
                </button>
              </div>
            </div>
          </div>

          {/* Restore Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>Restore Workspace from Backup</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Select a .zip or .dmbackup file to preview and restore documents without overwriting.
            </p>

            <div className="space-y-3">
              <input
                type="file"
                accept=".zip,.dmbackup"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileForRestore(f);
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />

              {restorePreview?.isEncrypted && (
                <div className="space-y-2">
                  <div className="text-[11px] text-amber-500 font-medium">
                    This backup is encrypted. Please enter the decryption password:
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      placeholder="Backup password"
                      className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={() => restoreFile && handleFileForRestore(restoreFile)}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
                    >
                      Unlock Preview
                    </button>
                  </div>
                </div>
              )}

              {restorePreview?.manifest && (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Backup Package Verified
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Source: {restorePreview.manifest.workspaceName} · Created:{' '}
                    {new Date(restorePreview.manifest.createdAt).toLocaleDateString()} ·{' '}
                    {restorePreview.manifest.documentCount} document(s)
                  </div>

                  <button
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-xs"
                  >
                    {isRestoring ? 'Restoring Documents...' : 'Confirm Restore (Safe Merge)'}
                  </button>
                </div>
              )}

              {restorePreview?.error && (
                <div className="text-rose-500 text-[11px] font-medium">
                  {restorePreview.error}
                </div>
              )}

              {restoreSuccess && (
                <div className="text-emerald-500 text-xs font-medium">{restoreSuccess}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI Preferences */}
      {activeTab === 'ai' && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>Gemini AI Privacy Preferences</span>
            </h3>

            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Allow Online Gemini AI Enhancements
                </div>
                <div className="text-[11px] text-slate-400">
                  When enabled, you can opt-in to send document excerpts for Q&amp;A and summaries.
                </div>
              </div>
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => toggleAiPreference(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Disabling this option blocks all client-to-server AI requests. The core DocuMind application (PDF text extraction, local OCR, classification, and search) remains 100% functional offline without sending any data over the network.
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: About */}
      {activeTab === 'about' && (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white">DocuMind Platform</h3>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Your Documents. Organized. Understood. Always Accessible.
            </p>

            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              <div>Version: <span className="font-mono text-slate-400">1.0.0-pwa</span></div>
              <div>Architecture: <span className="font-mono text-slate-400">Local-First (IndexedDB + Dexie + OPFS)</span></div>
              <div>OCR Engine: <span className="font-mono text-slate-400">Tesseract.js (In-Browser Worker)</span></div>
              <div>PDF Extraction: <span className="font-mono text-slate-400">PDF.js</span></div>
              <div>Cryptography: <span className="font-mono text-slate-400">Web Crypto API (AES-GCM / PBKDF2)</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
