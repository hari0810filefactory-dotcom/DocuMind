import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  FileSearch,
  ListTodo,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  GitCompare,
  WifiOff,
  RotateCcw,
  Check,
} from 'lucide-react';
import { db } from '../../services/database/db';
import { AiClientService, type AiServiceStatus } from '../../services/ai/aiClient';
import { AIConsentModal } from '../../components/common/AIConsentModal';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import type {
  DocumentRecord,
  ProcessingJob,
  DocumentField,
  DocumentText,
} from '../../types';

interface AIIntelligenceViewProps {
  workspaceId: string;
  subSection: string; // 'assistant' | 'extraction' | 'summaries' | 'queue'
  onSelectDocument: (doc: DocumentRecord) => void;
}

export const AIIntelligenceView: React.FC<AIIntelligenceViewProps> = ({
  workspaceId,
  subSection,
  onSelectDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'extraction' | 'summaries' | 'queue'>(
    (subSection as any) || 'assistant'
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [docText, setDocText] = useState<string>('');
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [pendingFields, setPendingFields] = useState<
    { field: DocumentField; docTitle: string }[]
  >([]);
  const isOnline = useOnlineStatus();
  const [aiStatus, setAiStatus] = useState<AiServiceStatus | null>(null);

  // Chat / Assistant states
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [isAnswering, setIsAnswering] = useState(false);

  // Summaries states
  const [summaryOutput, setSummaryOutput] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Consent modal states
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingAiAction, setPendingAiAction] = useState<(() => Promise<void>) | null>(null);
  const [consentActionTitle, setConsentActionTitle] = useState('');

  // Plain language explainer state
  const [termToExplain, setTermToExplain] = useState('');
  const [termExplanation, setTermExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    if (subSection) {
      setActiveTab(subSection as any);
    }
  }, [subSection]);

  const loadData = async () => {
    try {
      const [docs, jobList, allFields, status] = await Promise.all([
        db.documents.where('workspaceId').equals(workspaceId).and((d) => !d.isDeleted).toArray(),
        db.processingJobs.toArray(),
        db.documentFields.where('verificationStatus').equals('unverified').toArray(),
        AiClientService.checkStatus(),
      ]);

      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }

      jobList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setJobs(jobList);
      setAiStatus(status);

      // Join fields with document title
      const docTitleMap = new Map(docs.map((d) => [d.id, d.title]));
      setPendingFields(
        allFields.map((f) => ({
          field: f,
          docTitle: docTitleMap.get(f.documentId) || 'Document',
        }))
      );
    } catch (err) {
      console.error('Failed to load AI Intelligence data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  // Load selected document text
  useEffect(() => {
    if (!selectedDocId) {
      setDocText('');
      return;
    }
    db.documentText.where('documentId').equals(selectedDocId).first().then((record) => {
      setDocText(record?.extractedText || '');
    });
  }, [selectedDocId]);

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  // Request consent wrapper
  const triggerWithConsent = (title: string, action: () => Promise<void>) => {
    if (!isOnline) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Offline Mode: Gemini AI features require an internet connection. Core local document storage, classification, and OCR are unaffected.',
        },
      ]);
      return;
    }
    setConsentActionTitle(title);
    setPendingAiAction(() => action);
    setConsentOpen(true);
  };

  const executeChatQuestion = async () => {
    if (!chatQuestion.trim() || !selectedDoc) return;
    const q = chatQuestion.trim();
    setChatMessages((prev) => [...prev, { role: 'user', text: q }]);
    setChatQuestion('');
    setIsAnswering(true);

    try {
      const res = await AiClientService.askDocumentQuestion(q, docText);
      setChatMessages((prev) => [...prev, { role: 'assistant', text: res.answer }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${err.message || 'Failed to get answer'}` },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  const executeSummarize = async () => {
    if (!selectedDoc) return;
    setIsSummarizing(true);
    setSummaryOutput('');
    try {
      const res = await AiClientService.summarizeDocument(
        docText,
        selectedDoc.title,
        selectedDoc.documentType
      );
      setSummaryOutput(res.summary);
    } catch (err: any) {
      setSummaryOutput(`Error: ${err.message || 'Failed to generate summary'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const executeExplainTerm = async () => {
    if (!termToExplain.trim() || !selectedDoc) return;
    setIsExplaining(true);
    setTermExplanation('');
    try {
      const res = await AiClientService.explainTerm(termToExplain, selectedDoc.documentType);
      setTermExplanation(res.explanation);
    } catch (err: any) {
      setTermExplanation(`Error: ${err.message || 'Failed to explain clause'}`);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleVerifyField = async (fieldId: string) => {
    await db.documentFields.update(fieldId, {
      verificationStatus: 'verified',
      updatedAt: new Date().toISOString(),
    });
    loadData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-500" />
            <span>Document Intelligence &amp; AI</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Local OCR, deterministic field extraction, and optional online Gemini analysis.
          </p>
        </div>

        {/* AI & Online Connectivity Status Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Gemini Online Available</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline (Local OCR Only)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'assistant'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Document Assistant (Q&amp;A)
        </button>
        <button
          onClick={() => setActiveTab('extraction')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'extraction'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>OCR &amp; Verification</span>
          {pendingFields.length > 0 && (
            <span className="text-[10px] font-mono font-bold text-amber-500 tabular-nums">
              ({pendingFields.length})
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('summaries')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'summaries'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Summaries &amp; Terminology
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'queue'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Processing Queue ({jobs.length})
        </button>
      </div>

      {/* TAB 1: Document Assistant (Q&A) */}
      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Document Context:
            </label>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 shadow-xs text-xs">
              {documents.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDocId(d.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    d.id === selectedDocId
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate">{d.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                    {d.documentType} · {(d.fileSize / 1024).toFixed(0)} KB
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat conversation area */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col h-[520px]">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Chatting with: &ldquo;{selectedDoc?.title || 'Selected Document'}&rdquo;</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Strict Grounded Q&amp;A
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
                  <Bot className="w-10 h-10 mb-2 opacity-30 text-indigo-500" />
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Ask questions about &ldquo;{selectedDoc?.title || 'this document'}&rdquo;
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                    Ask about specific clauses, amounts, deadlines, or conditions. Answers are strictly grounded in the document text.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {isAnswering && (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Analyzing document text with Gemini...</span>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    triggerWithConsent('Document Question Q&A', executeChatQuestion);
                  }
                }}
                placeholder="Ask about this document..."
                className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
              />
              <button
                onClick={() => triggerWithConsent('Document Question Q&A', executeChatQuestion)}
                disabled={isAnswering || !chatQuestion.trim()}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OCR & Field Verification */}
      {activeTab === 'extraction' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Candidate Fields Requiring Human Verification
            </h2>
            <span className="text-xs text-slate-400">
              {pendingFields.length} unverified field(s)
            </span>
          </div>

          {pendingFields.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                All Extracted Fields Verified
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Every candidate metadata item in your vault has been confirmed by you.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {pendingFields.map(({ field, docTitle }) => (
                <div
                  key={field.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-[11px] text-slate-400">
                      Document: <strong className="text-slate-700 dark:text-slate-200">{docTitle}</strong>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">
                      {field.fieldName}:{' '}
                      <span className="text-blue-600 dark:text-blue-400 font-mono">
                        {field.fieldValue}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Deterministic Confidence: {(field.confidence * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleVerifyField(field.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify &amp; Accept</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Summaries & Terminology Explainer */}
      {activeTab === 'summaries' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Executive Summary Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Executive Summary &amp; Key Points</span>
              </span>
              <button
                onClick={() => triggerWithConsent('Generate Document Summary', executeSummarize)}
                disabled={isSummarizing || !selectedDoc}
                className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSummarizing && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Generate Summary</span>
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Selected Document: <strong className="text-slate-800 dark:text-slate-200">{selectedDoc?.title || 'None'}</strong>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 min-h-[220px] max-h-[360px] overflow-y-auto text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-850">
              {summaryOutput || (
                <div className="text-slate-400 italic text-center py-10">
                  Click &ldquo;Generate Summary&rdquo; to analyze this document with Gemini.
                </div>
              )}
            </div>
          </div>

          {/* Legal / Financial Terminology Explainer */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <span>Plain Language Term Explainer</span>
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={termToExplain}
                onChange={(e) => setTermToExplain(e.target.value)}
                placeholder="e.g. Indemnification clause, Subrogation, Deductible..."
                className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
              />
              <button
                onClick={() => triggerWithConsent('Explain Document Term', executeExplainTerm)}
                disabled={isExplaining || !termToExplain.trim()}
                className="w-full py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isExplaining ? 'Explaining Term...' : 'Explain in Plain English'}
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 min-h-[170px] max-h-[280px] overflow-y-auto text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-850">
              {termExplanation || (
                <div className="text-slate-400 italic text-center py-6">
                  Enter a complex legal or financial term above to see a plain English explanation and obligations.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Processing Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Document Processing Pipeline Jobs
            </h2>
            <button
              onClick={loadData}
              className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No jobs in processing history.</div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="p-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Job: {job.jobType.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Doc ID: {job.documentId} · {new Date(job.createdAt).toLocaleString()}
                    </div>
                    {job.errorMessage && (
                      <div className="text-[11px] text-rose-500 mt-1">{job.errorMessage}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                        {job.status.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{job.progress}%</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mandatory Privacy Consent Gate Modal */}
      <AIConsentModal
        isOpen={consentOpen}
        actionTitle={consentActionTitle}
        documentTitle={selectedDoc?.title || 'Document'}
        previewSnippet={docText.slice(0, 400)}
        characterCount={Math.min(docText.length, 16000)}
        onCancel={() => {
          setConsentOpen(false);
          setPendingAiAction(null);
        }}
        onConfirm={async () => {
          setConsentOpen(false);
          if (pendingAiAction) {
            await pendingAiAction();
          }
          setPendingAiAction(null);
        }}
      />
    </div>
  );
};
