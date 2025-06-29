import jsPDF from 'jspdf';
import { supabase } from './supabase';

/**
 * Generate a comprehensive PDF for a loan application
 * @param {Object} application - The loan application data
 * @returns {Promise<string>} - The PDF blob URL
 */
export const generateApplicationPDF = async (application) => {
  try {
    // Get complete application data from database
    const { data: fullData, error } = await supabase
      .rpc('get_application_summary', { app_id: application.id });
    
    if (error) throw error;
    
    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Helper function to add text with word wrapping
    const addText = (text, x, y, options = {}) => {
      const { fontSize = 10, fontStyle = 'normal', maxWidth = contentWidth } = options;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      
      if (maxWidth && text.length > 50) {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * (fontSize * 0.5));
      } else {
        doc.text(text, x, y);
        return y + (fontSize * 0.5);
      }
    };
    
    // Helper function to add section header
    const addSectionHeader = (title, y) => {
      doc.setFillColor(59, 130, 246); // Blue background
      doc.rect(margin, y - 5, contentWidth, 12, 'F');
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 5, y + 3);
      doc.setTextColor(0, 0, 0); // Reset to black
      return y + 20;
    };
    
    // Helper function to add field
    const addField = (label, value, y, options = {}) => {
      const { indent = 0 } = options;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', margin + indent, y);
      doc.setFont('helvetica', 'normal');
      const valueText = value || 'N/A';
      return addText(valueText, margin + indent + 60, y, { maxWidth: contentWidth - 60 - indent });
    };
    
    // Check if new page is needed
    const checkNewPage = (requiredSpace = 30) => {
      if (yPosition + requiredSpace > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPosition = 20;
      }
    };
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Loan Application Details', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    
    // Application Header Info
    yPosition = addSectionHeader('Application Information', yPosition);
    yPosition = addField('Application Number', fullData.application_number, yPosition) + 5;
    yPosition = addField('Application Date', new Date(fullData.created_at).toLocaleDateString(), yPosition) + 5;
    yPosition = addField('Status', fullData.status.toUpperCase(), yPosition) + 5;
    if (fullData.approval_date) {
      yPosition = addField('Approval Date', new Date(fullData.approval_date).toLocaleDateString(), yPosition) + 5;
    }
    yPosition += 10;
    
    checkNewPage();
    
    // Personal Information
    yPosition = addSectionHeader('Personal Information', yPosition);
    yPosition = addField('Full Name', fullData.applicant_name, yPosition) + 5;
    yPosition = addField('Email', fullData.email, yPosition) + 5;
    yPosition = addField('ID Number', fullData.id_number, yPosition) + 5;
    if (fullData.passport_number) {
      yPosition = addField('Passport Number', fullData.passport_number, yPosition) + 5;
    }
    yPosition = addField('Gender', fullData.gender, yPosition) + 5;
    yPosition = addField('Date of Birth', fullData.date_of_birth ? new Date(fullData.date_of_birth).toLocaleDateString() : 'N/A', yPosition) + 5;
    yPosition = addField('Place of Residence', fullData.place_of_residence, yPosition) + 5;
    yPosition = addField('Detailed Address', fullData.address, yPosition) + 10;
    
    checkNewPage();
    
    // Contact Information
    yPosition = addSectionHeader('Contact Information', yPosition);
    yPosition = addField('Primary Phone', fullData.phone_number, yPosition) + 5;
    if (fullData.alternate_phone) {
      yPosition = addField('Alternate Phone', fullData.alternate_phone, yPosition) + 5;
    }
    yPosition += 10;
    
    checkNewPage();
    
    // Employment Information
    yPosition = addSectionHeader('Employment Information', yPosition);
    yPosition = addField('Employment Status', fullData.employment_status, yPosition) + 5;
    yPosition = addField('Work Type', fullData.work_type, yPosition) + 5;
    yPosition = addField('Monthly Income', `${fullData.currency} ${(Number(fullData.monthly_income) || 0).toLocaleString()}`, yPosition) + 5;
    // Annual income field removed from database
    if (fullData.credit_score) {
      yPosition = addField('Credit Score', fullData.credit_score, yPosition) + 5;
    }
    yPosition += 10;
    
    checkNewPage();
    
    // Loan Details
    yPosition = addSectionHeader('Loan Details', yPosition);
    yPosition = addField('Loan Amount', `${fullData.currency} ${(Number(fullData.loan_amount) || 0).toLocaleString()}`, yPosition) + 5;
    yPosition = addField('Purpose', fullData.purpose, yPosition) + 5;
    yPosition = addField('Term', `${fullData.term_months} months`, yPosition) + 5;
    if (fullData.repayment_days) {
      yPosition = addField('Repayment Period', `${fullData.repayment_days} days`, yPosition) + 5;
    }
    yPosition += 10;
    
    checkNewPage();
    
    // References
    if (fullData.references && fullData.references.length > 0) {
      yPosition = addSectionHeader('References', yPosition);
      
      fullData.references.forEach((ref, index) => {
        if (ref.name && ref.name.trim() !== ' ') {
          checkNewPage(25);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Reference ${index + 1}:`, margin, yPosition);
          yPosition += 8;
          
          yPosition = addField('Name', ref.name, yPosition, { indent: 10 }) + 3;
          yPosition = addField('Phone', ref.phone, yPosition, { indent: 10 }) + 3;
          yPosition = addField('Relationship', ref.relationship, yPosition, { indent: 10 }) + 8;
        }
      });
    }
    
    checkNewPage();
    
    // Document Information
    yPosition = addSectionHeader('Document Information', yPosition);
    
    // Check if this is a legacy application (created before document upload feature)
    const isLegacyApplication = !fullData.id_card_front_url && !fullData.id_card_back_url && !fullData.passport_url;
    
    if (isLegacyApplication) {
      yPosition = addField('Document Status', 'Legacy application - documents not required at time of submission', yPosition) + 10;
    } else {
      yPosition = addField('ID Card Front', fullData.id_card_front_url ? 'Uploaded' : 'Not provided', yPosition) + 5;
      yPosition = addField('ID Card Back', fullData.id_card_back_url ? 'Uploaded' : 'Not provided', yPosition) + 5;
      yPosition = addField('Passport', fullData.passport_url ? 'Uploaded' : 'Not provided', yPosition) + 10;
    }
    
    // Footer
    checkNewPage(30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);
    doc.text('This is a system-generated document.', margin, yPosition + 10);
    
    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.height - 10);
    }
    
    return doc;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

/**
 * Download existing PDF from storage or generate new one
 * @param {Object} application - The loan application data
 * @returns {Promise<void>}
 */
export const downloadApplicationPDF = async (application) => {
  try {
    // Get current user ID for proper folder structure
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const filename = `${user.id}/${application.application_number || application.id}_application.pdf`;
    
    // Check if PDF already exists in storage
    if (application.pdf_url && application.pdf_generated) {
      // Download existing PDF from storage
      const { data, error } = await supabase.storage
        .from('loan-documents')
        .download(filename);
      
      if (!error && data) {
        // Create download link
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${application.application_number || 'loan-application'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
    }
    
    // Generate new PDF if not found in storage
    const doc = await generateApplicationPDF(application);
    const downloadFilename = `${application.application_number || 'loan-application'}.pdf`;
    doc.save(downloadFilename);
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

/**
 * Upload PDF to Supabase storage and mark as generated
 * @param {Object} application - The loan application data
 * @returns {Promise<string>} - The storage URL
 */
export const uploadAndMarkPDFGenerated = async (application) => {
  try {
    const doc = await generateApplicationPDF(application);
    
    // Get current user ID for proper folder structure (required by RLS policy)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const filename = `${user.id}/${application.application_number || application.id}_application.pdf`;
    
    // Convert PDF to blob
    const pdfBlob = doc.output('blob');
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('loan-documents')
      .upload(filename, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('loan-documents')
      .getPublicUrl(filename);
    
    const pdfUrl = urlData.publicUrl;
    
    // Mark PDF as generated in database
    const { error: markError } = await supabase
      .rpc('mark_pdf_generated', {
        app_id: application.id,
        pdf_file_url: pdfUrl
      });
    
    if (markError) throw markError;
    
    return pdfUrl;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};