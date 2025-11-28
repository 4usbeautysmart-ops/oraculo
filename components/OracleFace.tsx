import React, { useState, useEffect, useRef } from 'react';

const OracleFace: React.FC<{ isResponseReceived: boolean; isTyping: boolean; }> = ({ isResponseReceived, isTyping }) => {
    const [isAnimatingGlow, setIsAnimatingGlow] = useState(false);
    const prevResponseReceivedRef = useRef(isResponseReceived);
    const faceRef = useRef<HTMLDivElement>(null);
    const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isResponseReceived && !prevResponseReceivedRef.current) {
            setIsAnimatingGlow(true);
            const timer = setTimeout(() => setIsAnimatingGlow(false), 2500); // duration of mystic-glow animation
            return () => clearTimeout(timer);
        }
        prevResponseReceivedRef.current = isResponseReceived;
    }, [isResponseReceived]);

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!faceRef.current) return;

        const rect = faceRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;

        const maxOffset = 3; // Movimento ainda mais sutil e contemplativo

        const offsetX = (deltaX / (rect.width / 2)) * maxOffset;
        const offsetY = (deltaY / (rect.height / 2)) * maxOffset;

        setEyeOffset({ x: offsetX, y: offsetY });
    };

    const handleMouseLeave = () => {
        setEyeOffset({ x: 0, y: 0 });
    };


    return (
        <div 
            ref={faceRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative w-48 h-48 md:w-64 md:h-64 mb-8 group animate-fade-in"
        >
            {/* Background Glow */}
            <div
                className={`absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500/20 via-amber-600/20 to-yellow-400/20 blur-2xl transition-all duration-500 group-hover:scale-105 animate-gradient-glow ${isAnimatingGlow ? 'animate-mystic-glow' : ''}`}
                aria-hidden="true"
             />
             {/* SVG Oracle */}
             <svg
                viewBox="0 0 200 200"
                className={`relative w-full h-full transition-transform duration-500 ${isTyping ? 'animate-typing-pulse' : 'animate-subtle-pulse'}`}
                aria-label="Rosto de um Oráculo místico"
             >
                <defs>
                    <linearGradient id="oracle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'rgba(253, 186, 116, 1)', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: 'rgba(245, 158, 11, 1)', stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id="svg-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g stroke="url(#oracle-gradient)" strokeWidth="1.5" fill="none" filter="url(#svg-glow)">
                    {/* Face Outline - Static */}
                    <path d="M 50,150 C 50,90 150,90 150,150" strokeWidth="2" />
                    <path d="M 60,60 C 80,30 120,30 140,60" />

                    {/* Moving parts */}
                    <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`} style={{ transition: 'transform 0.5s ease-out' }}>
                        {/* Eyes */}
                        <path d="M 75,100 C 85,90 100,90 105,100" />
                        <path d="M 125,100 C 115,90 100,90 95,100" transform="scale(-1, 1) translate(-200, 0)" />

                        {/* Third Eye Symbol */}
                        <circle cx="100" cy="75" r="3" strokeWidth="1" />
                        <path d="M 90,75 a 10 5 0 0 1 20 0" />
                        <path d="M 90,75 a 10 5 0 0 0 20 0" />
                    </g>
                </g>
             </svg>
        </div>
    );
};

export default OracleFace;