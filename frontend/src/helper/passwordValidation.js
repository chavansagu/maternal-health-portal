export const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push({ rule: 'min_length', message: 'At least 8 characters' });
  }
  if (!/[A-Z]/.test(password)) {
    errors.push({ rule: 'uppercase', message: 'At least one uppercase letter (A-Z)' });
  }
  if (!/[a-z]/.test(password)) {
    errors.push({ rule: 'lowercase', message: 'At least one lowercase letter (a-z)' });
  }
  if (!/[0-9]/.test(password)) {
    errors.push({ rule: 'number', message: 'At least one number (0-9)' });
  }
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
    errors.push({ rule: 'special', message: 'At least one special character (!@#$%^&*)' });
  }
  
  return errors;
};

export const getPasswordStrength = (password) => {
  const errors = validatePassword(password);
  const strength = 5 - errors.length;
  
  if (strength === 5) return { label: 'Strong', color: '#28a745', width: 100 };
  if (strength >= 3) return { label: 'Medium', color: '#ffc107', width: 66 };
  return { label: 'Weak', color: '#dc3545', width: 33 };
};

export const checkPasswordRequirement = (password, rule) => {
  switch (rule) {
    case 'min_length':
      return password.length >= 8;
    case 'uppercase':
      return /[A-Z]/.test(password);
    case 'lowercase':
      return /[a-z]/.test(password);
    case 'number':
      return /[0-9]/.test(password);
    case 'special':
      return /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
    default:
      return false;
  }
};
