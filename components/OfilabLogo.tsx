import React from 'react';

interface OfilabLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OfilabLogo: React.FC<OfilabLogoProps> = ({ 
  size = 'md', 
  className = ''
}) => {
  const heightMap = {
    sm: 'h-14',
    md: 'h-20 md:h-24',
    lg: 'h-28'
  };

  const currentHeight = heightMap[size];

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/Logo_transparente.png"
        alt="OFILAB OCR Document System"
        className={`${currentHeight} w-auto object-contain max-h-[76px] transition-transform duration-300 hover:scale-[1.02] drop-shadow-xs`}
      />
    </div>
  );
};
