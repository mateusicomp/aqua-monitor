import React, { useState } from 'react';
import { Droplet, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { sendMeasureCommand, MeasureStatus } from '../services/mqtt';

interface MeasureButtonProps {
  deviceId: string;
}

export const MeasureButton: React.FC<MeasureButtonProps> = ({ deviceId }) => {
  const [status, setStatus] = useState<MeasureStatus>('idle');
  const [message, setMessage] = useState<string>('');

  const handleMeasure = async () => {
    setStatus('connecting');
    setMessage('Conectando...');

    try {
      await sendMeasureCommand(deviceId);
      
      setStatus('measuring');
      setMessage('Coletando dados...');
      
      // Simula tempo de medição (ajustar conforme tempo real do dispositivo)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setStatus('success');
      setMessage('Dados coletados com sucesso!');
      
      // Reset após 3 segundos
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
      
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Erro ao aferir qualidade');
      
      // Reset após 5 segundos
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    }
  };

  const getButtonStyles = () => {
    switch (status) {
      case 'connecting':
      case 'measuring':
        return 'bg-blue-500 shadow-lg shadow-blue-500/50';
      case 'success':
        return 'bg-green-500 shadow-lg shadow-green-500/50';
      case 'error':
        return 'bg-red-500 shadow-lg shadow-red-500/50';
      default:
        return 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-xl';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'connecting':
      case 'measuring':
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6" />;
      case 'error':
        return <XCircle className="w-6 h-6" />;
      default:
        return <Droplet className="w-6 h-6" />;
    }
  };

  const isDisabled = status !== 'idle';

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      {message && (
        <div className={`
          px-4 py-2 rounded-lg text-white text-sm max-w-[200px] text-right
          ${status === 'success' ? 'bg-green-500' : ''}
          ${status === 'error' ? 'bg-red-500' : ''}
          ${status === 'connecting' || status === 'measuring' ? 'bg-blue-500' : ''}
          animate-in fade-in slide-in-from-right duration-300
        `}>
          {message}
        </div>
      )}
      
      <button
        onClick={handleMeasure}
        disabled={isDisabled}
        className={`
          ${getButtonStyles()}
          text-white rounded-full p-4
          transition-all duration-300 ease-in-out
          disabled:opacity-70 disabled:cursor-not-allowed
          active:scale-95
          flex items-center justify-center
        `}
        aria-label="Aferir qualidade da água"
      >
        {getIcon()}
      </button>
      
      {status === 'idle' && (
        <p className="text-xs text-gray-500 mr-2">
          Aferir Qualidade
        </p>
      )}
    </div>
  );
};
