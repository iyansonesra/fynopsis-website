import React, { useEffect, useState } from 'react';
import logo from '../app/assets/fynopsis_noBG.png'
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Separator } from './ui/separator';
import CompanyListing from './CompanyListing';
import RegInnov from './RegInnov';
import { post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Skeleton } from './ui/skeleton';
import { ConsoleLogger } from 'aws-amplify/utils';
import { CodeSquare } from 'lucide-react';




interface IndustryProps {
    industryName: string;
    company: string;
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




const StyledSelect = styled(Select)(({ theme }) => ({
    '&.MuiInputBase-root': {
        border: 'none',
        '&:before, &:after': {
            display: 'none',
        },
    },
    '& .MuiSelect-select': {
        padding: '0 10px 0 0', // Add some padding to the right for the dropdown icon
        color: theme.palette.primary.main,
        '&:focus': {
            background: 'none',
        },
        fontSize: '0.875rem', // Equivalent to text-sm in Tailwind
        lineHeight: '1.25rem',
        fontWeight: 500,
    },
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none',
    },
    '& .MuiSelect-icon': {
        display: 'none',
    },
}));

const TimeSelector = ({ timeFrame, setTimeFrame }: {
    timeFrame: string;
    setTimeFrame: (value: string) => void;
}) => {
    const handleChange = (event: SelectChangeEvent<unknown>) => {
        setTimeFrame(event.target.value as string);
    };

    return (
        <FormControl sx={{ m: 0, minWidth: 80, }} className='dark:bg-slate-900'>
            <StyledSelect
                value={timeFrame}
                onChange={handleChange}
                displayEmpty
                inputProps={{ 'aria-label': 'Without label' }}
                className='dark:bg-slate-900'
            >
                <MenuItem value="24 hours" style={{ fontSize: '0.875rem' }}>24 hours</MenuItem>
                <MenuItem value="30 days" style={{ fontSize: '0.875rem' }}>30 days</MenuItem>
                <MenuItem value="6 months" style={{ fontSize: '0.875rem' }}>6 months</MenuItem>
                <MenuItem value="year" style={{ fontSize: '0.875rem' }}>year</MenuItem>
            </StyledSelect>
        </FormControl>
    );
};

interface Company {
    "Company Name": string;
    "Company URL": string;
    "LinkedIn URL": string;
    "Number of Employees": string;
}

const Industry: React.FC<IndustryProps> = ({
    industryName,
    company
}) => {


    const [industryInfo1Day, setIndustryInfo1Day] = useState('');
    const [industryInfo1Month, setIndustryInfo1Month] = useState('');
    const [industryInfo6Month, setIndustryInfo6Month] = useState('');
    const [industryInfoYear, setIndustryInfoYear] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [timeFrame, setTimeFrame] = useState('24 hours');
    const [majorPlayers, setMajorPlayers] = useState<Company[]>([]);
    const [isMajorPlayersLoading, setIsMajorPlayersLoading] = useState(true);
    const [similarCompanies, setSimilarCompanies] = useState<Company[]>([]);
    const [similarCompaniesLoading, setSimilarCompaniesLoading] = useState(true);
    const [mcap, setMcap] = useState('');
    const [cagr, setCagr] = useState('');
    const [industryMetricsLoading, setIndustryMetricsLoading] = useState(true);
    const [regInnovData, setRegInnovData] = useState<Array<{ Type: string; Date: string; ShortDescription: string; LongDescription: string }>>([]);
    const [regInnovLoading, setRegInnovLoading] = useState(true);
    const [selectedRegInnov, setSelectedRegInnov] = useState<{
        Type: string;
        Date: string;
        ShortDescription: string;
        LongDescription: string;
    } | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isOverallLoading, setIsOverallLoading] = useState(true);
    const [isActualLoadingComplete, setIsActualLoadingComplete] = useState(false);

    const startArtificialLoading = () => {
        const totalDuration = 120000; // 2 minutes in milliseconds
        const interval = 1000; // Update every second
        const incrementPerInterval = 99 / (totalDuration / interval); // Cap at 99%
    
        const timer = setInterval(() => {
            setLoadingProgress((prevProgress) => {
                const newProgress = prevProgress + incrementPerInterval;
                return newProgress >= 99 ? 99 : newProgress;
            });
        }, interval);
    
        return timer;
    };

    const quickRampUp = () => {
        const rampUpDuration = 2000; // 2 seconds for quick ramp-up
        const interval = 50; // Update every 50ms for smoother animation
        const incrementPerInterval = (99 - loadingProgress) / (rampUpDuration / interval);
    
        const timer = setInterval(() => {
            setLoadingProgress((prevProgress) => {
                const newProgress = prevProgress + incrementPerInterval;
                if (newProgress >= 99 || isActualLoadingComplete) {
                    clearInterval(timer);
                    return isActualLoadingComplete ? 100 : 99;
                }
                return newProgress;
            });
        }, interval);
    };

    const handleRegInnovClick = (item: {
        Type: string;
        Date: string;
        ShortDescription: string;
        LongDescription: string;
    }) => {
        setSelectedRegInnov(item);
    };

    const getSelectedInfo = () => {
        let info = '';
        switch (timeFrame) {
            case '24 hours':
                info = industryInfo1Day;
                break;
            case '30 days':
                info = industryInfo1Month;
                break;
            case '6 months':
                info = industryInfo6Month;
                break;
            case 'year':
                info = industryInfoYear;
                break;
        }

        if (info) {
            try {
                const parsedInfo = JSON.parse(info);
                if (parsedInfo.message) {
                    // Remove the sources section
                    const messageWithoutSources = parsedInfo.message.split('[SOURCES]')[0].trim();
                    return messageWithoutSources;
                }
            } catch (error) {
                console.error("Error parsing info:", error);
            }
        }
    };

    function parseIndustryMetrics(metricsString: string) {
        try {
            const parsedMetrics = JSON.parse(metricsString);
            
            // If the response is wrapped in a 'message' field, parse it
            const metrics = parsedMetrics.message ? JSON.parse(parsedMetrics.message) : parsedMetrics;
    
            const mcap = parseFloat(metrics.MCAP);
            const cagr = parseFloat(metrics.CAGR);
    
            if (isNaN(mcap) || isNaN(cagr)) {
                throw new Error('Invalid numeric values');
            }
    
            // MCAP should be a large number (assuming it's in USD)
            if (mcap < 1000000) { // Assuming MCAP should be at least 1 million
                throw new Error('MCAP value seems too low');
            }
    
            // CAGR should be a percentage between -100 and 100
            if (cagr < -100 || cagr > 100) {
                throw new Error('CAGR value out of expected range');
            }
    
            return {
                mcap: formatNumber(mcap),
                cagr: formatNumber(cagr, true)
            };
        } catch (error) {
            console.error('Error parsing industry metrics:', error);
            return { mcap: 'N/A', cagr: 'N/A' };
        }
    }


    async function infoQuery(timeframe: string) {
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
                            query: `As a financial analysis agent, provide a concise yet comprehensive summary (3-5 sentences MAXIMUM) of the most significant events and news within the ${timeframe} period that could have impacted the Dairy industry. Please remove any fluff such as "In the past six months, the mobile phone industry has seen significant developments", I just want pure facts. The response should be in paragraph format, not a list. The following is an example: Apple has emerged as the top smartphone vendor, surpassing Samsung for the first time in 12 years. Global smartphone shipments decreased by 4% in 2023 but rebounded with a 9% increase in Q2 2024, indicating a possible recovery trend. Additionally, mobile phone exports from India surged by 39% in early 2024, driven primarily by iPhone production. However, challenges remain, with consumers reportedly holding onto their devices longer than before, reflecting market saturation and economic pressures.`
                        }
                    }
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const responseMain = JSON.parse(responseText);

                return responseMain.body;
            } catch (e) {
                console.error("Error making API request:", e);
                return null;
            }
        } else {
            return null;
        }
    }

    async function queryMajorPlayers(industry: string) {
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
                            query: `As a financial analysis agent, provide a detailed list of the 5-6 major companies in the ${industry} industry. For each company, include the following information:

Company Name
Company URL
LinkedIn URL
Number of Employees

Please ensure the information is accurate and up-to-date. Return the response in JSON format, with an array of company objects. Each object should have the properties: "Company Name", "Company URL", "LinkedIn URL", and "Number of Employees". The response should not include any additional text before or after the JSON data. Here's an example of the expected format:
{"companies": [{"Company Name": "Apple Inc.", "Company URL": "apple.com", "LinkedIn URL": "linkedin.com/company/apple", "Number of Employees": 147000}, {"Company Name": "Samsung Electronics", "Company URL": "samsung.com", "LinkedIn URL": "linkedin.com/company/samsung-electronics", "Number of Employees": 287000}]}`
                        }
                    }
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const responseMain = JSON.parse(responseText);

                return responseMain.body;
            } catch (e) {
                console.error("Error making API request for major players:", e);
                return null;
            }
        } else {
            return null;
        }
    }

    async function querySimilarCompanies(company: string) {
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
                            query: `As a financial analysis agent, provide a detailed list of 5-6 companies similar to ${company}. For each company, include the following information (ensure that the entire LinkedIn URL is returned and accurate):

                            Company Name
                            Company URL
                            LinkedIn URL
                            Number of Employees
                            
                            Please ensure the information is accurate and up-to-date. Return the response in JSON format, with an array of company objects. Each object should have the properties: "Company Name", "Company URL", "LinkedIn URL", and "Number of Employees". The response should not include any additional text before or after the JSON data. Here's an example of the expected format:
                            {"companies": [{"Company Name": "Apple Inc.", "Company URL": "apple.com", "LinkedIn URL": "linkedin.com/company/apple", "Number of Employees": 147000}, {"Company Name": "Samsung Electronics", "Company URL": "samsung.com", "LinkedIn URL": "linkedin.com/company/samsung-electronics", "Number of Employees": 287000}]}`
                        }
                    }
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const responseMain = JSON.parse(responseText);

                console.log(responseMain.body);

                return responseMain.body;
            } catch (e) {
                console.error("Error making API request for similar companies:", e);
                return null;
            }
        } else {
            return null;
        }
    }

    async function queryIndustryMetrics(industry: string) {
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
                            query: `As a financial analysis agent, provide the current market capitalization (MCAP) and compound annual growth rate (CAGR) for the ${industry} industry. Please return the response in JSON format with the following structure:

{"MCAP": [value in USD], "CAGR": [value as percentage]}

Ensure that the values are accurate and up-to-date. The MCAP should be a dollar amount (e.g., 109000000000 for 109 billion USD) and the CAGR should be a percentage (e.g., 5.2 for 5.2%). The response should not include any additional text before or after the JSON data.`
                        }
                    }
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const responseMain = JSON.parse(responseText);

                return responseMain.body;
            } catch (e) {
                console.error("Error making API request for industry metrics:", e);
                return null;
            }
        } else {
            return null;
        }
    }


    async function queryRegulationsInnovations(industry: string) {
        console.log("called queryRegulations");
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
                            query: `As a financial analysis agent, provide a list of 5-6 recent regulations and innovations in the ${industry} industry. Return the response in JSON format as an array of objects. Each object should have the following properties:

Type: "Regulation" or "Innovation"
Date: In "MM/DD/YYYY" format
ShortDescription: A one-sentence description
LongDescription: A paragraph or two with more details

Please ensure the information is accurate and up-to-date. Sort the list by date, with the most recent items first. The response should not include any additional text before or after the JSON data. Here's an example of the expected format:
[{"Type": "Regulation", "Date": "05/13/2023", "ShortDescription": "US Congress has lifted import tariffs on dairy products from China and Russia.", "LongDescription": "In a significant move affecting the dairy industry, the US Congress has approved legislation to remove import tariffs on dairy products originating from China and Russia. This decision is expected to lead to an unprecedented influx of milk, cheese, and other dairy products into US markets. The policy change aims to increase competition and potentially lower prices for consumers, but it has raised concerns among domestic dairy farmers about the impact on their businesses. Industry analysts predict this could reshape the landscape of the US dairy market over the coming years."}, {"Type": "Innovation", "Date": "04/02/2023", "ShortDescription": "New probiotic yogurt with extended shelf life developed.", "LongDescription": "A team of food scientists has successfully created a new probiotic yogurt that maintains its beneficial bacterial cultures for up to six months without refrigeration. This breakthrough is expected to revolutionize yogurt distribution and accessibility, especially in regions with limited cold storage capabilities. The innovation involves a novel encapsulation technique that protects the probiotic bacteria from environmental stressors, allowing them to remain viable for extended periods at room temperature. This development could significantly expand the global market for probiotic dairy products and improve access to nutritious foods in developing countries."}]`
                        }
                    }
                });

                const { body } = await restOperation.response;
                const responseText = await body.text();
                const responseMain = JSON.parse(responseText);

                return responseMain.body;
            } catch (e) {
                console.error("Error making API request for regulations and innovations:", e);
                return null;
            }
        } else {
            return null;
        }
    }

    function parseMajorPlayers(response: string) {
        // console.log("Response: " + response);
        try {
            const parsedResponse = JSON.parse(response);
            console.log("Parsed response:", parsedResponse);
    
            // The actual data is nested in a JSON string inside the "message" field
            const messageContent = JSON.parse(parsedResponse.message);
            console.log("Parsed message content:", messageContent);
    
            const companies = messageContent.companies || [];
    
            if (!Array.isArray(companies)) {
                console.error('Unexpected response structure:', messageContent);
                return [];
            }
    
            console.log("Companies:", companies);
    
            return companies.map(company => {
                return {
                    "Company Name": company["Company Name"] || '',
                    "Company URL": company["Company URL"] || '',
                    "LinkedIn URL": company["LinkedIn URL"] || '',
                    "Number of Employees": formatNumber(company["Number of Employees"])
                };
            });
        } catch (error) {
            console.error('Error parsing response:', error);
            return [];
        }
        
    }

    function formatNumber(num: number, isPercentage = false) {
        if (isPercentage) {
            return num.toFixed(1) + '%';
        }
        if (num >= 1000000000000) {
            return (num / 1000000000000).toFixed(1) + 'T';
        } else if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        } else {
            return num.toFixed(1);
        }
    }

    useEffect(() => {
        console.log('useEffect in Industry component is running');

        setIsLoading(true);
        setIsMajorPlayersLoading(true);
        setSimilarCompaniesLoading(true);
        setIndustryMetricsLoading(true);  // Add this line
        setRegInnovLoading(true);
        setIsOverallLoading(true);
        setIsActualLoadingComplete(false);



        const startTime = performance.now();
        const loadingTimer = startArtificialLoading();


        const promises = [
            infoQuery('24 hours'),
            infoQuery('30 days'),
            infoQuery('6 months'),
            infoQuery('year'),
            queryMajorPlayers(industryName),
            querySimilarCompanies(company),
            queryIndustryMetrics(industryName),
            queryRegulationsInnovations(industryName)



        ];

        Promise.all(promises)
            .then(([info1Day, info1Month, info6Month, infoYear, majorPlayersInfo, similarCompaniesInfo, industryMetrics, regInnovInfo]) => {
                setIndustryInfo1Day(info1Day);
                setIndustryInfo1Month(info1Month);
                setIndustryInfo6Month(info6Month);
                setIndustryInfoYear(infoYear);

                

                if (majorPlayersInfo) {
                    const parsedPlayers = parseMajorPlayers(majorPlayersInfo);
                    setMajorPlayers(parsedPlayers);
                }

                if (similarCompaniesInfo) {
                    const parsedSimilarCompanies = parseMajorPlayers(similarCompaniesInfo);  // We can reuse this function
                    setSimilarCompanies(parsedSimilarCompanies);
                }

                if (industryMetrics) {
                    const { mcap, cagr } = parseIndustryMetrics(industryMetrics);
                    setMcap(mcap);
                    setCagr(cagr);
                }

                if (regInnovInfo) {
                    const parsedRegInnovData = parseRegInnovData(regInnovInfo);
                    setRegInnovData(parsedRegInnovData as never[]);
                }


                const endTime = performance.now();
                console.log(`All parallel queries completed in ${endTime - startTime} milliseconds.`);
                console.log('24 hours:', info1Day);
                console.log('30 days:', info1Month);
                console.log('6 months:', info6Month);
                console.log('1 year:', infoYear);
                console.log('Major Players Lambda Response:', majorPlayersInfo);
                console.log('Similar Companies Lambda Response:', similarCompaniesInfo);
                console.log('RegInnovInfo Lambda Response:', regInnovInfo);
                console.log('Similar Companies Lambda Response:', similarCompaniesInfo);
                setIsLoading(false);
                setIsMajorPlayersLoading(false);
                setSimilarCompaniesLoading(false);  // Add this line
                setIndustryMetricsLoading(false);  // Add this line
                setRegInnovLoading(false);

                if (!isLoading && !isMajorPlayersLoading && !similarCompaniesLoading && !industryMetricsLoading && !regInnovLoading) {
                    console.log("success!!!!!");
                    clearInterval(loadingTimer);
                    setLoadingProgress(100);
                }

                

            })
            .catch((error) => {
                console.error("Error fetching information:", error);
                setIsLoading(false);
                setIsMajorPlayersLoading(false);
                setSimilarCompaniesLoading(false);
                setIndustryMetricsLoading(false);
                setRegInnovLoading(false);
            })
            .finally(() => {
                setIsOverallLoading(false);
                setIsActualLoadingComplete(true);
                clearInterval(loadingTimer);
                if (loadingProgress < 99) {
                    quickRampUp();
                }
            });

            return () => clearInterval(loadingTimer);

    }, []);

    useEffect(() => {
        if (isActualLoadingComplete && loadingProgress >= 99) {
            setLoadingProgress(100);
        }
    }, [isActualLoadingComplete, loadingProgress]);

    function parseRegInnovData(response: string) {
        try {
            const parsedResponse = JSON.parse(response);
            
            // If the response is already an array, use it directly
            // Otherwise, try to parse the 'message' field if it exists
            const items = Array.isArray(parsedResponse) ? parsedResponse :
                          (parsedResponse.message ? JSON.parse(parsedResponse.message) : []);
    
            if (!Array.isArray(items)) {
                console.error('Unexpected response structure:', parsedResponse);
                return [];
            }
    
            return items.map(item => ({
                Type: item.Type || '',
                Date: item.Date || '',
                ShortDescription: item.ShortDescription || '',
                LongDescription: item.LongDescription || ''
            }));
        } catch (error) {
            console.error('Error parsing response:', error);
            return [];
        }
    }

    const SideScreen = ({ item, onClose }: { item: { 
        Type: string, 
        Date: string, 
        ShortDescription: string,
        LongDescription: string 
    } | null, onClose: () => void }) => (
        <div 
            className={`fixed right-0 top-0 h-full w-1/3 bg-white dark:bg-slate-800 p-4 shadow-lg transform transition-transform duration-300 ease-in-out ${
                item ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            {item && (
                <>
                    <button onClick={onClose} className="absolute top-4 right-4">Close</button>
                    <h2 className="text-xl font-bold mb-2">{item.Type}</h2>
                    <p className="text-sm mb-4">{item.Date}</p>
                    <p>{item['LongDescription']}</p>
                </>
            )}
        </div>
    );

    const LoadingOverlay = ({ progress }: { progress: number }) => (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg w-80">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(progress, 99)}%` }}></div>
                </div>
                <p className="text-center text-sm font-semibold">{Math.min(Math.round(progress), 99)}% Complete</p>
            </div>
        </div>
    );



    return (
        <div className='w-full h-full flex flex-col  py-12 px-4 2xl:py-12 2xl:px-12 font-montserrat gap-4'>
            {loadingProgress < 100 && <LoadingOverlay progress={loadingProgress} />}
            <h1 className="text-3xl font-bold 2xl:text-4xl">{industryName}</h1>

            <div className="flex flex-row">
                <div className="flex flex-[2] flex-col w-[66%]">
                    <p className="text-sm  2xl:text-lg flex items-center text-slate-500 mb-2">
                        In the last&nbsp; <TimeSelector timeFrame={timeFrame} setTimeFrame={setTimeFrame} />
                    </p>

                    <p className='text-sm 2xl:text-lg w-[95%] flex flex-col gap-2'>
                        {isLoading ?
                            <>
                                <Skeleton className='mb-0 w-full h-4' />
                                <Skeleton className='mb-0 w-full h-4' />
                                <Skeleton className='mb-0 w-full h-4' />
                                <Skeleton className='mb-0 w-full h-4' />
                            </>

                            : getSelectedInfo()}
                    </p>
                </div>

                <div className="flex flex-[1] flex-row w-[33%] items-center justify-center gap-16">
                    <div className="flex flex-col items-center justify-center gap-4 ">
                        <h1 className="px-6 py-1 bg-slate-100 dark:bg-slate-800 rounded-full 2xl:text-2xl">MCAP</h1>
                        {industryMetricsLoading ? (
                            <Skeleton className="h-12 w-24" />
                        ) : (
                            <h1 className="text-4xl font-bold 2xl:text-5xl">{mcap || 'N/A'}</h1>
                        )}
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4">
                        <h1 className="px-6 py-1 bg-slate-100 dark:bg-slate-800 rounded-full 2xl:text-2xl">CAGR</h1>
                        {industryMetricsLoading ? (
                            <Skeleton className="h-12 w-24" />
                        ) : (
                            <h1 className="text-4xl font-bold 2xl:text-5xl">{cagr || 'N/A'}</h1>
                        )}
                    </div>
                </div>

            </div>

            <div className="flex flex-row">
                <div className="flex-[2] w-[66%]">
                    <h1 className="font-semibold mb-1 2xl:text-xl">Major Players</h1>
                    <Separator className="w-36 mb-4"></Separator>
                    <div className="w-full flex-wrap flex gap-x-8 gap-y-6 mb-12">
                        {isMajorPlayersLoading ? (
                            <>
                                <Skeleton className="w-8 h-8 rounded-full"></Skeleton>
                            </>

                        ) : majorPlayers.length > 0 ? (
                            majorPlayers.map((player, index) => (
                                <CompanyListing
                                    key={index}
                                    url={player['Company URL']}
                                    name={player['Company Name']}
                                    numEmployees={player['Number of Employees']}
                                    linkedIn={player['LinkedIn URL']}  // Add this line
                                />
                            ))
                        ) : (
                            <p>No major players found.</p>
                        )}
                    </div>

                    <h1 className="font-bold mb-1 2xl:text-xl">Similar Companies to {company}</h1>
                    <Separator className="w-36 mb-4"></Separator>
                    <div className="w-full flex-wrap flex gap-x-8 gap-y-6 mb-6">
                        {similarCompaniesLoading ? (
                            <p>Loading similar companies...</p>
                        ) : similarCompanies.length > 0 ? (
                            similarCompanies.map((company, index) => (
                                <CompanyListing
                                    key={index}
                                    url={company['Company URL']}
                                    name={company['Company Name']}
                                    numEmployees={company['Number of Employees']}
                                    linkedIn={company['LinkedIn URL']}
                                />
                            ))
                        ) : (
                            <p>No similar companies found.</p>
                        )}
                    </div>
                </div>

                <div className="flex-[1] w-[33%]">
                    <h1 className="font-semibold mb-1 2xl:text-xl">Regulations & Innovations</h1>
                    <Separator className="w-56 mb-1"></Separator>
                    {regInnovLoading ? (
                        <>
                            <Skeleton className="h-16 w-full mb-2" />
                            <Skeleton className="h-16 w-full mb-2" />
                            <Skeleton className="h-16 w-full mb-2" />
                            <Skeleton className="h-16 w-full mb-2" />
                        </>
                    ) : regInnovData.length > 0 ? (
                        regInnovData.map((item, index) => (
                            <RegInnov
                                key={index}
                                type={item.Type}
                                date={item.Date}
                                info={item['ShortDescription']}
                                longInfo={item['LongDescription']}
                                onClick={() => handleRegInnovClick(item)}
                            />
                        ))
                    ) : (
                        <p>No regulations or innovations found.</p>
                    )}
                </div>
            </div>

            <SideScreen
                item={selectedRegInnov}
                onClose={() => setSelectedRegInnov(null)}
            />
        </div>
    );
};

export default Industry;