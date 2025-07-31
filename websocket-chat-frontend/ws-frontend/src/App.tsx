import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  useUser,
} from '@clerk/clerk-react';

type Data = {
  user: {
    id: string;
    username: string;
    imageUrl?: string;
  };
  message: string;
  createdAt?: string;
};

function App() {
  const [messages, setMessages] = useState<Data[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<WebSocket | null>(null);

  const { user, isSignedIn } = useUser();

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/messages', {
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data: Data[] = await response.json();
      // Only tries to set message state if data exists
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    // Fetch initial messages from the backend
    fetchData();

    // Establish WebSocket connection
    const ws = new WebSocket('ws://localhost:8080/ws');
    socketRef.current = ws;
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (e) => {
      const data: Data = JSON.parse(e.data);

      setMessages((prev) => [...prev, data]);
    };

    // set dark mode
    const root = window.document.documentElement;
    root.classList.add('dark');
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignedIn || !user) {
      console.error('User is not signed in');
      return;
    }
    if (input.trim() === '') return;

    if (socketRef.current) {
      const data: Data = {
        user: {
          id: user.id,
          username: user.username || user.fullName || 'Anonymous',
          imageUrl: user.imageUrl,
        },
        message: input,
      };
      socketRef.current.send(JSON.stringify(data));
      setInput('');
    }
  }

  return (
    <>
      <main className='flex items-center justify-center min-h-screen'>
        <SignedOut>
          <Card className='w-full max-w-sm'>
            <CardHeader>
              <CardTitle>Websocket Chat Client</CardTitle>
              <CardDescription>
                A simple chat client using WebSockets.
              </CardDescription>
              <CardAction>
                <Button asChild className='cursor-pointer'>
                  <SignInButton />
                </Button>
              </CardAction>
            </CardHeader>
          </Card>
        </SignedOut>
        <SignedIn>
          <Card className='w-full max-w-sm'>
            <CardHeader>
              <CardTitle>Websocket Chat Client</CardTitle>
              <CardDescription>
                A simple chat client using WebSockets.
              </CardDescription>
              <CardAction>
                <Button asChild className='cursor-pointer'>
                  <SignOutButton />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4'>
                <form className='flex gap-2' onSubmit={(e) => handleSubmit(e)}>
                  <Input
                    id='message-text'
                    type='text'
                    placeholder='message'
                    required
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button type='submit' className='cursor-pointer'>
                    Send
                  </Button>
                </form>
                <ul className='flex flex-col gap-4'>
                  {messages &&
                    messages.map((message, index) => (
                      <li key={index}>
                        <Message
                          message={message.message}
                          username={message.user.username}
                          imageUrl={message.user.imageUrl || ''}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </SignedIn>
      </main>
    </>
  );

  function Message(props: {
    message: string;
    username: string;
    imageUrl: string;
  }) {
    const { message, username, imageUrl } = props;

    // Styles messages for other users by default
    let additionalClasses = 'justify-self-start bg-indigo-600 text-white';

    let messageFromCurrentUserFlag = false;

    // Compare the clerk username if it exists, compare the clerk full name otherwise
    if (isSignedIn && user) {
      if (!user.username) {
        messageFromCurrentUserFlag = username === user.fullName;
      } else {
        messageFromCurrentUserFlag = username === user.username;
      }
    }

    if (messageFromCurrentUserFlag) {
      // Styles messages sent from the current user
      additionalClasses =
        'justify-self-end bg-primary text-primary-foreground flex-row-reverse';
    }

    return (
      <div
        className={`px-4 py-2 rounded-md max-w-3/4 flex gap-4 items-center ${additionalClasses}`}
      >
        <Avatar className='self-start'>
          <AvatarImage
            src={imageUrl}
            alt={`@${user ? user.username : 'Anonymous'}`}
          />
          <AvatarFallback className='text-white'>
            {username.toUpperCase().charAt(0)}
          </AvatarFallback>
        </Avatar>
        <p>{message}</p>
      </div>
    );
  }
}

export default App;
