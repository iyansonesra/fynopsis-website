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
    <div className='bg-slate-100 2xl:w-[200px] xl:w-[180px lg:w-[140px] sm:w-[130px] xs:w-[110px] rounded-2xl h-20 sm:h-20 lg:h-24 xl:h-28 2xl:h-40 flex flex-col overflow-hidden mt-4'>
        
      <div className = "logoContainer h-[70%] w-full  flex justify-center items-center p-2">
        <div className = "logo h-full aspect-square rounded-full bg-blue-100"></div>
      </div>

      <div className = "h-[30%] w-full flex items-align justify-center 2xl:text-2xl xl:text-xl lg:text-lg md:text-md sm:text-sm">
        <h1>{stockName}</h1>
      </div>

    </div>
  );
};

export default PinnedCompany;