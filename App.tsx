
import React, { useState, useCallback, useEffect } from 'react';
import Icon from './components/Icon.tsx';
import SetupGuide from './components/SetupGuide.tsx';
import SessionLog from './components/SessionLog.tsx';
import SessionTimer from './components/SessionTimer.tsx';
import useCleaner from './hooks/useCleaner.ts';
import { generateOptimizationPlan, generateComparisonAnalysis } from './services/geminiService.ts';
import { fetchPageSpeedReport } from './services/pageSpeedService.ts';
import { Recommendation, Session, CleaningOptions, ImpactSummary } from './types.ts';

const ScoreCircle = ({ score, label, loading = false }) => {
    const s = score * 100;
    const colorClass = s >= 90 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400';
    const ringColor = s >= 90 ? 'stroke-green-400' : s >= 50 ? 'stroke-yellow-400' : 'stroke-red-400';
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (s / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                    </div>
                ) : (
                    <>
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                            <circle
                                className={ringColor}
                                strokeWidth="8"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                fill="transparent"
                                r="40"
                                cx="50"
                                cy="50"
                                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                            />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${colorClass}`}>
                            {Math.round(s)}
                        </span>
                    </>
                )}
            </div>
            <p className="mt-2 text-sm font-medium text-gray-300">{label}</p>
        </div>
    );
};

const App = () => {
  const [url, setUrl] = useState('');
  
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [pageSpeedBefore, setPageSpeedBefore] = useState(null);
  const [pageSpeedAfter, setPageSpeedAfter] = useState(null);
  const [optimizationPlan, setOptimizationPlan] = useState<Recommendation[] | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [comparisonAnalysis, setComparisonAnalysis] = useState(null);
  const [apiError, setApiError] = useState('');
  
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
        const localData = localStorage.getItem('pageforge-sessions');
        return localData ? JSON.parse(localData) : [];
    } catch (error) {
        console.error("Failed to parse sessions from localStorage", error);
        return [];
    }
  });
  const [activeSessionStart, setActiveSessionStart] = useState<Date | null>(null);

  const { isCleaning, cleanHtml } = useCleaner();
  const [originalHtml, setOriginalHtml] = useState('');
  const [cleanedHtml, setCleanedHtml] = useState('');
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);
  const [options, setOptions] = useState<CleaningOptions>({
      stripComments: true,
      collapseWhitespace: true,
      minifyInlineCSSJS: true,
      removeEmptyAttributes: true,
      preserveIframes: false,
      preserveLinks: false,
      preserveShortcodes: false,
      semanticRewrite: true,
      lazyLoadEmbeds: true,
      lazyLoadImages: true,
      optimizeCssLoading: true,
      optimizeFontLoading: false,
      addPrefetchHints: false,
      deferScripts: true,
  });

  useEffect(() => {
    localStorage.setItem('pageforge-sessions', JSON.stringify(sessions));
  }, [sessions]);

  const handleMeasure = async (isRemeasure = false) => {
    if (!url) { setApiError('Please enter a URL to measure.'); return; }
    
    setIsMeasuring(true);
    setApiError('');
    if(!isRemeasure) {
        setPageSpeedBefore(null);
        setPageSpeedAfter(null);
        setOptimizationPlan(null);
        setComparisonAnalysis(null);
        setActiveSessionStart(new Date());
    }

    try {
        const newReport = await fetchPageSpeedReport(url);

        if (isRemeasure && pageSpeedBefore) {
            setPageSpeedAfter(newReport);
            const analysis = await generateComparisonAnalysis(pageSpeedBefore, newReport);
            setComparisonAnalysis(analysis);

            const sessionEndTime = new Date();
            const newSession: Omit<Session, 'id'> = {
                url,
                startTime: activeSessionStart!.toISOString(),
                endTime: sessionEndTime.toISOString(),
                duration: (sessionEndTime.getTime() - activeSessionStart!.getTime()) / 1000,
                beforeScores: {
                    mobile: pageSpeedBefore.mobile.lighthouseResult.categories.performance.score,
                    desktop: pageSpeedBefore.desktop.lighthouseResult.categories.performance.score,
                },
                afterScores: {
                    mobile: newReport.mobile.lighthouseResult.categories.performance.score,
                    desktop: newReport.desktop.lighthouseResult.categories.performance.score,
                },
            };
            
            const sessionWithId: Session = {
                ...newSession,
                id: `${newSession.startTime}-${crypto.randomUUID().slice(0, 8)}`,
            };
            setSessions(prev => [sessionWithId, ...prev]);

        } else {
            setPageSpeedBefore(newReport);
            setIsGeneratingPlan(true);
            const plan = await generateOptimizationPlan(newReport);
            setOptimizationPlan(plan);
        }
    } catch (error: any) {
        setApiError(error.message || 'An unexpected error occurred during measurement.');
    } finally {
        setIsMeasuring(false);
        setIsGeneratingPlan(false);
    }
  };

  const handleClean = useCallback(async () => {
    if (isCleaning || !originalHtml) {
        if (!originalHtml) setApiError('Please provide some HTML to clean first.');
        return;
    }
    setApiError('');
    try {
        const { cleanedHtml: resultHtml, summary } = await cleanHtml(originalHtml, options, optimizationPlan);
        setCleanedHtml(resultHtml);
        setImpactSummary(summary);
    } catch (error) {
        console.error('Cleaning process failed:', error);
        setApiError('An unexpected error occurred during the cleaning process.');
    }
  }, [originalHtml, options, cleanHtml, isCleaning, optimizationPlan]);

  const handleDownloadHtml = () => {
    if (!cleanedHtml) return;
    const blob = new Blob([cleanedHtml], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'cleaned_page.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };
  
  return (
    <div className="min-h-screen text-white bg-gray-950 p-4 sm:p-6 lg:p-8 font-sans flex flex-col">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-8">
          <div className="text-center">
             <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 animate-glow">PageForge AI</h1>
            <p className="text-lg text-gray-300 mt-2">Full Performance Analysis & Speed Boost</p>
            <p className="text-gray-400 mt-1">Prod by <a href="https://github.com/nion-dev" target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-300 hover:underline">Nion</a></p>
          </div>
        </header>
        
        {activeSessionStart && <SessionTimer startTime={activeSessionStart.toISOString()} />}

        <main className="space-y-8">
            <SetupGuide />

            <section className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <h2 className="text-2xl font-bold text-blue-300 mb-4">Step 1: Measure Performance</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => handleMeasure(false)}
                        disabled={isMeasuring}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-wait text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                         {isMeasuring && !pageSpeedAfter ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Icon name="magic" className="w-5 h-5" />}
                        Measure
                    </button>
                </div>
                {apiError && <p className="text-red-400 mt-4">{apiError}</p>}
                
                {pageSpeedBefore && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-850 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg text-center mb-4">Before Optimization</h3>
                            <div className="flex justify-around">
                                <ScoreCircle score={pageSpeedBefore.mobile.lighthouseResult.categories.performance.score} label="Mobile" loading={isMeasuring && !pageSpeedAfter}/>
                                <ScoreCircle score={pageSpeedBefore.desktop.lighthouseResult.categories.performance.score} label="Desktop" loading={isMeasuring && !pageSpeedAfter}/>
                            </div>
                        </div>
                        <div className="bg-gray-850 p-4 rounded-lg">
                            <h3 className="font-semibold text-lg text-center mb-4">After Optimization</h3>
                             {pageSpeedAfter ? (
                                <div className="flex justify-around">
                                    <ScoreCircle score={pageSpeedAfter.mobile.lighthouseResult.categories.performance.score} label="Mobile"/>
                                    <ScoreCircle score={pageSpeedAfter.desktop.lighthouseResult.categories.performance.score} label="Desktop"/>
                                </div>
                             ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <p>Clean your code and re-measure to see comparison.</p>
                                </div>
                             )}
                        </div>
                    </div>
                )}
            </section>
            
            <section className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <h2 className="text-2xl font-bold text-green-300 mb-4">Step 2: Clean & Optimize HTML</h2>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <textarea
                        value={originalHtml}
                        onChange={(e) => setOriginalHtml(e.target.value)}
                        placeholder="Paste your original HTML code here..."
                        className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                     <div className="w-full h-64 bg-gray-800 border border-gray-700 rounded-lg p-4 font-mono text-sm relative overflow-auto">
                        {isCleaning && <div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div></div>}
                        {cleanedHtml ? <pre><code>{cleanedHtml}</code></pre> : <p className="text-gray-500">Cleaned HTML will appear here...</p>}
                    </div>
                </div>
                <div className="my-4">
                    <h3 className="text-lg font-semibold mb-2">Cleaning Options</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
                        {Object.keys(options).map(key => (
                             <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={options[key]}
                                    onChange={() => setOptions(prev => ({ ...prev, [key]: !prev[key] }))}
                                    className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-600"
                                />
                                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button
                        onClick={handleClean}
                        disabled={isCleaning || !originalHtml}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-wait text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                         {isCleaning ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Icon name="magic" className="w-5 h-5" />}
                        Clean HTML
                    </button>
                    {cleanedHtml && 
                        <button
                            onClick={handleDownloadHtml}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Icon name="download" className="w-5 h-5" />
                            Download
                        </button>
                    }
                    {impactSummary && (
                        <div className="text-sm text-gray-300">
                           Size reduced from <span className="font-bold text-red-400">{(impactSummary.originalBytes / 1024).toFixed(2)} KB</span> to <span className="font-bold text-green-400">{(impactSummary.cleanedBytes / 1024).toFixed(2)} KB</span>. Saved <span className="font-bold text-green-300">{(impactSummary.bytesSaved / 1024).toFixed(2)} KB</span>.
                        </div>
                    )}
                </div>
            </section>
            
            {(pageSpeedBefore || pageSpeedAfter) && (
                <section className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <h2 className="text-2xl font-bold text-yellow-300 mb-4">Step 3: Analyze & Re-measure</h2>
                    {isGeneratingPlan && <p className="text-yellow-300">Generating AI optimization plan...</p>}
                    {optimizationPlan && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3">AI Optimization Plan</h3>
                            <ul className="space-y-3">
                                {optimizationPlan.map((rec, i) => (
                                    <li key={i} className="bg-gray-850 p-4 rounded-lg">
                                        <p className="font-bold text-yellow-400">{rec.title}</p>
                                        <p className="text-gray-300 text-sm mt-1">{rec.description}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {pageSpeedBefore && !pageSpeedAfter &&
                         <button
                            onClick={() => handleMeasure(true)}
                            disabled={isMeasuring}
                            className="mt-6 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-wait text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                             {isMeasuring ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Icon name="magic" className="w-5 h-5" />}
                            Compare Performance
                        </button>
                    }

                    {comparisonAnalysis && (
                        <div className="mt-6">
                             <h3 className="text-xl font-semibold mb-3">AI Comparison Analysis</h3>
                             <div className="bg-gray-850 p-4 rounded-lg text-gray-300 whitespace-pre-wrap">{comparisonAnalysis}</div>
                        </div>
                    )}
                </section>
            )}

            <SessionLog sessions={sessions} setSessions={setSessions} />
        </main>
      </div>
    </div>
  );
};

export default App;
