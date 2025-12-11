import React, { useState } from 'react';
import { MessageCircle, Droplet, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { sendMeasureCommand, MeasureStatus } from '../services/mqtt';


interface FloatingButtonsProps {
  onChatToggle: () => void;
  deviceId?: string;
  chatOpen?: boolean;
}

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({ 
  onChatToggle, 
  deviceId,
  chatOpen = false 
}) => {
  const [mqttStatus, setMqttStatus] = useState<MeasureStatus>('idle');
  const [mqttMessage, setMqttMessage] = useState<string>('');

  const handleMeasure = async () => {
    if (!deviceId) return;
    
    setMqttStatus('connecting');
    setMqttMessage('Conectando...');

    try {
      await sendMeasureCommand(deviceId);
      setMqttStatus('measuring');
      setMqttMessage('Coletando dados...');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setMqttStatus('success');
      setMqttMessage('Dados coletados!');
      
      setTimeout(() => {
        setMqttStatus('idle');
        setMqttMessage('');
      }, 3000);
      
    } catch (error) {
      setMqttStatus('error');
      setMqttMessage(error instanceof Error ? error.message : 'Erro');
      
      setTimeout(() => {
        setMqttStatus('idle');
        setMqttMessage('');
      }, 5000);
    }
  };

  const getMqttBackground = () => {
    switch (mqttStatus) {
      case 'connecting':
      case 'measuring':
        return '#3b82f6';
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      default:
        return 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)';
    }
  };

  const getMqttIcon = () => {
    switch (mqttStatus) {
      case 'connecting':
      case 'measuring':
        return <Loader2 style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite' }} />;
      case 'success':
        return <CheckCircle2 style={{ width: '24px', height: '24px' }} />;
      case 'error':
        return <XCircle style={{ width: '24px', height: '24px' }} />;
      default:
        return <Droplet style={{ width: '24px', height: '24px' }} />;
    }
  };

  if (chatOpen) return null;

return (
  <>
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `}</style>

    {/* Botão Chatbot + Label */}
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0px',
      }}
    >
      <button
        onClick={onChatToggle}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        aria-label="Abrir assistente virtual"
      >
        <MessageCircle style={{ width: '24px', height: '24px' }} />
      </button>

      {/* Label do Chat */}
      <p
        style={{
          fontSize: '17px',
          color: '#262729ff',
          margin: 0,
          userSelect: 'none',
        }}
      >
        Chat
      </p>
    </div>

    {/* Botão Aferir Qualidade */}
    {deviceId && (
      <div
        style={{
          position: 'fixed',
          bottom: '140px',
          right: '24px',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0px'
        }}
      >
        {/* Mensagem de status */}
        {mqttMessage && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: getMqttBackground(),
              color: 'white',
              fontSize: '13px',
              maxWidth: '180px',
              textAlign: 'right',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              animation: 'fadeIn 0.3s ease-out'
            }}
          >
            {mqttMessage}
          </div>
        )}

        {/* Botão */}
        <button
          onClick={handleMeasure}
          disabled={mqttStatus !== 'idle'}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: getMqttBackground(),
            color: 'white',
            border: 'none',
            cursor: mqttStatus === 'idle' ? 'pointer' : 'not-allowed',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            opacity: mqttStatus !== 'idle' ? 0.8 : 1
          }}
          onMouseEnter={(e) => {
            if (mqttStatus === 'idle') {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (mqttStatus === 'idle') {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
            }
          }}
          onMouseDown={(e) => {
            if (mqttStatus === 'idle') {
              e.currentTarget.style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            if (mqttStatus === 'idle') {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          aria-label="Aferir qualidade da água"
        >
          {getMqttIcon()}
        </button>

        {/* Label */}
        {mqttStatus === 'idle' && (
          <p
            style={{
              fontSize: '17px',
              color: '#262729ff',
              margin: 0,
              paddingRight: '1px',
              userSelect: 'none'
            }}
          >
            Coletar
          </p>
        )}
      </div>
    )}
  </>
);
};
