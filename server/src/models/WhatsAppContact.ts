import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppContact extends Document {
  phoneNumber: string;       // Unique customer number
  name?: string;             // Customer name from WhatsApp profile
  linkedTo: string;          // The WA Account number this contact interacted with
  totalIncoming: number;     // Messages from customer
  totalOutgoing: number;     // Messages from admin/bot
  lastMessage?: string;      // Snippet of last message
  lastInteraction: Date;     // Timestamp for sorting
  messageCounter: number;    // Counter for recursive summarization
  nativeContext?: string;    // Compressed long-term memory
  isBotStopped: boolean;     // Toggle for AI agent
  metadata: Record<string, any>;
}

const WhatsAppContactSchema: Schema = new Schema({
  phoneNumber: { type: String, required: true, index: true },
  name: { type: String },
  linkedTo: { type: String, required: true, index: true },
  totalIncoming: { type: Number, default: 0 },
  totalOutgoing: { type: Number, default: 0 },
  lastMessage: { type: String },
  lastInteraction: { type: Date, default: Date.now },
  messageCounter: { type: Number, default: 0 },
  nativeContext: { type: String, default: "" },
  isBotStopped: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Composite index for efficient querying per account
WhatsAppContactSchema.index({ linkedTo: 1, lastInteraction: -1 });
WhatsAppContactSchema.index({ phoneNumber: 1, linkedTo: 1 }, { unique: true });

export default mongoose.model<IWhatsAppContact>("WhatsAppContact", WhatsAppContactSchema);
