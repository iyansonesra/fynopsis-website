"use client";
import Dashboard from "./pages/Dashboard";
import StockSearch from "./pages/StockSearch";
import Settings from "./pages/Settings";
import { Authenticator } from "../components/Authenticator";
import  Home  from "./pages/DataroomPage";
import FrontPage from "./pages/newFrontPage";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { registerLicense } from '@syncfusion/ej2-base';



registerLicense('Ngo9BigBOggjHTQxAR8/V1NMaF5cXmBCf0x3R3xbf1x1ZFFMZVlbR3BPIiBoS35Rc0ViWXpfdnFQRWZaUUR1');

export default function page() {

  return (
    <FrontPage/>
  );
}
