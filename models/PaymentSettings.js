const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountTitle: { type: String, required: true },
  accountNumber: { type: String, required: true },
  iban: { type: String, required: true },
  branchCode: { type: String, default: '' },
  swiftCode: { type: String, default: '' },
  qrCodeImage: { type: String, default: '' }, // Cloudinary URL
  paymentAmounts: {
    shop: { type: Number, default: 5000 },
    institute: { type: Number, default: 10000 },
    hospital: { type: Number, default: 15000 },
    marketplace: { type: Number, default: 2000 }
  }
}, {
  timestamps: true
});

// Ensure only one payment settings document exists
paymentSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      bankName: 'HBL Bank',
      accountTitle: 'Pak Nexus Services',
      accountNumber: '1234-5678-9012-3456',
      iban: 'PK36HABB0000001234567890',
      branchCode: '1234',
      swiftCode: 'HABBPKKA',
      qrCodeImage: '',
      paymentAmounts: {
        shop: 5000,
        institute: 10000,
        hospital: 15000,
        marketplace: 2000
      }
    });
  }
  return settings;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);

