import { Library, Users, TrendingUp, LucideIcon, LogOut, ArrowRight, ChevronRight } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { Fade } from '@mui/material';
import darkDemo from '../assets/dark_demo.png';
import AnimatedGridPattern from '@/components/ui/animated-grid-pattern';
import { cn } from '@/lib/utils';
import AnimatedGradientText from '@/components/ui/animated-gradient-text';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import { MagicCard } from '@/components/ui/magic-card';
import { NeonGradientCard } from '@/components/ui/neon-gradient-card';
import { AnimatedBeamDemo } from '@/components/ui/beamDemo';
import { BentoGridSecondDemo } from '@/components/ui/bentoDemo';
import GradientBox from '@/components/ui/gradient-card';
import { Database, ChevronsUp } from 'lucide-react';
import { Timeline } from '@/components/ui/timeline';
import { TimelineDemo } from '@/components/ui/timeline-demo';


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

    const [color, setColor] = useState("#ffffff");


    return (
        <div className="relative min-h-screen w-full">
            {/* Background with grid and mask */}
            <div className="absolute inset-0">
                <div className="w-full h-full bg-black" />
                {/* <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" /> */}
            </div>

            {/* Content container */}
            <div className="relative z-10">
                {/* <AuroraBackground>
                    <motion.div
                        initial={{ opacity: 0.0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: 0.3,
                            duration: 0.8,
                            ease: "easeInOut",
                        }}
                        className="absolute top-0 flex flex-col gap-4 items-center justify-center px-4"
                        color='black'
                    >

                    </motion.div>
                    <div className="opacity=100"></div>

                </AuroraBackground> */}

                <AnimatedGridPattern
                    numSquares={30}
                    maxOpacity={0.1}
                    duration={3}
                    repeatDelay={1}
                    className={cn(
                        "[mask-image:radial-gradient(ellipse_at_top,white,transparent)]",
                        "absolute top-0 flex flex-col gap-4 z-0 opacity-40",
                    )}
                />

                <div className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm ">
                    <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">

                        <div className="flex items-center gap-2">
                            <img
                                src={logo.src}
                                alt="Fynopsis Logo"
                                className="h-8 w-auto"
                            />
                            <span className="font-semibold text-xl text-white font-montserrat">Fynopsis</span>
                        </div>

                        {/* Right side - Auth buttons */}
                        <div className="flex items-center gap-4">
                            <button
                                className="px-4 py-2 text-sm font-medium text-white hover:text-blue-200 transition-colors"
                                onClick={() => router.push('/login')}
                            >
                                Log in
                            </button>
                            <button
                                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
                                onClick={() => router.push('/signup')}
                            >
                                Sign up
                            </button>
                        </div>
                    </div>
                </div>
                <div className="w-full min-h-screen flex flex-col gap-4">
                    <div className="mt-28 flex items-center flex-col justify-center mx-auto gap-4">
                        <AnimatedGradientText>
                            <span
                                className={cn(
                                    `inline bg-gradient-to-r from-[#38B6FF] via-[#5271FF] to-[#004AAD] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
                                )}
                            >
                                Introducing Fynopsis
                            </span>
                            <ChevronRight className="ml-1 size-3 transition-transform duration-300 text-white ease-in-out group-hover:translate-x-0.5" />
                        </AnimatedGradientText>


                        <div className="flex flex-col gap-2 items-center justify-center">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl text-center max-w-[70%] md:max-w-[80%] lg:max-w-[100%]  font-cormorant font-semibold text-white">
                                AI-powered data rooms for your team.
                            </h1>
                            <h1 className="lext-lg md:text-lg lg:text-xl text-center max-w-[70%]  font-thin text-white">
                                Search and organize thousands of documents in seconds, so you can focus on what matters.
                            </h1>
                            <div className="flex flex-col lg:flex-row justify-center items-center lg:gap-0 gap-4 text-center w-full mt-4">
                                <HoverBorderGradient
                                    containerClassName="rounded-full"
                                    as="button"
                                    className=" text-black dark:text-white flex items-center"
                                >
                                    <input type="text" placeholder="Enter your email" className="w-72 md:w-80 lg:w-96 py-2 px-4 outline-none rounded-full bg-transparent border-white border-opacity-50 border text-white placeholder-white placeholder-opacity-50 z-20" />

                                </HoverBorderGradient>
                                <button className="bg-gradient-to-r from-[#1e6aa3] via-[#3148b3] to-[#003580] w-48 lg:w-48 text-white rounded-full py-3 px-6 ml-2 hover:opacity-90 transition-all">Get Started</button>
                            </div>
                        </div>


                        <FadeInSlideUp className="mt-16 relative max-w-[80%]    mx-auto">
                            <NeonGradientCard className="items-center justify-center text-center">
                                <img
                                    src={darkDemo.src}
                                    alt="Demo screenshot"
                                    className="relative w-full rounded-3xl shadow-2xl"
                                    style={{
                                        transform: 'rotateX(2deg)',
                                    }}
                                />
                            </NeonGradientCard>
                            {/* <div
                                className="absolute inset-0 transform translate-y-[-4] blur-xl opacity-20"
                                style={{
                                    background: 'linear-gradient(145deg, #000000 0%, transparent 100%)',
                                    borderRadius: '1rem'
                                }}
                            /> */}

                        </FadeInSlideUp>
                    </div>

                    <div className="mt-12 flex flex-col items-center justify-center w-full  gap-4 z-40">
                        {/* <FadeInSlideUp className="mt-16 max-w-[80%]  flex items-center justify-center mx-auto">
                            <h1 className="text-5xl text-center font-semibold font-cormorant text-white">
                                Your complete solution to cluttered data.
                            </h1>

                        </FadeInSlideUp> */}

                        <div
                            className={
                                "mt-8 flex  w-[80%] flex-col gap-4 lg:flex-row  z-40"
                            }
                        >

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                <FadeInSlideUp>
                                    <div className="relative rounded-lg shadow-md h-64  bg-transparent relative overflow-hidden flex flex-col">
                                        <div className="absolute inset-0 [mask-image:radial-gradient(100px,transparent_20%,green)]" />

                                        <h1 className="text-6xl text-left font-semibold font-cormorant text-white">
                                            Do more with more of your{' '}
                                            <span className="bg-gradient-to-r from-[#38B6FF] to-[#004AAD] bg-clip-text text-transparent">
                                                Data.
                                            </span>
                                        </h1>
                                    </div>
                                </FadeInSlideUp>
                                <FadeInSlideUp>
                                    <div className=" lg:flex hidden p-4 rounded-lg shadow-md h-64  bg-transparent relative overflow-hidden">
                                    </div>
                                </FadeInSlideUp>
                                <FadeInSlideUp>
                                    <GradientBox hasGradient={true} title='Easy Data Decisions' icon={<Database />} />

                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <GradientBox hasGradient={false} title='Boost Speed & Efficiency' icon={<ChevronsUp />} />
                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <GradientBox hasGradient={true} title='Effortless Personalization' />

                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <GradientBox hasGradient={false} title='Secure & Reliable' />

                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <div className="lg:flex hidden border border-white border-opacity-20 p-4 rounded-lg shadow-md h-64 bg-transparent relative overflow-hidden">
                                    </div>
                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <GradientBox hasGradient={false} title='Future Proof' />

                                </FadeInSlideUp>

                                <FadeInSlideUp>
                                    <div className="lg:flex hidden border border-white border-opacity-20 p-4 rounded-lg shadow-md h-64 bg-transparent relative overflow-hidden">
                                    </div>
                                </FadeInSlideUp>











                            </div>
                        </div>



                    </div>

                </div>
                <div className='w-full flex items-center justify-center bg-green-100'>
                    <TimelineDemo />


                </div>

            </div>
        </div>


    );
};

export default FrontPage;