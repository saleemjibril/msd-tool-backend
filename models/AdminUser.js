import mongoose from "mongoose";

const adminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);
