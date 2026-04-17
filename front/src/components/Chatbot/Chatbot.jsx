import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Chatbot.css';
import { askChatbot, listChatbotPrompts } from '../../api/chatbot';
import { findLocalMatch } from '../../services/chatbotMatcher';
import { getStoredToken } from '../../pages/Login';

const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState('');
  const messagesEndRef = useRef(null);
  const token = getStoredToken();

  // Initialize with welcome message and fetch prompts
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ 
        id: 'welcome', 
        type: 'bot', 
        text: t('chatbot.welcome'),
        suggestions: true 
      }]);
      
      listChatbotPrompts(token).then(data => {
        setPrompts(data.prompts || []);
      }).catch(err => console.error('Chatbot: Failed to load prompts', err));
    }
  }, [isOpen, messages.length, token, t]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (text = inputValue) => {
    const messageText = typeof text === 'string' ? text : inputValue;
    if (!messageText.trim() || isTyping) return;

    const userMessage = { id: Date.now(), type: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // 1. Local fuzzy match check (for UI status)
    const localPromptId = findLocalMatch(messageText, prompts);
    setTypingStatus(localPromptId ? t('chatbot.steps.local_matcher') : t('chatbot.steps.llm_consultation'));

    try {
      // The backend will perform its own matching (tier 2).
      const responseData = await askChatbot(token, messageText, i18n.language);

      const botMessage = {
        id: Date.now() + 1,
        type: responseData.type === 'metric' ? 'metric' : 'bot',
        text: responseData.response || (responseData.type === 'refused' ? t('chatbot.refusal') : ''),
        data: responseData
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'error',
        text: t('chatbot.error')
      }]);
    } finally {
      setIsTyping(false);
      setTypingStatus('');
    }
  };

  const handleSuggestion = (prompt) => {
    handleSend(prompt.label);
  };

  return (
    <div className="chatbot-container">
      {/* Trigger Button */}
      <button 
        className="chatbot-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title={t('chatbot.title')}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="12" cy="11" r="2"></circle><line x1="9" y1="11" x2="9.01" y2="11"></line><line x1="15" y1="11" x2="15.01" y2="11"></line></svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }}></div>
              <h3>{t('chatbot.title')}</h3>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map(msg => (
              <React.Fragment key={msg.id}>
                <div className={`chatbot-bubble ${msg.type}`}>
                  {msg.source === 'llm' && (
                    <div className="chatbot-ai-badge" title={t('chatbot.aiProcessed')}>
                      AI
                    </div>
                  )}
                  {msg.source === 'llm_failed' && (
                    <div className="chatbot-ai-failed-badge">
                      {t('chatbot.aiFailed')}
                    </div>
                  )}
                  {msg.data?.steps && (
                    <div className="chatbot-steps-container">
                      {msg.data.steps.map((step, idx) => (
                        <div key={idx} className="chatbot-step">
                          <div className={`chatbot-step-icon ${step.status}`}></div>
                          <div className="chatbot-step-label">
                            {t(`chatbot.steps.${step.key}`)}
                            {step.details && <div className="chatbot-step-details">{step.details}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.text}
                  {msg.type === 'metric' && msg.data && (
                    <div className="chatbot-metric-card">
                      <span className="chatbot-metric-title">{msg.data.title}</span>
                      <span className="chatbot-metric-value">{msg.data.value}</span>
                      {msg.data.subtitle && <span className="chatbot-metric-subtitle">{msg.data.subtitle}</span>}
                    </div>
                  )}
                </div>
                {msg.suggestions && prompts.length > 0 && (
                  <div className="chatbot-suggestions">
                    {prompts.slice(0, 6).map(p => (
                      <button key={p.id} className="chatbot-suggestion-chip" onClick={() => handleSuggestion(p)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            {isTyping && (
              <div className="chatbot-typing-wrapper">
                <div className="chatbot-typing-status">{typingStatus}</div>
                <div className="chatbot-typing">
                  <div className="chatbot-dot"></div>
                  <div className="chatbot-dot"></div>
                  <div className="chatbot-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <div className="chatbot-input-wrapper">
              <input 
                type="text" 
                className="chatbot-input" 
                placeholder={t('chatbot.placeholder')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.slice(0, 350))}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                className="chatbot-send" 
                disabled={!inputValue.trim() || isTyping}
                onClick={() => handleSend()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
            <div className="chatbot-char-count">{inputValue.length}/350 {t('chatbot.charCount')}</div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Chatbot;
