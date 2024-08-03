import React, { useCallback, useMemo } from 'react';
import RecentSearch from './RecentSearch';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import UserSearchBubble from './UserSearchBubble';
import GPTResponse from './GPTResponse';
import { Copy, Link, Menu, Scroll, Search, Send, SettingsIcon, User } from 'lucide-react';
import RelevantLink from './RelevantLinks';
import CustomGraph, { DataPoint } from './StockGraph';
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
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { set } from 'react-hook-form';
import { Skeleton } from './ui/skeleton';
import { subDays, subMonths, subYears, parseISO } from 'date-fns';
import { ReferenceArea } from 'recharts';


export function filterDataByTimeframe(data: DataPoint[], timeframe: string): DataPoint[] {
  const endDate = parseISO(data[data.length - 1].name);
  let startDate: Date;

  switch (timeframe) {
    case '1W':
      startDate = subDays(endDate, 6);
      break;
    case '1M':
      startDate = subMonths(endDate, 1);
      break;
    case '6M':
      startDate = subMonths(endDate, 6);
      break;
    case '1Y':
      startDate = subYears(endDate, 1);
      break;
    case '5Y':
      startDate = subYears(endDate, 5);
      break;
    default: // 'MAX'
      return data;
  }

  return data.filter(item => parseISO(item.name) >= startDate);
}


interface StockProps {
  image: string;
  companyName: string;
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

interface InputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const LearnMoreContent: React.FC<InputProps> = ({ value, onChange, onKeyDown }) => (
  <div className="relative mt-4  w-full flex flex-row justify-center">
    <Search className="h-4 w-4 2xl:h-6 2xl:w-6 absolute left-[15%] self-center decoration-slate-300" />
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className="w-3/4 h-8 2xl:h-12 2xl:text-lg bg-slate-100 rounded-full pl-12 2xl:pl-16 text-sm" placeholder='Ask a question...'></input>

  </div>
);

const Stock: React.FC<StockProps> = ({
  image,
  companyName,
  stockDescription,
  imageType,
}) => {
  const [answer, setAnswer] = useState<string>();
  const [query, setQuery] = useState<string>();
  // const [companyName, setCompanyName] = useState<string>('-');
  const [companyDescription, setCompanyDescription] = useState<string>();

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dateInfoLoaded, setDateInfoLoaded] = useState(false);
  const [aboutInfoLoaded, setAboutInfoLoaded] = useState(false);
  const [statInfoLoaded, setStatInfoLoaded] = useState(false);
  const [relevantLinksLoaded, setRelevantLinksLoaded] = useState(false);
  const [industryButtonLoaded, setIndustryButtonLoaded] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('MAX');

  const { data: allData, importantMarkers } = useMemo(() => generateRandomStockData(5), []);
  const [displayedData, setDisplayedData] = useState(allData);
  const [aboutCompanyText, setAboutCompanyText] = useState<string>();
  const [isLoadingAboutText, setIsLoadingAboutText] = useState(true);



  useEffect(() => {
    const filteredData = filterDataByTimeframe(allData, selectedTimeframe);
    setDisplayedData(filteredData);
  }, [selectedTimeframe, allData]);


  useEffect(() => {
    if (isInitialLoad) {
      // Create horizontal line data
      const horizontalLineData: DataPoint[] = allData.map(point => ({
        ...point,
        uv: allData[0].uv / 2, // Use the first value for a straight line
        pv: allData[0].pv / 2,
        amt: allData[0].amt / 2,
      }));

      // Set initial data to horizontal line
      setDisplayedData(horizontalLineData);

      // After 2 seconds, switch to original data
      const timer = setTimeout(() => {
        setDisplayedData(allData);
        setIsInitialLoad(false);
        setDateInfoLoaded(true);
        setAboutInfoLoaded(true);
        setStatInfoLoaded(true);
        setRelevantLinksLoaded(true);
        setIndustryButtonLoaded(true);
      }, 2000);

      // Clean up timer
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, allData]);

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

  const handleKeyPress = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (!inputValue.trim()) return;
      const userMessage = inputValue.trim();
      setInputValue('');
      await handleSendQuery(userMessage);
    }
  };

  const handleSendQuery = async (userMessage: string) => {
    console.log("requesting Info");
    setIsLoadingAboutText(true);

    const accessTokens = await handleFetchAccess();
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
        console.log('Raw response:', responseText);

        const responseMain = JSON.parse(responseText);
        console.log('Parsed response:', responseMain);

        if (responseMain && responseMain.body) {
          const innerBody = JSON.parse(responseMain.body);
          console.log('Inner body:', innerBody);

          if (innerBody && innerBody.message) {
            setAboutCompanyText(innerBody.message);
          } else {
            setAboutCompanyText("Failed to parse company information. Please try again.");
          }
        } else {
          setAboutCompanyText("Failed to fetch company information. Please try again.");
        }
      } catch (e) {
        console.error('POST call failed: ', e);
        setAboutCompanyText("An error occurred while fetching company information. Please try again.");
      } finally {
        setIsLoadingAboutText(false);
      }
    } else {
      setAboutCompanyText("Failed to authenticate. Please refresh and try again.");
      setIsLoadingAboutText(false);
      console.log('Failed to fetch access token.');
    }
  };


  useEffect(() => {
    // Send initial query when component mounts
    handleSendQuery(`Provide a brief summary about ${companyName}. Please keep it anywhere from 3-5 sentences maximum.`);
  }, [companyName]);

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

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const MobileSidebar = () => (
    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden">
          <Menu className="h-6 w-6 2xl:h-12 2xl:w-12 self-center decoration-slate-300" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col gap-4 mt-8">
          <Link href="#" className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100">
            {/* <Homer className="h-4 w-4" /> */}
            <span>Dashboard</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100">
            <Search className="h-4 w-4" />
            <span>Stock Search</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100">
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className='w-full h-full flex flex-col md:flex-row md:py-6 md:px-4 2xl:py-12 2xl:px-12 font-montserrat gap-4'>
      <div className="flex-[9] hidden md:flex flex-col">
        <div className="relative flex-[5] flex items-end font-sans">
          <div className="nameAndPrice absolute top-0 left-0 gap-2 2xl:gap-4 flex flex-col">
            <h1 className="text-3xl font-extralight 2xl:text-4xl">{companyName}</h1>
            <h1 className="text-5xl font-normal font-montserrat 2xl:text-6xl">$122.12</h1>
            <div className="flex">
              <div className="bg-red-400 rounded-2xl px-4 py-1">
                <h1 className="text-white font-montserrat font-semibold text-base 2xl:text-xl">-4.07%</h1>
              </div>
            </div>
          </div>

          <div className="timeframe absolute top-0 right-0 gap-2 2xl:gap-4 flex flex-row inline-block">
            {['1W', '1M', '6M', '1Y', '5Y', 'MAX'].map((frame) => (
              <div
                key={frame}
                className="relative cursor-pointer"
                onClick={() => setSelectedTimeframe(frame)}
              >
                <h1 className={`font-normal ${selectedTimeframe === frame ? 'text-blue-500' : 'text-slate-500'}`}>
                  {frame}
                </h1>
                {selectedTimeframe === frame && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transition-all duration-300"></div>
                )}
              </div>
            ))}
          </div>
          <CustomGraph
            data={displayedData}
            importantMarkers={importantMarkers}
            height={'60%'}
            width={'100%'}
            gradientColor={'rgb(52, 128, 235)'}
            hideXaxis={true}
            hideYaxis={true}
          />
        </div>
        <div className="flex-[4] w-full flex flex-col font-sans 2xl:gap-2">
          <div className="flex flex-row justify-between">
            <h1 className="font-semibold 2xl:text-2xl">August 28, 2019</h1>
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className={`px-4 border border-black rounded-full transition-colors ${showLearnMore ? 'bg-black text-white' : 'bg-white text-black'
                }`}
            >
              <h1 className="2xl:text-xl">Learn More</h1>
            </button>
          </div>
          <Separator className="decoration-black w-[100%] my-1" />
          {showLearnMore ? (
            <div className="relative mt-4  w-full flex flex-row justify-center">
              <Search className="h-4 w-4 2xl:h-6 2xl:w-6 absolute left-[15%] self-center decoration-slate-300" />
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                className="w-3/4 h-8 2xl:h-12 2xl:text-lg bg-slate-100 rounded-full pl-12 2xl:pl-16 text-sm" placeholder='Ask a question...'></input>

            </div>
          ) : (
            <>
              {dateInfoLoaded ? (
                <ScrollArea className='h-[8rem] md:h-[5rem] text-slate-600 text-[.90rem] font-light 2xl:text-2xl 2xl:h-40 mb-4'>
                  Apple Inc. is a leading American technology company known for designing, manufacturing, and selling consumer electronics, software, and online services. Founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne, Apple is best known for its innovative products such as the iPhone, iPad, Mac computers, Apple Watch, and Apple TV.
                </ScrollArea>

              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-4 mt-2">
                    <Skeleton className="w-[90%] h-4 rounded-full" />
                    <Skeleton className="w-full h-4 rounded-full" />
                    <Skeleton className="w-[80%] h-4 rounded-full" />
                  </div>


                </>


              )}


              <h1 className="font-semibold 2xl:text-2xl">Relevant Links</h1>
              <div className="flex inline-block relative">
                <ScrollArea className="flex flex-row pb-4 pt-2 w-[90vw] md:w-[50vw] 2xl:w-[50vw] md:w-[65vw] lg:w-[50vw]">
                  <div className="flex flex-row h-full gap-4 justify-center ">
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} isLoading={!relevantLinksLoaded} />
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} isLoading={!relevantLinksLoaded} />
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} isLoading={!relevantLinksLoaded} />
                    <RelevantLink title={'NY Times | Blah title'} url={''} linkDescription={'blah blah blah blahblah blah blah blah blah blah blah blah Apple blah blah blah blah blah blah blah blah blah iPhone blah'} isLoading={!relevantLinksLoaded} />
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="absolute right-0 h-full w-4 bg-gradient-to-l from-white to-transparent"></div>
              </div>
            </>
          )}
        </div>


      </div>

      <ScrollArea className="flex-[4] hidden md:flex font-sans">
        <div className="flex flex-row justify-between items-center mb-2">
          <h1 className="font-normal text-lg 2xl:text-2xl">About {companyName}</h1>
          <button
            onClick={() => setShowDealHistory(!showDealHistory)}
            className={`px-4 border border-black rounded-full transition-colors ${showDealHistory ? 'bg-black text-white' : 'bg-white text-black'
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
              <IndustryButton industryName={'Consumer Electronics'} isLoading={!industryButtonLoaded} />
              <IndustryButton industryName={'Software'} isLoading={!industryButtonLoaded} />
              <IndustryButton industryName={'Cloud'} isLoading={!industryButtonLoaded} />
            </div>

            {isLoadingAboutText ? (
            <div className="flex flex-col gap-2 mb-4 mt-2">
              <Skeleton className="w-[90%] h-4 rounded-full" />
              <Skeleton className="w-full h-4 rounded-full" />
              <Skeleton className="w-[90%] h-4 rounded-full" />
              <Skeleton className="w-[85%] h-4 rounded-full" />
              <Skeleton className="w-[100%] h-4 rounded-full" />
              <Skeleton className="w-[70%] h-4 rounded-full" />
            </div>
          ) : (
            <h1 className="text-slate-600 text-[.95rem] font-light mb-4 2xl:mb-6 2xl:text-2xl">
              {aboutCompanyText || "No information available."}
            </h1>
          )}

            <div className="stats flex flex-col gap-4 2xl:gap-6 inline-block">
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Employees' statVal='161,100' isLoading={!statInfoLoaded} />
                <StatListing statName='CEO' statVal='Tim Cook' isLoading={!statInfoLoaded} />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Founded' statVal='1976' isLoading={!statInfoLoaded} />
                <StatListing statName='Based In' statVal='Cupertino, CA' isLoading={!statInfoLoaded} />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='EBITDA' statVal='$129.629B' isLoading={!statInfoLoaded} />
                <StatListing statName='Enterprise Value' statVal='3.36T' isLoading={!statInfoLoaded} />
              </div>
            </div>
          </>
        )}
      </ScrollArea>

      <div className="w-full flex md:hidden h-screen overflow-hidden  font-sans"> {/* Added overflow-hidden */}


        <div className="flex w-full flex-col overflow-y-auto overflow-x-hidden px-4 py-6 "> {/* Removed inline-block, added overflow-y-auto */}
          <div className="inline-block w-full mb-2">
            <MobileSidebar />
          </div>
          <div className="nameAndPrice relative  flex flex-col mb-32 ">
            <div className="absolute left-0 top-0 gap-1 flex flex-col">
              <h1 className="text-2xl font-extralight 2xl:text-4xl">{companyName}</h1>
              <h1 className="text-4xl font-normal font-montserrat 2xl:text-6xl">$122.12</h1>
              <div className="flex">
                <div className="bg-red-400 rounded-2xl px-4 py-1">
                  <h1 className="text-white font-montserrat font-semibold text-base 2xl:text-xl">-4.07%</h1>
                </div>
              </div>
            </div>
            <div className="timeframe absolute top-0 right-0 gap-2 2xl:gap-4 flex flex-row inline-block  ">
              {['1W', '1M', '6M', '1Y', '5Y', 'MAX'].map((frame) => (
                <div
                  key={frame}
                  className="relative cursor-pointer"
                  onClick={() => setSelectedTimeframe(frame)}
                >
                  <h1 className={`font-normal ${selectedTimeframe === frame ? 'text-blue-500' : 'text-slate-500'}`}>
                    {frame}
                  </h1>
                  {selectedTimeframe === frame && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transition-all duration-300"></div>
                  )}
                </div>
              ))}
            </div>

          </div>

          <div className="graphArea w-full min-h-[15rem] flex inline-block">

            <CustomGraph
              data={displayedData}
              importantMarkers={importantMarkers}
              height={'100%'}
              width={'100%'}
              gradientColor={'rgb(52, 128, 235)'}
              hideXaxis={true}
              hideYaxis={true}
            />
          </div>

          <div className="w-full flex flex-col font-sans 2xl:gap-2">
            <div className="flex flex-row justify-between items-center">

              <h1 className="font-semibold text-lg md:text-base 2xl:text-2xl">August 28, 2019</h1>
              <button
                onClick={() => setShowLearnMore(!showLearnMore)}
                className={`px-4 border border-black rounded-full transition-colors ${showLearnMore ? 'bg-black text-white' : 'bg-white text-black'
                  }`}
              >
                <h1 className="2xl:text-xl">Learn More</h1>
              </button>
            </div>
            <Separator className="decoration-black w-[100%] my-1" />
            {showLearnMore ? (
              <>
                <LearnMoreContent
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                />
                <div className="h-56 w-full"></div>
              </>

            ) : (
              <>
                {dateInfoLoaded ? (
                  <ScrollArea className='h-[8rem] md:h-[5rem] text-slate-600 text-[.90rem] font-light 2xl:text-2xl 2xl:h-40 mb-4'>
                    {answer}               
                     </ScrollArea>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 mb-4 mt-2">
                      <Skeleton className="w-[90%] h-4 rounded-full" />
                      <Skeleton className="w-full h-4 rounded-full" />
                      <Skeleton className="w-[80%] h-4 rounded-full" />
                    </div>
                  </>
                )}
                {/* <div className='inline-block text-slate-600 text-[1rem] font-light 2xl:text-2xl 2xl:h-40 mb-4'>
                  {answer}
                </div> */}

                <h1 className="font-semibold text-lg md:text-base 2xl:text-2xl">Relevant Links</h1>
                <div className="flex inline-block relative">
                  <ScrollArea className="flex flex-row pb-4 pt-2 w-[90vw] md:w-[50vw] 2xl:w-[50vw] md:w-[65vw] lg:w-[50vw]">
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

          <div className=" flex flex-col font-sans">
            <div className="flex flex-row justify-between items-center mb-2">
              <h1 className="font-normal text-xl md:text-lg 2xl:text-2xl">About APPL</h1>
              <button
                onClick={() => setShowDealHistory(!showDealHistory)}
                className={`px-4 border border-black rounded-full transition-colors ${showDealHistory ? 'bg-black text-white' : 'bg-white text-black'
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
                  <h1 className="text-slate-600 md:text-[.95rem] font-light mb-4 2xl:mb-6 2xl:text-2xl">
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
          </div>


        </div>


      </div>

    </div>
  );
};

export default Stock;