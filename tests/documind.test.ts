// DocuMind Core Suite Unit & Logic Tests

import { CryptoService } from '../src/services/encryption/crypto';
import { DocumentClassifier } from '../src/services/classification/classifier';
import { MetadataExtractor } from '../src/services/extraction/metadataExtractor';
import { ProcessingPipeline } from '../src/services/processing/processingPipeline';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`✗ [FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- Running DocuMind Test Suite ---');

  // 1. Cryptography: Salt & Verification
  try {
    const salt1 = CryptoService.generateSalt();
    const salt2 = CryptoService.generateSalt();
    assert(salt1.length === 32 && salt1 !== salt2, 'generateSalt produces unique 32-hex character strings');

    const verifier = await CryptoService.createPasswordVerifier('secretPass123', salt1);
    assert(verifier.length > 20, 'createPasswordVerifier generates valid AES-GCM verifier token');

    const validCheck = await CryptoService.verifyPassword('secretPass123', salt1, verifier);
    assert(validCheck === true, 'verifyPassword returns true for matching password');

    const invalidCheck = await CryptoService.verifyPassword('wrongPassword', salt1, verifier);
    assert(invalidCheck === false, 'verifyPassword returns false for non-matching password');
  } catch (err) {
    assert(false, `Crypto verification test failed: ${err}`);
  }

  // 2. Cryptography: SHA-256 Hashing
  try {
    const enc = new TextEncoder();
    const buffer = enc.encode('DocuMind Offline Vault Test Document Content').buffer as ArrayBuffer;
    const hash = await CryptoService.calculateHash(buffer);
    assert(hash.length === 64, `calculateHash returns 64-character hex string (${hash.slice(0, 8)}...)`);
  } catch (err) {
    assert(false, `calculateHash failed: ${err}`);
  }

  // 3. Document Classification
  try {
    const invoiceResult = DocumentClassifier.classify(
      'inv_2024_001.pdf',
      'Invoice #99201 Bill To: Acme Corp Amount Due: $1,250.00 Net 30 days'
    );
    assert(invoiceResult.documentType === 'Invoice', `classify detects Invoice (got ${invoiceResult.documentType})`);

    const idResult = DocumentClassifier.classify(
      'scan_doc.jpg',
      'Passport No: 8291028 Nationality: United States Date of Birth: 1988-04-12'
    );
    assert(idResult.documentType === 'Identity document', `classify detects Identity document (got ${idResult.documentType})`);

    const contractResult = DocumentClassifier.classify(
      'service_agreement.pdf',
      'This non-disclosure agreement is entered into by and between the parties in witness whereof...'
    );
    assert(contractResult.documentType === 'Contract', `classify detects Contract (got ${contractResult.documentType})`);

    const taxResult = DocumentClassifier.classify(
      'w2_form.pdf',
      'Internal Revenue Service Form W-2 Wage and Tax Statement Tax Year 2024'
    );
    assert(taxResult.documentType === 'Tax document', `classify detects Tax document (got ${taxResult.documentType})`);
  } catch (err) {
    assert(false, `DocumentClassifier failed: ${err}`);
  }

  // 4. Metadata Extraction
  try {
    const sampleText = `
Acme Cloud Services
Invoice No: INV-88291
Issue Date: 2026-03-15
Due Date: 2026-04-15
Total Due: $450.00
Payment terms: Net 30
`;
    const fields = MetadataExtractor.extract(sampleText, 'Invoice', 'test-doc-id');
    const issueDate = fields.find((f) => f.fieldName === 'Issue Date');
    const expiryDate = fields.find((f) => f.fieldName === 'Expiry Date');
    const refNum = fields.find((f) => f.fieldName === 'Reference Number');
    const amount = fields.find((f) => f.fieldName === 'Total Amount');

    assert(Boolean(issueDate && issueDate.fieldValue === '2026-03-15'), 'extract finds Issue Date 2026-03-15');
    assert(Boolean(expiryDate && expiryDate.fieldValue === '2026-04-15'), 'extract finds Expiry/Due Date 2026-04-15');
    assert(Boolean(refNum && refNum.fieldValue === 'INV-88291'), 'extract finds Reference Number INV-88291');
    assert(Boolean(amount && amount.fieldValue === '450.00'), 'extract finds Total Amount 450.00');

    // Verification check: all extracted fields must default to unverified
    const allUnverified = fields.every((f) => f.verificationStatus === 'unverified');
    assert(allUnverified, 'AI & extracted fields must strictly default to "unverified" status');
  } catch (err) {
    assert(false, `MetadataExtractor failed: ${err}`);
  }

  // 5. File Signature Validation
  try {
    // Simulated PDF bytes: %PDF-
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfRes = await ProcessingPipeline.validateFileSignature(pdfBlob);
    assert(pdfRes.valid && pdfRes.detectedFormat === 'PDF', 'validateFileSignature recognizes PDF magic bytes');

    // Simulated PNG bytes: \x89PNG
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngBlob = new Blob([pngBytes], { type: 'image/png' });
    const pngRes = await ProcessingPipeline.validateFileSignature(pngBlob);
    assert(pngRes.valid && pngRes.detectedFormat === 'PNG Image', 'validateFileSignature recognizes PNG magic bytes');
  } catch (err) {
    assert(false, `File signature validation failed: ${err}`);
  }

  console.log(`\nTests finished: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
