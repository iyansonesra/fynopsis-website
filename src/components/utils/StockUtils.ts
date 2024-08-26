import { format, parseISO, subDays, subMonths, subYears } from 'date-fns';
import { post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useState } from 'react';

export interface DataPoint {
    name: string;
    uv: number;
    pv: number;
    amt: number;
  }
  
  export interface ImportantMarker {
    date: string;
    label: string;
    explanation: string;
  }

  export async function handleFetchAccess() {
    try {
      const access = (await fetchAuthSession()).tokens?.accessToken?.toString();
      if (!access) {
        throw new Error("Token is null or undefined");
      }
      return access;
    } catch (error) {
      // console.log(error);
      return null;
    }
  }
  
  export const handleInputChange = (setInputValue: React.Dispatch<React.SetStateAction<string>>) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
    };
  
  export const handleKeyPress = (
    inputValue: string,
    setInputValue: React.Dispatch<React.SetStateAction<string>>,
    handleSendQuery: (userMessage: string) => Promise<void>
  ) => async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (!inputValue.trim()) return;
      const userMessage = inputValue.trim();
      setInputValue('');
      await handleSendQuery(userMessage);
    }
  };
  
  export const formatLargeNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) {
      return 'N/A';
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



  
  export const handleStockData = async (
    companyName: string,
    setIsLoadingAboutText: React.Dispatch<React.SetStateAction<boolean>>,
    setStockInfo: (info: any) => void,
    setStockHistory: React.Dispatch<React.SetStateAction<any[]>>,
    setDisplayedData: React.Dispatch<React.SetStateAction<any[]>>,
    setImportantMarkers: React.Dispatch<React.SetStateAction<any[]>>,
    selectedTimeframe: string,
    parseHistoryData: (history: any) => { dataPoints: any[], monthlyData: any[] },
    filterDataByTimeframe: (data: any[], timeframe: string) => any[],
    findTopVolumeMonths: (monthlyData: any[]) => any[]
  ) => {
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
        const responseMain = JSON.parse(responseText);
  
        if (responseMain && responseMain.body) {
          const innerBody = responseMain.body;
          if (innerBody && innerBody.message && innerBody.message.info) {
            const info = innerBody.message.info;
            setStockInfo(info);
  
            if (innerBody.message.history) {
              const { dataPoints, monthlyData } = parseHistoryData(innerBody.message.history);
              setStockHistory(dataPoints);
              const filteredData = filterDataByTimeframe(dataPoints, selectedTimeframe);
              setDisplayedData(filteredData);
  
              const topVolumeMarkers = findTopVolumeMonths(monthlyData);
              setImportantMarkers(topVolumeMarkers);
            }
          }
        }
      } catch (e) {
        // Handle error
      } finally {
        setIsLoadingAboutText(false);
      }
    } else {
      setIsLoadingAboutText(false);
    }
  };
  
  export const handleSendQuery = async (
    userMessage: string,
    setIsLoadingAboutText: React.Dispatch<React.SetStateAction<boolean>>,
    setAboutCompanyText: React.Dispatch<React.SetStateAction<string>>
  ) => {
    setIsLoadingAboutText(true);
    console.log("yo");
  
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
        const responseMain = JSON.parse(responseText);
  
        if (responseMain && responseMain.body) {
          const innerBody = JSON.parse(responseMain.body);
         
          if (innerBody && innerBody.message) {
            setAboutCompanyText(innerBody.message);
          } else {
            setAboutCompanyText("Failed to parse company information. Please try again.");
          }
        } else {
          setAboutCompanyText("Failed to fetch company information. Please try again.");
        }
      } catch (e) {
        setAboutCompanyText("An error occurred while fetching company information. Please try again.");
      } finally {
        setIsLoadingAboutText(false);
      }
    } else {
      setAboutCompanyText("Failed to authenticate. Please refresh and try again.");
      setIsLoadingAboutText(false);
    }
  };

export const parseHistoryData = (history: any): { dataPoints: DataPoint[], monthlyData: any[] } => {
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
  
 export const findTopVolumeMonths = (monthlyData: any[]): ImportantMarker[] => {
    // Sort the data chronologically
    const sortedData = [...monthlyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
    const totalMonths = sortedData.length;
    const groupSize = Math.ceil(totalMonths / 5);
  
    const topMonths = [];
    for (let i = 0; i < 5; i++) {
      const startIndex = i * groupSize;
      const endIndex = Math.min((i + 1) * groupSize, totalMonths);
      const group = sortedData.slice(startIndex, endIndex);
  
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
  
  export const formatNumber = (num: number): string => {
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

  export const extractRelevantLinks = (content: string): { title: string; url: string }[] => {
    // console.log("Original content:", content);

    const sourcesSection = content.split('Sources:')[1];
    if (!sourcesSection) {
      // console.log("No 'Sources:' section found.");
      return [];
    }

    // console.log("Sources section:", sourcesSection);

    // Updated regex pattern to match the new format
    const links = sourcesSection.match(/\d+\.\s"(.+?)"\s\[(.+?)\]/g) || [];
    // console.log("Matched links:", links);

    const extractedLinks = links.map(link => {
      // Updated regex to capture title and URL in the new format
      const [, title, url] = link.match(/\d+\.\s"(.+?)"\s\[(.+?)\]/) || [];
      return { title, url };
    });

    // console.log("Extracted links:", extractedLinks);

    return extractedLinks;
  };


  export const generateFlatLineData = (length: number): DataPoint[] => {
    const flatLineData: DataPoint[] = [];
    const baseDate = new Date();
    const baseValue = 0; // You can adjust this value as needed

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

  export const createHandleMarkerSelect = (setSelectedMarkerDate: (date: string | null) => void) => {
    return (date: string | null) => {
      setSelectedMarkerDate(date);
    };
  };