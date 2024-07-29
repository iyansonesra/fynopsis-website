import React from 'react';

interface PinnedCompaniesProps {
  image: string;
  stockName: string;
  stockDescription: string;
}

const PinnedCompany: React.FC<PinnedCompaniesProps> = ({
  image,
  stockName,
  stockDescription,
}) => {
  return (
    <div className='bg-slate-100 w-[110px] sm:w-[130px] md:w-[120px] lg:w-[140px] xl:w-[130px] 2xl:w-[160px] aspect-square rounded-2xl flex flex-col overflow-hidden mt-4'>
      <div className="logoContainer h-[70%] w-full flex justify-center items-center p-2">
        <div className="logo h-full aspect-square rounded-full bg-blue-100"></div>
      </div>
      <div className="h-[30%] w-full flex items-center justify-center text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
        <h1>{stockName}</h1>
      </div>
    </div>
  );
};

export default PinnedCompany;