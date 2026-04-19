import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppMessage extends Document {
  messageId: string;         // WhatsApp unique ID
  sessionId: string;         // Instance ID
  from: string;              // Sender number
  to: string;                // Recipient number
  text: string;              // Message content
  type: "text" | "image" | "audio" | "document";
  senderType: "customer" | "admin" | "bot";
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;           // Precision timestamp
  isAi: boolean;
  isCampaign?: boolean;
  isSystem?: boolean;
  mediaUrl?: string;
}

const WhatsAppMessageSchema: Schema = new Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  sessionId: { type: String, required: true, index: true },
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  text: { type: String },
  type: { type: String, enum: ["text", "image", "audio", "document"], default: "text" },
  senderType: { type: String, enum: ["customer", "admin", "bot"], required: true },
  status: { type: String, enum: ["sent", "delivered", "read", "failed"], default: "sent" },
  timestamp: { type: Date, default: Date.now },
  isAi: { type: Boolean, default: false },
  isCampaign: { type: Boolean, default: false },
  isSystem: { type: Boolean, default: false },
  mediaUrl: { type: String }
}, { timestamps: true, collection: 'whatsapp_messages' });

// Index for chat history retrieval
WhatsAppMessageSchema.index({ sessionId: 1, from: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ sessionId: 1, to: 1, timestamp: -1 });

export default mongoose.model<IWhatsAppMessage>("WhatsAppMessage", WhatsAppMessageSchema);
