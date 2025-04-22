import React from 'react';

const Checkbox = ({
  label,
  name,
  checked,
  onChange,
  required = false,
  error = '',
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`flex items-start ${className}`}>
      <div className="flex items-center h-5">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500
            ${error ? 'border-red-300' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          `}
        />
      </div>
      <div className="ml-3 text-sm">
        {label && (
          <label htmlFor={name} className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
};

export default Checkbox;