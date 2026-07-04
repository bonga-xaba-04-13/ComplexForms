import { StepperResponse, FormDefinitionResponse } from '../models/index';

export const MOCK_STEPPER: StepperResponse = {
  stepperKeyname: 'patient_intake_stepper',
  title: 'Patient Registration',
  totalSteps: 3,
  steps: [
    {
      stepId: 0,
      formKeyname: 'reg_personal_info',
      title: 'Personal Information',
      subtitle: 'Enter your personal details',
      order: 0,
    },
    {
      stepId: 1,
      formKeyname: 'reg_medical_insurance',
      title: 'Medical & Insurance Details',
      subtitle: 'Provide your medical and insurance information',
      order: 1,
    },
    {
      stepId: 2,
      formKeyname: 'reg_consent_info',
      title: 'Consent & Additional Information',
      subtitle: 'Complete authorization and preferences',
      order: 2,
    },
  ],
};

export const MOCK_STEP_FORMS: Record<string, FormDefinitionResponse> = {
  reg_personal_info: {
    id: 1,
    formKeyname: 'reg_personal_info',
    formLabel: 'Personal Information',
    formDescription: 'Capture patient personal details',
    allowDynamicParticipants: false,
    definition: JSON.stringify([
      { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'John', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Doe', required: true },
      { name: 'middleName', label: 'Middle Name', type: 'text', placeholder: 'Optional', required: false },
      { name: 'suffix', label: 'Suffix', type: 'select', required: false, options: [
        { label: 'None', value: '' },
        { label: 'Jr.', value: 'jr' },
        { label: 'Sr.', value: 'sr' },
        { label: 'II', value: 'ii' },
      ]},
      { name: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com', required: true },
      { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1 (555) 123-4567', required: true },
      { name: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { name: 'gender', label: 'Gender', type: 'select', required: true, options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
      ]},
      { name: 'address', label: 'Address', type: 'text', placeholder: '123 Main Street', required: true },
      { name: 'city', label: 'City', type: 'text', placeholder: 'New York', required: true },
      { name: 'postalCode', label: 'Postal Code', type: 'text', placeholder: '10001', required: true },
      { name: 'preferredLanguage', label: 'Preferred Language', type: 'select', required: false, options: [
        { label: 'English', value: 'english' },
        { label: 'Spanish', value: 'spanish' },
        { label: 'Mandarin', value: 'mandarin' },
      ]},
    ]),
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  reg_medical_insurance: {
    id: 2,
    formKeyname: 'reg_medical_insurance',
    formLabel: 'Medical & Insurance Details',
    formDescription: 'Capture medical history and insurance information',
    allowDynamicParticipants: false,
    definition: JSON.stringify([
      { name: 'currentMedications', label: 'Current Medications', type: 'textarea', placeholder: 'List medications...', rows: 4 },
      { name: 'drugAllergies', label: 'Drug Allergies', type: 'textarea', placeholder: 'List drug allergies...', rows: 4 },
      { name: 'chronicConditions', label: 'Chronic Conditions', type: 'checkgroup', options: [
        { label: 'Diabetes', value: 'diabetes' },
        { label: 'Hypertension', value: 'hypertension' },
        { label: 'Asthma', value: 'asthma' },
        { label: 'Heart Disease', value: 'heart-disease' },
        { label: 'Arthritis', value: 'arthritis' },
        { label: 'COPD', value: 'copd' },
      ]},
      { name: 'insuranceProvider', label: 'Insurance Provider Name', type: 'text', placeholder: 'Blue Cross' },
      { name: 'insuranceType', label: 'Insurance Type', type: 'select', options: [
        { label: 'HMO', value: 'hmo' },
        { label: 'PPO', value: 'ppo' },
        { label: 'Medicare', value: 'medicare' },
      ]},
      { name: 'policyNumber', label: 'Policy Number', type: 'text', placeholder: 'Your policy number' },
      { name: 'primaryCarePhysician', label: 'Primary Care Physician Name', type: 'text', placeholder: 'Dr. Smith' },
    ]),
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  reg_consent_info: {
    id: 3,
    formKeyname: 'reg_consent_info',
    formLabel: 'Consent & Additional Information',
    formDescription: 'Capture consent and emergency contact information',
    allowDynamicParticipants: false,
    definition: JSON.stringify([
      { name: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text', placeholder: 'Contact Name', required: true },
      { name: 'emergencyContactPhone', label: 'Emergency Contact Phone', type: 'tel', placeholder: '+1 (555) 987-6543', required: true },
      { name: 'relationship', label: 'Relationship', type: 'select', required: true, options: [
        { label: 'Spouse', value: 'spouse' },
        { label: 'Parent', value: 'parent' },
        { label: 'Child', value: 'child' },
        { label: 'Sibling', value: 'sibling' },
      ]},
      { name: 'consentToTreatment', label: 'I consent to medical treatment', type: 'radio', required: true, options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { name: 'medicalRecordsAuthorization', label: 'I authorize access to my medical records', type: 'checkbox', required: true },
      { name: 'hipaaAuthorization', label: 'I acknowledge HIPAA privacy notice', type: 'checkbox', required: true },
      { name: 'preferredContactMethod', label: 'Preferred Contact Method', type: 'radio', required: true, options: [
        { label: 'Phone Call', value: 'phone' },
        { label: 'Email', value: 'email' },
        { label: 'Text Message', value: 'text' },
      ]},
    ]),
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};
