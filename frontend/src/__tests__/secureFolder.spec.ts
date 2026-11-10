import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFileSystemStore } from '@/stores/filesystem';
import { useDesktopStore } from '@/stores/desktopStore';

describe('Secure Folder Suite - Exigencia de Contraseña en Cada Entrada', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    } else {
      const mockStorage: Record<string, string> = {};
      vi.stubGlobal('localStorage', {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, val: string) => {
          mockStorage[key] = val;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          for (const k of Object.keys(mockStorage)) delete mockStorage[k];
        }),
      });
    }
    vi.restoreAllMocks();

    // Default mock para fetch
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('verify-password')) {
          return { ok: true, json: async () => ({ valid: true }) };
        }
        if (url.includes('nodes?parentPath')) {
          return { ok: true, json: async () => ({ nodes: [], total: 0 }) };
        }
        return {
          ok: true,
          json: async () => ({
            id: 'mock-node-id',
            name: 'Mock Folder',
            is_directory: true,
            is_protected: true,
          }),
        };
      })
    );
  });

  it('1. isFolderUnlocked siempre retorna false para forzar verificación en cada entrada', () => {
    const fs = useFileSystemStore();
    expect(fs.isFolderUnlocked('folder-123')).toBe(false);

    fs.unlockFolder('folder-123');
    expect(fs.isFolderUnlocked('folder-123')).toBe(false);
  });

  it('2. verifyFolderPassword valida la contraseña sin guardar el ID como desbloqueado permanente', async () => {
    const fs = useFileSystemStore();

    const isValid = await fs.verifyFolderPassword('folder-sec', 'mi-password-segura');
    expect(isValid).toBe(true);

    // Debe seguir sin estar guardado como desbloqueado
    expect(fs.isFolderUnlocked('folder-sec')).toBe(false);
  });

  it('3. createFolder en desktopStore crea carpeta protegida sin dejarla desbloqueada', async () => {
    const desktopStore = useDesktopStore();
    const fs = useFileSystemStore();

    const folder = await desktopStore.createFolder('Privada', 10, 20, 'secret123');
    expect(folder).not.toBeNull();
    expect(folder?.is_protected).toBe(true);
    expect(fs.isFolderUnlocked(folder!.id)).toBe(false);
  });

  it('4. createNode en filesystemStore crea carpeta protegida sin dejarla desbloqueada', async () => {
    const fs = useFileSystemStore();

    const node = await fs.createNode({
      name: 'Documentos Confidenciales',
      is_directory: true,
      password: 'password999',
    });

    expect(node).not.toBeNull();
    expect(fs.isFolderUnlocked(node!.id)).toBe(false);
  });

  it('5. setFolderPassword protege la carpeta sin dejarla desbloqueada', async () => {
    const fs = useFileSystemStore();

    const res = await fs.setFolderPassword('folder-to-protect', 'new-pass');
    expect(res.success).toBe(true);
    expect(fs.isFolderUnlocked('folder-to-protect')).toBe(false);
  });
});
