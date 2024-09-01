import React, { SetStateAction, useCallback, useMemo } from 'react';
import RecentSearch from './RecentSearch';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import UserSearchBubble from './UserSearchBubble';
import GPTResponse from './GPTResponse';
import { ArrowLeft, Copy, Link, Menu, Scroll, Search, Send, SettingsIcon, User } from 'lucide-react';
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
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { set } from 'react-hook-form';
import { Skeleton } from './ui/skeleton';
import { subDays, subMonths, subYears, parseISO } from 'date-fns';
import { ReferenceArea } from 'recharts';
import { format } from 'date-fns';
import { startOfMonth, startOfWeek, } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { get } from 'aws-amplify/api';
import { put } from 'aws-amplify/api';
import { CircularProgress } from '@mui/material';
import {
  parseHistoryData,
  findTopVolumeMonths,
  formatNumber,
  filterDataByTimeframe,
  extractRelevantLinks,
  generateFlatLineData,
  createHandleMarkerSelect,
  DataPoint,
  ImportantMarker,
  handleFetchAccess,
  handleInputChange,
  handleKeyPress,
  formatLargeNumber,
  handleStockData,
  handleSendQuery
} from '../components/utils/StockUtils';
import Industry from './Industry';


interface StockProps {
  image: string;
  companyName: string;
  stockDescription: string;
  imageType: 'circular' | 'rectangular';
  onBack: () => void;

}

interface MarkerResponse {
  date: string;
  content: string;
  links: { title: string; url: string }[];
}

interface InputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

let searchCount = 0;



const Stock: React.FC<StockProps> = ({
  image,
  companyName,
  stockDescription,
  imageType,
  onBack,
}) => {
  const [answer, setAnswer] = useState<string>();
  const [query, setQuery] = useState<string>();
  // const [companyName, setCompanyName] = useState<string>('-');
  const [inputValue, setInputValue] = useState('');
  const [showDealHistory, setShowDealHistory] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [deals, setDeals] = useState([
    { date: 'Loading...', dealDescription: 'Loading...' },
    // ... add all your deals here
  ]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const dataFetchedRef = useRef(false);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dateInfoLoaded, setDateInfoLoaded] = useState(false);
  const [relevantLinks, setRelevantLinks] = useState<{ title: string; url: string }[]>([]);
  const [industryButtonLoaded, setIndustryButtonLoaded] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('MAX');
  const [markerResponses, setMarkerResponses] = useState<MarkerResponse[]>([]);
  const [isLoadingMarkerData, setIsLoadingMarkerData] = useState(false);
  const { data: allData } = useMemo(() => generateRandomStockData(5), []);
  const [importantMarkers, setImportantMarkers] = useState<ImportantMarker[]>([]);
  const [displayedData, setDisplayedData] = useState(allData);
  const [aboutCompanyText, setAboutCompanyText] = useState<string>();
  const [isLoadingAboutText, setIsLoadingAboutText] = useState(true);
  const [selectedMarkerDate, setSelectedMarkerDate] = useState<string | null>(null);
  const [numEmployees, setNumEmployees] = useState<string>("0");
  const [ceo, setCeo] = useState<string>("-");
  const [founded, setFounded] = useState<string>("-");
  const [basedIn, setBasedIn] = useState<string>("-");
  const [ebitda, setEbitda] = useState<string>("-");
  const [enterpriseValue, setEnterpriseValue] = useState<string>("-");
  const [open, setOpen] = useState("0");
  const [longName, setLongName] = useState<string>("-");
  const [ticker, setTicker] = useState<string>("-");
  const [sector, setSector] = useState<string>("-");
  const [percentChange, setPercentChange] = useState<number>(0);
  const [stockHistory, setStockHistory] = useState<DataPoint[]>(() => generateFlatLineData(100)); // 100 is an arbitrary number of data points
  const handleMarkerSelect = createHandleMarkerSelect(setSelectedMarkerDate);
  const [qLoading, setQLoading] = useState(false);
  const [questionResponse, setQuestionResponse] = useState('');
  const [showIndustry, setShowIndustry] = useState(false);
  const [recentNews, setRecentNews] = useState("");
  const [recentNewsSources, setRecentNewsSources] = useState<{ title: string; url: string }[]>([]);
  const [isLoadingRecentNews, setIsLoadingRecentNews] = useState(true);
  const [questionResponseLinks, setQuestionResponseLinks] = useState<{ title: string; url: string }[]>([]);


  const handleInputChangeQ = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyPressQ = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      await handleSendQuestion();
    }
  };

  const handleSendQuestion = async () => {
    if (!inputValue.trim()) return;

    setQLoading(true);
    setQuestionResponse('');

    try {
      const accessToken = await handleFetchAccess();
      if (!accessToken) {
        console.error('Failed to fetch access token.');
        return;
      }

      const restOperation = post({
        apiName: 'testAPI',
        path: '/postAgent',
        options: {
          headers: {
            Authorization: accessToken
          },
          body: {
            query: `The following question is in relation to ${longName} (make sure to answer with a maximum of 3-4 sentences): ${inputValue}`
          }
        }
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const responseMain = JSON.parse(responseText);

      if (responseMain && responseMain.body) {
        const innerBody = JSON.parse(responseMain.body);
        if (innerBody && innerBody.message) {
          // console.log(innerBody.message);
          // console.log(innerBody.sources);
          // console.log(innerBody.sources.sources);
          const links = extractRelevantLinks(innerBody.sources.sources);
          const contentWithoutSources = innerBody.message;
          setQuestionResponse(contentWithoutSources);
          setQuestionResponseLinks(links);
        }
      }
    } catch (error) {
      console.error('Error sending query');
      setQuestionResponse('An error occurred while processing your question.');
    } finally {
      setQLoading(false);
    }
  };
  const handleIndustryClick = () => {
    setShowIndustry(true);
  };

  async function putSearches(searchTerm: any) {
    if (searchTerm === '-' || searchCount > 0) return;
    try {
      searchCount++;
      const restOperation = put({
        apiName: 'testAPI',
        path: '/passSearchesTest', // Adjust this path as needed
        options: {
          body: {
            recent_search: searchTerm // Use the input parameter here
          }
        }
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();

      const responseMain = JSON.parse(responseText);
      // console.log('Recent searches');
    } catch (error) {
      console.error('Error fetching recent searches');
    }
  }


  useEffect(() => {
    const filteredData = filterDataByTimeframe(allData, selectedTimeframe);
    setDisplayedData(filteredData);
  }, [selectedTimeframe, allData]);

  useEffect(() => {
    if (stockHistory.length > 0) {
      const filteredData = filterDataByTimeframe(stockHistory, selectedTimeframe);
      setDisplayedData(filteredData);
    }
  }, [selectedTimeframe, stockHistory]);


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
   
    }
  }, [isInitialLoad, allData]);

  const handleInputChangeWrapper = handleInputChange(setInputValue);

  const handleKeyPressWrapper = (event: React.KeyboardEvent<HTMLInputElement>) =>
    handleKeyPress(inputValue, setInputValue, handleSendQueryWrapper)(event);

  const handleSendQueryWrapper = (userMessage: string) =>
    handleSendQuery(userMessage, setIsLoadingAboutText as React.Dispatch<React.SetStateAction<boolean>>, setAboutCompanyText as React.Dispatch<React.SetStateAction<string>>);

  const handleStockDataWrapper = () =>
    handleStockData(
      companyName,
      setIsLoadingAboutText,
      (info) => {
        setNumEmployees(formatLargeNumber(info.fullTimeEmployees) || "0");
        setCeo(info.companyOfficers[0]?.name || "-");
        setFounded(info.yearBorn || "-");
        setBasedIn(info.city ? `${info.city}, ${info.state}` : "-");
        setEbitda(formatLargeNumber(info.ebitda) || "-");
        setEnterpriseValue(formatLargeNumber(info.enterpriseValue) || "-");
        setOpen(info.currentPrice || "0");
        setLongName(info.longName || "-");
        setTicker(info.symbol || "-");
        setSector(info.sector || "-");
        putSearches(info.longName || "-");
        // console.log(searchCount);

        const currentPrice = info.currentPrice || 1;
        const previousClose = info.previousClose || 1;
        const calculatedPercentChange = ((currentPrice - previousClose) / previousClose) * 100;
        setPercentChange(calculatedPercentChange);
      },
      setStockHistory,
      setDisplayedData,
      setImportantMarkers,
      selectedTimeframe,
      parseHistoryData,
      filterDataByTimeframe,
      findTopVolumeMonths
    );

  useEffect(() => {
    // Send initial query when component mounts
    setStockHistory(generateFlatLineData(100))
    handleStockDataWrapper();


  }, [longName]);

  useEffect(() => {
    if (longName !== "-") {
      handleSendQuery(`Provide a brief summary about ${longName}... (ensure that it is a maximum of 3 sentences long)`, setIsLoadingAboutText as React.Dispatch<React.SetStateAction<boolean>>, setAboutCompanyText as React.Dispatch<React.SetStateAction<string>>);
    }
  }, [longName]);

  const resetSearchCount = () => {
    searchCount = 0;
  };

  const handleBack = () => {
    resetSearchCount();
    onBack();
  };

  useEffect(() => {

    async function fetchMarkerData() {
      if (importantMarkers.length > 0 && !dataFetchedRef.current) {
        setIsLoadingMarkerData(true);
        const markerDates = importantMarkers.map(marker => marker.date);

        const fetchPromises = markerDates.map(async (marker) => {
          const formattedDate = format(new Date(marker), 'MMMM yyyy');
          // console.log("Making request for date " + formattedDate);

          try {
            const accessToken = await handleFetchAccess();
            if (!accessToken) {
              // console.error('Failed to fetch access token.');
              return null;
            }

            const restOperation = post({
              apiName: 'testAPI',
              path: '/postAgent',
              options: {
                headers: {
                  Authorization: accessToken
                },
                body: {
                  query: `As a financial analysis agent, provide a concise yet comprehensive summary (3-5 sentences) of the most significant events and news within a one-month period centered on ${formattedDate} that could have impacted the stock price of ${longName}. Include:
    1. Company-specific news: Earnings reports, management changes, product launches, or major announcements.
    2. Industry developments: Competitive landscape shifts, regulatory changes, or technological advancements.
    3. Macroeconomic factors: Interest rate changes, economic indicators, or geopolitical events.
    4. Market trends: Sector performance, investor sentiment, or notable analyst reports.
    For each point, briefly explain its potential impact on ${longName}'s stock price. If applicable, include quantitative data such as percentage changes in stock price, revenue figures, or market share. Conclude with a sentence summarizing the overall market sentiment towards ${longName} during this period.`
                }
              }
            });

            const { body } = await restOperation.response;
            const responseText = await body.text();
            const responseMain = JSON.parse(responseText);

            if (responseMain && responseMain.body) {
              const innerBody = JSON.parse(responseMain.body);
              if (innerBody && innerBody.message) {
                console.log(innerBody.message);
                console.log(innerBody.sources);
                console.log(innerBody.sources.sources);
                const links = extractRelevantLinks(innerBody.sources.sources);
                const contentWithoutSources = innerBody.message;
                return { date: marker, content: contentWithoutSources, links };
              }
            }
            return null;
          } catch (error) {
            // console.error(`Error fetching data for marker ${formattedDate}:`, error);
            return null;
          }
        });

        const markerResponses = await Promise.all(fetchPromises);
        const validResponses = markerResponses.filter(response => response !== null);

        setMarkerResponses(prev => [...prev, ...validResponses]);
        setIsLoadingMarkerData(false);
        setDateInfoLoaded(true);
        dataFetchedRef.current = true;
      }
    }

    fetchMarkerData();
  }, [importantMarkers, companyName]);

  const fetchRecentNews = async () => {
    setIsLoadingRecentNews(true);
    try {
      const accessToken = await handleFetchAccess();
      if (!accessToken) {
        console.error('Failed to fetch access token.');
        return;
      }

      const restOperation = post({
        apiName: 'testAPI',
        path: '/postAgent',
        options: {
          headers: {
            Authorization: accessToken
          },
          body: {
            query: `Provide a brief summary of the most recent news (last 7 days) for ${longName}. Include any significant events, financial updates, or market trends that could impact the stock. Limit the response to 3-4 sentences.`
          }
        }
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const responseMain = JSON.parse(responseText);

      if (responseMain && responseMain.body) {
        const innerBody = JSON.parse(responseMain.body);
        if (innerBody && innerBody.message) {
          const links = extractRelevantLinks(innerBody.sources.sources);
          const contentWithoutSources = innerBody.message;
          setRecentNews(contentWithoutSources);
          setRecentNewsSources(links);
        }
      }
    } catch (error) {
      console.error('Error fetching recent news:', error);
      setRecentNews("Unable to fetch recent news at this time." as SetStateAction<string>);
      setRecentNewsSources([]);
    } finally {
      setIsLoadingRecentNews(false);
    }
  };

  const fetchRecentDealHistory = async () => {
    setIsLoadingRecentNews(true);
    try {
      const accessToken = await handleFetchAccess();
      if (!accessToken) {
        console.error('Failed to fetch access token.');
        return;
      }

      const restOperation = post({
        apiName: 'testAPI',
        path: '/postAgent',
        options: {
          headers: {
            Authorization: accessToken
          },
          body: {
            query: `As a financial analysis agent, provide a detailed list of the 4-5 recent deals for ${longName}. For each deal, include the following information:

Date of the Deal
Deal Description
Return the response in JSON format, with an array of deal objects in descending chronological order as shown in the example. Each object should have the properties: "date" and "dealDescription". The response should not include any additional text before or after the JSON data.

Here's an example of the expected format:

{"dealHistory": [{"date": "September 12, 2020","dealDescription": "blah blah blah blah blah blah blah blah blah blah blah blah"},{"date": "August 28, 2019", "dealDescription": "blah blah blah blah blah blah blah blah blah blah blah blah"}]}`
          }
        }
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const responseMain = JSON.parse(responseText);
      console.log(responseMain);

      if (responseMain && responseMain.body) {
        const innerBody = JSON.parse(responseMain.body);
        if (innerBody && innerBody.message) {
          // const links = extractRelevantLinks(innerBody.sources.sources);
          console.log(innerBody.message);
          const contentWithoutSources = JSON.parse(innerBody.message);
          console.log(contentWithoutSources);
          const finalContent = contentWithoutSources.dealHistory;
          console.log(finalContent);
          setDeals(finalContent);
          setIsLoadingDeals(false);
          // setRecentNewsSources(links);
        }
      }
    } catch (error) {
      console.error('Error fetching recent news:', error);
      setRecentNews("Unable to fetch recent news at this time." as SetStateAction<string>);
      setRecentNewsSources([]);
    } finally {
      setIsLoadingRecentNews(false);
    }
  };

  useEffect(() => {
    if (longName !== "-") {
      fetchRecentNews();
      fetchRecentDealHistory();
    }
  }, [longName]);

  useEffect(() => {
    if (selectedMarkerDate) {
      const selectedMarker = markerResponses.find(response => response.date === selectedMarkerDate);
      if (selectedMarker) {
        setRelevantLinks(selectedMarker.links || []);
      }
    }
  }, [selectedMarkerDate, markerResponses]);

  const handleCopyAll = () => {
    const allDealsText = deals.map(deal => `${deal.date}\n${deal.dealDescription}`).join('\n\n');
    navigator.clipboard.writeText(allDealsText)
      .then(() => {
        setIsCopiedAll(true);
        // console.log('All deals copied to clipboard');

        setTimeout(() => {
          setIsCopiedAll(false);
        }, 2000);
      })
      .catch(err => {
        // console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className='w-full h-full flex flex-col md:flex-row py-12 px-4 2xl:py-12 2xl:px-12 sans-serif gap-4 '>
      <button
        onClick={handleBack}
        className="absolute top-[1%] left-[1%] p-2 text-black hover:text-blue-700"
        aria-label="Go back to stock search"
      >
        <ArrowLeft className="h-6 w-6 2xl:h-8 2xl:w-8 dark:text-slate-200" />
      </button>
      <div className="flex-[9] flex flex-col ">
        <div className="relative inline-block flex flex-col items-start font-sans ">

          <div className="nameAndPrice relative top-0 left-0 gap-2 2xl:gap-4 flex flex-col">
            <h1 className="text-3xl font-extralight 2xl:text-4xl">{longName} | {ticker}</h1>
            <h1 className="text-5xl font-normal font-montserrat 2xl:text-6xl">${open}</h1>
            <div className="flex">
              <div className={`flex ${percentChange >= 0 ? 'bg-green-400' : 'bg-red-400'} rounded-2xl px-4 py-1`}>
                <h1 className="text-white font-montserrat font-semibold text-base 2xl:text-xl">
                  {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
                </h1>
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
          <div className="w-full h-64  justify-self-end self-end">
            <CustomGraph
              data={displayedData}
              importantMarkers={importantMarkers}
              height={'100%'}
              width={'100%'}
              gradientColor={'rgb(52, 128, 235)'}
              hideXaxis={true}
              hideYaxis={true}
              selectedMarkerDate={selectedMarkerDate}
              onMarkerSelect={handleMarkerSelect}
            />
          </div>

        </div>
        <div className="flex-[4] w-full flex flex-col font-sans 2xl:gap-2">
          <div className="flex flex-row justify-between">
            <h1 className="font-semibold 2xl:text-2xl">
              {showLearnMore ? "Learn More" : selectedMarkerDate
                ? format(new Date(selectedMarkerDate), 'MMMM d, yyyy')
                : "Recent News"}
            </h1>
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className={`px-4 border border-black rounded-full transition-colors ${showLearnMore ? 'bg-sky-700 text-sky-100 border-none' : 'bg-transparent dark:text-sky-700 dark:border-sky-700'}`}
            >
              <h1 className="2xl:text-xl">Learn More</h1>
            </button>
          </div>
          <Separator className="decoration-black w-[100%] my-1" />
          {showLearnMore ? (
            <div className="relative mt-4  w-full flex flex-col  items-center">
              <Search className="h-4 w-4 2xl:h-6 2xl:w-6 absolute left-[15%] justify-self-center top-4 decoration-slate-300" />
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChangeQ}
                onKeyDown={handleKeyPressQ}
                className="w-3/4 h-12 2xl:h-14 2xl:text-lg bg-slate-100 dark:bg-slate-900 border-slate-100 border rounded-full pl-12 2xl:pl-16 text-sm"
                placeholder='Ask a question...'
              />

              {qLoading ? (
                <div className="mt-4 flex justify-center">
                  <CircularProgress />
                </div>
              ) : questionResponse ? (
                <div className="mt-2 p-4 rounded-lg text-left w-full">
                  <ScrollArea className='h-[12rem] md:h-[12rem] items-center justify-center text-slate-600 text-[.8rem] flex font-light dark:text-slate-200 2xl:text-xl mb-4'>
                    <ReactMarkdown>{questionResponse}</ReactMarkdown>
                  </ScrollArea>
                  <h1 className="font-semibold 2xl:text-2xl">Relevant Links</h1>
                  <div className="flex inline-block relative">
                    <ScrollArea className="flex flex-row pb-4 pt-2 w-[90vw] md:w-[50vw] 2xl:w-[50vw] md:w-[65vw] lg:w-[50vw]">
                      <div className="flex flex-row h-full gap-4 justify-center ">
                        {questionResponseLinks.map((link, index) => (
                          <RelevantLink
                            key={index}
                            title={link.title}
                            url={link.url}
                            linkDescription=""
                            isLoading={false}
                          />
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    <div className="dark:hidden absolute right-0 h-full w-4 bg-gradient-to-l from-white to-transparent dark:from-black dark:to-transparent"></div>
                  </div>
                </div>
              ) : null}

            </div>
          ) : (
            <>
              {dateInfoLoaded ? (
                <ScrollArea className='h-[12rem] md:h-[12rem] items-center justify-center text-slate-600 text-[.8rem] flex font-light dark:text-slate-200 2xl:text-xl mb-4'>
                 {selectedMarkerDate ? (
                isLoadingMarkerData ? (
                  <div className="w-full h-[12rem] md:h-[12rem] flex items-center justify-center">
                    <CircularProgress />
                  </div>
                ) : (
                  <ReactMarkdown>
                    {markerResponses.find(response => response.date === selectedMarkerDate)?.content ||
                      "No information available for this date."
                    }
                  </ReactMarkdown>
                )
              ) : isLoadingRecentNews ? (
                <div className="w-full h-[12rem] md:h-[12rem] flex items-center justify-center">
                  <CircularProgress />
                </div>
              ) : (
                <ReactMarkdown>{recentNews ? recentNews: "No recent news available."}</ReactMarkdown>
              )}
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

                    {dateInfoLoaded ? (
                      relevantLinks.map((link, index) => (
                        <RelevantLink
                          key={index}
                          title={link.title}
                          url={link.url}
                          linkDescription=""
                          isLoading={false}
                        />
                      ))
                    ) : (
                      // Show skeletons while loading
                      Array(3).fill(null).map((_, index) => (
                        <div key={index} className="flex flex-col items-center justify-center w-48 h-24 bg-gray-100 dark:bg-slate-700 rounded-lg p-2">
                          <Skeleton className="w-3/4 h-4 mb-2 rounded-full" />
                          <Skeleton className="w-full h-3 rounded-full" />
                          <Skeleton className="w-2/3 h-3 mt-1 rounded-full" />
                        </div>
                      ))
                    )}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="dark:hidden absolute right-0 h-full w-4 bg-gradient-to-l from-white to-transparent dark:from-black dark:to-transparent"></div>
              </div>
            </>
          )}
        </div>


      </div>

      <div className="flex-[4] flex font-sans flex-col">
        <div className="flex flex-row justify-between items-center mb-2 ">
          <h1 className="font-normal text-lg 2xl:text-xl">About {longName}</h1>
          <button
            onClick={() => setShowDealHistory(!showDealHistory)}
            className={`px-4 border border-black  rounded-full transition-colors ${!showDealHistory ? 'dark:border-sky-700 dark:text-sky-700 dark:bg-transparent' : 'bg-sky-700 text-sky-100'
              }`}
          >
            <h1 className="2xl:text-xl">Deal History</h1>
          </button>
        </div>

        <Separator className="decoration-black w-[100%] my-1" />

        {showDealHistory ? isLoadingDeals ? 
          <div className="inline-block flex flex-col mt-2">
            <div className="flex flex-row items-center justify-center min-h-screen">
              <CircularProgress />
            </div>
          </div>:(
          <div className="inline-block flex flex-col mt-2">
            {deals.length === 0 ? (
              <div className="flex flex-row items-center justify-center mt-4">
                <h1 className="text-sm text-gray-500 dark:text-gray-400">
                  Sorry, no recent deals could be found.
                </h1>
              </div>
            ) : (
              <>
                <div className="flex flex-row items-center justify-end gap-2 mr-2">
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-2 focus:outline-none"
                    aria-label="Copy all deal information"
                  >
                    <Copy size={16} />
                    <h1 className="text-sm text-black dark:text-white">
                      {isCopiedAll ? "Copied!" : "Copy All"}
                    </h1>
                  </button>
                </div>
                {deals.map((deal, index) => (
                  <Deal key={index} date={deal.date} dealDescription={deal.dealDescription} />
                ))}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="inline-block flex flex-wrap py-2 gap-2">
              <IndustryButton
                industryName={sector}
                isLoading={sector === "-"}
                onClick={handleIndustryClick}
              />
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
              <h1 className="text-slate-600 text-[.95rem] font-light dark:text-slate-200 mb-4 2xl:mb-6 2xl:text-xl">
                {aboutCompanyText || "No information available."}
              </h1>
            )}

            <div className="stats flex flex-col gap-4 2xl:gap-6 inline-block">
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Employees' statVal={numEmployees} isLoading={numEmployees === "0"} />
                <StatListing statName='CEO' statVal={ceo} isLoading={ceo === "-"} />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='EBITDA' statVal={ebitda} isLoading={ebitda === "-"} />
                <StatListing statName='Enterprise Value' statVal={enterpriseValue} isLoading={enterpriseValue === "-"} />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Based In' statVal={basedIn} isLoading={basedIn === "-"} />
              </div>
            </div>
          </>
        )}
      </div>




    </div>
  );
};

export default Stock;