"use client";
import Dashboard from "./pages/Dashboard";
import StockSearch from "./pages/StockSearch";
import Settings from "./pages/Settings";
import { Authenticator } from "../components/Authenticator";
import  Home  from "./pages/DataroomPage";
import FrontPage from "./pages/FrontPage";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";



export default function page() {

  return (
    <FrontPage/>
  );
}
