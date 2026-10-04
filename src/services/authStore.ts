import { User } from '../types/game';

const AUTH_STORAGE_KEY = 'arboris_current_user_v1';

class AuthStoreService {
  private currentUser: User | null = null;
  private listeners: Array<(user: User | null) => void> = [];

  constructor() {
    const cached = localStorage.getItem(AUTH_STORAGE_KEY);
    if (cached) {
      try {
        this.currentUser = JSON.parse(cached);
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    this.notify();
  }

  subscribe(listener: (user: User | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }
}

export const authStore = new AuthStoreService();
