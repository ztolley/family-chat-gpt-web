import type { AuthBackendProvider, UserProfile } from "@/types";
import {
  clearSession,
  deriveProfile,
  restoreSession,
  saveSession,
} from "@/lib/authHelpers";

export interface AuthState {
  token: string | null;
  profile: UserProfile | null;
}

type AuthChangeCallback = (state: AuthState) => void;

class AuthProvider extends EventTarget {
  private state: AuthState = { token: null, profile: null };

  constructor() {
    super();
    const restored = restoreSession();
    if (restored) {
      this.state = restored;
    }
  }

  getState(): AuthState {
    return this.state;
  }

  subscribe(callback: AuthChangeCallback): () => void {
    const listener = (event: Event) => {
      callback((event as CustomEvent<AuthState>).detail);
    };
    this.addEventListener("change", listener as EventListener);
    callback(this.state);
    return () => this.removeEventListener("change", listener as EventListener);
  }

  login(provider: AuthBackendProvider, token: string) {
    const profile = deriveProfile(provider, token);
    saveSession(token, profile);
    this.updateState({ token, profile });
  }

  logout() {
    clearSession();
    this.updateState({ token: null, profile: null });
  }

  restore(): boolean {
    const restored = restoreSession();
    if (restored) {
      this.updateState(restored);
      return true;
    }
    this.updateState({ token: null, profile: null });
    return false;
  }

  private updateState(next: AuthState) {
    this.state = next;
    this.dispatchEvent(new CustomEvent("change", { detail: this.state }));
  }
}

export const authProvider = new AuthProvider();
