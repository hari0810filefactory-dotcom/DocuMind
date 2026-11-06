import { useState, useEffect, useCallback } from 'react';
import { db, initializeWorkspaceDefaults } from '../services/database/db';
import type { Workspace, Category, User } from '../types';

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

  // Reload current workspace state
  const refresh = useCallback(async () => {
    try {
      const allWorkspaces = await db.workspaces.toArray();
      setWorkspaces(allWorkspaces);

      if (allWorkspaces.length === 0) {
        setNeedsOnboarding(true);
        setWorkspace(null);
        setCategories([]);
        return;
      }

      setNeedsOnboarding(false);

      // Read active workspace ID from localStorage or pick first
      const savedWsId = localStorage.getItem('documind_active_workspace_id');
      let current = allWorkspaces.find((w) => w.id === savedWsId);
      if (!current) {
        current = allWorkspaces[0];
        localStorage.setItem('documind_active_workspace_id', current.id);
      }
      setWorkspace(current);

      // Load user
      const allUsers = await db.users.toArray();
      if (allUsers.length > 0) {
        setUser(allUsers[0]);
      }

      // Load categories
      const cats = await db.categories.where('workspaceId').equals(current.id).toArray();
      setCategories(cats);
    } catch (err) {
      console.error('Error loading workspace state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchWorkspace = useCallback(async (wsId: string) => {
    const ws = await db.workspaces.get(wsId);
    if (ws) {
      localStorage.setItem('documind_active_workspace_id', ws.id);
      setWorkspace(ws);
      const cats = await db.categories.where('workspaceId').equals(ws.id).toArray();
      setCategories(cats);
    }
  }, []);

  const createWorkspace = useCallback(
    async (name: string, type: 'personal' | 'household' | 'business') => {
      const newWs: Workspace = {
        id: crypto.randomUUID(),
        name,
        type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.workspaces.add(newWs);

      const currentUser = await db.users.toCollection().first();
      const userId = currentUser?.id || crypto.randomUUID();

      await initializeWorkspaceDefaults(newWs.id, userId);

      await db.workspaceMembers.add({
        id: crypto.randomUUID(),
        workspaceId: newWs.id,
        userId,
        name: currentUser?.displayName || 'Owner',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      });

      localStorage.setItem('documind_active_workspace_id', newWs.id);
      await refresh();
      return newWs;
    },
    [refresh]
  );

  return {
    workspace,
    workspaces,
    categories,
    user,
    isLoading,
    needsOnboarding,
    refresh,
    switchWorkspace,
    createWorkspace,
  };
}
