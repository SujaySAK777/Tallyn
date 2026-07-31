import { useMemo, useRef, useState } from 'react';
import { sendSupportMessage } from './services/chatbotApi';

const INITIAL_MESSAGES = [
  {
    id: 'welcome-1',
    role: 'assistant',
    text: 'Hi! I am Tallyn Support. Ask me about payment failures, transaction status, refunds, or account safety.'
  }
];

function buildUserMessage(text) {
  return {
    id: `user-${Date.now()}`,
    role: 'user',
    text
  };
}

function buildAssistantMessage(text) {
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    text
  };
}

function SupportChatbot({ isOpen: controlledOpen, onClose, hideFab = false }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const canSend = useMemo(() => {
    return !sending && draft.trim().length > 0;
  }, [sending, draft]);

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const openChat = () => {
    if (!isControlled) {
      setInternalOpen(true);
    }
    scrollToBottom();
  };

  const closeChat = () => {
    if (isControlled) {
      onClose?.();
      return;
    }

    setInternalOpen(false);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) {
      return;
    }

    const userMessage = buildUserMessage(text);
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setDraft('');
    setSending(true);
    setChatError('');
    scrollToBottom();

    try {
      const assistantReply = await sendSupportMessage(nextHistory);
      setMessages((prev) => [...prev, buildAssistantMessage(assistantReply)]);
    } catch (err) {
      setChatError(err.message || 'Unable to reach support assistant. Please try again.');
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        !hideFab && (
          <button className="chatbot-fab" onClick={openChat} aria-label="Open support chat">
            Support Chat
          </button>
        )
      )}

      {isOpen && (
        <section className="chatbot-panel" aria-label="Customer support chatbot">
          <header className="chatbot-header">
            <div>
              <strong>Tallyn Support</strong>
              <p>Online assistant</p>
            </div>
            <button className="chatbot-close" onClick={closeChat} aria-label="Close support chat">
              x
            </button>
          </header>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-bubble ${message.role === 'user' ? 'user' : 'assistant'}`}>
                {message.text}
              </div>
            ))}

            {sending && <div className="chatbot-bubble assistant typing">Typing...</div>}
            {chatError && <div className="chatbot-error">{chatError}</div>}
            <div ref={messagesEndRef} />
          </div>

          <footer className="chatbot-input-wrap">
            <textarea
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about payments, refunds, or transaction issues..."
            />
            <button disabled={!canSend} onClick={handleSend}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </footer>
        </section>
      )}
    </>
  );
}

export default SupportChatbot;
