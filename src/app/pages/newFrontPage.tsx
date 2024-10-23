
import { Library, Users, TrendingUp, LucideIcon, LogOut, ArrowRight } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import NewsListing from "@/components/NewsListing"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import RecentNews from "@/components/RecentNews"
import RecentSearch from "@/components/RecentSearch"
import { Instagram, Linkedin, MoveRight, Search, Sparkle, Star, User } from "lucide-react"
import PinnedCompany from "@/components/PinnedCompanies"
import React, { useRef, useEffect, useState } from 'react';
import Stock from "@/components/Stock"
import logo from "../assets/fynopsis_noBG.png"
import demo1 from "../assets/demo_page.png"
import graphZoom from '../assets/graphZoom.png'
import FadeInSlideUp from './../../components/animation/FadeInSlideUp';
import AIDisplay from '../assets/AIDisplay.png'
import UserSearchBubble from "@/components/UserSearchBubble"
import GPTResponse from "@/components/GPTResponse"
import { useRouter } from 'next/navigation';

interface Tab {
    icon: LucideIcon;
    label: string;
}

interface IndicatorStyle {
    top: string;
    height: string;
}

const FrontPage: React.FC = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

    const tabs: Tab[] = [
        { icon: Library, label: 'Library' },
        { icon: Users, label: 'People' },
        { icon: TrendingUp, label: 'Trending' }
    ];

    function signIn(): void {
        router.push('/signin');
    }

    function handleLogout(): void {
        // Add your logout logic here
        console.log('Logout clicked');
    }

    function handleTabClick(index: number): void {
        setActiveTab(index);
        // Add your tab functionality here
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

    return (
        <div className="relative h-screen w-full flex flex-col font-cormorant overflow-auto" >
            <div className="fixed top-0 left-0 right-0 h-16 md:h-16 xl:h-20 bg-white dark:bg-slate-900 bg-opacity-92 w-full flex items-center justify-between 2xl:px-12 xl:px-8 md:px-4 sm:px-2  select-none font-poppins">
                <div className="flex flex-row items-center">
                    <img src={logo.src} alt="logo" className="md:h-10 md:w-auto w-[10%] h-auto" />
                    <h1 className="font-semibold text-lg sm:text-2xl md:text-2xl font-montserrat">Fynopsis</h1>
                </div>

                <div className="h-full flex items-center gap-4">
                    <a href="https://calendly.com/willzhang-utexas/fynopsis-demo" className="h-full flex items-center">
                        <button className="inline-block px-6 py-2 rounded-lg font-base text-lg text-black max-sm:hidden md:flex text-center text-justify justify-center items-center font-montserrat">Book a Demo</button>
                    </a>
                    <button
                        className="inline-block font-light text-md sm:text-base md:text-lg font-montserrat bg-black px-6 py-1 rounded-lg text-white"
                        onClick={signIn}
                    >
                        Sign In
                    </button>
                </div>


            </div>

            <div className="flex flex-row mt-20  w-full h-[100vh] min-h-[100vh] border-t justify-center">
                <div className="flex-1 max-w-[50%] text-left px-20 rounded-2xl flex  flex-col pt-12">
                    <h1 className="font-semibold font-bold text-6xl text-black ">AI-enhanced virual data rooms for your enterprise.</h1>

                    <h1 className="font-semibold font-light text-lg text-black font-montserrat mt-4">Search through thousands of documents in seconds. We index everything so you don't have to</h1>
                    <div className="flex flex-row items-center justify-center mt-8">
                        <input type="text" placeholder="Enter your email" className="w-[90%] border h-12 rounded-lg  px-4 text-slate-900 border-slate-400 text-xl outline-none" />
                        <button className="w-[10%] h-12 bg-gray-700 text-white rounded-lg ml-2 flex items-center justify-center">
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>


                </div>

                <div className="flex-1 max-w-[50%] ">

                </div>
            </div>

            <div className="flex flex-row  w-full inline-block justify-center px-24 text-center">
                <h1 className="font-semibold font-bold text-6xl text-black ">AI-enhanced virual data rooms for your enterprise.</h1>
            </div>


        </div>
    );
};

export default FrontPage;