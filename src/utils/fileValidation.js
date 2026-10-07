// File validation utility for upload security
// Backend enforces: PDF, JPG, PNG only, max 10MB

const FILE_TYPES = {
  prescription: {
    extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    maxSizeMB: 10
  },
  report: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    maxSizeMB: 10
  },
  attachment: {
    extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    maxSizeMB: 10
  }
};

export const validateFile = (file, fileType = 'prescription') => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  const config = FILE_TYPES[fileType];
  if (!config) {
    return { valid: false, error: 'Invalid file type configuration' };
  }

  // Check file size
  const maxSizeBytes = config.maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File too large. Maximum ${config.maxSizeMB}MB allowed. Your file is ${fileSizeMB}MB.`
    };
  }

  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!config.extensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file type. Only ${config.extensions.join(', ')} files are allowed.`
    };
  }

  // Check MIME type
  const mimeType = file.type.toLowerCase();
  if (!config.mimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file format. Only ${config.extensions.join(', ')} files are allowed.`
    };
  }

  return { valid: true };
};

export const handleFileUploadError = (error, response) => {
  if (response) {
    if (response.status === 413) {
      return 'File is too large. Please select a file smaller than 10MB.';
    } else if (response.status === 400) {
      if (error.detail?.includes('Invalid file type')) {
        return 'Invalid file format. Please upload PDF, JPG, or PNG file.';
      } else if (error.detail?.includes('content does not match')) {
        return 'File appears to be corrupted or has wrong extension. Please check your file.';
      }
      return error.detail || 'Invalid file. Please check your file and try again.';
    }
  }
  return error.detail || error.message || 'Upload failed. Please try again.';
};

export { FILE_TYPES };
