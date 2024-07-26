import React from 'react';
import RecentSearch from './RecentSearch';
import { ScrollArea } from './ui/scroll-area';
import UserSearchBubble from './UserSearchBubble';
import GPTResponse from './GPTResponse';
import { Send, User } from 'lucide-react';



interface StockProps {
  image: string;
  stockName: string;
  stockDescription: string;
  imageType: 'circular' | 'rectangular';
}

const Stock: React.FC<StockProps> = ({
  image,
  stockName,
  stockDescription,
  imageType,
}) => {
  return (
    <div className='w-full h-full flex flex-col'>
      <div className=' flex flex-row flex-1 h-[10%] items-center pl-8 gap-2 2xl:gap-3'>
        <h1 className="flex flex-col font-semibold text-2xl 2xl:text-4xl">{stockName} </h1>
        <h1 className="text-2xl font-light 2xl:text-4xl">|</h1>
        <h1 className="text-2xl font-light 2xl:text-4xl">Apple Inc.</h1>
        <div className ="rounded-full border border-1 border-black inline-block px-2 2xl:px-4 text-sm 2xl:text-lg ml-1 mt-2">PUBLIC</div>
      </div>

      <div className='flex flex-[10] flex-row h-[80%] px-4 gap-4 '>
        <div className="flex-[3] flex flex-col w-[60%] h-[90%] xl:h-[85%] 2xl:h-[88%] gap-4">
          <div className="flex flex-[2] h-[40%] rounded-2xl"></div>

          <div className="flex relative flex-[3] h-[50%] border rounded-2xl py-2 2xl:py-4 justify-center gap-4">
            <ScrollArea className="h-[calc(100%-40px-0.5rem)] 2xl:h-[calc(100%-60px-0.5rem)] overflow-auto w-full px-4">
              <div className="flex flex-col gap-4 2xl:gap-6">
                <UserSearchBubble userSearch="When did Apple begin selling the iPhone 7? What was the overall public response?" />
                <GPTResponse userSearch="Apple began selling the iPhone 7 in September 2016. The overall public response was positive." />
                <UserSearchBubble userSearch="When did Apple begin selling the iPhone 7? What was the overall public response?" />
                <GPTResponse userSearch="Apple began selling the iPhone 7 in September 2016. The overall public response was positive." />
                <UserSearchBubble userSearch="When did Apple begin selling the iPhone 7? What was the overall public response?" />
                <GPTResponse userSearch="Apple began selling the iPhone 7 in September 2016. The overall public response was positive." />
                <UserSearchBubble userSearch="When did Apple begin selling the iPhone 7? What was the overall public response?" />
                <GPTResponse userSearch="Apple began selling the iPhone 7 in September 2016. The overall public response was positive." />
       
              </div>
            </ScrollArea>
            <input className="inputBar w-[calc(100%-1rem)] absolute bottom-2 2xl:bottom-4 h-[40px] 2xl:h-[60px] border rounded-full pl-4 bg-transparent text-base" placeholder="Message Fynopsis"></input>
            <Send className="absolute right-6 bottom-4 2xl:right-8 2xl:bottom-6 h-6 w-6 2xl:h-10 2xl:w-10 text-slate-500"></Send>
            <div className="absolute rounded-2xl bottom-[calc(40px+.5rem)] 2xl:bottom-[calc(60px+1rem)] left-0 right-0  h-8 2xl:h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>

          </div>
        </div>

        <div className="flex-[2] flex w-[40%] h-[90%] xl:h-[85%] 2xl:h-[88%]">
          <div className = "h-full w-full  rounded-2xl border flex flex-col">
            <div className = "flex-1  w-full h-[10%] border-b py-2 px-4 2xl:py-4 2xl:px-8">
              <h1 className = "font-normal italic 2xl:text-2xl">April 5, 2019</h1>  {/*will put date in focus here*/}
              <h1 className = "font-bold text-3xl 2xl:text-5xl">45.29 USD</h1>  {/*will put date in focus here*/}
            </div>
            <div className = "flex-[5] lg:flex-[7] xl:flex-[6] 2xl:flex-[8] w-full h-[90%] px-4 2xl:px-8 py-2">
              <h1 className='font-medium italic 2xl:text-2xl'>What Happened?</h1>
              <h1 className="font-normal 2xl:text-2xl">Lots of text lots of text Lots of text lots of text Lots of text lots of text Lots of text lots of text Lots of text lots of text Lots of text lots of text</h1>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Stock;