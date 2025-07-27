import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';

function App() {
  const [messages, setMessages] = useState<string[]>(['test message']);
  const [input, setInput] = useState('');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // const ws = new WebSocket('ws://localhost:8080/ws');
    // socketRef.current = ws;
    // ws.onopen = () => {
    //   console.log('WebSocket connection established');
    // };
    // ws.onmessage = (e) => {
    //   console.log('Received message:', e.data);
    //   setMessages((prevMessages) => [...prevMessages, e.data]);
    // };

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

    setMessages((prev) => [...prev, input]);
    setInput('');
  }

  return (
    <>
      <main className='flex items-center justify-center min-h-screen'>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>Websocket Chat Client</CardTitle>
            <CardDescription>
              A simple chat client using WebSockets.
            </CardDescription>
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
                      author={index === 1 ? 'me' : 'other'}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Message(props: { message: string; author: string }) {
  const { message, author } = props;
  return (
    <div
      className={` px-4 py-2 rounded-md max-w-3/4 flex gap-4 items-center ${
        author === 'me'
          ? 'justify-self-end bg-primary text-primary-foreground flex-row-reverse'
          : 'justify-self-start bg-indigo-600 text-white'
      }`}
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

export default App;
