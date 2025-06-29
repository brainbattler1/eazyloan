import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import './LoanApplicationForm.css';

const LoanApplicationForm = ({ onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: user?.email || '',
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
    employmentStatus: '',
    creditScore: '',
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
    termMonths: '1',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [currentSection, setCurrentSection] = useState('personal');

  // Debug effect to monitor income field changes
  useEffect(() => {
    if (formData.monthlyIncome) {
      console.log('Monthly income value updated:', formData.monthlyIncome);
    }
  }, [formData.monthlyIncome]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    // Debug logging for income field
    if (name === 'monthlyIncome') {
      console.log('Monthly income field changed:', { name, value, type });
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value,
    }));
    setError(''); // Clear error when user starts typing
  };

  // Handle file upload specifically to prevent form submission
  const handleFileChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
      setError(''); // Clear error when user uploads file
    }
  };

  // File upload helper
  const uploadFile = async (file, fileName) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${fileName}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('loan-documents')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('loan-documents')
      .getPublicUrl(filePath);
    return publicUrl;
  };

  // Validation
  const validateForm = () => {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'idNumber', 'gender', 'dateOfBirth',
      'placeOfResidence', 'detailedAddress', 'phoneNumber', 'workType', 'monthlyIncome',
      'employmentStatus',
      'reference1FirstName', 'reference1LastName', 'reference1Phone', 'reference1Gender', 'reference1Relationship',
      'reference2FirstName', 'reference2LastName', 'reference2Phone', 'reference2Gender', 'reference2Relationship',
      'loanAmount', 'loanPurpose', 'repaymentPeriod', 'termMonths'
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
        return false;
      }
    }

    if (!formData.idCardFront || !formData.idCardBack) {
      setError('Please upload both front and back of your ID card.');
      return false;
    }

    return true;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    // Small delay to prevent rapid submissions and reduce race conditions
    await new Promise(resolve => setTimeout(resolve, 50));

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
        employment_status: formData.employmentStatus || formData.workType,
        credit_score: formData.creditScore ? parseInt(formData.creditScore) : null,
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
        term_months: parseInt(formData.termMonths),
        status: 'pending',
        pdf_generated: false,
      };

      // Retry logic for handling potential conflicts
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (!success && retryCount < maxRetries) {
        try {
          const { error: dbError } = await supabase
            .from('loan_applications')
            .insert([applicationData]);

          if (dbError) {
            // If it's a duplicate key error, wait a bit and retry
            if (dbError.code === '23505' && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
              continue;
            }
            throw dbError;
          }
          
          success = true;
          setSubmitted(true);
        } catch (retryError) {
          if (retryCount === maxRetries - 1) {
            throw retryError;
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        }
      }
    } catch (err) {
      console.error('Loan application submission error:', err);
      if (err.code === '23505') {
        setError('There was a conflict with your application. Please try submitting again.');
      } else {
        setError(err.message || 'Submission failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Section navigation
  const sections = [
    { id: 'personal', title: 'Personal Info', icon: '👤' },
    { id: 'contact', title: 'Contact & Work', icon: '📞' },
    { id: 'references', title: 'References', icon: '👥' },
    { id: 'documents', title: 'Documents', icon: '📄' },
    { id: 'loan', title: 'Loan Details', icon: '💰' }
  ];

  const scrollToSection = (sectionId) => {
    setCurrentSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (submitted) {
    return (
      <div className="loan-form-container">
        <div className="success-screen">
          <div className="success-animation">
            <div className="checkmark">✓</div>
          </div>
          <h2>Application Submitted Successfully!</h2>
          <p>Your loan application has been received and is being reviewed. We'll contact you within 24 hours.</p>
          <button className="primary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="loan-form-container">
      <div className="form-header">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h1>Quick Loan Application</h1>
        <p>Complete all sections to apply for your loan</p>
      </div>

      {/* Navigation Pills */}
      <div className="section-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`nav-pill ${currentSection === section.id ? 'active' : ''}`}
            onClick={() => scrollToSection(section.id)}
          >
            <span className="nav-icon">{section.icon}</span>
            <span className="nav-text">{section.title}</span>
          </button>
        ))}
      </div>

      <form className="loan-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Personal Information Section */}
        <section id="personal" className="form-section">
          <div className="section-header">
            <h2>👤 Personal Information</h2>
            <p>Tell us about yourself</p>
          </div>
          
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="idNumber">ID Card Number *</label>
            <input
              id="idNumber"
              name="idNumber"
              type="text"
              value={formData.idNumber}
              onChange={handleChange}
              placeholder="Enter your ID number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="passportNumber">Passport Number (Optional)</label>
            <input
              id="passportNumber"
              name="passportNumber"
              type="text"
              value={formData.passportNumber}
              onChange={handleChange}
              placeholder="Enter passport number if available"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender *</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
            >
              <option value="">Select your gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth *</label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="placeOfResidence">Place of Residence *</label>
            <input
              id="placeOfResidence"
              name="placeOfResidence"
              type="text"
              value={formData.placeOfResidence}
              onChange={handleChange}
              placeholder="City, County"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="detailedAddress">Detailed Address *</label>
            <textarea
              id="detailedAddress"
              name="detailedAddress"
              value={formData.detailedAddress}
              onChange={handleChange}
              placeholder="Street address, building, apartment number"
              rows={3}
              required
            />
          </div>
        </section>

        {/* Contact & Employment Section */}
        <section id="contact" className="form-section">
          <div className="section-header">
            <h2>📞 Contact & Employment</h2>
            <p>How can we reach you and your work details</p>
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">M-Pesa Phone Number *</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="0712345678"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="alternatePhone">Alternate Phone Number</label>
            <input
              id="alternatePhone"
              name="alternatePhone"
              type="tel"
              value={formData.alternatePhone}
              onChange={handleChange}
              placeholder="0712345678 (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="workType">Type of Work *</label>
            <input
              id="workType"
              name="workType"
              type="text"
              value={formData.workType}
              onChange={handleChange}
              placeholder="e.g., Teacher, Driver, Business Owner"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="employmentStatus">Employment Status *</label>
            <select
              id="employmentStatus"
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleChange}
              required
            >
              <option value="">Select employment status</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self Employed</option>
              <option value="business_owner">Business Owner</option>
              <option value="freelancer">Freelancer</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
              <option value="unemployed">Unemployed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="creditScore">Credit Score (Optional)</label>
            <input
              id="creditScore"
              name="creditScore"
              type="number"
              value={formData.creditScore}
              onChange={handleChange}
              placeholder="Enter your credit score (300-850)"
              min="300"
              max="850"
            />
            <small className="field-hint">If you know your credit score, it helps us process your application faster</small>
          </div>

          <div className="form-group">
            <label htmlFor="monthlyIncome">Monthly Income (KES) *</label>
            <div className="input-with-clear">
              <input
                id="monthlyIncome"
                name="monthlyIncome"
                type="number"
                value={formData.monthlyIncome}
                onChange={handleChange}
                placeholder="Enter your monthly income (e.g., 50000)"
                min="1000"
                step="1000"
                autoComplete="off"
                required
              />
              {formData.monthlyIncome && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setFormData(prev => ({ ...prev, monthlyIncome: '' }))}
                  title="Clear income field"
                >
                  ×
                </button>
              )}
            </div>
            <small className="field-hint">Enter your actual monthly income in Kenyan Shillings</small>
            {formData.monthlyIncome && parseFloat(formData.monthlyIncome) < 1000 && (
              <small className="field-error">Income must be at least KES 1,000</small>
            )}
          </div>
        </section>

        {/* References Section */}
        <section id="references" className="form-section">
          <div className="section-header">
            <h2>👥 References</h2>
            <p>Provide two people who can vouch for you</p>
          </div>

          <div className="reference-group">
            <h3>Reference 1</h3>
            
            <div className="form-group">
              <label htmlFor="reference1FirstName">First Name *</label>
              <input
                id="reference1FirstName"
                name="reference1FirstName"
                type="text"
                value={formData.reference1FirstName}
                onChange={handleChange}
                placeholder="Reference first name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reference1LastName">Last Name *</label>
              <input
                id="reference1LastName"
                name="reference1LastName"
                type="text"
                value={formData.reference1LastName}
                onChange={handleChange}
                placeholder="Reference last name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reference1Phone">Phone Number *</label>
              <input
                id="reference1Phone"
                name="reference1Phone"
                type="tel"
                value={formData.reference1Phone}
                onChange={handleChange}
                placeholder="0712345678"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reference1Gender">Gender *</label>
              <select
                id="reference1Gender"
                name="reference1Gender"
                value={formData.reference1Gender}
                onChange={handleChange}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reference1Relationship">Relationship *</label>
              <input
                id="reference1Relationship"
                name="reference1Relationship"
                type="text"
                value={formData.reference1Relationship}
                onChange={handleChange}
                placeholder="e.g., Friend, Colleague, Family"
                required
              />
            </div>
          </div>

          <div className="reference-group">
            <h3>Reference 2</h3>
            
            <div className="form-group">
              <label htmlFor="reference2FirstName">First Name *</label>
              <input
                id="reference2FirstName"
                name="reference2FirstName"
                type="text"
                value={formData.reference2FirstName}
                onChange={handleChange}
                placeholder="Reference first name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reference2LastName">Last Name *</label>
              <input
                id="reference2LastName"
                name="reference2LastName"
                type="text"
                value={formData.reference2LastName}
                onChange={handleChange}
                placeholder="Reference last name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reference2Phone">Phone Number *</label>
              <input
                id="reference2Phone"
                name="reference2Phone"
                type="tel"
                value={formData.reference2Phone}
                onChange={handleChange}
                placeholder="0712345678"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reference2Gender">Gender *</label>
              <select
                id="reference2Gender"
                name="reference2Gender"
                value={formData.reference2Gender}
                onChange={handleChange}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reference2Relationship">Relationship *</label>
              <input
                id="reference2Relationship"
                name="reference2Relationship"
                type="text"
                value={formData.reference2Relationship}
                onChange={handleChange}
                placeholder="e.g., Friend, Colleague, Family"
                required
              />
            </div>
          </div>
        </section>

        {/* Documents Section */}
        <section id="documents" className="form-section">
          <div className="section-header">
            <h2>📄 Documents</h2>
            <p>Upload required identification documents</p>
          </div>

          <div className="form-group">
            <label htmlFor="idCardFront">ID Card Front *</label>
            <div className="file-upload">
              <input
                id="idCardFront"
                name="idCardFront"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="file-input"
                required
              />
              <label htmlFor="idCardFront" className="file-label" onClick={(e) => e.stopPropagation()}>
                <span className="file-icon">📷</span>
                <span className="file-text">
                  {formData.idCardFront ? formData.idCardFront.name : 'Take Photo or Upload ID Front'}
                </span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="idCardBack">ID Card Back *</label>
            <div className="file-upload">
              <input
                id="idCardBack"
                name="idCardBack"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="file-input"
                required
              />
              <label htmlFor="idCardBack" className="file-label" onClick={(e) => e.stopPropagation()}>
                <span className="file-icon">📷</span>
                <span className="file-text">
                  {formData.idCardBack ? formData.idCardBack.name : 'Take Photo or Upload ID Back'}
                </span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="passport">Passport (Optional)</label>
            <div className="file-upload">
              <input
                id="passport"
                name="passport"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="passport" className="file-label" onClick={(e) => e.stopPropagation()}>
                <span className="file-icon">📄</span>
                <span className="file-text">
                  {formData.passport ? formData.passport.name : 'Upload Passport (Optional)'}
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Loan Details Section */}
        <section id="loan" className="form-section">
          <div className="section-header">
            <h2>💰 Loan Details</h2>
            <p>Specify your loan requirements</p>
          </div>

          <div className="form-group">
            <label htmlFor="loanAmount">Loan Amount (KES) *</label>
            <input
              id="loanAmount"
              name="loanAmount"
              type="number"
              value={formData.loanAmount}
              onChange={handleChange}
              placeholder="50000"
              min="5000"
              max="5000000"
              step="100"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="loanPurpose">Loan Purpose *</label>
            <select
              id="loanPurpose"
              name="loanPurpose"
              value={formData.loanPurpose}
              onChange={handleChange}
              required
            >
              <option value="">Select loan purpose</option>
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
            <label htmlFor="termMonths">Loan Term (Months) *</label>
            <select
              id="termMonths"
              name="termMonths"
              value={formData.termMonths}
              onChange={handleChange}
              required
            >
              <option value="1">1 month</option>
              <option value="2">2 months</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="24">24 months</option>
              <option value="36">36 months</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="repaymentPeriod">Repayment Period (Days) *</label>
            <select
              id="repaymentPeriod"
              name="repaymentPeriod"
              value={formData.repaymentPeriod}
              onChange={handleChange}
              required
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="45">45 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </section>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanApplicationForm;