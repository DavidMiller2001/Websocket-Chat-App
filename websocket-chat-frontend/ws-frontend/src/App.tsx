import { useState } from 'react';

function App() {
  const [messages, setMessages] = useState<string[]>(['test message']);
  const ws = new WebSocket('ws://localhost:8080/ws');
  ws.onopen = () => {
    console.log('WebSocket connection established');
  };
  ws.onmessage = (event) => {
    console.log('Message from server:', event.data);
    setMessages((prevMessages) => [...prevMessages, event.data]);
  };

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = event.currentTarget.querySelector(
      'input'
    ) as HTMLInputElement;
    if (input.value.trim() !== '') {
      ws.send(input.value);
      input.value = '';
    }
  }

  return (
    <>
      <div className='h-screen flex flex-col items-center justify-center'>
        <form onSubmit={(e) => handleSubmit(e)}>
          <input type='text' className='text-white bg-gray-700 px-4 py-2' />
          <button
            type='submit'
            className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
          >
            Send
          </button>
        </form>
        {messages.map((message, index) => (
          <span key={index}>{message}</span>
        ))}
      </div>
    </>
  );
}

export default App;
