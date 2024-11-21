import React, { useEffect, useRef, useMemo } from 'react';

const FlowingLine = ({ 
  color = "#5271FF", 
  className = "",
  height = 450,
  amplitude = 15 // Controls how much the line curves up and down
}) => {
  const containerRef = useRef(null);

  // Generate a simple, smooth curve
  const path = useMemo(() => {
    // Create a single, smooth S-curve across the width
    return `M0,${height/2} C250,${height/2 - amplitude} 750,${height/2 + amplitude} 1000,${height/2}`;
  }, [height, amplitude]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-flow');
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-32 overflow-visible opacity-0 ${className}`}
    >
      <svg
        className="w-full h-full"
        viewBox={`0 0 1000 ${height}`}
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={path}
          stroke={color}
          strokeWidth="4"
          className="flowing-path"
        />
      </svg>
      <style jsx>{`
        .animate-flow {
          animation: fadeIn 0.5s forwards;
        }
        
        .animate-flow .flowing-path {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: drawLine 2s forwards ease-out,
                     flowEffect 4s 2s infinite ease-in-out;
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }

        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes flowEffect {
          0% {
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dashoffset: -100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FlowingLine;