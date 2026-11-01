import { User } from '../types';

interface StoredAccount extends User {
  password: string;
}

// 3 Akun Utama dengan Role Admin: Ebi, Tia, Sam
export const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'user-admin-ebi',
    name: 'Ebi',
    email: 'ebi@mango.com',
    role: 'Admin',
    password: 'ebi123',
    avatar: '👨‍💼',
  },
  {
    id: 'user-admin-tia',
    name: 'Tia',
    email: 'tia@mango.com',
    role: 'Admin',
    password: 'tia123',
    avatar: '👩‍💼',
  },
  {
    id: 'user-admin-sam',
    name: 'Sam',
    email: 'sam@mango.com',
    role: 'Admin',
    password: 'sam123',
    avatar: '🧑‍💼',
  },
];

export const AVAILABLE_PROFILES: User[] = [
  {
    id: 'user-admin-sam',
    name: 'Sam',
    email: 'sam@mango.com',
    role: 'Admin',
    avatar: '🧑‍💼',
  },
  {
    id: 'user-admin-ebi',
    name: 'Ebi',
    email: 'ebi@mango.com',
    role: 'Admin',
    avatar: '👨‍💼',
  },
  {
    id: 'user-admin-tia',
    name: 'Tia',
    email: 'tia@mango.com',
    role: 'Admin',
    avatar: '👩‍💼',
  },
];

const STORAGE_USERS_KEY = 'mango_auth_accounts_v2';
const STORAGE_CURRENT_USER_KEY = 'mango_current_user';
const STORAGE_REMEMBER_KEY = 'mango_remember_session';

// Hapus akun lama (Budi / Siti / v1) secara otomatis jika masih tersimpan di browser
function cleanupOldAccounts() {
  try {
    const oldUsers = localStorage.getItem('mango_auth_accounts');
    if (oldUsers) {
      localStorage.removeItem('mango_auth_accounts');
    }
    const currUserRaw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (currUserRaw) {
      const u = JSON.parse(currUserRaw);
      if (u.email === 'admin@mango.com' || u.email === 'kasir@mango.com' || u.name?.includes('Budi') || u.name?.includes('Siti')) {
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
        sessionStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      }
    }
  } catch {
    // Ignore storage parse error
  }
}

// Jalankan pembersihan akun lama saat file dimuat
cleanupOldAccounts();

function getStoredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    return parsed;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export function getCurrentUser(): User | null {
  try {
    const savedLocal = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (savedLocal) return JSON.parse(savedLocal);

    const savedSession = sessionStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (savedSession) return JSON.parse(savedSession);

    return null;
  } catch {
    return null;
  }
}

export async function loginUser(
  emailOrUsername: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; user?: User; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const cleanInput = emailOrUsername.trim().toLowerCase();
  const accounts = getStoredAccounts();

  // Memungkinkan login dengan email (misal: ebi@mango.com) ATAU langsung dengan nama username (misal: ebi)
  const found = accounts.find((acc) => {
    const matchEmail = acc.email.toLowerCase() === cleanInput;
    const matchUsername = acc.name.toLowerCase() === cleanInput;
    const matchEmailPrefix = acc.email.split('@')[0].toLowerCase() === cleanInput;
    return (matchEmail || matchUsername || matchEmailPrefix) && acc.password === password;
  });

  if (!found) {
    // Cek apakah username / email terdaftar
    const exists = accounts.some((acc) => {
      const matchEmail = acc.email.toLowerCase() === cleanInput;
      const matchUsername = acc.name.toLowerCase() === cleanInput;
      const matchEmailPrefix = acc.email.split('@')[0].toLowerCase() === cleanInput;
      return matchEmail || matchUsername || matchEmailPrefix;
    });

    if (exists) {
      return { success: false, error: 'Kata sandi (password) salah. Silakan periksa kembali.' };
    }
    return { success: false, error: 'Username atau email tidak ditemukan. Pastikan akun adalah Ebi, Tia, atau Sam.' };
  }

  const { password: _, ...userSafe } = found;

  if (rememberMe) {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(userSafe));
    sessionStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    localStorage.setItem(STORAGE_REMEMBER_KEY, 'true');
  } else {
    sessionStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(userSafe));
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    localStorage.removeItem(STORAGE_REMEMBER_KEY);
  }

  return { success: true, user: userSafe };
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: 'Admin' | 'Kasir'
): Promise<{ success: boolean; user?: User; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName) {
    return { success: false, error: 'Nama lengkap wajib diisi.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Email tidak valid.' };
  }
  if (!password || password.length < 5) {
    return { success: false, error: 'Password minimal 5 karakter.' };
  }

  const accounts = getStoredAccounts();
  const exists = accounts.some((acc) => acc.email.toLowerCase() === cleanEmail);
  if (exists) {
    return { success: false, error: 'Email ini sudah terdaftar. Silakan login langsung.' };
  }

  const newUser: StoredAccount = {
    id: `user-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    role,
    password,
    avatar: role === 'Admin' ? '👨‍💼' : '🧑‍🍳',
  };

  const updated = [...accounts, newUser];
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));

  const { password: _, ...userSafe } = newUser;
  localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(userSafe));

  return { success: true, user: userSafe };
}

export function logoutUser(): void {
  localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  sessionStorage.removeItem(STORAGE_CURRENT_USER_KEY);
}

export function getDemoAccounts() {
  return [
    {
      label: 'Admin Ebi',
      name: 'Ebi',
      email: 'ebi@mango.com',
      password: 'ebi123',
      role: 'Admin' as const,
      icon: '👑',
      avatar: '👨‍💼',
      desc: 'Role Admin / Pemilik',
    },
    {
      label: 'Admin Tia',
      name: 'Tia',
      email: 'tia@mango.com',
      password: 'tia123',
      role: 'Admin' as const,
      icon: '👑',
      avatar: '👩‍💼',
      desc: 'Role Admin / Pemilik',
    },
    {
      label: 'Admin Sam',
      name: 'Sam',
      email: 'sam@mango.com',
      password: 'sam123',
      role: 'Admin' as const,
      icon: '👑',
      avatar: '🧑‍💼',
      desc: 'Role Admin / Pemilik',
    },
  ];
}
