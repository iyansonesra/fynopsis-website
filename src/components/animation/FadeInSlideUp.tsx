import React, { ReactNode } from 'react';
import useFadeInSlideUp from './useFadeInSlideUp';

interface FadeInSlideUpProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

const FadeInSlideUp: React.FC<FadeInSlideUpProps> = ({
  children,
  className = '',
  threshold,
  rootMargin,
  triggerOnce
}) => {
  const [ref, isVisible] = useFadeInSlideUp({
    threshold,
    rootMargin,
    triggerOnce
  });

  return (
    <div 
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-10'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default FadeInSlideUp;