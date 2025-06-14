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
  Colombiano: 'co',
  Costarricense: 'cr',
  Costa: 'cr',
  CostaRica: 'cr',
  'Costa Rica': 'cr',
  Mexico: 'mx',
  "México ": 'mx',
  Mexican: 'mx',
  México: 'mx',
  Mexicano: 'mx',
  Mexicana: 'mx',
  Peru: 'pe',
  Perú: 'pe',
  Peruana: 'pe',
  Panamá: 'pa',
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
  Russia: 'ru',
  Rusia: 'ru',
  Guatemala: 'gt',
  Guatemalteco: 'gt',
  Salvador: 'sv',
  "El Salvador": 'sv',
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
