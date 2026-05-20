import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  ipNo: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Patient age is required'],
    min: 1,
    max: 125
  },
  date: {
    type: String,
    required: [true, 'Intake date is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other']
  },
  fileName: {
    type: String,
    required: [true, 'Diagnostic file name is required']
  },
  fileSize: {
    type: String,
    required: [true, 'Diagnostic file size is required']
  },
  fileData: {
    type: String,
    required: [true, 'Diagnostic file content (Base64) is required']
  },
  driveFileId: {
    type: String,
    required: false
  },
  driveFileUrl: {
    type: String,
    required: false
  },
  driveReportFileId: {
    type: String,
    required: false
  },
  driveReportFileUrl: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Configure JSON serialization to expose virtual 'id' mapping from Mongo '_id'
PatientSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

PatientSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {   delete ret._id;  }
});

const Patient = mongoose.model('Patient', PatientSchema);
export default Patient;
