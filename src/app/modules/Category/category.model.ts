// src/app/modules/Category/category.model.ts
import { Schema, model } from "mongoose";
import { TCategory } from "./category.interface";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";

const sizeChartSchema = new Schema(
  {
    headers: {
      type: [String],
      required: true,
    },
    rows: {
      type: [[String]], // Array of string arrays
      required: true,
    },
  },
  { _id: false } // Don't create a separate _id for the chart object
);

const categorySchema = new Schema<TCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    sizeChart: {
      type: sizeChartSchema,
      optional: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "Category", // Self-reference
      default: null, // Top-level categories have null parent
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: Record<string, any>) {
        ret.id = ret._id; // Map _id to id
        delete ret._id; // Now allowed
        delete ret.__v; // Now allowed
        return ret;
      },
    },
  }
);

// Pre-save hook to ensure slug uniqueness on update
categorySchema.pre("save", async function (next) {
  // Slug uniqueness check (remains the same)
  if (this.isModified("slug")) {
    const existingSlug = await Category.findOne({
      slug: this.slug,
      _id: { $ne: this._id }, // Exclude self
    });
    if (existingSlug) {
      return next(
        new Error(`A category with the slug '${this.slug}' already exists.`)
      );
    }
  }

  // --- ADD Parent validation ---
  if (
    this.parentCategory &&
    (this.isNew || this.isModified("parentCategory"))
  ) {
    // 1. Check if parent exists
    const parent = await Category.findById(this.parentCategory);
    if (!parent) {
      return next(
        new ApiError(httpStatus.BAD_REQUEST, "Parent category not found.")
      );
    }
    // 2. Prevent setting self as parent
    if (this._id && this._id.equals(this.parentCategory)) {
      return next(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "A category cannot be its own parent."
        )
      );
    }
  }
  next();
});

export const Category = model<TCategory>("Category", categorySchema);
