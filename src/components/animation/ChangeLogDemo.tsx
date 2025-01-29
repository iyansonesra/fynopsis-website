import React, { useState, useEffect, useRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { TextShimmer } from '../ui/text-shimmer';

// Custom hook for intersection observer
const useInView = (options = {}) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        // Once we've seen it, we can disconnect the observer
        observer.disconnect();
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, isInView];
};

const ChangeLogDemo = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [ref, isInView] = useInView({
    threshold: 0.2, // Trigger when 20% of the component is visible
    rootMargin: '50px' // Start loading a bit before it comes into view
  });

  const changeLogs = [
    {
      user: "Sarah Chen",
      action: "updated financial projections Q4.xlsx",
      time: "2 minutes ago"
    },
    {
      user: "Mike Peterson",
      action: "added new version of legal agreement.pdf",
      time: "5 minutes ago"
    },
    {
      user: "Ana Silva",
      action: "modified company overview.docx",
      time: "12 minutes ago"
    },
    {
      user: "Tom Wilson",
      action: "uploaded revised term sheet.pdf",
      time: "15 minutes ago"
    }
  ];

  useEffect(() => {
    if (!isInView) return; // Don't start animation until in view

    // Start animation sequence after 1 second
    const timer1 = setTimeout(() => {
      setIsCollapsed(true);
    }, 2000);

    // Show loader after collapse animation
    const timer2 = setTimeout(() => {
      setShowLoader(true);
    }, 3000);

    // Show summary after loading
    const timer3 = setTimeout(() => {
      setShowLoader(false);
      setShowSummary(true);
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isInView]); // Dependency on isInView

  return (
    <div ref={ref} className="relative w-full max-w-lg mx-auto p-4 h-96 flex justify-center items-center font-montserrat">
      <div className="space-y-3">
        {changeLogs.map((log, index) => (
          <div
            key={index}
            className={`transform transition-all duration-500 ${isCollapsed
                ? 'opacity-0 -translate-y-16'
                : 'opacity-100 translate-y-0'
              }`}
            style={{
              transitionDelay: `${index * 100}ms`
            }}
          >
            <Card className="p-3 bg-neutral-900 border-none text-white shadow-sm">
              <p className="text-sm">
                <span className="font-semibold">{log.user}</span> {log.action}
                <span className="text-gray-500 ml-2">{log.time}</span>
              </p>
            </Card>
          </div>
        ))}
      </div>

      {showLoader && (
        <div className="absolute top-1/2 left-1/2 transform transition-transform -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700">
          <LoaderCircle className="animate-spin mx-auto mb-2" />
          {/* <p className="text-sm font-medium text-">Generating update summary</p> */}
          <TextShimmer
            key="generating-sources"
            className='text-sm'
            duration={1}
          >
            Generating Update Summary...
          </TextShimmer>        
          </div>
      )}

      <div
        className={`absolute left-0 right-0 px-4 transition-all duration-700 ease-out ${showSummary
        ? 'opacity-100 top-1/2 -translate-y-1/2'
        : 'opacity-0 top-full translate-y-0'
          }`}
      >
        <Card className="p-4 bg-neutral-950 shadow-lg transform transition-transform border-none relative overflow-hidden">
          <h3 className="font-semibold mb-2 text-white relative z-10">Recent Changes Summary</h3>
          <p className="text-sm text-gray-500 relative z-10">
        In the last 15 minutes, there have been 4 document updates:
        modifications to financial projections and company overview documents,
        a new version of the legal agreement, and an updated term sheet.
        Key changes focus on Q4 financial data and revised legal terms.
          </p>
          <div className="absolute -bottom-1/2 -right-1/2 w-[100%] h-[100%] bg-blue-500 rounded-lg blur-3xl opacity-25"></div>
        </Card>
      </div>
    </div>
  );
};

export default ChangeLogDemo;