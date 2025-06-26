import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import './LoanApplicationForm.css';

const steps = [
  'Personal Information',
  'Contact & Employment',
  'References',
  'Documents & Loan Details',
];

const initialFormData = {
  // Personal Information
  firstName: '',
  lastName: '',
  email: '',
  idNumber: '',
  passportNumber: '',
  gender: '',
  dateOfBirth: '',
  placeOfResidence: '',
  detailedAddress: '',
  // Contact & Employment
  phoneNumber: '',
  alternatePhone: '',
  workType: '',
  monthlyIncome: '',
  // References
  reference1FirstName: '',
  reference1LastName: '',
  reference1Phone: '',
  reference1Gender: '',
  reference1Relationship: '',
  reference2FirstName: '',
  reference2LastName: '',
  reference2Phone: '',
  reference2Gender: '',
  reference2Relationship: '',
  // Documents & Loan Details
  idCardFront: null,
  idCardBack: null,
  passport: null,
  loanAmount: '',
  loanPurpose: '',
  repaymentPeriod: '30',
};

const LoanApplicationForm = ({ onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ ...initialFormData, email: user?.email || '' });
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Step validation
  const validateStep = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName && formData.lastName && formData.email && formData.idNumber && formData.gender && formData.dateOfBirth && formData.placeOfResidence && formData.detailedAddress;
      case 1:
        return formData.phoneNumber && formData.workType && formData.monthlyIncome;
      case 2:
        return formData.reference1FirstName && formData.reference1LastName && formData.reference1Phone && formData.reference1Gender && formData.reference1Relationship && formData.reference2FirstName && formData.reference2LastName && formData.reference2Phone && formData.reference2Gender && formData.reference2Relationship;
      case 3:
        return formData.loanAmount && formData.loanPurpose && formData.repaymentPeriod;
      default:
        return true;
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value,
    }));
  };

  // File upload helper
  const uploadFile = async (file, fileName) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${fileName}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('loan-documents').upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
    return publicUrl;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Upload files
      const idCardFrontUrl = await uploadFile(formData.idCardFront, 'id_card_front');
      const idCardBackUrl = await uploadFile(formData.idCardBack, 'id_card_back');
      const passportUrl = await uploadFile(formData.passport, 'passport');
      // Prepare data
      const applicationData = {
        user_id: user.id,
        user_email: user.email,
        user_name: `${formData.firstName} ${formData.lastName}`,
        first_name: formData.firstName,
        last_name: formData.lastName,
        id_number: formData.idNumber,
        passport_number: formData.passportNumber || null,
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        place_of_residence: formData.placeOfResidence,
        detailed_address: formData.detailedAddress,
        phone_number: formData.phoneNumber,
        alternate_phone: formData.alternatePhone || null,
        work_type: formData.workType,
        monthly_income: parseFloat(formData.monthlyIncome),
        reference1_first_name: formData.reference1FirstName,
        reference1_last_name: formData.reference1LastName,
        reference1_phone: formData.reference1Phone,
        reference1_gender: formData.reference1Gender,
        reference1_relationship: formData.reference1Relationship,
        reference2_first_name: formData.reference2FirstName,
        reference2_last_name: formData.reference2LastName,
        reference2_phone: formData.reference2Phone,
        reference2_gender: formData.reference2Gender,
        reference2_relationship: formData.reference2Relationship,
        id_card_front_url: idCardFrontUrl,
        id_card_back_url: idCardBackUrl,
        passport_url: passportUrl,
        amount: parseFloat(formData.loanAmount),
        loan_amount_kes: parseFloat(formData.loanAmount),
        purpose: formData.loanPurpose,
        repayment_period_days: parseInt(formData.repaymentPeriod),
        annual_income: parseFloat(formData.monthlyIncome) * 12,
        employment_status: formData.workType,
        term_months: Math.ceil(parseInt(formData.repaymentPeriod) / 30),
        status: 'pending',
      };
      const { error: dbError } = await supabase.from('loan_applications').insert([applicationData]);
      if (dbError) throw dbError;
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (!validateStep()) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const prevStep = () => {
    setError('');
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  // Step renderers
  const renderPersonal = () => (
    <div className="form-step">
      <div className="form-grid">
        <div className="form-group">
          <label>First Name*</label>
          <input name="firstName" value={formData.firstName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Last Name*</label>
          <input name="lastName" value={formData.lastName} onChange={handleChange} required />
        </div>
        <div className="form-group full-width">
          <label>Email*</label>
          <input name="email" type="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>ID Card Number*</label>
          <input name="idNumber" value={formData.idNumber} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Passport Number (Optional)</label>
          <input name="passportNumber" value={formData.passportNumber} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Gender*</label>
          <select name="gender" value={formData.gender} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Date of Birth*</label>
          <input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required />
        </div>
        <div className="form-group full-width">
          <label>Place of Residence*</label>
          <input name="placeOfResidence" value={formData.placeOfResidence} onChange={handleChange} required />
        </div>
        <div className="form-group full-width">
          <label>Detailed Address*</label>
          <textarea name="detailedAddress" value={formData.detailedAddress} onChange={handleChange} required rows={2} />
        </div>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="form-step">
      <div className="form-grid">
        <div className="form-group">
          <label>M-Pesa Phone Number*</label>
          <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Alternate Phone</label>
          <input name="alternatePhone" value={formData.alternatePhone} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Work Type*</label>
          <input name="workType" value={formData.workType} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Monthly Income (KES)*</label>
          <input name="monthlyIncome" type="number" value={formData.monthlyIncome} onChange={handleChange} required />
        </div>
      </div>
    </div>
  );

  const renderReferences = () => (
    <div className="form-step">
      <div className="form-grid">
        <div className="form-group">
          <label>Reference 1 First Name*</label>
          <input name="reference1FirstName" value={formData.reference1FirstName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Reference 1 Last Name*</label>
          <input name="reference1LastName" value={formData.reference1LastName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Reference 1 Phone*</label>
          <input name="reference1Phone" value={formData.reference1Phone} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Reference 1 Gender*</label>
          <select name="reference1Gender" value={formData.reference1Gender} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Reference 1 Relationship*</label>
          <input name="reference1Relationship" value={formData.reference1Relationship} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Reference 2 First Name*</label>
          <input name="reference2FirstName" value={formData.reference2FirstName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Reference 2 Last Name*</label>
          <input name="reference2LastName" value={formData.reference2LastName} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Reference 2 Phone*</label>
          <input name="reference2Phone" value={formData.reference2Phone} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Reference 2 Gender*</label>
          <select name="reference2Gender" value={formData.reference2Gender} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Reference 2 Relationship*</label>
          <input name="reference2Relationship" value={formData.reference2Relationship} onChange={handleChange} required />
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="form-step">
      <div className="form-grid">
        <div className="form-group">
          <label>ID Card Front</label>
          <input name="idCardFront" type="file" accept="image/*,application/pdf" onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>ID Card Back</label>
          <input name="idCardBack" type="file" accept="image/*,application/pdf" onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Passport (Optional)</label>
          <input name="passport" type="file" accept="image/*,application/pdf" onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Loan Amount (KES)*</label>
          <input name="loanAmount" type="number" value={formData.loanAmount} onChange={handleChange} required min="5000" max="5000000" step="100" />
        </div>
        <div className="form-group">
          <label>Loan Purpose*</label>
          <select name="loanPurpose" value={formData.loanPurpose} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="business">Business</option>
            <option value="education">Education</option>
            <option value="medical">Medical</option>
            <option value="home_improvement">Home Improvement</option>
            <option value="debt_consolidation">Debt Consolidation</option>
            <option value="emergency">Emergency</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Repayment Period (Days)*</label>
          <select name="repaymentPeriod" value={formData.repaymentPeriod} onChange={handleChange} required>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="45">45 days</option>
            <option value="60">60 days</option>
          </select>
        </div>
      </div>
    </div>
  );

  // Step progress bar
  const renderProgressBar = () => (
    <div className="step-progress-bar-wrapper" aria-label="Form progress" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length} role="progressbar">
      <div
        className="step-progress-bar"
        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
      />
    </div>
  );

  // Step indicator
  const renderStepIndicator = () => (
    <div className="step-indicator">
      {steps.map((label, idx) => (
        <div key={label} className={`step ${currentStep >= idx ? 'active' : ''} ${currentStep === idx ? 'current' : ''}`}>
          <div className="step-number">{idx + 1}</div>
          <div className="step-label">{label}</div>
        </div>
      ))}
    </div>
  );

  // Main render
  return (
    <div className="loan-form-overlay">
      <div className="loan-form-container multi-step" style={{ background: '#fff', borderRadius: 24, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.13)', padding: 0, maxWidth: 900, width: '100%' }}>
        <div className="loan-form-header">
          <h2>Apply for Quick Loan</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {renderProgressBar()}
        {submitted ? (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Application Submitted!</h2>
            <p>Your loan application has been successfully submitted. We'll review it and get back to you soon.</p>
            <button className="submit-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="loan-form" onSubmit={handleSubmit}>
            {renderStepIndicator()}
            {error && <div className="error-message">{error}</div>}
            {currentStep === 0 && renderPersonal()}
            {currentStep === 1 && renderContact()}
            {currentStep === 2 && renderReferences()}
            {currentStep === 3 && renderDocuments()}
            <div className="form-actions">
              {currentStep > 0 && <button type="button" className="cancel-btn" onClick={prevStep}>Previous</button>}
              {currentStep < steps.length - 1 && <button type="button" className="submit-btn" onClick={nextStep}>Next</button>}
              {currentStep === steps.length - 1 && <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Submitting...' : 'Submit Application'}</button>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoanApplicationForm; 