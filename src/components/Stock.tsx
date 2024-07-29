import React from 'react';
import RecentSearch from './RecentSearch';
import { ScrollArea } from './ui/scroll-area';
import UserSearchBubble from './UserSearchBubble';
import GPTResponse from './GPTResponse';
import { Send, User } from 'lucide-react';
import RelevantLink from './RelevantLinks';
import CustomGraph from './StockGraph';
import generateRandomStockData from './GenerateRandomStockData';
import { useState, useRef, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { post } from 'aws-amplify/api';


interface StockProps {
  image: string;
  stockName: string;
  stockDescription: string;
  imageType: 'circular' | 'rectangular';
}
type Message = {
  type: 'user' | 'bot';
  content: string;
};

interface ResponseBody {
  message: string;
  // add other properties as needed
}

interface ApiResponse {
  body: {
    message: string;
    input: {
      query: string;
    };
  }
}
const Stock: React.FC<StockProps> = ({
  image,
  stockName,
  stockDescription,
  imageType,
}) => {
  const { data, importantMarkers } = generateRandomStockData();

  const [messages, setMessages] = useState<Message[]>([]);

  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // const { user, signOut } = useAuthenticator((context) => [context.user]);


  async function handleFetchAccess() {
    try {
      const access = (await fetchAuthSession()).tokens?.accessToken?.toString();
      if (!access) {
        throw new Error("Token is null or undefined");
      }
      return access;
    } catch (error) {
      console.log(error);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();

    // Clear the input
    setInputValue('');

    // Add user message to the chat
    setMessages((prevMessages) => [
      ...prevMessages,
      { type: 'user', content: userMessage },
    ]);

    const accessTokens = await handleFetchAccess();
    // console.log(accessTokens + "testing fetch");
    console.log("requesting information");
    if (accessTokens) {
      try {
        const restOperation = post({
          apiName: 'testAPI',
          path: '/postAgent',

          options: {
            headers: {
              Authorization: accessTokens
            },
            body: {
              query: userMessage
            }
          }
        });

        const { body } = await restOperation.response;
        // const { body } = await restOperation.response;
        const responseText = await body.text(); // Get the response as text
        const responseMain: ApiResponse = JSON.parse(responseText); // Parse the JSON manually
        console.log(responseText);
        console.log(responseMain);
        // const responseBody = response.body;
        // const botMessage = (responseBody as any).message;
        // console.log(response);

        console.log('POST call succeeded');
        if (responseMain) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { type: 'bot', content: responseMain.body.message },
          ]);
        }
        else {
          setMessages((prevMessages) => [
            ...prevMessages,
            { type: 'bot', content: "Failed. Please Refresh." },
          ]);
        }
      } catch (e) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { type: 'bot', content: "Failed. Please Refresh." },
        ]);
        console.log('POST call failed: ', e);
      }
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: 'bot', content: "Failed. Please Refresh." },
      ]);
      console.log('Failed to fetch access token.');
    }


    // Add bot response to the chat




    // try {
    //   const response = await fetch('YOUR_API_ENDPOINT', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': 'Bearer YOUR_AUTH_TOKEN',
    //     },
    //     body: JSON.stringify({ message: userMessage }),
    //   });

    //   if (response.ok) {
    //     const data = await response.json();
    //     const botMessage = data.message; // Adjust based on your API response structure

    //     // Add bot response to the chat
    //     setMessages((prevMessages) => [
    //       ...prevMessages,
    //       { type: 'bot', content: botMessage },
    //     ]);
    //   } else {
    //     console.error('Error:', response.statusText);
    //   }
    // } catch (error) {
    //   console.error('Error:', error);
    // }
  };
  // useEffect(() => {
  //   if (scrollRef.current) {
  //     scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [messages]);

  return (
    <div className='w-full h-screen flex flex-col 2xl:p-4 font-montserrat'>
      <div className='  flex-row hidden lg:flex lg:flex-1 h-[70px] lg:h-[10%] items-center pl-8 gap-2 2xl:gap-3'>
        <h1 className="flex flex-col font-semibold text-2xl 2xl:text-4xl">{stockName} </h1>
        <h1 className="text-2xl font-light 2xl:text-4xl">|</h1>
        <h1 className="text-2xl font-light 2xl:text-4xl">Apple Inc.</h1>
        <div className="rounded-full border border-1 border-black inline-block px-2 2xl:px-4 text-sm 2xl:text-lg ml-1 mt-2">PUBLIC</div>
      </div>

      <div className='hidden lg:flex lg:flex-[10] lg:flex-row flex-col h-[600px] lg:h-[80%] w-full px-4 2xl:gap-8 xl:gap-6 gap-4'>
        <div className="flex-[3] flex flex-col w-[100%] lg:w-[60%] h-[90%] xl:h-[89%] 2xl:h-[88%] 2xl:gap-6 xl:gap-4 gap-2">
          <div className="flex flex-[2] h-[40%] rounded-3xl ">
            <CustomGraph
              data={data}
              height="100%"
              width="100%"
              gradientColor="#4BC7FD"
              importantMarkers={importantMarkers}
              hideXaxis={true}
              hideYaxis={true}
            />
          </div>

          <div className="flex relative flex-[3] h-[50%] border-2 rounded-3xl py-2 2xl:py-4 justify-center gap-4">
            <ScrollArea className="h-[calc(100%-40px-0.5rem)] 2xl:h-[calc(100%-60px-0.5rem)] overflow-auto w-full px-4">
              <div className="flex flex-col gap-4 2xl:gap-6">
                <GPTResponse userSearch="Hi. Do you have any further questions?" />
                {/* <UserSearchBubble userSearch="When did Apple begin selling the iPhone 7? What was the overall public response?" /> */}
                {messages.map((message, index) => (
                  message.type === 'user' ? (
                    <UserSearchBubble key={index} userSearch={message.content} />
                  ) : (
                    <GPTResponse key={index} userSearch={message.content} />
                  )
                ))}
                <div ref={scrollRef}></div>
              </div>
            </ScrollArea>
            <input className="inputBar w-[calc(100%-1rem)] absolute border-2 bottom-2 2xl:bottom-4 h-[40px] 2xl:h-[60px] border rounded-full pl-4 bg-transparent text-base"
              placeholder="Message Fynopsis"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
            ></input>
            <Send className="absolute right-6 bottom-4 2xl:right-8 2xl:bottom-6 h-6 w-6 2xl:h-10 2xl:w-10 text-slate-500"
              onClick={handleSend}></Send>
            <div className="absolute rounded-3xl bottom-[calc(40px+.5rem)] 2xl:bottom-[calc(60px+1rem)] left-0 right-0  h-8 2xl:h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>

          </div>
        </div>

        <div className="flex-[2] relative hidden lg:flex w-[40%] h-[90%] xl:h-[89%] 2xl:h-[88%]">
          <div className="h-full w-full rounded-3xl border-2 flex flex-col">
            <div className="flex-none w-full border-b-2 py-2 px-4 2xl:py-4 2xl:px-8">
              <h1 className="font-normal italic 2xl:text-2xl">April 5, 2019</h1>
              <h1 className="font-bold text-3xl 2xl:text-5xl">45.29 USD</h1>
            </div>
            <div className="flex-none w-full px-4 2xl:px-8 py-2 mb-2">
              <h1 className='font-medium italic 2xl:text-2xl'>What Happened?</h1>
              <h1 className="font-normal 2xl:text-lg">Lots of text lots of text Lots of text lots of text Lots of text lots of text Lots of text lots of text Lots of text lots of text Lots of text lots of text.</h1>
            </div>
            <div className="flex-grow flex flex-col w-full px-4 2xl:px-8 py-2 overflow-y-auto">
              <h1 className="flex-none font-medium italic 2xl:text-2xl mb-2">Relevant Links</h1>
              <ScrollArea className='w-full flex-grow'>
                <div className="flex flex-col gap-4 2xl:gap-6">
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                  <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />

                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="absolute rounded-3xl bottom-2 left-0 right-0  h-8 2xl:h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>

        </div>
      </div>


      <div className="smallScreenVersion lg:hidden flex flex-col w-full h-screen overflow-y-auto">

        <div className="w-full min-h-[70px] flex flex-row items-center pl-8 gap-2">
          <h1 className="flex flex-col font-semibold text-2xl 2xl:text-4xl">{stockName} </h1>
          <h1 className="text-2xl font-light 2xl:text-4xl">|</h1>
          <h1 className="text-2xl font-light 2xl:text-4xl">Apple Inc.</h1>
          <div className="rounded-full border border-1 border-black inline-block px-2 2xl:px-4 text-sm 2xl:text-lg ml-1 mt-2">PUBLIC</div>
        </div>

        <div className="w-full min-h-[200px] px-8 mb-4">
          <CustomGraph
            data={data}
            height="100%"
            width="100%"
            gradientColor="#4BC7FD"
            importantMarkers={importantMarkers}
            hideXaxis={true}
            hideYaxis={true}
          />
        </div>

        <div className="w-full min-h-[400px] flex items-start rounded-3xl px-8">
          <div className="flex-[2] relative flex lg:hidden h-full">
            <div className="h-full w-full rounded-3xl border-2 flex flex-col">
              <div className="flex-none w-full border-b-2 py-2 px-4 2xl:py-4 2xl:px-8">
                <h1 className="font-normal italic 2xl:text-2xl">April 5, 2019</h1>
                <h1 className="font-bold text-3xl 2xl:text-5xl">45.29 USD</h1>
              </div>
              <div className="flex-none w-full px-4 2xl:px-8 py-2 mb-2">
                <h1 className='font-medium italic 2xl:text-2xl'>What Happened?</h1>
                <h1 className="font-normal 2xl:text-lg">Lots of text lots os of text Lots of text lots of text Lots of text lots of text.</h1>
              </div>
              <div className="flex-grow flex flex-col w-full px-4 2xl:px-8 py-2 overflow-y-auto">
                <h1 className="flex-none font-medium italic 2xl:text-2xl mb-2">Relevant Links</h1>
                <ScrollArea className='w-full flex-grow'>
                  <div className="flex flex-col gap-4 2xl:gap-6">
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />
                    <RelevantLink image='' stockName='Apple Inc.' stockDescription='Apple Inc. is an American multinational technology company that specializes in consumer electronics, computer software, and online services.' width='100%' imageType='rectangular' />

                  </div>
                </ScrollArea>
              </div>
            </div>
            <div className="absolute rounded-3xl bottom-2 left-0 right-0  h-8 2xl:h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>

          </div>
        </div>
        <div className="w-full min-h-[400px] px-8 py-4">
          <div className="flex relative flex-[3] h-[85%] border-2 rounded-3xl py-2 2xl:py-4 justify-center gap-4">
            <ScrollArea className="h-[calc(100%-40px-0.5rem)] 2xl:h-[calc(100%-60px-0.5rem)] overflow-auto w-full px-4">
              <div className="flex flex-col gap-4 2xl:gap-6">
                <GPTResponse userSearch="Hi. Do you have any further questions?" />
                {/* <UserSearchBubble userSearch="When did Apple begin selling the iPhone 7? What was the overall public response?" /> */}
                {messages.map((message, index) => (
                  message.type === 'user' ? (
                    <UserSearchBubble key={index} userSearch={message.content} />
                  ) : (
                    <GPTResponse key={index} userSearch={message.content} />
                  )
                ))}
                <div ref={scrollRef}></div>
              </div>
            </ScrollArea>
            <input className="inputBar w-[calc(100%-1rem)] absolute border-2 bottom-2 2xl:bottom-4 h-[40px] 2xl:h-[60px] border rounded-full pl-4 bg-transparent text-base"
              placeholder="Message Fynopsis"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
            ></input>
            <Send className="absolute right-6 bottom-4 2xl:right-8 2xl:bottom-6 h-6 w-6 2xl:h-10 2xl:w-10 text-slate-500"
              onClick={handleSend}></Send>
            <div className="absolute rounded-3xl bottom-[calc(40px+.5rem)] 2xl:bottom-[calc(60px+1rem)] left-0 right-0  h-8 2xl:h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>

          </div>
        </div>
       
      </div>



    </div>
  );
};

export default Stock;