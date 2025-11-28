import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-8">
      <h1 className="font-cinzel text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-white to-amber-200 animate-fade-in-down">
        Oráculo da Consciência
      </h1>
      <p className="mt-2 text-lg text-orange-200/80 animate-fade-in-up">
        Pergunte e a sabedoria do universo responderá.
      </p>
    </header>
  );
};

export default Header;