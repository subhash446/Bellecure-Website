const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    from_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone_number: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    business_type: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'website',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);
