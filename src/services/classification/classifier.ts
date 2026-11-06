// Deterministic Rule-Based Document Classification Engine

import type { DocumentType } from '../../types';

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  matchedRules: string[];
}

interface RuleDefinition {
  type: DocumentType;
  keywords: string[];
  filenamePatterns: RegExp[];
  textPatterns: RegExp[];
  weight: number;
}

export class DocumentClassifier {
  private static rules: RuleDefinition[] = [
    {
      type: 'Identity document',
      keywords: [
        'passport',
        'national identity card',
        'driver license',
        "driver's license",
        'driving licence',
        'social security',
        'birth certificate',
        'citizenship',
        'permanent resident',
        'identity card',
        'id card',
      ],
      filenamePatterns: [/passport/i, /id[_\-\s]?card/i, /driver[_\-\s]?licen[cs]e/i, /dl[_\-\s]/i, /ssn/i],
      textPatterns: [
        /passport\s*no/i,
        /date\s*of\s*birth/i,
        /nationality/i,
        /issuing\s*authority/i,
        /licen[cs]e\s*(no|number)/i,
      ],
      weight: 1.2,
    },
    {
      type: 'Education certificate',
      keywords: [
        'degree',
        'diploma',
        'certificate',
        'transcript',
        'university',
        'bachelor',
        'master',
        'doctorate',
        'graduation',
        'academic',
        'curriculum',
        'institute of technology',
      ],
      filenamePatterns: [/degree/i, /diploma/i, /certificate/i, /transcript/i, /graduation/i],
      textPatterns: [
        /hereby\s*confers\s*upon/i,
        /degree\s*of/i,
        /has\s*successfully\s*completed/i,
        /board\s*of\s*trustees/i,
        /cumulative\s*gpa/i,
      ],
      weight: 1.1,
    },
    {
      type: 'Employment document',
      keywords: [
        'payslip',
        'pay stub',
        'employment contract',
        'offer letter',
        'salary',
        'w-2',
        'employer',
        'job title',
        'compensation',
        'resignation',
        'termination',
      ],
      filenamePatterns: [/payslip/i, /pay[_\-\s]?stub/i, /offer[_\-\s]?letter/i, /employment/i, /w2/i],
      textPatterns: [
        /gross\s*pay/i,
        /net\s*pay/i,
        /pay\s*period/i,
        /earnings\s*statement/i,
        /position\s*of/i,
        /base\s*salary/i,
      ],
      weight: 1.1,
    },
    {
      type: 'Invoice',
      keywords: [
        'invoice',
        'bill to',
        'invoice number',
        'inv#',
        'amount due',
        'payment terms',
        'remit to',
        'subtotal',
        'balance due',
        'due date',
      ],
      filenamePatterns: [/invoice/i, /inv[_\-\s]?\d+/i, /bill[_\-\s]?\d+/i],
      textPatterns: [
        /invoice\s*(#|no|number)/i,
        /bill\s*to:/i,
        /total\s*due/i,
        /payment\s*terms/i,
        /net\s*(15|30|60)\s*days/i,
      ],
      weight: 1.3,
    },
    {
      type: 'Receipt',
      keywords: [
        'receipt',
        'cashier',
        'register',
        'subtotal',
        'sales tax',
        'change due',
        'visa ending',
        'mastercard ending',
        'terminal #',
        'store #',
      ],
      filenamePatterns: [/receipt/i, /rec[_\-\s]?\d+/i, /pos[_\-\s]/i],
      textPatterns: [
        /store\s*#/i,
        /register\s*#/i,
        /items\s*sold/i,
        /card\s*type/i,
        /auth\s*code/i,
        /tender\s*type/i,
      ],
      weight: 1.2,
    },
    {
      type: 'Insurance policy',
      keywords: [
        'insurance',
        'policy number',
        'premium',
        'deductible',
        'coverage',
        'policyholder',
        'beneficiary',
        'underwritten by',
        'health insurance',
        'auto insurance',
        'life insurance',
      ],
      filenamePatterns: [/insurance/i, /policy/i, /claim/i, /coverage/i],
      textPatterns: [
        /policy\s*(#|no|number)/i,
        /effective\s*date/i,
        /expiration\s*date/i,
        /deductible/i,
        /coverage\s*limit/i,
      ],
      weight: 1.2,
    },
    {
      type: 'Vehicle document',
      keywords: [
        'vehicle identification number',
        'vin',
        'license plate',
        'odometer',
        'certificate of title',
        'registration card',
        'department of motor vehicles',
        'dmv',
        'make and model',
      ],
      filenamePatterns: [/vehicle/i, /car[_\-\s]?title/i, /registration/i, /vin/i, /dmv/i],
      textPatterns: [
        /vin:\s*[A-HJ-NPR-Z0-9]{11,17}/i,
        /odometer\s*reading/i,
        /license\s*plate/i,
        /motor\s*vehicle/i,
      ],
      weight: 1.3,
    },
    {
      type: 'Property document',
      keywords: [
        'deed',
        'lease agreement',
        'mortgage',
        'landlord',
        'tenant',
        'rental agreement',
        'property tax',
        'premises',
        'escrow',
        'title deed',
      ],
      filenamePatterns: [/lease/i, /mortgage/i, /deed/i, /property/i, /rental/i],
      textPatterns: [
        /landlord\s*and\s*tenant/i,
        /leased\s*premises/i,
        /monthly\s*rent/i,
        /security\s*deposit/i,
        /parcel\s*id/i,
      ],
      weight: 1.1,
    },
    {
      type: 'Contract',
      keywords: [
        'agreement',
        'terms and conditions',
        'confidentiality',
        'non-disclosure',
        'nda',
        'hereby agree',
        'in witness whereof',
        'binding agreement',
        'parties',
      ],
      filenamePatterns: [/contract/i, /agreement/i, /nda/i, /sla/i],
      textPatterns: [
        /by\s*and\s*between/i,
        /in\s*witness\s*whereof/i,
        /terms\s*and\s*conditions/i,
        /governing\s*law/i,
      ],
      weight: 1.0,
    },
    {
      type: 'Business licence',
      keywords: [
        'business license',
        'business licence',
        'articles of incorporation',
        'certificate of good standing',
        'secretary of state',
        'registered agent',
        'llc',
        'corporation',
        'operating agreement',
      ],
      filenamePatterns: [/business[_\-\s]?licen[cs]e/i, /articles[_\-\s]of/i, /certificate[_\-\s]of[_\-\s]incorporation/i],
      textPatterns: [
        /secretary\s*of\s*state/i,
        /authorized\s*to\s*transact\s*business/i,
        /articles\s*of\s*organization/i,
        /business\s*entity/i,
      ],
      weight: 1.2,
    },
    {
      type: 'Tax document',
      keywords: [
        'internal revenue service',
        'irs',
        'form 1040',
        'tax return',
        '1099-misc',
        'w-4',
        'w-9',
        'adjusted gross income',
        'taxable income',
        'tax year',
      ],
      filenamePatterns: [/tax/i, /1040/i, /1099/i, /w4/i, /w9/i, /irs/i],
      textPatterns: [
        /form\s*(1040|1099|w-2|w-4|w-9)/i,
        /department\s*of\s*the\s*treasury/i,
        /internal\s*revenue\s*service/i,
        /tax\s*year/i,
      ],
      weight: 1.3,
    },
    {
      type: 'Medical document',
      keywords: [
        'patient',
        'physician',
        'diagnosis',
        'prescription',
        'clinic',
        'hospital',
        'laboratory report',
        'medical record',
        'blood test',
        'dosage',
      ],
      filenamePatterns: [/medical/i, /lab[_\-\s]?result/i, /prescription/i, /doctor/i, /clinic/i],
      textPatterns: [
        /patient\s*name/i,
        /attending\s*physician/i,
        /rx\s*#/i,
        /diagnosis:/i,
        /clinical\s*notes/i,
      ],
      weight: 1.2,
    },
  ];

  /**
   * Deterministically classify document based on filename and extracted text
   */
  static classify(filename: string, extractedText: string): ClassificationResult {
    const scores: Record<DocumentType, { score: number; matchedRules: string[] }> = {
      'Identity document': { score: 0, matchedRules: [] },
      'Education certificate': { score: 0, matchedRules: [] },
      'Employment document': { score: 0, matchedRules: [] },
      Invoice: { score: 0, matchedRules: [] },
      Receipt: { score: 0, matchedRules: [] },
      'Insurance policy': { score: 0, matchedRules: [] },
      'Vehicle document': { score: 0, matchedRules: [] },
      'Property document': { score: 0, matchedRules: [] },
      Contract: { score: 0, matchedRules: [] },
      'Business licence': { score: 0, matchedRules: [] },
      'Tax document': { score: 0, matchedRules: [] },
      'Medical document': { score: 0, matchedRules: [] },
      Other: { score: 0.1, matchedRules: ['Default baseline'] },
    };

    const lowerName = filename.toLowerCase();
    const lowerText = extractedText.toLowerCase();

    for (const rule of this.rules) {
      // 1. Check filename patterns (strong indicator)
      for (const pattern of rule.filenamePatterns) {
        if (pattern.test(lowerName)) {
          scores[rule.type].score += 3.5 * rule.weight;
          scores[rule.type].matchedRules.push(`Filename match: ${pattern.toString()}`);
        }
      }

      // 2. Check regex text patterns
      for (const pattern of rule.textPatterns) {
        if (pattern.test(lowerText)) {
          scores[rule.type].score += 2.5 * rule.weight;
          scores[rule.type].matchedRules.push(`Text regex match: ${pattern.source}`);
        }
      }

      // 3. Check keyword occurrences
      let keywordHits = 0;
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          keywordHits++;
          scores[rule.type].matchedRules.push(`Keyword match: "${keyword}"`);
        }
      }
      scores[rule.type].score += keywordHits * 0.8 * rule.weight;
    }

    // Find best match
    let bestType: DocumentType = 'Other';
    let maxScore = 0;

    for (const [type, data] of Object.entries(scores)) {
      if (data.score > maxScore) {
        maxScore = data.score;
        bestType = type as DocumentType;
      }
    }

    if (maxScore < 1.5) {
      return {
        documentType: 'Other',
        confidence: 0.5,
        matchedRules: ['Insufficient distinct keyword matches'],
      };
    }

    // Confidence normalized 0.65 to 0.98
    const confidence = Math.min(0.98, Math.max(0.65, 0.6 + maxScore * 0.05));

    return {
      documentType: bestType,
      confidence: parseFloat(confidence.toFixed(2)),
      matchedRules: scores[bestType].matchedRules.slice(0, 5),
    };
  }
}
