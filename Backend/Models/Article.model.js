import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, 'Please provide a valid URL'],
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

articleSchema.index({ title: 'text', source: 'text' });

export const Article = mongoose.model('Article', articleSchema);