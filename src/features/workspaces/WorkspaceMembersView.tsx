import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  User,
  Shield,
  Plus,
  Trash2,
  Server,
  Layers,
  CheckCircle,
  Network,
  X,
} from 'lucide-react';
import { db, logActivity } from '../../services/database/db';
import type { Workspace, WorkspaceMember, MemberRole, WorkspaceType } from '../../types';

interface WorkspaceMembersViewProps {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, type: WorkspaceType) => Promise<Workspace>;
}

export const WorkspaceMembersView: React.FC<WorkspaceMembersViewProps> = ({
  currentWorkspace,
  workspaces,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);

  // New member form state
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('member');

  // New workspace form state
  const [newWsName, setNewWsName] = useState('');
  const [newWsType, setNewWsType] = useState<WorkspaceType>('personal');

  const loadMembers = async () => {
    if (!currentWorkspace) return;
    const memberList = await db.workspaceMembers
      .where('workspaceId')
      .equals(currentWorkspace.id)
      .toArray();
    setMembers(memberList);
  };

  useEffect(() => {
    loadMembers();
  }, [currentWorkspace?.id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !memberName.trim()) return;

    await db.workspaceMembers.add({
      id: crypto.randomUUID(),
      workspaceId: currentWorkspace.id,
      userId: crypto.randomUUID(),
      name: memberName.trim(),
      role: memberRole,
      joinedAt: new Date().toISOString(),
    });

    await logActivity(
      currentWorkspace.id,
      'user',
      'Added workspace member',
      memberName.trim(),
      `Role: ${memberRole}`
    );

    setIsAddModalOpen(false);
    setMemberName('');
    setMemberRole('member');
    loadMembers();
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    await onCreateWorkspace(newWsName.trim(), newWsType);
    setIsCreateWsOpen(false);
    setNewWsName('');
  };

  const handleDeleteMember = async (id: string) => {
    await db.workspaceMembers.delete(id);
    loadMembers();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span>Workspace &amp; Members</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage local household/business profiles, permissions, and LAN service boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateWsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>New Workspace</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Workspace Switcher Cards */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Your Workspaces
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {workspaces.map((ws) => {
            const isSelected = ws.id === currentWorkspace?.id;
            return (
              <div
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {ws.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                    {ws.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Created {new Date(ws.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Members Table */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Workspace Members ({members.length})
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-4">Member Name</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4 font-mono">Joined Date</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {m.name}
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-300">
                    <span
                      className={`text-[11px] font-medium ${
                        m.role === 'owner' ? 'text-blue-500' : 'text-slate-500'
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 tabular-nums">
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Future LAN Mode Readiness Architecture Documentation Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Server className="w-4 h-4 text-indigo-500" />
          <span>Future Private LAN Deployment Architecture</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          DocuMind service interfaces are designed for seamless extension to a private local server on your LAN (Raspberry Pi, NAS, or home server). In LAN mode, member roles, document permissions, audit trails, and conflict detection operate over your local network without internet dependence. IndexedDB remains strictly isolated per device until synced to your configured private server.
        </p>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Local Member
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Member Display Name
                </label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Jordan (Family Member)"
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Role &amp; Permissions
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as MemberRole)}
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="admin">Admin (Full Edit &amp; Upload)</option>
                  <option value="member">Member (Upload &amp; View)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {isCreateWsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create New Workspace
              </h3>
              <button
                onClick={() => setIsCreateWsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Small Business Vault"
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Type
                </label>
                <select
                  value={newWsType}
                  onChange={(e) => setNewWsType(e.target.value as WorkspaceType)}
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="personal">Personal</option>
                  <option value="household">Household</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateWsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
