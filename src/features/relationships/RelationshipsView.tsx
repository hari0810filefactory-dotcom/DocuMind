import React, { useState, useEffect } from 'react';
import {
  Network,
  Plus,
  Trash2,
  FileText,
  ArrowRight,
  Shield,
  Receipt,
  FileCheck,
  Building2,
  X,
} from 'lucide-react';
import { db, logActivity } from '../../services/database/db';
import type { Relationship, RelationshipType, DocumentRecord } from '../../types';

interface RelationshipsViewProps {
  workspaceId: string;
  onSelectDocument: (doc: DocumentRecord) => void;
}

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  invoice_belongs_to_asset: 'Invoice belongs to asset',
  warranty_belongs_to_purchase: 'Warranty covers purchase',
  insurance_covers_asset: 'Insurance covers asset/property',
  contract_relates_to_org: 'Contract relates to organization',
  renewal_replaces_previous: 'Renewal replaces previous version',
  certificate_supports_application: 'Certificate supports application',
  custom_relation: 'Custom relationship',
};

export const RelationshipsView: React.FC<RelationshipsViewProps> = ({
  workspaceId,
  onSelectDocument,
}) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [sourceDocId, setSourceDocId] = useState('');
  const [targetDocId, setTargetDocId] = useState('');
  const [relType, setRelType] = useState<RelationshipType>('invoice_belongs_to_asset');
  const [customDesc, setCustomDesc] = useState('');

  const loadData = async () => {
    try {
      const [rels, docs] = await Promise.all([
        db.relationships.where('workspaceId').equals(workspaceId).toArray(),
        db.documents.where('workspaceId').equals(workspaceId).and((d) => !d.isDeleted).toArray(),
      ]);
      setRelationships(rels);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load relationships:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const docMap = new Map(documents.map((d) => [d.id, d]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceDocId || !targetDocId || sourceDocId === targetDocId) return;

    await db.relationships.add({
      id: crypto.randomUUID(),
      workspaceId,
      sourceDocumentId: sourceDocId,
      targetDocumentId: targetDocId,
      relationshipType: relType,
      customDescription: customDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    await logActivity(
      workspaceId,
      'user',
      'Created document relationship',
      sourceDocId,
      RELATIONSHIP_LABELS[relType]
    );

    setIsModalOpen(false);
    setSourceDocId('');
    setTargetDocId('');
    setCustomDesc('');
    loadData();
  };

  const handleDelete = async (id: string) => {
    await db.relationships.delete(id);
    loadData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-500" />
            <span>Document Relationships &amp; Graphs</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Link warranties to purchases, insurance to assets, invoices to contracts, and renewals.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={documents.length < 2}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Link Documents</span>
        </button>
      </div>

      {/* Relationships Grid */}
      {relationships.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 text-xs">
          <Network className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            No document relationships configured
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {documents.length < 2
              ? 'Upload at least 2 documents to begin establishing linkages.'
              : 'Click "Link Documents" to associate related records together.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relationships.map((rel) => {
            const source = docMap.get(rel.sourceDocumentId);
            const target = docMap.get(rel.targetDocumentId);

            return (
              <div
                key={rel.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {RELATIONSHIP_LABELS[rel.relationshipType] || 'Related'}
                  </span>
                  <button
                    onClick={() => handleDelete(rel.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Remove linkage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-850">
                  <div
                    onClick={() => source && onSelectDocument(source)}
                    className="min-w-0 flex-1 cursor-pointer hover:text-blue-500 transition-colors"
                  >
                    <div className="font-semibold truncate">
                      {source?.title || 'Unknown Source'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {source?.documentType}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  <div
                    onClick={() => target && onSelectDocument(target)}
                    className="min-w-0 flex-1 cursor-pointer hover:text-blue-500 transition-colors text-right"
                  >
                    <div className="font-semibold truncate">
                      {target?.title || 'Unknown Target'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {target?.documentType}
                    </div>
                  </div>
                </div>

                {rel.customDescription && (
                  <div className="text-[11px] text-slate-400 italic">
                    &ldquo;{rel.customDescription}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link Documents Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Document Relationship
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Source Document (Subject)
                </label>
                <select
                  value={sourceDocId}
                  onChange={(e) => setSourceDocId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="">Select source document...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.documentType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Relationship Type
                </label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value as RelationshipType)}
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  {Object.entries(RELATIONSHIP_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Target Document (Related Item)
                </label>
                <select
                  value={targetDocId}
                  onChange={(e) => setTargetDocId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="">Select target document...</option>
                  {documents
                    .filter((d) => d.id !== sourceDocId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.documentType})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Description / Note (Optional)
                </label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="e.g. 2-year warranty extension on Macbook invoice"
                  className="w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!sourceDocId || !targetDocId || sourceDocId === targetDocId}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs disabled:opacity-50"
                >
                  Save Linkage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
