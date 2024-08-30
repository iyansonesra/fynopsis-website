"use client";
import Link from "next/link"
import {
  Bell,
  Search,
  LogOut,
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


export default function Home() {
  const [selectedTab, setSelectedTab] = useState("stockSearch");
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);

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
      console.log(error);
    }
  }

  const renderSelectedScreen = () => {
    switch (selectedTab) {
      case "stockSearch":
        return <StockSearch setSelectedTab={setSelectedTab} />
      case "settings":
        return <Settings setSelectedTab={setSelectedTab} />
      case "industryPage":
        return <IndustryPage setSelectedTab={setSelectedTab}/>
      default:
        return <StockSearch setSelectedTab={setSelectedTab} />
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
    <div className="grid max-h-screen w-full lg:grid-cols-[250px_1fr] xl:grid-cols-[250px_1fr] 2xl:grid-cols-[350px_1fr] overflow-hidden font-montserrat bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="hidden border-r lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 xl:h-[60px] 2xl:h-[90px]">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <img src={logo.src} alt="Fynopsis Logo" className="h-8 w-8 2xl:h-14 2xl:w-14" />
              <span className="sm-text-lg lg:text-m 2xl:text-2xl">{userAttributes?.given_name} {userAttributes?.family_name}</span>
            </Link>
            <Button
              variant="outline"
              size="icon"
              className="ml-auto h-8 w-8 2xl:[h-12 w-12]"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ?
                <Sun className="h-4 w-4 2xl:h-6 w-6" /> :
                <Moon className="h-4 w-4 2xl:h-6 w-6" />
              }
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 lg:text-base xl:text-lg 2xl:text-2xl font-medium lg:px-4">
              <Link
                href="#"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${selectedTab === "stockSearch" ? "bg-muted text-primary" : "text-muted-foreground"
                  }`}
                onClick={() => setSelectedTab("stockSearch")}
              >
                <Search className="h-4 w-4 2xl:h-6 2xl:w-6" />
                Stock Search
              </Link>

              <Link
                href="#"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${selectedTab === "stockSearch" ? "text-muted-foreground" : "bg-muted text-primary" 
                  }`}
                onClick={() => setSelectedTab("industryPage")}
              >
                <Factory className="h-4 w-4 2xl:h-6 2xl:w-6" />
                Industry
              </Link>

              {/* <Link
                href="#"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${selectedTab === "settings" ? "bg-muted text-primary" : "text-muted-foreground"
                  }`}
                onClick={() => setSelectedTab("settings")}
              >
                <SettingsIcon className="h-4 w-4 2xl:h-6 2xl:w-6" />
                Settings
              </Link> */}

             
            </nav>
          </div>
          <div className="mt-auto p-4">
            <button className="h-12 w-full justify-center flex flex-row items-center gap-2" onClick={signOut}>
              <h1 className="text-red-400">Logout</h1>
              <LogOut className="h-4 w-4 decoration-red-400" color={"#E74545"} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <ScrollArea className="">
          {renderSelectedScreen()}
        </ScrollArea>
      </div>
    </div>
  );
}