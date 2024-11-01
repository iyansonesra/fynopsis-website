import React from 'react';
import { ArrowRight } from 'lucide-react';

const PulsingEmailInput = () => {
  return (
    <div className="flex justify-center flex-col items-center w-full mt-24 mb-24">
      <h1 className="font-montserrat text-2xl">Get early access today</h1>
      
      <div className="w-full flex items-center justify-center mt-4">
        <div className="flex flex-row items-center justify-center mt-8 w-full relative">
          <div className="absolute inset-0 w-[55%] rounded-2xl animate-pulse-glow" />
          <input 
            type="text" 
            placeholder="Enter your email to get early access" 
            className="w-[55%] border h-12 bg-tan-100 rounded-2xl px-4 text-slate-900 border-slate-400 text-xl outline-none relative z-10" 
          />
          <button className="w-12 aspect-square bg-gray-700 text-white rounded-2xl ml-2 flex items-center justify-center">
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-glow {
    0% {
      box-shadow: 0 35px 35px rgba(83,113,255,0.15);
    }
    50% {
      box-shadow: 0 35px 35px rgba(83,113,255,0.4);
    }
    100% {
      box-shadow: 0 35px 35px rgba(83,113,255,0.15);
    }
  }

  .animate-pulse-glow {
    animation: pulse-glow 3s ease-in-out infinite;
  }
`;
document.head.appendChild(style);

export default PulsingEmailInput;