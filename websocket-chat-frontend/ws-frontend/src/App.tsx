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

function App() {
  const [messages, setMessages] = useState<string[]>(['test message']);
  const [input, setInput] = useState('');
  const socketRef = useRef<WebSocket | null>(null);

  const { user, isSignedIn } = useUser();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/ws');
    socketRef.current = ws;
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };
    ws.onmessage = (e) => {
      console.log('Received message:', e.data);
      setMessages((prevMessages) => [...prevMessages, e.data]);
    };

    // set dark mode
    const root = window.document.documentElement;
    root.classList.add('dark');
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() === '') return;

    if (socketRef.current) {
      socketRef.current.send(input);
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
                        message={message}
                        authorId={
                          index % 2 === 1 ? (user ? user.id : 'me') : 'other'
                        }
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
