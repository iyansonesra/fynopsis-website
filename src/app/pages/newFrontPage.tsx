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
import demo from "../assets/demo.png"
import Stock from "@/components/Stock"
import logo from "../assets/fynopsis_noBG.png"
import backgrnd from "../assets/backgrnd.png"
import demo1 from "../assets/demo_page.png"
import graphZoom from '../assets/graphZoom.png'
import FadeInSlideUp from './../../components/animation/FadeInSlideUp';
import AIDisplay from '../assets/AIDisplay.png'
import UserSearchBubble from "@/components/UserSearchBubble"
import GPTResponse from "@/components/GPTResponse"
import { useRouter } from 'next/navigation';
import { Fade } from '@mui/material';
import leftGraphic from "../assets/leftGraphic.png"
import rightGraphic from "../assets/rightGraphic.png"
import CircleBurstAnimation from '@/components/animation/CircleAnimation';
import ChangeLogDemo from '@/components/animation/ChangeLogDemo';
import SquigglyLine from '@/components/animation/Squiggle';
import FlowingLine from '@/components/animation/Squiggle';

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
        console.log('Logout clicked');
    }

    function handleTabClick(index: number): void {
        setActiveTab(index);
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
        <div className="relative min-h-screen w-full flex flex-col font-cormorant overflow-x-hidden">
            {/* Background container with fade effect */}
            <div className="absolute inset-0 h-screen w-screen overflow-hidden">
                <div
                    className="w-full h-full bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: `url(${backgrnd.src})`,
                        width: '100vw',  // Force full viewport width
                        minWidth: '100vw'
                    }}
                />
                <div
                    className="absolute inset-0 w-screen"
                    style={{
                        background: 'linear-gradient(to bottom, transparent 0%, transparent 70%, white 100%)'
                    }}
                />
            </div>

            {/* Content container */}
            <div className="relative z-10 overflow-hidden">
                {/* Navigation bar */}
                <div className="fixed top-0 left-0 right-0 h-16 md:h-16 xl:h-20 bg-white dark:bg-slate-900 bg-opacity-98 w-full flex items-center justify-between 2xl:px-12 xl:px-8 md:px-4 sm:px-2 select-none font-poppins z-20">
                    <div className="flex flex-row items-center">
                        <img src={logo.src} alt="logo" className="md:h-10 md:w-auto w-[10%] h-auto" />
                        <h1 className="font-semibold text-lg sm:text-2xl md:text-2xl font-montserrat">Fynopsis</h1>
                    </div>

                    <div className="h-full flex items-center gap-4">
                        <a href="https://calendly.com/willzhang-utexas/fynopsis-demo" className="h-full flex items-center">
                            {/* <button className="inline-block px-6 py-2 rounded-lg font-base text-lg text-black max-sm:hidden md:flex text-center text-justify justify-center items-center font-montserrat">Book a Demo</button> */}
                        </a>
                        <button
                            className="inline-block font-light text-md sm:text-base md:text-lg font-montserrat px-6 py-1 rounded-lg text-black"
                            onClick={signIn}
                        >
                            Sign In
                        </button>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-row mt-20 w-full justify-center">
                    <FlowingLine amplitude={500} className=' absolute top-[20%] w-full' />
                    <FlowingLine amplitude={1000} className=' absolute top-[52%] w-full rotate-180' />
                    <FlowingLine amplitude={700} className=' absolute top-[78%] w-full rotate-140' />

                    <div className="inline-block max-w-[90%]  text-center px-20 rounded-2xl flex flex-col pt-12 ">
                        <h1 className="font-semibold font-bold text-6xl text-black">AI-powered data rooms for your team.</h1>
                        <h1 className="font-semibold font-light text-lg text-black font-montserrat mt-4">Search and organize thousands of documents in seconds, so you can focus on what matters.</h1>
                        <div className="flex flex-row items-center justify-center mt-8">
                            <input type="text" placeholder="Enter your email to get early access" className="w-[55%] border h-12 bg-tan-100 rounded-2xl px-4 text-slate-900 border-slate-400 text-xl outline-none" />
                            <button className="w-12 aspect-square bg-gray-700 text-white rounded-2xl ml-2 flex items-center justify-center">
                                <ArrowRight className="w-6 h-6" />
                            </button>
                        </div>


                        <FadeInSlideUp className="mt-28 relative">

                            <div
                                className="absolute inset-0 transform translate-y-[-4] blur-xl opacity-20"
                                style={{
                                    background: 'linear-gradient(145deg, #000000 0%, transparent 100%)',
                                    borderRadius: '1rem'
                                }}
                            />
                            <img
                                src={demo.src}
                                alt="Demo screenshot"
                                className="relative w-full rounded-3xl shadow-2xl"
                                style={{
                                    transform: 'rotateX(2deg)',
                                }}
                            />
                        </FadeInSlideUp>


                    </div>


                </div>

                <div className="flex flex-col w-full inline-block justify-center px-24 text-center mt-24">

                    <FadeInSlideUp>
                        <h1 className="font-montserrat text-2xl">About</h1>
                    </FadeInSlideUp>

                    <FadeInSlideUp>
                        <h1 className="font-semibold font-bold text-5xl text-black">Cut down deal timelines with intelligent document management.</h1>
                    </FadeInSlideUp>

                    <FadeInSlideUp>
                        <div className="flex flex-row justify-center mt-12 gap-12 mb-12">
                            <div className="flex-[3] max-w-[66%] flex flex-col  bg-white drop-shadow-xl rounded-3xl px-8 py-2">


                                <h3 className="font-bold text-3xl text-left mt-4">Understand and analyze thousands of documents in seconds</h3>
                                <p className="text-gray-600 mt-2 text-left font-montserrat mb-4">Instantly extracts key insights, identify patterns, and makes your data searchable.</p>
                                <img
                                    src={leftGraphic.src}
                                    alt="Demo screenshot"
                                    className="relative  w-[90%] h-auto self-center mb-4 rounded-3xl"
                                    style={{
                                        transform: '',
                                    }}
                                />

                            </div>
                            <div className="flex-[2] max-w-[33%] flex flex-col bg-white drop-shadow-xl rounded-3xl relative overflow-hidden">

                                <div className="px-8 py-2 z-40">
                                    <h3 className="font-bold text-3xl mt-4 text-left">Detailed breakdowns with AI</h3>
                                    <p className="text-gray-600 mt-2 text-left font-montserrat mb-2">Receive clear explanations of complex terms, identify key clauses, and understand important implications.</p>

                                </div>
                                <img
                                    src={rightGraphic.src}
                                    alt="Demo screenshot"
                                    className="absolute top-[20%] left-1/2 transform -translate-x-1/2 -translate-y- min-w-[120%] h-auto"
                                />
                                <div
                                    className="z-0 absolute inset-0 bg-gradient-to-b from-white to-transparent"
                                    style={{
                                        height: '50%',
                                    }}
                                />

                            </div>
                        </div>
                    </FadeInSlideUp>

                </div>
                <FadeInSlideUp>
                    <div className="mt-12 w-full flex px-24 gap-4">
                        <div className="flex-1 max-w-[50%]">
                            <h1 className="text-left text-5xl font-semibold mb-2">Smart Document Tagging & Instant Summaries</h1>
                            <h1 className="text-left text-xl font-montserrat">Every document is automatically categorized and condensed, turning complex files into clear, searchable insights in seconds</h1>

                        </div>
                        <div className="flex-1 max-w-[50%] flex justify-center items-center">
                            <CircleBurstAnimation />
                        </div>

                    </div>
                </FadeInSlideUp>

                <FadeInSlideUp>
                    <div className="mt-44 w-full flex px-24 gap-4">
                        <div className="flex-1 max-w-[50%]">
                            <ChangeLogDemo />

                        </div>
                        <div className="flex-1 flex-col max-w-[50%] flex justify-center items-center ">
                            <h1 className="text-right text-5xl font-semibold mb-2">Stay in the Loop with Smart Document Digests</h1>
                            <h1 className="text-right text-xl font-montserrat">Get instant, AI-powered summaries of document changes and updates across your data room, ensuring you never miss critical modifications.</h1>
                        </div>

                    </div>
                </FadeInSlideUp>



                <div className="flex justify-center flex-col items-center w-full mt-36 mb-24">
                    <FadeInSlideUp className='flex justify-center items-center flex-col'>
                        <h1 className="text-5xl font-semibold w-[60%] text-center mb-2">The future of document storage is here. Don't miss out.</h1>

                    </FadeInSlideUp>
                    <FadeInSlideUp className="flex justify-center items-center flex-col">
                        <h1 className="font-montserrat text-2xl">Get early access today</h1>
                    </FadeInSlideUp>

                    <FadeInSlideUp className='w-full flex items-center justify-center mt-4 '>
                        <div className="flex flex-row items-center justify-center mt-8 w-full">
                            <input type="text" placeholder="Enter your email to get early access" className="w-[55%] border h-12 bg-tan-100 rounded-2xl px-4 drop-shadow-[0_20px_20px_rgba(83,113,255,0.1)] text-slate-900 border-slate-400 text-xl outline-none" />
                            <button className="w-12 aspect-square bg-gray-700 text-white rounded-2xl ml-2 flex items-center justify-center">
                                <ArrowRight className="w-6 h-6" />
                            </button>
                        </div>
                    </FadeInSlideUp>
                </div>

                <div className="w-full inline-block flex justify-center items-center flex-col">
                    <div className="flex flex-row py-12 gap-64">
                        <div className="flex flex-row items-center">
                            <img src={logo.src} alt="logo" className="md:h-6 md:w-auto w-[10%] h-auto" />
                            <h1 className="font-semibold text-xl sm:text-2xl md:text-lg font-montserrat">Fynopsis</h1>
                        </div>

                        <div className="flex flex-row items-center gap-4">
                            <a href="https://www.linkedin.com/company/fynopsis-ai">
                                <Linkedin className="w-6 h-6 text-black dark:text-white" />
                            </a>
                        </div>
                    </div>


                    <Separator className="decoration-black w-[45%]" />
                    <div className="flex flex-row gap-6 py-4">

                        <h1>© 2024 Fynopsis All rights reserved.</h1>
                        <h1>Privacy Policy</h1>
                        <h1>Terms of Service</h1>
                    </div>


                </div>



            </div>
        </div>
    );
};

export default FrontPage;