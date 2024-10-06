"use client";
import Link from "next/link"
import {
  Bell,
  Search,
  Settings as SettingsIcon,
  Factory,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from '../assets/fynopsis_noBG.png'
import { useState, useEffect } from "react"
import Dashboard from "./Dashboard";
import StockSearch from "./StockSearch";
import Settings from "./Settings";
import IndustryPage from "./IndustryPage";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Sun, Moon } from "lucide-react";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { CircularProgress } from "@mui/material";
import React, {  useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Library, Users, TrendingUp, LucideIcon, LogOut } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AdvancedSearch from "@/components/Analytics";
import Files from "@/components/Files";
import People from "@/components/People";


export default function Home() {
  const [selectedTab, setSelectedTab] = useState("library");
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  const tabs: Tab[] = [
      { icon: Library, label: 'Library' },
      { icon: Search, label: 'People' },
      { icon: TrendingUp, label: 'Trending' }
  ];

  function signIn(): void {
      router.push('/signin');
  }

  
  function handleTabClick(index: number): void {
    setActiveTab(index);
    setSelectedTab(tabs[index].label.toLowerCase());
  }

  useEffect(() => {
      if (activeTab !== null && tabRefs.current[activeTab]) {
          const tabElement = tabRefs.current[activeTab];
          if (tabElement) {
              setIndicatorStyle({
                  top: `${tabElement.offsetTop}px`,
                  height: `${tabElement.offsetHeight}px`,
              });
          }
      }
  }, [activeTab]);

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (user) {
      handleFetchUserAttributes();
    }
  }, [user]);

  async function handleFetchUserAttributes() {
    try {
      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
    } catch (error) {
      console.log("error");
    }
  }

  const renderSelectedScreen = () => {
    switch (selectedTab) {
      case "library":
        return <Files setSelectedTab={setSelectedTab} />
      case "trending":
        return <AdvancedSearch setSelectedTab={setSelectedTab} />
      case "people":
        return <People setSelectedTab={setSelectedTab} />
      default:
        return <Files setSelectedTab={setSelectedTab} />
    }
  }

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    userAttributes ?
      <div className="relative h-screen w-full flex flex-row sans-serif">
        <div className="w-20 bg-slate-900 h-full flex flex-col items-center justify-between pt-4 pb-6">
          <div className="">
            <img src={logo.src} alt="logo" className="h-14 w-auto mb-8" />
            <div className="relative flex flex-col items-center">
              {activeTab !== null && (
                <div
                  className="absolute left-0 w-full bg-blue-300 rounded-xl transition-all duration-300 ease-in-out"
                  style={indicatorStyle}
                />
              )}
              {tabs.map((tab, index) => (
                <div
                  key={tab.label}
                  ref={(el) => (tabRefs.current[index] = el)}
                  className={`relative z-10 p-2 mb-4 cursor-pointer ${activeTab === index ? 'text-slate-900' : 'text-white'
                    }`}
                  onClick={() => handleTabClick(index)}
                >
                  <tab.icon size={24} />
                </div>
              ))}
            </div>
          </div>

          <Popover>
            <PopoverTrigger className='bg-sky-600 h-10 aspect-square rounded-full'></PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 overflow-hidden">
          {renderSelectedScreen()}
        </div>
      </div> :
      <div className="grid h-screen place-items-center">
        <CircularProgress value={0.5} />
      </div>
  );
}