import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

const CHAT_API_URL = 'http://localhost:8000/chat';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotViewProps {
  deviceId?: string | null;
  siteId?: string | null;
}

export const ChatbotView: React.FC<ChatbotViewProps> = ({ deviceId, siteId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou seu assistente de qualidade da água. Como posso ajudar você hoje?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [sessionId] = useState<string>(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as any).randomUUID();
    }
    return `session-${Date.now()}`;
  });

  const suggestedQuestions = [
    'Qual a faixa ideal de pH para meu viveiro?',
    'Como melhorar a qualidade da água?',
    'O que significa turbidez alta?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Adiciona mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text.trim(),
          device_id: deviceId ?? null,
          site_id: siteId ?? null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null as any);
        const backendMessage =
          (errorData as any)?.detail ||
          (typeof (errorData as any)?.message === 'string'
            ? (errorData as any).message
            : null);

        throw new Error(
          backendMessage ||
          'Não foi possível obter resposta do assistente no momento.'
        );
      }

      const data = await response.json() as {
        session_id: string;
        answer: string;
        intent: string;
        data_used?: Record<string, unknown> | null;
      };

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem para o backend:', error);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          'Tive um problema para acessar os dados agora. Confira sua conexão com a internet e tente novamente.',
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: 'white',
      overflow: 'hidden'
    }}>
      
      {/* Header do Chat */}
      <div style={{
        background: 'linear-gradient(to right, #0d9488, #0891b2)',
        padding: '16px',
        color: 'white',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: '8px',
            borderRadius: '9999px'
          }}>
            <Sparkles style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
              Assistente Inteligente
            </h3>
            <p style={{ fontSize: '12px', opacity: 0.9, margin: '2px 0 0 0', color: 'white' }}>
              Tire suas dúvidas sobre qualidade da água
            </p>
          </div>
        </div>
      </div>

      {/* Sugestões de Perguntas */}
      {messages.length <= 1 && (
        <div style={{
          padding: '16px',
          background: 'linear-gradient(to bottom, #F9FAFB, white)',
          borderBottom: '1px solid #F3F4F6',
          flexShrink: 0
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', marginTop: 0 }}>
            Sugestões de perguntas:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0d9488';
                  e.currentTarget.style.color = '#0d9488';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Área de Mensagens */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minHeight: 0
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
            }}
          >
            {/* Avatar */}
            <div style={{
              flexShrink: 0,
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: message.sender === 'bot' 
                ? 'linear-gradient(to bottom right, #14b8a6, #0891b2)'
                : '#D1D5DB'
            }}>
              {message.sender === 'bot' ? (
                <Bot style={{ width: '20px', height: '20px', color: 'white' }} />
              ) : (
                <User style={{ width: '20px', height: '20px', color: '#4B5563' }} />
              )}
            </div>

            {/* Balão de Mensagem */}
            <div style={{
              maxWidth: '75%',
              borderRadius: '16px',
              padding: '12px 16px',
              background: message.sender === 'bot'
                ? '#F3F4F6'
                : 'linear-gradient(to right, #0d9488, #0891b2)',
              color: message.sender === 'bot' ? '#1F2937' : 'white',
              borderTopLeftRadius: message.sender === 'bot' ? '4px' : '16px',
              borderTopRightRadius: message.sender === 'user' ? '4px' : '16px'
            }}>
              <p style={{ 
                fontSize: '14px', 
                lineHeight: '1.5', 
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {message.text}
              </p>
              <p style={{
                fontSize: '12px',
                marginTop: '4px',
                marginBottom: 0,
                color: message.sender === 'bot' ? '#9CA3AF' : 'rgba(255,255,255,0.7)'
              }}>
                {message.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Indicador de digitação */}
        {isTyping && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              flexShrink: 0,
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: 'linear-gradient(to bottom right, #14b8a6, #0891b2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            <div style={{
              backgroundColor: '#F3F4F6',
              borderRadius: '16px',
              borderTopLeftRadius: '4px',
              padding: '12px 16px'
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 150, 300].map((delay, i) => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#9CA3AF',
                      borderRadius: '9999px',
                      animation: 'bounce 1s infinite',
                      animationDelay: `${delay}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #F3F4F6',
        backgroundColor: 'white',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta..."
            disabled={isTyping}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              overflow: 'hidden',
              padding: '12px 16px',
              backgroundColor: '#F3F4F6',
              borderRadius: '12px',
              border: 'none',
              fontSize: '14px',
              maxHeight: '128px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px #0d9488';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isTyping}
            style={{
              flexShrink: 0,
              background: 'linear-gradient(to right, #0d9488, #0891b2)',
              color: 'white',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              cursor: inputText.trim() && !isTyping ? 'pointer' : 'not-allowed',
              opacity: inputText.trim() && !isTyping ? 1 : 0.5,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (inputText.trim() && !isTyping) {
                e.currentTarget.style.transform = 'scale(0.95)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Send style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
        <p style={{
          fontSize: '12px',
          color: '#9CA3AF',
          marginTop: '8px',
          marginBottom: 0,
          textAlign: 'center'
        }}>
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>

      {/* CSS para animação de bounce */}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};
