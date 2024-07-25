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
    <div style={{ width }} className='bg-slate-100 rounded-2xl sm:h-12 lg:h-16 xl:h-28 2xl:h-40 flex flex-row overflow-hidden mt-4'>
      <div className = "h-[70%] w-full bg-red-100">

      </div>

      <div className = "h-[70%] w-full bg-red-100">

      </div>

    </div>
  );
};

export default PinnedCompany;