import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  {
    ignores: [
      '.next/**',
      '.next-corrupt-*/**',
      'node_modules/**',
      'output/**',
      'outputs/**',
      'tmp/**'
    ]
  },
  ...nextVitals,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off'
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
