import React, { useState } from 'react';
import {
  Shield,
  HardDrive,
  WifiOff,
  Sparkles,
  ArrowRight,
  Check,
  Lock,
  User,
  Users,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { db, initializeWorkspaceDefaults } from '../../services/database/db';
import type { WorkspaceType } from '../../types';

interface OnboardingWizardProps {
  onComplete: () => void;
  setupPassword: (password: string, minutes: number) => Promise<void>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  setupPassword,
}) => {
  const [step, setStep] = useState<number>(1);

  // Form states
  const [displayName, setDisplayName] = useState('My Local Vault');
  const [workspaceName, setWorkspaceName] = useState('Personal Documents');
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('personal');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);
  const [enablePasswordProtection, setEnablePasswordProtection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (enablePasswordProtection) {
      if (masterPassword.length < 6) {
        setError('Master password must be at least 6 characters.');
        return;
      }
      if (masterPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create local user
      const userId = crypto.randomUUID();
      await db.users.add({
        id: userId,
        displayName: displayName.trim() || 'Owner',
        createdAt: new Date().toISOString(),
      });

      // 2. Create primary workspace
      const wsId = crypto.randomUUID();
      await db.workspaces.add({
        id: wsId,
        name: workspaceName.trim() || 'Personal Documents',
        type: workspaceType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 3. Create owner membership
      await db.workspaceMembers.add({
        id: crypto.randomUUID(),
        workspaceId: wsId,
        userId,
        name: displayName.trim() || 'Owner',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      });

      // 4. Initialize default categories
      await initializeWorkspaceDefaults(wsId, userId);

      // 5. Configure password protection if enabled
      if (enablePasswordProtection && masterPassword) {
        await setupPassword(masterPassword, autoLockMinutes);
      }

      localStorage.setItem('documind_active_workspace_id', wsId);
      localStorage.setItem('documind_onboarded', 'true');

      onComplete();
    } catch (err: any) {
      setError(`Setup failed: ${err.message || 'unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 md:p-8 flex flex-col">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">DocuMind Setup</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Step {step} of 3</span>
          </div>
        </div>

        {/* Step 1: Welcome & Offline Principles */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Your Documents. Organized. Understood. Always Accessible.
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                DocuMind is an independent, offline-first document platform. Before getting started,
                please review how your data is protected on this device:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="font-semibold text-slate-200">100% Local Storage</div>
                <div className="text-slate-400 leading-relaxed text-[11px]">
                  Files &amp; metadata are stored on your local device (OPFS &amp; IndexedDB). No remote cloud database or storage required.
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div className="font-semibold text-slate-200">Offline Intelligence</div>
                <div className="text-slate-400 leading-relaxed text-[11px]">
                  PDF extraction, OCR, rule-based classification, and search run entirely inside your browser without sending files away.
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="font-semibold text-slate-200">Optional Gemini AI</div>
                <div className="text-slate-400 leading-relaxed text-[11px]">
                  Cloud AI features require explicit per-action user consent and an internet connection. The core app never requires AI.
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="font-semibold text-slate-200">Backups Are Yours</div>
                <div className="text-slate-400 leading-relaxed text-[11px]">
                  Clearing browser site data will erase local storage. Use the built-in Backup &amp; Restore tool regularly to export backups.
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 text-xs transition-colors"
            >
              <span>Continue to Workspace Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Workspace & Profile */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Configure Local Workspace
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Choose the workspace type and assign a friendly name for your local profile.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex M."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Workspace Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceType('personal');
                      setWorkspaceName('Personal Documents');
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      workspaceType === 'personal'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4 mb-2 text-blue-400" />
                    <div className="font-semibold text-xs">Personal</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Individual use</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceType('household');
                      setWorkspaceName('Household Vault');
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      workspaceType === 'household'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4 mb-2 text-indigo-400" />
                    <div className="font-semibold text-xs">Household</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Family documents</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceType('business');
                      setWorkspaceName('Business Records');
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      workspaceType === 'business'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 mb-2 text-amber-400" />
                    <div className="font-semibold text-xs">Business</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Small enterprise</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 py-2.5 text-xs hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 text-xs transition-colors"
              >
                <span>Continue to Security</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Local Vault Password & Encryption */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Local Vault Security &amp; Encryption
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Protect sensitive documents with AES-GCM 256-bit encryption derived from a master password.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white">Enable Master Password Protection</div>
                  <div className="text-[11px] text-slate-400">
                    Lock vault when closing browser or after inactivity
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enablePasswordProtection}
                  onChange={(e) => setEnablePasswordProtection(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              {enablePasswordProtection && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Master Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Confirm Master Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Automatic Inactivity Lock
                    </label>
                    <select
                      value={autoLockMinutes}
                      onChange={(e) => setAutoLockMinutes(parseInt(e.target.value, 10))}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={15}>15 minutes (Recommended)</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={0}>Never lock automatically</option>
                    </select>
                  </div>
                </>
              )}

              {error && <div className="text-xs text-rose-400 font-medium">{error}</div>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 py-2.5 text-xs hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="w-2/3 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 text-xs transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Initializing Vault...' : 'Complete & Open Vault'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
