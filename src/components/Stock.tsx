import React from 'react';
import RecentSearch from './RecentSearch';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import UserSearchBubble from './UserSearchBubble';
import GPTResponse from './GPTResponse';
import { Copy, Scroll, Search, Send, User } from 'lucide-react';
import RelevantLink from './RelevantLinks';
import CustomGraph from './StockGraph';
import generateRandomStockData from './GenerateRandomStockData';
import { useState, useRef, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { post } from 'aws-amplify/api';
import { Separator } from './ui/separator';
import IndustryButton from './IndustryButton';
import StatListing from './StatListing';
import Deal from './Deal';

interface StockProps {
  image: string;
  stockName: string;
  stockDescription: string;
  imageType: 'circular' | 'rectangular';
}

type Message = {
  type: 'user' | 'bot';
  content: string;
};

interface ResponseBody {
  message: string;
  // add other properties as needed
}

interface ApiResponse {
  body: {
    message: string;
    input: {
      query: string;
    };
  }
}

const LearnMoreContent = () => (
  <div className="relative mt-4  w-full flex flex-row justify-center">
    <Search className="h-4 w-4 2xl:h-6 2xl:w-6 absolute left-[15%] self-center decoration-slate-300" />
    <input className = "w-3/4 h-8 2xl:h-12 2xl:text-lg bg-slate-100 rounded-full pl-12 2xl:pl-16 text-sm" placeholder='Ask a question...'></input>
  </div>
);

const Stock: React.FC<StockProps> = ({
  image,
  stockName,
  stockDescription,
  imageType,
}) => {
  const { data, importantMarkers } = generateRandomStockData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showDealHistory, setShowDealHistory] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [deals, setDeals] = useState([
    { date: 'August 28, 2019', dealDescription: 'blah blah blah blah blah blah blah blah blah blahblah blah b' },
    { date: 'August 28, 2019', dealDescription: 'blah blah blah blah blah blah blah blah blah blahblah blah b' },
    // ... add all your deals here
  ]);
  const [isCopiedAll, setIsCopiedAll] = useState(false);

  async function handleFetchAccess() {
    try {
      const access = (await fetchAuthSession()).tokens?.accessToken?.toString();
      if (!access) {
        throw new Error("Token is null or undefined");
      }
      return access;
    } catch (error) {
      console.log(error);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages((prevMessages) => [
      ...prevMessages,
      { type: 'user', content: userMessage },
    ]);

    const accessTokens = await handleFetchAccess();
    console.log("requesting information");
    if (accessTokens) {
      try {
        const restOperation = post({
          apiName: 'testAPI',
          path: '/postAgent',
          options: {
            headers: {
              Authorization: accessTokens
            },
            body: {
              query: userMessage
            }
          }
        });

        const { body } = await restOperation.response;
        const responseText = await body.text();
        const responseMain: ApiResponse = JSON.parse(responseText);
        console.log(responseText);
        console.log(responseMain);

        console.log('POST call succeeded');
        if (responseMain) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { type: 'bot', content: responseMain.body.message },
          ]);
        }
        else {
          setMessages((prevMessages) => [
            ...prevMessages,
            { type: 'bot', content: "Failed. Please Refresh." },
          ]);
        }
      } catch (e) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: 'bot', content: "Failed. Please Refresh." },
        ]);
        console.log('POST call failed: ', e);
      }
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: 'bot', content: "Failed. Please Refresh." },
      ]);
      console.log('Failed to fetch access token.');
    }
  };

  const handleCopyAll = () => {
    const allDealsText = deals.map(deal => `${deal.date}\n${deal.dealDescription}`).join('\n\n');
    navigator.clipboard.writeText(allDealsText)
      .then(() => {
        setIsCopiedAll(true);
        console.log('All deals copied to clipboard');

        setTimeout(() => {
          setIsCopiedAll(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className='w-full h-full flex flex-row py-6 px-4 2xl:py-12 2xl:px-12 font-montserrat gap-4'>
      <div className="flex-[9] flex flex-col">
        <div className="relative flex-[5] flex items-end font-sans">
          <div className="nameAndPrice absolute top-0 left-0 gap-2 2xl:gap-4 flex flex-col">
            <h1 className="text-3xl font-extralight 2xl:text-4xl">Apple Inc. | AAPL</h1>
            <h1 className="text-5xl font-normal font-montserrat 2xl:text-6xl">$122.12</h1>
            <div className="flex">
              <div className="bg-red-400 rounded-2xl px-4 py-1">
                <h1 className="text-white font-montserrat font-semibold text-base 2xl:text-xl">-4.07%</h1>
              </div>
            </div>
          </div>
          <CustomGraph data={data} importantMarkers={importantMarkers} height={'60%'} width={'100%'} gradientColor={'rgb(212,240,255)'} hideXaxis={true} hideYaxis={true} />
        </div>
        <div className="flex-[4] w-full flex flex-col font-sans 2xl:gap-2">
          <div className="flex flex-row justify-between">
            <h1 className="font-semibold 2xl:text-2xl">August 28, 2019</h1>
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className={`px-4 border border-black rounded-full transition-colors ${
                showLearnMore ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              <h1 className="2xl:text-xl">Learn More</h1>
            </button>
          </div>
          <Separator className="decoration-black w-[100%] my-1" />
          {showLearnMore ? (
            <LearnMoreContent />
          ) : (
            <>
              <ScrollArea className='h-[5rem] text-slate-600 text-[.90rem] font-light 2xl:text-2xl 2xl:h-40 mb-4'>
                Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services. Founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne, Apple is best known for its innovative products such as the iPhone, iPad, Mac computers, Apple Watch, and Apple TV.
              </ScrollArea>

              <h1 className="font-semibold 2xl:text-2xl">Relevant Links</h1>
              <div className="flex inline-block relative">
                <ScrollArea className="flex flex-row pb-4 pt-2 w-[50vw] 2xl:w-[50vw] md:w-[65vw] lg:w-[50vw]">
                  <div className="flex flex-row h-full gap-4 justify-center ">
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} />
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} />
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} />
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} />
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="absolute right-0 h-full w-4 bg-gradient-to-l from-white to-transparent"></div>
              </div>
            </>
          )}
        </div>
      </div>

      <ScrollArea className="flex-[4] font-sans">
        <div className="flex flex-row justify-between items-center mb-2">
          <h1 className="font-normal text-lg 2xl:text-2xl">About APPL</h1>
          <button
            onClick={() => setShowDealHistory(!showDealHistory)}
            className={`px-4 border border-black rounded-full transition-colors ${
              showDealHistory ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            <h1 className="2xl:text-xl">Deal History</h1>
          </button>
        </div>
        <Separator className="decoration-black w-[100%] my-1" />
        {showDealHistory ? (
          <div className="inline-block flex flex-col mt-2">
            <div className="flex flex-row items-center justify-end gap-2 mr-2">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-2 focus:outline-none"
                aria-label="Copy all deal information"
              >
                <Copy size={16} />
                <h1 className="text-sm text-black">
                  {isCopiedAll ? "Copied!" : "Copy All"}
                </h1>
              </button>
            </div>
            {deals.map((deal, index) => (
              <Deal key={index} date={deal.date} dealDescription={deal.dealDescription} />
            ))}
          </div>
        ) : (
          <>
            <div className="inline-block flex flex-wrap py-2 2xl:py-4 gap-2">
              <IndustryButton industryName={'Consumer Electronics'} />
              <IndustryButton industryName={'Software'} />
              <IndustryButton industryName={'Cloud'} />
            </div>
            <div className="description inline-block">
              <h1 className="text-slate-600 text-[.95rem] font-light mb-4 2xl:mb-6 2xl:text-2xl">
                Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services. Founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne, Apple is best known for its innovative products such as the iPhone, iPad, Mac computers, Apple Watch, and Apple TV.
              </h1>
            </div>
            <div className="stats flex flex-col gap-4 2xl:gap-6 inline-block">
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Employees' statVal='161,100' />
                <StatListing statName='CEO' statVal='Tim Cook' />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Founded' statVal='1976' />
                <StatListing statName='Based In' statVal='Cupertino, CA' />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='EBITDA' statVal='$129.629B' />
                <StatListing statName='Enterprise Value' statVal='3.36T' />
              </div>
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
};

export default Stock;