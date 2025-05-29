export class ApiKeyManager {
  private static readonly STORAGE_KEY = 'claude_api_key';
  private static readonly DECLINED_KEY = 'claude_api_key_declined';
  private static readonly PROMPTED_KEY = 'claude_api_key_prompted';
  private static apiKey: string | null = null;

  static setApiKey(key: string): void {
    this.apiKey = key;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, key);
      localStorage.removeItem(this.DECLINED_KEY);
    }
  }

  static getApiKey(): string | null {
    if (this.apiKey) {
      return this.apiKey;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      this.apiKey = localStorage.getItem(this.STORAGE_KEY);
      return this.apiKey;
    }

    return null;
  }

  static clearApiKey(): void {
    this.apiKey = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  static hasApiKey(): boolean {
    return !!this.getApiKey();
  }

  static setDeclined(declined: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (declined) {
        localStorage.setItem(this.DECLINED_KEY, 'true');
      } else {
        localStorage.removeItem(this.DECLINED_KEY);
      }
    }
  }

  static hasDeclined(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.DECLINED_KEY) === 'true';
    }
    return false;
  }

  static setPrompted(prompted: boolean): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (prompted) {
        localStorage.setItem(this.PROMPTED_KEY, 'true');
      } else {
        localStorage.removeItem(this.PROMPTED_KEY);
      }
    }
  }

  static hasBeenPrompted(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.PROMPTED_KEY) === 'true';
    }
    return false;
  }

  static shouldPromptForKey(): boolean {
    return !this.hasApiKey() && !this.hasDeclined() && !this.hasBeenPrompted();
  }
}