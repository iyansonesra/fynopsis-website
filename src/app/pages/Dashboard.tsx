"use client";
import Link from "next/link"
import {
    Bell,
    Search,
    Settings as SettingsIcon,
    Factory,
    Plus,
    Fullscreen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from '../assets/fynopsis_noBG.png'
import { useState, useEffect } from "react"
import StockSearch from "./StockSearch";
import Settings from "./Settings";
import IndustryPage from "./IndustryPage";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Sun, Moon } from "lucide-react";
import { fetchAuthSession, fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { CircularProgress } from "@mui/material";
import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Library, Users, TrendingUp, LucideIcon, LogOut, DoorOpen } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AdvancedSearch from "@/components/Analytics";
import Files from "@/components/Files";
import People from "@/components/People";
import { Separator } from "@radix-ui/react-separator";
import DataRoomCard from "@/components/DataRoomCard";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { post } from 'aws-amplify/api';
import { get } from 'aws-amplify/api';
import { aws4Interceptor } from 'aws4-axios';
import axios from 'axios';
// import { API } from 'aws-amplify';

export default function GeneralDashboard() {
    const [selectedTab, setSelectedTab] = useState("library");
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
    const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

    const tabs: Tab[] = [
        { icon: DoorOpen, label: 'Rooms' },
    ];

    function signIn(): void {
        router.push('/signin');
    }

    const [dataRooms, setDataRooms] = useState([
        // { uuid: 1, title: 'Apple M&A', created: 'Sept. 27, 2024 5:36 PM' },
        // { uuid: 2, title: 'Project X', created: 'Sept. 26, 2024 2:15 PM' },
        // { uuid: 3, title: 'Quarterly Review', created: 'Sept. 25, 2024 10:00 AM' },
      ]);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newDataroomName, setNewDataroomName] = useState('');


    const handleDataRoomClick = (name: any) => {
        // console.log(uuid);
        router.push(`/dataroom?id=${name}`);
    };

    const handleFetchDataRooms = async () => {
        try {
            const { credentials } = await fetchAuthSession();
            if (!credentials) {
                throw new Error('User is not authenticated');
            }
    
            const restOperation = get({
                apiName: 'VdrBucketAPI',
                path: '/list_buckets',
                options: {
                    withCredentials: true
                }
            });
    
            const { body } = await restOperation.response;
            const responseText = await body.text();
            // console.log(responseText);
    
            // Parse the response text to JSON
            const buckets = JSON.parse(responseText);
    
            // Map the buckets to the dataRooms format
            
            const newDataRooms = buckets.map(bucket => ({
                id: bucket.uuid,
                title: bucket.bucketName.replace(`-${bucket.userId}`, ''), // Remove user ID from bucket name
                lastOpened: new Date(bucket.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                }),
                createdAt: bucket.createdAt,
                userId: bucket.userId,
                fullBucketName: bucket.bucketName
            }));
    
            // Update the dataRooms state
            setDataRooms(newDataRooms);
    
        } catch (error) {
            console.error('Error fetching buckets:', error);
        }
    }

    const handleAddDataroom = async () => {
        try {
            const newDataroomNameStored = newDataroomName.trim();
            // console.log(newDataroomNameStored);
            const { credentials } = await fetchAuthSession();
            if (!credentials) {
                throw new Error('User is not authenticated');
            }
            // console.log(credentials);
            const restOperation = post({
              apiName: 'VdrBucketAPI',
              path: '/create_bucket',
              options: {
                body: {
                    bucketName: newDataroomNameStored
                },
                withCredentials: true
              }
            });

            // console.log(restOperation);
      
            const { body } = await restOperation.response;
            const responseText = await body.text();
            console.log(responseText); // fix this responseText to return the bucket details

            const newDataroom = {
                id: dataRooms.length + 1, 
                title: newDataroomNameStored,
                lastOpened: new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                })
            };

            setDataRooms([...dataRooms, newDataroom]);
            setIsAddDialogOpen(false);
            setNewDataroomName('');
      
        } catch (error) {
            console.error('Error sending new bucket creation');
        }
    };




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
            handleFetchDataRooms();
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


                <div className="flex-1 overflow-hidden flex">
                    <div className="flex-[2] px-4 py-4">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="font-semibold text-xl">Your Datarooms</h1>
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Add Dataroom
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dataRooms.map((room) => (
                                <DataRoomCard
                                    key={room.id}
                                    title={room.title}
                                    createdAt={room.createdAt}
                                    onClick={() => handleDataRoomClick(room.fullBucketName)}
                                />
                            ))}
                        </div>

                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Dataroom</DialogTitle>
                                </DialogHeader>
                                <Input
                                    value={newDataroomName}
                                    onChange={(e) => setNewDataroomName(e.target.value)}
                                    placeholder="Enter dataroom name"
                                />
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddDataroom}>Create</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex-1 px-4 py-4">
                        <h1 className="font-semibold text-xl">Recent Activity</h1>
                       
                    </div>
                </div>
            </div > :
            <div className="grid h-screen place-items-center">
                <CircularProgress value={0.5} />
            </div>
    );
}

