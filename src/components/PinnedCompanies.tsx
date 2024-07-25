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
    <div className='bg-slate-100 2xl:w-[200px] xl:w-[180px lg:w-[140px] sm:w-[130px] xs:w-[110px] rounded-2xl sm:h-12 lg:h-16 xl:h-28 2xl:h-40 flex flex-col overflow-hidden mt-4'>
        
      <div className = "logoContainer h-[70%] w-full  flex justify-center items-center p-2">
        <div className = "logo h-full aspect-square rounded-full bg-blue-100"></div>
      </div>

      <div className = "h-[30%] w-full flex items-align justify-center">
        <h1>{stockName}</h1>
      </div>

    </div>
  );
};

export default PinnedCompany;