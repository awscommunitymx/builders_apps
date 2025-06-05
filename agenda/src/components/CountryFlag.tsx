import React from 'react';
import Flag from 'react-world-flags';

interface CountryFlagProps {
  nationality: string | undefined;
  size?: number;
}

// Mapeo de nacionalidades a códigos de país para las banderas
const nationalityToCode: Record<string, string> = {
  Argentina: 'ar',
  Argentino: 'ar',
  Brazil: 'br',
  Brasil: 'br',
  Chile: 'cl',
  Colombian: 'co',
  Colombia: 'co',
  Mexico: 'mx',
  Mexican: 'mx',
  México: 'mx',
  Mexicano: 'mx',
  Peru: 'pe',
  Perú: 'pe',
  USA: 'us',
  'United States': 'us',
  Ecuador: 'ec',
  Venezuela: 've',
  Spain: 'es',
  España: 'es',
  India: 'in',
  English: 'gb',
  UK: 'gb',
  'United Kingdom': 'gb',
};

const CountryFlag: React.FC<CountryFlagProps> = ({ nationality, size = 18 }) => {
  // Si no hay nacionalidad o no está en nuestro mapeo, no mostramos nada
  if (!nationality || !nationalityToCode[nationality]) {
    return null;
  }

  const countryCode = nationalityToCode[nationality];

  return (
    <Flag
      code={countryCode}
      alt={`Bandera de ${nationality}`}
      title={nationality}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: '6px',
        verticalAlign: 'middle',
        borderRadius: '2px',
      }}
    />
  );
};

export default CountryFlag;
