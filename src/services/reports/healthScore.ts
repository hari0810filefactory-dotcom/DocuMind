// Transparent Document Health Score & Audit Calculator

import { db } from '../database/db';
import type { DocumentHealthScore } from '../../types';

export class DocumentHealthService {
  /**
   * Calculate transparent Document Health Score for a workspace
   */
  static async calculateHealthScore(workspaceId: string): Promise<DocumentHealthScore> {
    const docs = await db.documents
      .where('workspaceId')
      .equals(workspaceId)
      .filter((d) => !d.isDeleted)
      .toArray();

    const totalDocs = docs.length;

    if (totalDocs === 0) {
      return {
        score: 100,
        grade: 'A',
        totalDocuments: 0,
        expiredCount: 0,
        expiringCount: 0,
        unverifiedCount: 0,
        missingDatesCount: 0,
        unclassifiedCount: 0,
        breakdown: [
          {
            label: 'Clean Vault',
            weight: 100,
            pointsEarned: 100,
            description: 'No document issues detected in empty workspace.',
          },
        ],
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    let expiredCount = 0;
    let expiringCount = 0;
    let unverifiedCount = 0;
    let missingDatesCount = 0;
    let unclassifiedCount = 0;

    for (const doc of docs) {
      if (doc.expiryDate) {
        if (doc.expiryDate < todayStr) {
          expiredCount++;
        } else if (doc.expiryDate <= thirtyDaysFromNow) {
          expiringCount++;
        }
      } else {
        missingDatesCount++;
      }

      if (doc.verificationStatus === 'unverified') {
        unverifiedCount++;
      }

      if (doc.documentType === 'Other') {
        unclassifiedCount++;
      }
    }

    // 1. Expiration Currency (30 pts): penalty for expired docs
    const expiredRatio = expiredCount / totalDocs;
    const expirationPoints = Math.round(Math.max(0, 30 * (1 - expiredRatio * 2)));

    // 2. Verification Completeness (25 pts): reward verified docs
    const verifiedRatio = (totalDocs - unverifiedCount) / totalDocs;
    const verificationPoints = Math.round(25 * verifiedRatio);

    // 3. Classification Quality (20 pts): docs not marked 'Other'
    const classifiedRatio = (totalDocs - unclassifiedCount) / totalDocs;
    const classificationPoints = Math.round(20 * classifiedRatio);

    // 4. Temporal Completeness (15 pts): docs with known issue or expiry date
    const dateCompletenessRatio = (totalDocs - missingDatesCount) / totalDocs;
    const datePoints = Math.round(15 * dateCompletenessRatio);

    // 5. Active Upcoming Attention (10 pts): penalize unaddressed near-expiry docs
    const nearExpiryPenalty = expiringCount > 0 ? Math.min(10, expiringCount * 2) : 0;
    const attentionPoints = Math.max(0, 10 - nearExpiryPenalty);

    const totalScore = Math.min(
      100,
      Math.max(0, expirationPoints + verificationPoints + classificationPoints + datePoints + attentionPoints)
    );

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (totalScore >= 90) grade = 'A';
    else if (totalScore >= 80) grade = 'B';
    else if (totalScore >= 70) grade = 'C';
    else if (totalScore >= 60) grade = 'D';

    return {
      score: totalScore,
      grade,
      totalDocuments: totalDocs,
      expiredCount,
      expiringCount,
      unverifiedCount,
      missingDatesCount,
      unclassifiedCount,
      breakdown: [
        {
          label: 'Expiration Currency',
          weight: 30,
          pointsEarned: expirationPoints,
          description:
            expiredCount === 0
              ? 'No expired documents detected.'
              : `${expiredCount} document(s) have passed their expiration date.`,
        },
        {
          label: 'Data Verification',
          weight: 25,
          pointsEarned: verificationPoints,
          description: `${Math.round(verifiedRatio * 100)}% of extracted metadata has been verified by the user.`,
        },
        {
          label: 'Document Classification',
          weight: 20,
          pointsEarned: classificationPoints,
          description: `${Math.round(classifiedRatio * 100)}% of documents have specific classified types.`,
        },
        {
          label: 'Timeline & Dates',
          weight: 15,
          pointsEarned: datePoints,
          description: `${totalDocs - missingDatesCount} of ${totalDocs} documents have issue or expiry dates recorded.`,
        },
        {
          label: 'Attention & Renewals',
          weight: 10,
          pointsEarned: attentionPoints,
          description:
            expiringCount === 0
              ? 'No documents expiring within the next 30 days.'
              : `${expiringCount} document(s) expiring within 30 days.`,
        },
      ],
    };
  }
}
