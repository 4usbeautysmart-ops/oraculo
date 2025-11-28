import React, { useState } from 'react';

interface HistoryEntry {
  id: number;
  question: string;
  response: string;
}

interface HistoryProps {
  history: HistoryEntry[];
}

interface HistoryItemProps {
    entry: HistoryEntry;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleShare = async () => {
        const textToShare = `Pergunta ao Oráculo da Consciência:\n\n"${entry.question}"\n\nResposta:\n${entry.response}`;

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
                setTimeout(() => setCopyStatus('idle'), 2000); // Reset after 2 seconds
            } catch (error) {
                console.error('Falha ao copiar para a área de transferência:', error);
                alert('Não foi possível copiar a resposta.');
            }
        }
    };

    return (
        <div className="bg-black/20 backdrop-blur-sm border border-orange-400/20 rounded-lg overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left p-4 flex justify-between items-center hover:bg-orange-900/20 focus:outline-none focus:bg-orange-900/30 transition-colors"
                aria-expanded={isOpen}
            >
                <span className="font-medium text-orange-200 truncate">{entry.question}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-orange-300 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
            <div
                className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}
                style={{ transitionProperty: 'max-height, padding' }}
            >
                <div className={`p-4 border-t border-orange-400/20 ${!isOpen && 'hidden'}`}>
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {entry.response}
                    </p>
                    <div className="mt-4 flex justify-end">
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
            </div>
        </div>
    );
};

const History: React.FC<HistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
        <div className="text-center text-gray-500 py-8">
            <h2 id="history-modal-title" className="font-cinzel text-2xl md:text-3xl text-center text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-200 mb-6">
                Ecos do Cosmos
            </h2>
            <p>A biblioteca de sabedoria ainda está vazia.</p>
        </div>
    );
  }

  return (
    <div className="w-full">
        <h2 id="history-modal-title" className="font-cinzel text-2xl md:text-3xl text-center text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-200 mb-6">
            Ecos do Cosmos
        </h2>
        <div className="space-y-3">
            {history.map(entry => (
                <HistoryItem key={entry.id} entry={entry} />
            ))}
        </div>
    </div>
  );
};

export default History;