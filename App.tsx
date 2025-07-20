
import React, { useState, useCallback, useEffect } from 'react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import Icon from './components/Icon.tsx';
import SetupGuide from './components/SetupGuide.tsx';
import SessionLog from './components/SessionLog.tsx';
import SessionTimer from './components/SessionTimer.tsx';
import { generateOptimizationPlan, generateComparisonAnalysis } from './services/geminiService.ts';
import { fetchPageSpeedReport } from './services/pageSpeedService.ts';
import { Recommendation, Session, CleaningOptions, ImpactSummary, ApiKeys } from './types.ts';

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

const SESSION_LOG_KEY = 'pageforge_ai_sessions';
const SESSION_ID_KEY = 'pageforge_session_id';

const getSessionId = (): string => {
    let sid = localStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
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
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionStart, setActiveSessionStart] = useState<Date | null>(null);

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

  const [sessionId] = useState(getSessionId());
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [keysLoading, setKeysLoading] = useState(true);

  useEffect(() => {
    try {
        const storedSessions = localStorage.getItem(SESSION_LOG_KEY);
        if (storedSessions) {
            setSessions(JSON.parse(storedSessions));
        }
    } catch (error) {
        console.error('Failed to load sessions from localStorage:', error);
        setSessions([]);
    }

    const fetchKeys = async () => {
        setKeysLoading(true);
        try {
            const res = await fetch(`/api/keys?sessionId=${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data);
            } else {
                setApiKeys(null);
            }
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
            setApiKeys(null);
        } finally {
            setKeysLoading(false);
        }
    };
    fetchKeys();
  }, [sessionId]);

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
        const newReport = await fetchPageSpeedReport(url, sessionId);

        if (isRemeasure && pageSpeedBefore) {
            setPageSpeedAfter(newReport);
            const analysis = await generateComparisonAnalysis(pageSpeedBefore, newReport, sessionId);
            setComparisonAnalysis(analysis);

            const sessionEndTime = new Date();
            const newSession: Session = {
                id: `${sessionEndTime.toISOString()}-${Math.random().toString(36).substring(2, 9)}`,
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
            
            const updatedSessions = [newSession, ...sessions];
            setSessions(updatedSessions);
            localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(updatedSessions));
            setActiveSessionStart(null); // End session
        } else {
            setPageSpeedBefore(newReport);
            setIsGeneratingPlan(true);
            const plan = await generateOptimizationPlan(newReport, sessionId);
            setOptimizationPlan(plan);
        }
    } catch (error: any) {
        setApiError(error.message || 'An unexpected error occurred during measurement.');
    } finally {
        setIsMeasuring(false);
        setIsGeneratingPlan(false);
    }
  };


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
        <header className="mb-8 relative">
          <div className="text-center">
             <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 animate-glow">PageForge AI</h1>
            <p className="text-lg text-gray-300 mt-2">Full Performance Analysis & Speed Boost</p>
            <p className="text-gray-400 mt-1">Prod by <a href="https://github.com/nion-dev" target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-300 hover:underline">Nion</a></p>
          </div>
          <div className="absolute top-0 right-0">
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <a href="/sign-in">Sign In</a>
            </SignedOut>
          </div>
        </header>
        
        {activeSessionStart && <SessionTimer startTime={activeSessionStart.toISOString()} />}

        <main className="space-y-8">
            <SetupGuide sessionId={sessionId} apiKeys={apiKeys} setApiKeys={setApiKeys} keysLoading={keysLoading}/>

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
