import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  {
    files: ['src/components/QuotePDF.tsx'],
    rules: {
      'jsx-a11y/alt-text': 'off'
    }
  }
];

export default config;
