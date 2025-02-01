// import React, { useEffect, useState } from 'react';
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import NewsListing from "@/components/NewsListing";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { Separator } from "@/components/ui/separator";
// import { Search, Menu, LogOut, SettingsIcon, Factory } from "lucide-react";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import logo from "../assets/fynopsis_noBG.png";
// import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
// import { useAuthenticator } from '@aws-amplify/ui-react';
// import Link from 'next/link';
// import { get } from 'aws-amplify/api';


// function timeSince(dateString: string | number | Date) {
//     // Set the current date to August 14, 2024, at 5:43 PM CST
//     const now = new Date('2024-08-14T22:43:00Z'); // 5:43 PM CST in UTC
//     const date = new Date(dateString);
    
//     const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
//     if (seconds < 0) {
//         return "just now";
//     }
    
//     const intervals = [
//         { label: 'year', seconds: 31536000 },
//         { label: 'month', seconds: 2592000 },
//         { label: 'day', seconds: 86400 },
//         { label: 'hour', seconds: 3600 },
//         { label: 'minute', seconds: 60 },
//         { label: 'second', seconds: 1 }
//     ];

//     for (let i = 0; i < intervals.length; i++) {
//         const interval = Math.floor(seconds / intervals[i].seconds);
//         if (interval >= 1) {
//             return interval + " " + intervals[i].label + (interval > 1 ? "s" : "") + " ago";
//         }
//     }
    
//     return "just now";
// }

// interface StockSearchProps {
//     setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
//     remainingRequests: number | null;
//     setRemainingRequests: React.Dispatch<React.SetStateAction<number | null>>;
// }
// export default function StockSearch({ setSelectedTab, remainingRequests, setRemainingRequests }: StockSearchProps) {
//     const [searchInput, setSearchInput] = useState('');
//     const [showStock, setShowStock] = useState(false);
//     const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
//     const { user, signOut } = useAuthenticator((context) => [context.user]);
//     interface RecentSearch {
//         value: string;
//         timestamp: string;
//     }
    
//     const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     // const [remainingRequests, setRemainingRequests] = useState<number | null>(null);


//     async function getTotalSearches() {
//         try {
//             const restOperation = get({
//                 apiName: 'testAPI',
//                 path: '/fetchTotalSearches',
//             });
//             const { body } = await restOperation.response;
//             const responseText = await body.text();
//             const responseMain = JSON.parse(responseText);
//             // console.log('Recent searches:', responseMain);
  
//             // Extract the searches array from the response
//             const value = 5 - responseMain.totalSearches || 0;
//             setRemainingRequests(value);
//         } catch (error) {
//             console.error('Error fetching recent searches');
//         }
//     }
//     useEffect(() => {
//       if (user) {
//         getTotalSearches();
//       }
//     }, [user]);

//     async function getRecentSearches() {
//         setIsLoading(true);
//         setError(null);
//         try {
//             const restOperation = get({
//                 apiName: 'testAPI',
//                 path: '/fetchPastSearches',
//             });
//             const { body } = await restOperation.response;
//             const responseText = await body.text();
//             const responseMain = JSON.parse(responseText);
//             // console.log('Recent searches:', responseMain);

//             // Extract the searches array from the response
//             const searches = responseMain.searches || [];
//             setRecentSearches(searches);
//         } catch (error) {
//             console.error('Error fetching recent searches');
//             setError("Failed to fetch recent searches. Please try again later.");
//         } finally {
//             setIsLoading(false);
//         }
//     }

//     useEffect(() => {
//         if (user) {
//             handleFetchUserAttributes();
//         }
//         getRecentSearches();
//     }, [user]);

//     async function incrementSearches() {
//         try {
//             const restOperation = get({
//                 apiName: 'testAPI',
//                 path: '/incrementTotalSearches',
//             });
//             // const { body } = await restOperation.response;
//             // const responseText = await body.text();
//             // const responseMain = JSON.parse(responseText);
//             // // console.log('Recent searches:', responseMain);
  
//             // // Extract the searches array from the response
//             // const value = 5 - responseMain.totalSearches || 0;
//             // setRemainingRequests(value);
//         } catch (error) {
//             console.error('Error fetching recent searches');
//         }
//     }


//     async function handleFetchUserAttributes() {
//         try {
//             const attributes = await fetchUserAttributes();
//             setUserAttributes(attributes);
//         } catch (error) {
//             console.log('error');
//         }
//     }

//     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setSearchInput(e.target.value);
//     };

//     const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter' && searchInput.trim() !== '' && remainingRequests != null && remainingRequests > 0) {
//             incrementSearches();
//             setRemainingRequests(remainingRequests - 1);
//             setShowStock(true);
//         }
//     };

//     const handleTabChange = (tab: React.SetStateAction<string>) => {
//         if (setSelectedTab) {
//             setSelectedTab(tab);
//         }
//     };

//     const handleBack = () => {
//         setShowStock(false);
//         setSearchInput('');
//     };

//     const handleRecentSearchClick = (search: { value: string }) => {
//         setSearchInput(search.value);
//         setShowStock(true);
//     };

//     if (showStock) {
//         return (
//             <div className="flex flex-col h-screen w-full">
//                 <Stock
//                     companyName={searchInput}
//                     image={''}
//                     stockDescription={''}
//                     imageType={'circular'}
//                     onBack={handleBack}
//                     remainingRequests={remainingRequests}
//                     setRemainingRequests={setRemainingRequests}
//                 />
//             </div>
//         );
//     }

//     return (
//         <ScrollArea className="h-screen w-full sans-serif">


//             <div className="flex flex-col min-h-screen w-full xl:px-4 2xl:px-8 ">
//                 <div className="flex-none w-full inline-block py-4 2xl:py-8 xl:py-6 flex justify-center items-center relative">
//                     {/* Menu icon and Sheet for smaller screens */}
//                     <div className="absolute left-4 lg:hidden">
//                         <Sheet>
//                             <SheetTrigger asChild>
//                                 <button className="p-2">
//                                     <Menu className="h-6 w-6" />
//                                 </button>
//                             </SheetTrigger>
//                             <SheetContent side="left" className='pl-2 pt-3'>
//                                 <div className="flex flex-col justify-start items-start">
//                                     <div className="inline-block w-full flex items-center gap-2 mb-4">
//                                         <img src={logo.src} alt="Fynopsis Logo" className="h-8 w-8" />
//                                         <h1>{userAttributes?.given_name} {userAttributes?.family_name} </h1>
//                                     </div>

//                                     <h2 className="text-lg font-semibold px-4">Menu</h2>
//                                     <div className="flex-1">
//                                         <nav className="grid items-start px-2 lg:text-base xl:text-lg 2xl:text-2xl font-medium lg:px-4">
//                                             <Link
//                                                 href="#"
//                                                 className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary"
//                                                 onClick={() => handleTabChange("stockSearch")}
//                                             >
//                                                 <Search className="h-4 w-4 2xl:h-6 2xl:w-6" />
//                                                 Stock Search
//                                             </Link>
//                                             <Link
//                                                 href="#"
//                                                 className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary"
//                                                 onClick={() => handleTabChange("industryPage")}
//                                             >
//                                                 <Factory className="h-4 w-4 2xl:h-6 2xl:w-6" />
//                                                 Industry Search
//                                             </Link>
//                                         </nav>
//                                     </div>
//                                     <div className="absolute bottom-0 w-full flex">
//                                         <button className="h-12 w-full justify-center flex flex-row items-center gap-2" onClick={signOut}>
//                                             <h1 className="text-red-400">Logout</h1>
//                                             <LogOut className="h-4 w-4 decoration-red-400" color={"#E74545"} />
//                                         </button>
//                                     </div>
//                                 </div>
//                             </SheetContent>
//                         </Sheet>
//                     </div>

//                     <div className="relative w-[70%] lg:w-[60%] ">
//                         <input
//                             type="text"
//                             className="searchBar bg-slate-200 dark:bg-transparent dark:border-slate-400 dark:border-2 w-full 2xl:h-[4.5rem] lg:h-[3.5rem] h-[2.5rem] 2xl:text-xl text-lg rounded-full pl-12 lg:pl-16 xl:pl-20 2xl:pl-24"
//                             placeholder="Search for a stock"
//                             value={searchInput}
//                             onChange={handleInputChange}
//                             onKeyPress={handleKeyPress}
//                         />
//                         <Search className="h-4 w-4 lg:h-6 lg:w-6 2xl:h-8 2xl:w-8 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
//                     </div>
//                 </div>
//                 {/* Add your stock search content here */}
//                 <div className="mt-8 px-4">
//                     <h2 className="text-xl font-semibold mb-4">Recent Searches</h2>
//                     {isLoading ? (
//                         <p>Loading recent searches...</p>
//                     ) : error ? (
//                         <p className="text-red-500">{error}</p>
//                     ) : recentSearches.length > 0 ? (
//                         <ul className="space-y-2">
//                             {[...recentSearches].reverse().map((search, index) => (
//                                 <li
//                                     key={index}
//                                     className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
//                                     onClick={() => handleRecentSearchClick(search)}
//                                 >
//                                     <div className="flex justify-between items-center">
//                                         <span>{search.value}</span>
//                                         <span className="text-sm text-gray-500">{timeSince(search.timestamp)}</span>
//                                     </div>
//                                 </li>
//                             ))}
//                         </ul>
//                     ) : (
//                         <p>No recent searches found.</p>
//                     )}
//                 </div>
//             </div>
//         </ScrollArea>
//     );
// }