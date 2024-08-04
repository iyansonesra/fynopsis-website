import React, { useCallback, useMemo } from 'react';
import RecentSearch from './RecentSearch';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import UserSearchBubble from './UserSearchBubble';
import GPTResponse from './GPTResponse';
import { Copy, Link, Menu, Scroll, Search, Send, SettingsIcon, User } from 'lucide-react';
import RelevantLink from './RelevantLinks';
import CustomGraph, { DataPoint, ImportantMarker } from './StockGraph';
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


const parseHistoryData = (history: any): { dataPoints: DataPoint[], monthlyData: any[] } => {
  const dataPoints: DataPoint[] = [];
  const monthlyData: { [key: string]: { volume: number, date: string, days: number } } = {};

  const entries = Object.entries(history);

  entries.forEach(([dateString, data]: [string, any]) => {
    const date = parseISO(dateString);
    const monthKey = format(date, 'yyyy-MM');

    dataPoints.push({
      name: format(date, 'yyyy-MM-dd'),
      uv: data.Close,
      pv: data.Volume,
      amt: data.High - data.Low,
    });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { volume: 0, date: dateString, days: 0 };
    }
    monthlyData[monthKey].volume += data.Volume;
    monthlyData[monthKey].days += 1;
  });

  return {
    dataPoints,
    monthlyData: Object.entries(monthlyData).map(([month, data]) => ({
      month,
      volume: data.volume,
      date: data.date,
      avgDailyVolume: data.volume / data.days
    }))
  };
};

const findTopVolumeMonths = (monthlyData: any[]): ImportantMarker[] => {
  // Sort the data chronologically
  const sortedData = [...monthlyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalMonths = sortedData.length;
  const groupSize = Math.ceil(totalMonths / 5);

  // console.log('Total months:', totalMonths);
  // console.log('Group size:', groupSize);

  const topMonths = [];
  for (let i = 0; i < 5; i++) {
    const startIndex = i * groupSize;
    const endIndex = Math.min((i + 1) * groupSize, totalMonths);
    const group = sortedData.slice(startIndex, endIndex);

    // console.log(`\nGroup ${i + 1} (${group[0].month} to ${group[group.length - 1].month}):`);
    group.forEach(item => {
      // console.log(`  ${item.month}: Total Volume: ${formatNumber(item.volume)}, Avg Daily: ${formatNumber(item.avgDailyVolume)}`);
    });

    if (group.length > 0) {
      const topMonth = group.reduce((max, current) => (current.volume > max.volume ? current : max), group[0]);
      topMonths.push(topMonth);
      // console.log(`Top month for group ${i + 1}: ${topMonth.month} with total volume ${formatNumber(topMonth.volume)} and avg daily volume ${formatNumber(topMonth.avgDailyVolume)}`);
    }
  }

  // console.log('\nSelected top months:');
  topMonths.forEach(month => {
    // console.log(`${month.month}: Total Volume: ${formatNumber(month.volume)}, Avg Daily: ${formatNumber(month.avgDailyVolume)}`);
  });

  return topMonths.map(item => ({
    date: `${item.month}-01`,
    label: `High Volume Month`,
    explanation: `Total trading volume of ${formatNumber(item.volume)} shares in ${format(parseISO(item.date), 'MMMM yyyy')}, with an average daily volume of ${formatNumber(item.avgDailyVolume)}.`
  }));
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export function filterDataByTimeframe(data: DataPoint[], timeframe: string): DataPoint[] {
  const endDate = parseISO(data[data.length - 1].name);
  let startDate: Date;
  let interval: number = 1; // Default to daily

  switch (timeframe) {
    case '1W':
      startDate = subDays(endDate, 7);
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
    case 'MAX':
      startDate = parseISO(data[0].name);
      interval = 30; // Monthly for MAX
      break;
    default:
      return data;
  }

  return data.filter((item, index) => {
    const itemDate = parseISO(item.name);
    return itemDate >= startDate && index % interval === 0;
  });
}



interface MarkerData {
  date: string;
  response: any; // Replace 'any' with the actual type of your response
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

  const dataFetchedRef = useRef(false);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dateInfoLoaded, setDateInfoLoaded] = useState(false);
  const [aboutInfoLoaded, setAboutInfoLoaded] = useState(false);
  const [statInfoLoaded, setStatInfoLoaded] = useState(false);
  const [relevantLinks, setRelevantLinks] = useState<{ title: string; url: string }[]>([]);

  const [relevantLinksLoaded, setRelevantLinksLoaded] = useState(false);
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
  const [recentNewsDate, setRecentNewsDate] = useState<string>("Recent News");
  const [numEmployees, setNumEmployees] = useState<string>("0");
  const [ceo, setCeo] = useState<string>("-");
  const [founded, setFounded] = useState<string>("-");
  const [basedIn, setBasedIn] = useState<string>("-");
  const [ebitda, setEbitda] = useState<string>("-");
  const [enterpriseValue, setEnterpriseValue] = useState<string>("-");
  const [open, setOpen] = useState("0");
  const [longName, setLongName] = useState<string>("-");
  const [ticker, setTicker] = useState<string>("-");
  const [isStockDataLoading, setIsStockDataLoading] = useState(true);
  const [sector, setSector] = useState<string>("-");

  const extractRelevantLinks = (content: string): { title: string; url: string }[] => {
    console.log("Original content:", content);
  
    const sourcesSection = content.split('Sources:')[1];
    if (!sourcesSection) {
      console.log("No 'Sources:' section found.");
      return [];
    }
  
    console.log("Sources section:", sourcesSection);
  
    // Updated regex pattern to match the new format
    const links = sourcesSection.match(/\d+\.\s"(.+?)"\s\[(.+?)\]/g) || [];
    console.log("Matched links:", links);
  
    const extractedLinks = links.map(link => {
      // Updated regex to capture title and URL in the new format
      const [, title, url] = link.match(/\d+\.\s"(.+?)"\s\[(.+?)\]/) || [];
      return { title, url };
    });
  
    console.log("Extracted links:", extractedLinks);
  
    return extractedLinks;
  };
  
  // Test the function with the provided example
  const testContent = `Some content here...
  
  Sources:
  1. "LPL Financial fined $5.5M by FINRA over transaction supervision lapses" [https://www.complianceweek.com/regulatory-enforcement/lpl-financial-fined-55m-by-finra-over-transaction-supervision-lapses/34078.article]
  2. "Smooth transition expected at LPL Financial under new CEO Dan Arnold" [https://www.investmentnews.com/industry-news/archive/smooth-transition-expected-at-lpl-financial-under-new-ceo-dan-arnold-70027]
  3. "LPL Financial's new CEO Dan Arnold to receive big pay hike in 2017" [https://www.investmentnews.com/industry-news/news/lpl-financials-new-ceo-dan-arnold-to-receive-big-pay-hike-in-2017-70225]`;
  
  console.log("Test result:", extractRelevantLinks(testContent));


  const generateFlatLineData = (length: number): DataPoint[] => {
    const flatLineData: DataPoint[] = [];
    const baseDate = new Date();
    const baseValue = 100; // You can adjust this value as needed

    for (let i = 0; i < length; i++) {
      flatLineData.push({
        name: format(subDays(baseDate, length - i - 1), 'yyyy-MM-dd'),
        uv: baseValue,
        pv: baseValue,
        amt: baseValue,
      });
    }

    return flatLineData;
  };

  const [stockHistory, setStockHistory] = useState<DataPoint[]>(() => generateFlatLineData(100)); // 100 is an arbitrary number of data points




  const handleMarkerSelect = (date: string | null) => {
    setSelectedMarkerDate(date);
  };


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
      const timer = setTimeout(() => {
        // setDisplayedData(allData);
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

  const formatLargeNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) {
      return 'N/A'; // or return any default value you prefer
    }

    if (num >= 1000000000000) { // Trillion
      return (num / 1000000000000).toFixed(2) + 'T';
    } else if (num >= 1000000000) { // Billion
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) { // Million
      return (num / 1000000).toFixed(2) + ' M';
    } else if (num >= 1000) { // Thousand
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toString();
    }
  };


  // async function fetchMarkerData(markers: string[]): Promise<MarkerData[]> {
  //   const accessToken = await handleFetchAccess(); // Assuming this function exists

  //   if (!accessToken) {
  //     console.error('Failed to fetch access token.');
  //     return [];
  //   }

  //   const markerData: MarkerData[] = [];


  //   for (const marker of markers) {
  //     setIsLoadingMarkerData(true);
  //     console.log("Making request for date " + format(new Date(marker), 'MMMM yyyy'));
  //     const formattedDate = format(new Date(marker), 'MMMM yyyy');

  //     try {
  //       const restOperation = post({
  //         apiName: 'testAPI',
  //         path: '/postAgent', // Adjust this path as needed
  //         options: {
  //           headers: {
  //             Authorization: accessToken
  //           },
  //           body: {
  //             query: "Give me a 3-5 sentence description of the most important news near the date of " + formattedDate + " on the company " + companyName
  //           }
  //         }
  //       });

  //       const { body } = await restOperation.response;
  //       const responseText = await body.text();
  //       const responseMain = JSON.parse(responseText);

  //       console.log('Parsed response:', responseMain);

  //       if (responseMain && responseMain.body) {
  //         const innerBody = JSON.parse(responseMain.body);
  //         console.log('Inner body:', innerBody);

  //         if (innerBody && innerBody.message) {
  //           setMarkerResponses(prev => [...prev, { date: marker, content: innerBody.message }]);

  //         } else {
  //           setAboutCompanyText("Failed to parse company information. Please try again.");
  //         }
  //       } else {
  //         setAboutCompanyText("Failed to fetch company information. Please try again.");
  //       }



  //     } catch (error) {
  //       console.error(`Error fetching data for marker ${formattedDate}:`, error);
  //       markerData.push({
  //         date: marker,
  //         response: null
  //       });

  //     } finally {
  //       setIsLoadingMarkerData(false);
  //     }
  //   }

  //   return markerData;
  // }

  
  const handleStockData = async () => {
    console.log("requesting Stock Info");
    setIsLoadingAboutText(true);

    const accessTokens = await handleFetchAccess();
    if (accessTokens) {
      try {
        const restOperation = post({
          apiName: 'testAPI',
          path: '/postStockData',
          options: {
            headers: {
              Authorization: accessTokens
            },
            body: {
              company: companyName
            }
          }
        });

        const { body } = await restOperation.response;
        const responseText = await body.text();
        console.log('Raw response:', responseText);

        const responseMain = JSON.parse(responseText);
        console.log('Parsed response:', responseMain);

        if (responseMain && responseMain.body) {
          const innerBody = responseMain.body;
          if (innerBody && innerBody.message && innerBody.message.info) {
            const info = innerBody.message.info;

            // Set state variables with the extracted data
            setNumEmployees(formatLargeNumber(info.fullTimeEmployees) || "0");
            setCeo(info.companyOfficers[0]?.name || "-");
            setFounded(info.yearBorn || "-");
            setBasedIn(info.city ? `${info.city}, ${info.state}` : "-");
            setEbitda(formatLargeNumber(info.ebitda) || "-");
            setEnterpriseValue(formatLargeNumber(info.enterpriseValue) || "-");
            setOpen(info.regularMarketOpen || "0");
            setLongName(info.longName || "-");
            setTicker(info.symbol || "-");
            setSector(info.sector || "-");

            setIsStockDataLoading(false);


            // Set about company text
            if (innerBody && innerBody.message && innerBody.message.history) {
              const { dataPoints, monthlyData } = parseHistoryData(innerBody.message.history);
              setStockHistory(dataPoints);
              const filteredData = filterDataByTimeframe(dataPoints, selectedTimeframe);
              setDisplayedData(filteredData);

              // Find top 5 volume months and set as important markers
              const topVolumeMarkers = findTopVolumeMonths(monthlyData);
              setImportantMarkers(topVolumeMarkers);

            }


          } else {

          }
        } else {
        }
      } catch (e) {
        console.error('POST call failed: ', e);
        setAboutCompanyText("An error occurred while fetching company information. Please try again.");
        setIsStockDataLoading(false);
      } finally {
        setIsLoadingAboutText(false);
        setIsStockDataLoading(false);
      }
    } else {
      setAboutCompanyText("Failed to authenticate. Please refresh and try again.");
      setIsLoadingAboutText(false);
      console.log('Failed to fetch access token.');
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
    setStockHistory(generateFlatLineData(100))
    handleSendQuery(`Provide a brief summary about ${longName}. Please keep it anywhere from 3-5 sentences maximum.`);
    handleStockData();
  }, [longName]);


  useEffect(() => {

    async function fetchMarkerData() {
      if (importantMarkers.length > 0 && !dataFetchedRef.current) {
        setIsLoadingMarkerData(true);
        const markerDates = importantMarkers.map(marker => marker.date);

        const fetchPromises = markerDates.map(async (marker) => {
          const formattedDate = format(new Date(marker), 'MMMM yyyy');
          console.log("Making request for date " + formattedDate);

          try {
            const accessToken = await handleFetchAccess();
            if (!accessToken) {
              console.error('Failed to fetch access token.');
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
    For each point, briefly explain its potential impact on ${longName}'s stock price. If applicable, include quantitative data such as percentage changes in stock price, revenue figures, or market share. Conclude with a sentence summarizing the overall market sentiment towards ${longName} during this period.
    
    After your summary, you must provide a "Sources:" section with 1-3 relevant links to news articles from the provided data, formatted exactly as follows:
    Sources:
    1. "Title of Article 1" [URL1]
    2. "Title of Article 2" [URL2]
    3. "Title of Article 3" [URL3]`
                }
              }
            });

            const { body } = await restOperation.response;
            const responseText = await body.text();
            const responseMain = JSON.parse(responseText);

            if (responseMain && responseMain.body) {
              const innerBody = JSON.parse(responseMain.body);
              if (innerBody && innerBody.message) {
                const links = extractRelevantLinks(innerBody.message);
                const contentWithoutSources = innerBody.message.split('Sources:')[0].trim();
                return { date: marker, content: contentWithoutSources, links };
              }
            }
            return null;
          } catch (error) {
            console.error(`Error fetching data for marker ${formattedDate}:`, error);
            return null;
          }
        });

        const markerResponses = await Promise.all(fetchPromises);
        const validResponses = markerResponses.filter(response => response !== null);

        setMarkerResponses(prev => [...prev, ...validResponses]);
        setIsLoadingMarkerData(false);
        dataFetchedRef.current = true;
      }
    }


    fetchMarkerData();
  }, [importantMarkers, companyName]);

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
        <div className="relative inline-block flex flex-col items-start font-sans">
          <div className="nameAndPrice relative top-0 left-0 gap-2 2xl:gap-4 flex flex-col">
            <h1 className="text-3xl font-extralight 2xl:text-4xl">{longName} | {ticker}</h1>
            <h1 className="text-5xl font-normal font-montserrat 2xl:text-6xl">${open}</h1>
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
              {selectedMarkerDate
                ? format(new Date(selectedMarkerDate), 'MMMM d, yyyy')
                : "Recent News"}
            </h1>
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className={`px-4 border border-black rounded-full transition-colors ${showLearnMore ? 'bg-black text-white' : 'bg-white text-black'}`}
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
                <ScrollArea className='h-[12rem] md:h-[12rem] text-slate-600 text-[.8rem] font-light 2xl:text-xl mb-4'>
                  {selectedMarkerDate ? (
                    isLoadingMarkerData ? (
                      <Skeleton className="w-full h-full rounded" />
                    ) : (
                      <ReactMarkdown>
                        {markerResponses.find(response => response.date === selectedMarkerDate)?.content ||
                          "No information available for this date."
                        }
                      </ReactMarkdown>


                    )
                  ) : (
                    "Select a date to view information."
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
                    {relevantLinks.map((link, index) => (
                      <RelevantLink
                        key={index}
                        title={link.title}
                        url={link.url}
                        linkDescription=""
                        isLoading={!relevantLinksLoaded}
                      />
                    ))}
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
          <h1 className="font-normal text-lg 2xl:text-2xl">About {longName}</h1>
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
              <IndustryButton industryName={sector} isLoading={!industryButtonLoaded} />

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
              <h1 className="text-slate-600 text-[.95rem] font-light mb-4 2xl:mb-6 2xl:text-xl">
                {aboutCompanyText || "No information available."}
              </h1>
            )}

            <div className="stats flex flex-col gap-4 2xl:gap-6 inline-block">
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Employees' statVal={numEmployees} isLoading={numEmployees === "0"} />
                <StatListing statName='CEO' statVal={ceo} isLoading={ceo === "-"} />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='Founded' statVal={founded} isLoading={founded === "-"} />
                <StatListing statName='Based In' statVal={basedIn} isLoading={basedIn === "-"} />
              </div>
              <div className="inline-block flex flex-row items-center justify-around w-full">
                <StatListing statName='EBITDA' statVal={ebitda} isLoading={ebitda === "-"} />
                <StatListing statName='Enterprise Value' statVal={enterpriseValue} isLoading={enterpriseValue === "-"} />
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
                    <StatListing statName='Employees' statVal={numEmployees} isLoading={numEmployees === "0"} />
                    <StatListing statName='CEO' statVal={ceo} isLoading={ceo === "-"} />
                  </div>
                  <div className="inline-block flex flex-row items-center justify-around w-full">
                    <StatListing statName='Founded' statVal={founded} isLoading={founded === "-"} />
                    <StatListing statName='Based In' statVal={basedIn} isLoading={basedIn === "-"} />
                  </div>
                  <div className="inline-block flex flex-row items-center justify-around w-full">
                    <StatListing statName='EBITDA' statVal={ebitda} isLoading={ebitda === "-"} />
                    <StatListing statName='Enterprise Value' statVal={enterpriseValue} isLoading={enterpriseValue === "-"} />
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