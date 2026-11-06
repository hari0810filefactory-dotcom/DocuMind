import { useState, useEffect, useCallback, useRef } from 'react';
import { CryptoService } from '../services/encryption/crypto';
import { db } from '../services/database/db';

const VAULT_SALT_KEY = 'documind_vault_salt';
const VAULT_VERIFIER_KEY = 'documind_vault_verifier';
const VAULT_AUTOLOCK_KEY = 'documind_vault_autolock';

export function useVaultAuth() {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // In-memory derived key reference (cleared on lock)
  const activeKeyRef = useRef<CryptoKey | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Check setup on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const salt = localStorage.getItem(VAULT_SALT_KEY);
        const verifier = localStorage.getItem(VAULT_VERIFIER_KEY);
        const autoLock = localStorage.getItem(VAULT_AUTOLOCK_KEY);

        if (autoLock) {
          setAutoLockMinutes(parseInt(autoLock, 10));
        }

        if (salt && verifier) {
          setIsConfigured(true);
          // If configured, default to locked on application load/restart
          setIsLocked(true);
        } else {
          setIsConfigured(false);
          setIsLocked(false);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, []);

  // Lock the vault
  const lock = useCallback(() => {
    activeKeyRef.current = null;
    setIsLocked(true);
  }, []);

  // Unlock the vault
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const salt = localStorage.getItem(VAULT_SALT_KEY);
    const expectedVerifier = localStorage.getItem(VAULT_VERIFIER_KEY);

    if (!salt || !expectedVerifier) {
      // Not configured, unlock
      setIsLocked(false);
      return true;
    }

    const isValid = await CryptoService.verifyPassword(password, salt, expectedVerifier);
    if (isValid) {
      // Derive active key into RAM
      activeKeyRef.current = await CryptoService.deriveKey(password, salt);
      setIsLocked(false);
      lastActivityRef.current = Date.now();
      return true;
    }

    return false;
  }, []);

  // Set up master password
  const setupPassword = useCallback(async (password: string, minutes: number = 15): Promise<void> => {
    const salt = CryptoService.generateSalt();
    const verifier = await CryptoService.createPasswordVerifier(password, salt);

    localStorage.setItem(VAULT_SALT_KEY, salt);
    localStorage.setItem(VAULT_VERIFIER_KEY, verifier);
    localStorage.setItem(VAULT_AUTOLOCK_KEY, minutes.toString());

    activeKeyRef.current = await CryptoService.deriveKey(password, salt);
    setAutoLockMinutes(minutes);
    setIsConfigured(true);
    setIsLocked(false);
    lastActivityRef.current = Date.now();
  }, []);

  // Change password
  const changePassword = useCallback(
    async (oldPass: string, newPass: string): Promise<boolean> => {
      const salt = localStorage.getItem(VAULT_SALT_KEY);
      const expectedVerifier = localStorage.getItem(VAULT_VERIFIER_KEY);

      if (!salt || !expectedVerifier) return false;

      const isValid = await CryptoService.verifyPassword(oldPass, salt, expectedVerifier);
      if (!isValid) return false;

      const newSalt = CryptoService.generateSalt();
      const newVerifier = await CryptoService.createPasswordVerifier(newPass, newSalt);

      localStorage.setItem(VAULT_SALT_KEY, newSalt);
      localStorage.setItem(VAULT_VERIFIER_KEY, newVerifier);

      activeKeyRef.current = await CryptoService.deriveKey(newPass, newSalt);
      lastActivityRef.current = Date.now();
      return true;
    },
    []
  );

  // Auto-lock inactivity listener
  useEffect(() => {
    if (isLocked || !isConfigured || autoLockMinutes <= 0) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime > autoLockMinutes * 60 * 1000) {
        lock();
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearInterval(interval);
    };
  }, [isLocked, isConfigured, autoLockMinutes, lock]);

  return {
    isLocked,
    isConfigured,
    autoLockMinutes,
    isLoading,
    lock,
    unlock,
    setupPassword,
    changePassword,
    activeKey: activeKeyRef.current,
  };
}
