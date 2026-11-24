import mongoose from 'mongoose';

const evidenceItemSchema = new mongoose.Schema(
  {
    source_name: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    published_date: { type: String, default: null },
    content: { type: String, required: true },
    relevance_score: { type: Number, default: null },
    evidence_relationship: {
      type: String,
      enum: ['SUPPORTS', 'CONTRADICTS', 'CONTEXTUALIZES', 'NEUTRAL'],
      default: 'NEUTRAL'
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { _id: false }
);

const extractedClaimSchema = new mongoose.Schema(
  {
    claim: { type: String, required: true },
    is_verifiable: { type: Boolean, default: true },
    confidence: { type: Number, default: 1.0 },
    verification_reasoning: { type: String, default: '' }
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    original_input: {
      type: String,
      required: true,
      trim: true
    },
    input_type: {
      type: String,
      enum: ['TEXT', 'CLAIM', 'IMAGE', 'PDF', 'URL'],
      default: 'CLAIM',
      index: true
    },
    extracted_text: {
      type: String,
      default: null
    },
    extracted_claims: {
      type: [extractedClaimSchema],
      default: []
    },
    primary_claim: {
      type: String,
      required: true,
      trim: true
    },
    verdict: {
      type: String,
      enum: ['VERIFIED', 'FALSE', 'MISLEADING', 'PARTIALLY TRUE', 'UNVERIFIED'],
      default: 'UNVERIFIED',
      index: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    summary: {
      type: String,
      default: ''
    },
    explanation: {
      type: String,
      default: ''
    },
    supporting_evidence: {
      type: [evidenceItemSchema],
      default: []
    },
    contradicting_evidence: {
      type: [evidenceItemSchema],
      default: []
    },
    contextual_evidence: {
      type: [evidenceItemSchema],
      default: []
    },
    corrected_headline: {
      type: String,
      default: null
    },
    corrected_news: {
      type: String,
      default: null
    },
    correction_explanation: {
      type: String,
      default: null
    },
    sources: {
      type: [String],
      default: []
    },
    limitations: {
      type: [String],
      default: []
    },
    processing_status: {
      type: String,
      enum: [
        'RECEIVED',
        'EXTRACTING_TEXT',
        'EXTRACTING_CLAIMS',
        'SEARCHING_EVIDENCE',
        'ANALYZING_EVIDENCE',
        'GENERATING_VERDICT',
        'GENERATING_CORRECTION',
        'COMPLETED',
        'FAILED'
      ],
      default: 'COMPLETED',
      index: true
    },
    error_details: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index for sorted history listing with filters
verificationSchema.index({ createdAt: -1 });
verificationSchema.index({ verdict: 1, createdAt: -1 });

export const Verification = mongoose.model('Verification', verificationSchema);
