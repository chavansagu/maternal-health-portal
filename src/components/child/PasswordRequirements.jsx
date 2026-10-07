import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { authAPI } from '../../services/api';
import { checkPasswordRequirement, getPasswordStrength } from '../../helper/passwordValidation';

const PasswordRequirements = ({ password = '', showStrength = true }) => {
  const [requirements, setRequirements] = useState([]);
  const [example, setExample] = useState('');

  useEffect(() => {
    authAPI.getPasswordRequirements()
      .then(data => {
        setRequirements(data.requirements);
        setExample(data.example);
      })
      .catch(() => {
        setRequirements([
          { rule: 'min_length', description: 'At least 8 characters' },
          { rule: 'uppercase', description: 'At least one uppercase letter (A-Z)' },
          { rule: 'lowercase', description: 'At least one lowercase letter (a-z)' },
          { rule: 'number', description: 'At least one number (0-9)' },
          { rule: 'special', description: 'At least one special character (!@#$%^&*)' }
        ]);
        setExample('Example: MyP@ssw0rd');
      });
  }, []);

  const strength = password ? getPasswordStrength(password) : null;

  return (
    <div className='password-requirements-container'>
      <div className='mb-2'>
        <small className='text-secondary-light fw-medium'>Password Requirements:</small>
      </div>
      <ul className='list-unstyled mb-2'>
        {requirements.map((req, index) => {
          const isValid = password && checkPasswordRequirement(password, req.rule);
          return (
            <li key={index} className='mb-1'>
              <small className={isValid ? 'text-success' : 'text-secondary-light'}>
                <Icon 
                  icon={isValid ? 'mdi:check-circle' : 'mdi:circle-outline'} 
                  className='me-1'
                />
                {req.description}
              </small>
            </li>
          );
        })}
      </ul>
      {showStrength && password && strength && (
        <div className='mb-2'>
          <div className='d-flex align-items-center gap-2 mb-1'>
            <div className='flex-grow-1 bg-neutral-200' style={{ height: '4px', borderRadius: '2px' }}>
              <div 
                style={{ 
                  width: `${strength.width}%`, 
                  height: '100%', 
                  backgroundColor: strength.color,
                  borderRadius: '2px',
                  transition: 'all 0.3s'
                }}
              />
            </div>
            <small className='fw-medium' style={{ color: strength.color }}>
              {strength.label}
            </small>
          </div>
        </div>
      )}
      {example && (
        <small className='text-muted fst-italic'>{example}</small>
      )}
    </div>
  );
};

export default PasswordRequirements;
