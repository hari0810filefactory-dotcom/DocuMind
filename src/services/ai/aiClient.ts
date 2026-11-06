// Client-Side AI Service Abstraction with Privacy Gate and Offline Guard

export interface AiServiceStatus {
  available: boolean;
  model: string;
  isOnline: boolean;
  enabledInSettings: boolean;
}

export class AiClientService {
  /**
   * Check if online and if server Gemini service is configured
   */
  static async checkStatus(): Promise<AiServiceStatus> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return {
        available: false,
        model: 'gemini-3.8-flash',
        isOnline: false,
        enabledInSettings: this.isAiEnabledLocally(),
      };
    }

    try {
      const res = await fetch('/api/ai/status', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          available: Boolean(data.available),
          model: data.model || 'gemini-3.8-flash',
          isOnline: true,
          enabledInSettings: this.isAiEnabledLocally(),
        };
      }
      return {
        available: false,
        model: 'gemini-3.8-flash',
        isOnline: true,
        enabledInSettings: this.isAiEnabledLocally(),
      };
    } catch {
      return {
        available: false,
        model: 'gemini-3.8-flash',
        isOnline: isOnline,
        enabledInSettings: this.isAiEnabledLocally(),
      };
    }
  }

  /**
   * Local toggle setting in localStorage
   */
  static isAiEnabledLocally(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const val = localStorage.getItem('documind_ai_enabled');
    return val !== 'false';
  }

  static setAiEnabledLocally(enabled: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('documind_ai_enabled', enabled ? 'true' : 'false');
    }
  }

  /**
   * Request document summary (Online only, requires user consent)
   */
  static async summarizeDocument(
    text: string,
    title: string,
    documentType: string
  ): Promise<{ summary: string }> {
    this.assertAllowed();

    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title, documentType }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate AI summary.');
    }

    return await res.json();
  }

  /**
   * Request structured metadata suggestions (Online only)
   */
  static async extractMetadata(
    text: string,
    title: string,
    documentType: string
  ): Promise<{ metadata: any }> {
    this.assertAllowed();

    const res = await fetch('/api/ai/extract-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title, documentType }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to extract AI metadata.');
    }

    return await res.json();
  }

  /**
   * Ask question about selected document text
   */
  static async askDocumentQuestion(
    question: string,
    documentContext: string
  ): Promise<{ answer: string }> {
    this.assertAllowed();

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, documentContext }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to answer question.');
    }

    return await res.json();
  }

  /**
   * Explain complex legal / financial document term in plain language
   */
  static async explainTerm(
    termOrClause: string,
    documentType?: string
  ): Promise<{ explanation: string }> {
    this.assertAllowed();

    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termOrClause, documentType }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to explain term.');
    }

    return await res.json();
  }

  /**
   * Compare two versions of a document
   */
  static async compareVersions(
    version1Text: string,
    version2Text: string,
    title: string
  ): Promise<{ comparison: string }> {
    this.assertAllowed();

    const res = await fetch('/api/ai/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version1Text, version2Text, title }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to compare document versions.');
    }

    return await res.json();
  }

  private static assertAllowed(): void {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error(
        'Offline Mode: Gemini AI features require an internet connection. All local document features remain operational.'
      );
    }
    if (!this.isAiEnabledLocally()) {
      throw new Error('AI features are currently disabled in Settings.');
    }
  }
}
