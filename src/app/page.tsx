"use client";
import Dashboard from "./pages/Dashboard";
// import StockSearch from "./pages/StockSearch";
import Settings from "./pages/Settings";
import  Home  from "./pages/DataroomPage";
import FrontPage from "./pages/newFrontPage";
import { Amplify } from "aws-amplify";
import { Authenticator as AmplifyAuthenticator } from "@aws-amplify/ui-react";
import { registerLicense } from '@syncfusion/ej2-base';



registerLicense('ORg4AjUWIQA/Gnt2XVhhQlJHfV5AQmBIYVp/TGpJfl96cVxMZVVBJAtUQF1hTH5SdkNiW3xecHFdTmhf');

export default function page() {

  return (
    <FrontPage/>
  );
}
