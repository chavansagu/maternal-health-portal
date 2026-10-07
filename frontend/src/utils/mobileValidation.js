// Mobile Number Validation Utility for Indian Mobile Numbers
// Pattern: Must be 10 digits starting with 6, 7, 8, or 9

export const validateMobileNumber = (mobileNumber) => {
  if (!mobileNumber) {
    return { isValid: false, error: 'Mobile number is required' };
  }

  const trimmedNumber = mobileNumber.trim();
  
  if (trimmedNumber.length !== 10) {
    return { isValid: false, error: 'Mobile number must be exactly 10 digits' };
  }

  if (!/^\d{10}$/.test(trimmedNumber)) {
    return { isValid: false, error: 'Mobile number must contain only digits' };
  }

  if (!/^[6-9]/.test(trimmedNumber)) {
    return { isValid: false, error: 'Mobile number must start with 6, 7, 8, or 9' };
  }

  return { isValid: true, error: '' };
};

export const formatMobileNumberInput = (value) => {
  return value.replace(/\D/g, '').slice(0, 10);
};
