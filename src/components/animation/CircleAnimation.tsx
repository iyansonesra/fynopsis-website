import React, { useState, useEffect, useRef } from 'react';

const CircleBurstAnimation = () => {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [textSlid, setTextSlid] = useState(false);
  const [startCircleAnimation, setStartCircleAnimation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const containerRef = useRef(null);
  
  const radius = 85;
  const strokeWidth = 10;
  const center = radius + strokeWidth;
  const size = (radius + strokeWidth) * 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getProgressText = () => {
    if (!textSlid) {
      return (
        <>
          Uploading 2024_Finance_Report.pdf
          <span className="animate-[ellipsis_1s_steps(4,end)_infinite] font-montserrat">...</span>
        </>
      );
    }
    
    switch (progress) {
      case 0:
        return 'Analyzing document...';
      case 25:
        return 'Finding relevant tags...';
      case 50:
        return 'Finding trends...';
      case 75:
        return 'Generating summary...';
      case 100:
        return 'Complete!';
      default:
        return 'Processing...';
    }
  };
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          setTimeout(() => {
            setTextSlid(true);
            
            setTimeout(() => {
              setStartCircleAnimation(true);
              setIsAnimating(true);
            }, 1500);
          }, 1500);
        }
      },
      {
        threshold: 0.5,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!isAnimating || !startCircleAnimation) return;
    
    const steps = [25, 50, 75, 100];
    let currentStep = 0;
    
    const animate = () => {
      if (currentStep >= steps.length) {
        setIsAnimating(false);
        setTimeout(() => {
          setShowSummary(true);
        }, 0);
        return;
      }
      
      setProgress(steps[currentStep]);
      
      setTimeout(() => {
        currentStep++;
        animate();
      }, 1100);
    };
    
    animate();
    
    return () => setIsAnimating(false);
  }, [isAnimating, startCircleAnimation]);
  
  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full min-h-64 ">
      {/* Original circle and text container */}
      <div className={`
        transition-all duration-1000 ease-in-out transform
        ${showSummary ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}>
        {/* Text element */}
        <div className={`
            absolute top-1/2 left-0 right-0 -mt-16 flex items-center justify-center 
          transition-all duration-500 ease-in-out transform
          ${textSlid ? '-translate-y-24' : 'translate-y-0'}
        `}>
          <div className="bg-neutral-900 rounded-lg shadow-md px-6 py-3">
            <p className="text-gray-300 font-medium font-montserrat whitespace-nowrap">
              {getProgressText()}
            </p>
          </div>
        </div>


        
        {/* Circle animation with fade in */}
        <div className={`transition-opacity duration-1000 ${textSlid ? 'opacity-100' : 'opacity-0'}`}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#262626"
              strokeWidth={strokeWidth}
            />
            
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-in-out"
            />
          </svg>
        </div>
      </div>

      {/* Summary container */}
      <div className={`
        absolute inset-0 
        transition-all duration-1000 ease-in-out transform px-8
        ${showSummary ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}>
        <div className="rounded-lg shadow-lg p-6 max-w-2xl mx-auto font-montserrat bg-neutral-950 relative overflow-hidden">
          <div className="flex flex-col space-y-4 relative z-10">
            <h2 className="text-xl 2xl:text-2xl font-bold text-gray-200 truncate">
              2024_Finance_Report.pdf
            </h2>
            
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs 2xl:text-base md:text-sm whitespace-nowrap">
          Finance
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs  2xl:text-base md:text-sm whitespace-nowrap">
          Annual Report
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs  2xl:text-base  md:text-sm whitespace-nowrap">
          2024
              </span>
            </div>
            
            <div className="text-gray-400">
              <p className="text-xs md:text-sm 2xl:text-lg">
              This annual financial report covers the fiscal year 2024, highlighting key performance indicators,
              revenue growth of 15%, and strategic initiatives. The document includes detailed sections on 
              market analysis, risk assessment, and future projections.
              </p>
            </div>
          </div>
          {/* Blue gradient background effect */}
          <div className="absolute -bottom-1/2 -right-1/2 w-[100%] h-[100%] bg-blue-500 rounded-lg blur-3xl opacity-25"></div>
        </div>
      </div>
    </div>
  );
};

export default CircleBurstAnimation;