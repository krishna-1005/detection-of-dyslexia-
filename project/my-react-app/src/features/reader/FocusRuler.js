import React, { useState, useEffect } from 'react';
import './FocusRuler.css';

const FocusRuler = ({ isActive }) => {
  const [position, setPosition] = useState({ y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isActive) {
        setPosition({ y: e.clientY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      <div 
        className="focus-ruler-overlay-top" 
        style={{ height: `${position.y - 40}px` }}
      />
      <div 
        className="focus-ruler-highlight" 
        style={{ top: `${position.y - 40}px` }}
      />
      <div 
        className="focus-ruler-overlay-bottom" 
        style={{ top: `${position.y + 40}px` }}
      />
    </>
  );
};

export default FocusRuler;
