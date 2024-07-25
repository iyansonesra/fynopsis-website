"use client";
import Link from "next/link"
import {
  Bell,
  CircleUser,
  LineChart,
  Menu,
  Home as Homer,
  Package,
  Package2,
  Search,
  ShoppingCart,
  Users,
  Settings as SettingsIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import logo from '../assets/fynopsis_noBG.png'
import { useState, useEffect } from "react"
import Dashboard from "./Dashboard";
import StockSearch from "./StockSearch";
import Settings from "./Settings";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth'
import { get } from 'aws-amplify/api';

export default function Home() {

  const [selectedTab, setSelectedTab] = useState("dashboard");
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const [authToken, setAuthToken] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");


  useEffect(() => {
       if (user) {
           handleFetchUserAttributes();
           handleFetchAuthSession();
           getTodo();
       }
  }, [user]);

  

  async function getTodo() {
    try {
      const restOperation = get({ 
        apiName: 'testAPI',
        path: '/getTest', 
        options: {
          headers: {
            Authorization: authToken
          }
        }
      });
  
      const response = await restOperation.response;
      console.log('GET call succeeded: ', response);
    } catch (e) {
      console.log('GET call failed: ', e);
    }
  }

  async function handleFetchUserAttributes() {
      try {
          const attributes = await fetchUserAttributes();
          setUserAttributes(attributes);
          console.log(attributes);
      } catch (error) {
          console.log(error);
      }
  }
  
   async function handleFetchAuthSession() {
       try {
           const token = (await fetchAuthSession()).tokens?.idToken?.toString();
           const access = (await fetchAuthSession()).tokens?.accessToken?.toString();
           if (!token || !access) {
               throw new Error("Token is null or undefined");
           }
           setAccessToken(access);
           setAuthToken(token);
           console.log("idToken: " + token);
           console.log("accessToken: " + access);
       } catch (error) {
           console.log(error);
       }
   }

  const renderSelectedScreen = () => {
    switch (selectedTab) {
      case "dashboard":
        return <Dashboard />
      case "stockSearch":
        return <StockSearch />
      case "settings":
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  

  return (
    <div className="grid max-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] xl:grid-cols-[250px_1fr] 2xl:grid-cols-[350px_1fr] overflow-hidden">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 xl:h-[60px] 2xl:h-[90px]">
            <Link href="/" className="flex items-center gap-2 font-semibold">
            <img src={logo.src} alt="Fynopsis Logo" className="h-8 w-8 2xl:h-14 2xl:w-14" />

              <span className="sm-text-lg lg:text-m 2xl:text-2xl">{userAttributes?.given_name} {userAttributes?.family_name}</span>
            </Link>
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8 2xl:[h-12 w-12]">
              <Bell className="h-4 w-4 2xl:h-6 w-6" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 lg:text-sm xl:text-sm 2xl:text-xl font-medium lg:px-4">
            <Link
              href="#"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                selectedTab === "dashboard" ? "bg-muted text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setSelectedTab("dashboard")}
            >
              <Homer className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="#"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                selectedTab === "stockSearch" ? "bg-muted text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setSelectedTab("stockSearch")}
            >
              <Search className="h-4 w-4" />
              Stock Search
            </Link>
            <Link
              href="#"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                selectedTab === "settings" ? "bg-muted text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setSelectedTab("settings")}
            >
              <SettingsIcon className="h-4 w-4" />
              Settings
            </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Card x-chunk="dashboard-02-chunk-0">
              <CardHeader className="p-2 pt-0 md:p-4">
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>
                  Unlock all features and get unlimited access to our support
                  team.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                <Button size="sm" className="w-full">
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 xl:h-[60px] 2xl:h-[90px]">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Package2 className="h-6 w-6" />
                  <span className="sr-only">Acme Inc</span>
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  {/* <Home className="h-5 w-5" /> */}
                  Dashboard
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl bg-muted px-3 py-2 text-foreground hover:text-foreground"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Orders
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    6
                  </Badge>
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Package className="h-5 w-5" />
                  Products
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-5 w-5" />
                  Customers
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <LineChart className="h-5 w-5" />
                  Analytics
                </Link>
              </nav>
              <div className="mt-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Upgrade to Pro</CardTitle>
                    <CardDescription>
                      Unlock all features and get unlimited access to our
                      support team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" className="w-full">
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <div className = "flex flex-col gap-0">
                    <h1 className = "font-semibold text-med mb-0 2xl:text-2xl">Hello, {userAttributes?.given_name}!</h1>
                    <h1 className = "text-sm -mt-1 text-gray-700 2xl:text-lg">Tuesday, July 6th, 2024</h1>
                </div>
              </div>
            </form>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5 2xl:h-8 2xl:w-8" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} style={{ cursor: 'pointer' }}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} style={{ cursor: 'pointer' }}>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} style={{ cursor: 'pointer' }}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="bg-slate-50 flex-grow p-0 overflow-auto">
        {renderSelectedScreen()}
        </main>
      </div>
    </div>
  );
}
