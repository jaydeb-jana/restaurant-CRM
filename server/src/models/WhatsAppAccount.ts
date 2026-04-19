import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppAccount extends Document {
  sessionId: string;
  phoneNumber: string;
  name: string;
  status: "connected" | "disconnected" | "connecting";
  profilePic?: string;
  lastSeen: Date;
  isActive: boolean;
}

const WhatsAppAccountSchema: Schema = new Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  phoneNumber: { type: String, required: true, index: true },
  name: { type: String, default: "WhatsApp Business" },
  status: { type: String, enum: ["connected", "disconnected", "connecting"], default: "disconnected" },
  profilePic: { type: String },
  lastSeen: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IWhatsAppAccount>("WhatsAppAccount", WhatsAppAccountSchema);
