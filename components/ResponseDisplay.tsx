import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import Loader from './Loader';
import { getGuardianSpeech } from '../services/geminiService';

interface ResponseDisplayProps {
  response: string;
  isLoading: boolean;
  error: string | null;
  question: string;
}

// --- Funções Auxiliares para Áudio ---

// Decodifica uma string base64 para um Uint8Array.
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodifica dados de áudio PCM brutos em um AudioBuffer.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Converte um AudioBuffer para um Blob no formato WAV.
function bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    // Cabeçalho RIFF
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    // Sub-chunk "fmt "
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // Tamanho do sub-chunk
    setUint16(1); // Formato de áudio (PCM)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // Sub-chunk "data"
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (i = 0; i < numOfChan; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset] || 0));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
}
// --- Fim das Funções Auxiliares ---

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ response, isLoading, error, question }) => {
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [animationClass, setAnimationClass] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const prevResponseRef = useRef<string>(response);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  useEffect(() => {
    if (response) {
      setCopyStatus('idle');
    }
  }, [response]);

  useEffect(() => {
    const prevResponse = prevResponseRef.current;
    
    if (response && !prevResponse) {
        setDisplayedResponse(response);
        setAnimationClass('animate-fade-in-scale-up');
    } 
    else if (!response && prevResponse) {
        setAnimationClass('animate-fade-out-scale-down');
        const timer = setTimeout(() => setDisplayedResponse(''), 500);
        return () => clearTimeout(timer);
    }
    else if (response && prevResponse && response !== prevResponse) {
        setAnimationClass('animate-fade-out-scale-down');
        const timer = setTimeout(() => {
            setDisplayedResponse(response);
            setAnimationClass('animate-fade-in-scale-up');
        }, 500);
        return () => clearTimeout(timer);
    }
    
    prevResponseRef.current = response;
  }, [response]);
  
  // Efeito para parar o áudio e limpar o buffer quando a resposta muda
  useEffect(() => {
    if (audioSourceRef.current) {
        audioSourceRef.current.stop();
    }
    setAudioState('idle');
    setAudioBuffer(null);
  }, [response]);

  // Efeito de limpeza para desmontagem do componente
  useEffect(() => {
    return () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
  }, []);

  const handlePlayAudio = async () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
      setAudioState('idle');
      return;
    }
    
    const playBuffer = (buffer: AudioBuffer) => {
        if (!audioContextRef.current) return;
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        source.onended = () => {
            setAudioState('idle');
            audioSourceRef.current = null;
        };
        audioSourceRef.current = source;
        setAudioState('playing');
    };
    
    if (audioBuffer) {
        playBuffer(audioBuffer);
        return;
    }

    setAudioState('loading');
    
    try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const base64Audio = await getGuardianSpeech(response);
        const audioBytes = decode(base64Audio);
        const newAudioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
        
        setAudioBuffer(newAudioBuffer);
        playBuffer(newAudioBuffer);

    } catch (err) {
        console.error("Falha ao reproduzir áudio:", err);
        setAudioState('error');
        setTimeout(() => setAudioState('idle'), 2000);
    }
  };

  const handleShare = async () => {
    const textToShare = `Pergunta ao Oráculo da Consciência:\n\n"${question}"\n\nResposta:\n${response}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Sabedoria do Oráculo da Consciência',
                text: textToShare,
            });
        } catch (error) {
            console.log('Compartilhamento cancelado ou falhou:', error);
        }
    } else {
        try {
            await navigator.clipboard.writeText(textToShare);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } catch (error) {
            console.error('Falha ao copiar para a área de transferência:', error);
            alert('Não foi possível copiar a resposta.');
        }
    }
  };
  
  const handleSavePdf = () => {
    if (!question || !response) return;

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 20;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Sabedoria do Oráculo da Consciência', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Sua Pergunta:', margin, currentY);
    currentY += 8;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    const questionLines = doc.splitTextToSize(`"${question}"`, contentWidth);
    doc.text(questionLines, margin, currentY);
    currentY += (questionLines.length * 5) + 10;

    doc.setDrawColor(249, 115, 22);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Resposta do Oráculo:', margin, currentY);
    currentY += 8;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(12);
    const responseLines = doc.splitTextToSize(response, contentWidth);

    for (let i = 0; i < responseLines.length; i++) {
        if (currentY > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
        }
        doc.text(responseLines[i], margin, currentY);
        currentY += 5;
    }

    doc.save('sabedoria-do-oraculo.pdf');
  };
  
  const handleSaveAudio = () => {
    if (!audioBuffer) return;

    const wavBlob = bufferToWav(audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'resposta-do-oraculo.wav';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const showPlaceholder = !isLoading && !error && !displayedResponse && animationClass !== 'animate-fade-out-scale-down';
  
  const renderAudioButtonIcon = () => {
    switch (audioState) {
        case 'loading':
            return (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            );
        case 'playing':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
                </svg>
            );
        case 'error':
             return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             );
        case 'idle':
        default:
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                    <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.482 5.482 0 0 1 11.025 8a5.482 5.482 0 0 1-1.61 3.89l.706.706z"/>
                    <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                </svg>
            );
    }
  };


  return (
    <div className={`mt-6 w-full min-h-[10rem] p-4 bg-black/20 backdrop-blur-md rounded-lg border border-orange-400/30 flex items-center justify-center transition-shadow duration-500`}>
      {isLoading && <Loader />}
      {error && <p className="text-orange-400 text-center">{error}</p>}
      
      {showPlaceholder && (
        <p className="text-gray-400 text-center animate-fade-in-scale-up">A resposta do universo aguarda sua pergunta.</p>
      )}
      
      {displayedResponse && (
        <div className={`relative w-full ${animationClass}`}>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed pb-12 pr-4">
                {displayedResponse}
            </p>
            <div className="absolute bottom-0 right-0 flex items-center space-x-2">
                <button
                    onClick={handlePlayAudio}
                    className="flex items-center justify-center p-1.5 h-7 w-7 rounded-full bg-orange-900/50 text-orange-300 hover:bg-orange-900/80 transition-all duration-200 disabled:opacity-50"
                    disabled={audioState === 'loading' || audioState === 'error'}
                    aria-label={audioState === 'playing' ? "Parar áudio" : "Ouvir resposta"}
                    title={audioState === 'playing' ? "Parar áudio" : "Ouvir resposta"}
                >
                    {renderAudioButtonIcon()}
                </button>
                {audioBuffer && (
                    <button
                      onClick={handleSaveAudio}
                      className="flex items-center justify-center p-1.5 h-7 w-7 rounded-full bg-orange-900/50 text-orange-300 hover:bg-orange-900/80 transition-all duration-200"
                      aria-label="Salvar áudio da resposta"
                      title="Salvar Áudio"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                )}
                <button
                  onClick={handleSavePdf}
                  className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md bg-orange-900/50 text-orange-300 hover:bg-orange-900/80 transition-all duration-200"
                  aria-label="Salvar resposta como PDF"
                  title="Salvar como PDF"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Salvar PDF</span>
                </button>
                <button
                    onClick={handleShare}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-md bg-orange-900/50 text-orange-300 hover:bg-orange-900/80 transition-all duration-200 disabled:opacity-70"
                    disabled={copyStatus === 'copied'}
                    aria-label="Compartilhar resposta"
                >
                    {copyStatus === 'copied' ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copiado!</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                            <span>Compartilhar</span>
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResponseDisplay;