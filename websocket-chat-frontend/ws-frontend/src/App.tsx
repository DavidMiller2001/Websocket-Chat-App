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
  };
  message: string;
  createdAt?: string; // Optional field for createdAt
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
      setMessages(data);
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
    ws.onmessage = () => {
      fetchData();
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
          username: user.username || 'Anonymous',
        },
        message: input,
      };
      socketRef.current.send(JSON.stringify(data));
      setInput('');
    }

    // Pushing input directly to messages for demo purposes
    // setMessages((prevMessages) => [...prevMessages, input]);
    // setInput('');
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
                  {messages.map((message, index) => (
                    <li key={index}>
                      <Message
                        message={message.message}
                        authorId={message.user.id || 'Anonymous'}
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

  function Message(props: { message: string; authorId: string }) {
    const { message, authorId } = props;

    let additionalClasses =
      'justify-self-end bg-primary text-primary-foreground flex-row-reverse';

    if (isSignedIn && user) {
      if (authorId === user.id) {
        additionalClasses = 'justify-self-start bg-indigo-600 text-white';
      }
    }

    return (
      <div
        className={`px-4 py-2 rounded-md max-w-3/4 flex gap-4 items-center ${additionalClasses}`}
      >
        <Avatar className='self-start'>
          <AvatarImage
            src='https://github.com/davidmiller2001.png'
            alt='@davidmiller2001'
          />
          <AvatarFallback>DM</AvatarFallback>
        </Avatar>
        <p>{message}</p>
      </div>
    );
  }
}

export default App;
