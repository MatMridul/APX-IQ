'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CarbonPanel, MetricValue } from '@/components/f1/Primitives';
import { Activity, Zap, Brain, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TRACK_IDS } from '@/utils/constants';

type BackendStatus = {
    status: string;
    modules: Record<string, string>;
    llm_backend: {
        backend: string;
        model?: string;
        url?: string;
    };
    hardware_detected: string | null;
};

type LapReport = {
    title: string;
    markdown: string;
    summary: string;
    key_findings: string[];
    generated_by: string;
};

type LapInfo = {
    lap_id: number;
    session_uid: number;
    lap_number: number;
    lap_time_ms: number | null;
    sector_1_time_ms: number | null;
    sector_2_time_ms: number | null;
    sector_3_time_ms: number | null;
    is_valid: boolean;
    telemetry_points: number;
    max_distance_m: number;
    created_at: string;
};

type TelemetryPoint = {
    distance_m: number;
    speed_kph: number;
    throttle: number;
    brake: number;
    steer: number;
    gear: number;
    rpm: number;
    drs: boolean;
    x: number;
    y: number;
    z: number;
};

export default function IntelligencePage() {
    const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [report, setReport] = useState<LapReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Lap selection state
    const [availableLaps, setAvailableLaps] = useState<LapInfo[]>([]);
    const [selectedLapId, setSelectedLapId] = useState<number | null>(null);
    const [isLoadingLaps, setIsLoadingLaps] = useState(false);
    
    // Ghost lap selection state
    const [ghostYear, setGhostYear] = useState(2024);
    const [ghostTrackId, setGhostTrackId] = useState<number>(5); // Monaco default
    const [ghostDriver, setGhostDriver] = useState('VER');
    const [ghostLapData, setGhostLapData] = useState<any>(null);
    const [isLoadingGhost, setIsLoadingGhost] = useState(false);
    const [ghostError, setGhostError] = useState<string | null>(null);
    const [useMockData, setUseMockData] = useState(true); // Toggle for testing

    // Hardware profiling state
    const [hardwareProfile, setHardwareProfile] = useState<any>(null);
    const [isProfilingHardware, setIsProfilingHardware] = useState(false);
    const [hardwareError, setHardwareError] = useState<string | null>(null);

    // Report history state
    const [reportHistory, setReportHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Available drivers (F1 2024 grid + legends)
    const DRIVERS = [
        'VER', 'PER', 'HAM', 'RUS', 'LEC', 'SAI', 'NOR', 'PIA',
        'ALO', 'STR', 'OCO', 'GAS', 'TSU', 'RIC', 'BOT', 'ZHO',
        'MAG', 'HUL', 'ALB', 'SAR', 'BEA', 'LAW'
    ];

    // Fetch available laps on mount
    useEffect(() => {
        fetchAvailableLaps();
        fetchReportHistory();
    }, []);

    const fetchReportHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch('http://localhost:8000/intelligence/reports/history?limit=10');
            if (response.ok) {
                const history = await response.json();
                setReportHistory(history);
            }
        } catch (err) {
            console.error('Failed to fetch report history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const loadReportFromHistory = async (reportId: number) => {
        try {
            const response = await fetch(`http://localhost:8000/intelligence/reports/${reportId}`);
            if (response.ok) {
                const reportData = await response.json();
                setReport(reportData);
                setShowHistory(false);
            }
        } catch (err) {
            setError('Failed to load report from history');
        }
    };

    const saveCurrentReport = async () => {
        if (!report) return;

        try {
            const saveData = {
                user_lap_id: selectedLapId,
                ghost_lap_id: ghostLapData?.ghost_lap_id || null,
                session_uid: availableLaps.find(l => l.lap_id === selectedLapId)?.session_uid || null,
                lap_number: availableLaps.find(l => l.lap_id === selectedLapId)?.lap_number || null,
                report_type: 'lap_debrief',
                title: report.title,
                markdown: report.markdown,
                summary: report.summary,
                key_findings: report.key_findings,
                generated_by: report.generated_by,
                hardware_profile: hardwareProfile,
            };

            const response = await fetch('http://localhost:8000/intelligence/reports/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saveData),
            });

            if (response.ok) {
                // Refresh history
                await fetchReportHistory();
            }
        } catch (err) {
            console.error('Failed to save report:', err);
        }
    };

    const fetchAvailableLaps = async () => {
        setIsLoadingLaps(true);
        try {
            const response = await fetch('http://localhost:8000/telemetry/laps/completed');
            if (response.ok) {
                const laps = await response.json();
                setAvailableLaps(laps);
                
                // Auto-select the lap with best time (lowest lap_time_ms)
                if (laps.length > 0) {
                    const bestLap = laps.reduce((best: LapInfo, lap: LapInfo) => {
                        if (!lap.lap_time_ms) return best;
                        if (!best.lap_time_ms) return lap;
                        return lap.lap_time_ms < best.lap_time_ms ? lap : best;
                    });
                    setSelectedLapId(bestLap.lap_id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch laps:', err);
            // Don't show error - just means no laps recorded yet
        } finally {
            setIsLoadingLaps(false);
        }
    };

    const loadGhostLap = async () => {
        setIsLoadingGhost(true);
        setGhostError(null);
        
        try {
            const response = await fetch(
                `http://localhost:8000/intelligence/ghost/${ghostTrackId}?year=${ghostYear}&driver=${ghostDriver}&session_type=R`
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`No ghost lap found for ${ghostDriver} at ${TRACK_IDS[ghostTrackId]} ${ghostYear}`);
                }
                throw new Error(`Failed to load ghost lap: ${response.statusText}`);
            }
            
            const data = await response.json();
            setGhostLapData(data);
            setGhostError(null);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to load ghost lap';
            setGhostError(errorMsg);
            setGhostLapData(null);
        } finally {
            setIsLoadingGhost(false);
        }
    };

    const profileHardware = async () => {
        if (!selectedLapId) {
            setHardwareError('Please select a lap first');
            return;
        }

        setIsProfilingHardware(true);
        setHardwareError(null);

        try {
            // Fetch steering trace from selected lap
            const steeringResponse = await fetch(`http://localhost:8000/telemetry/lap/${selectedLapId}/steering`);
            if (!steeringResponse.ok) {
                throw new Error(`Failed to fetch steering trace: ${steeringResponse.statusText}`);
            }
            const steeringData = await steeringResponse.json();

            if (steeringData.steer_trace.length < 200) {
                throw new Error(`Insufficient steering data: ${steeringData.steer_trace.length} points (minimum 200)`);
            }

            // Send to hardware profiler
            const profileResponse = await fetch('http://localhost:8000/intelligence/hardware', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steer_trace: steeringData.steer_trace }),
            });

            if (!profileResponse.ok) {
                throw new Error(`Hardware profiling failed: ${profileResponse.statusText}`);
            }

            const profile = await profileResponse.json();
            setHardwareProfile(profile);
            setHardwareError(null);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to profile hardware';
            setHardwareError(errorMsg);
            setHardwareProfile(null);
        } finally {
            setIsProfilingHardware(false);
        }
    };

    // Fetch backend health status
    const checkBackendHealth = async () => {
        try {
            const response = await fetch('http://localhost:8000/intelligence/health');
            const data = await response.json();
            setBackendStatus(data);
        } catch (err) {
            setError('Failed to connect to intelligence backend');
        }
    };

    // Generate lap report (with real or mock telemetry)
    const generateReport = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            let telemetryData;

            if (useMockData || !selectedLapId) {
                // Use mock telemetry for testing
                telemetryData = {
                    user_telemetry: Array.from({ length: 500 }, (_, i) => ({
                        distance_m: i * 10,
                        speed_kph: 250 + 30 * Math.sin(i / 50),
                        throttle: 0.8 + 0.2 * Math.sin(i / 50),
                        brake: Math.max(0, -0.2 * Math.sin(i / 50)),
                        steer: 0.1 * Math.sin(i / 30),
                        gear: Math.min(8, Math.max(1, Math.floor(i / 60))),
                        rpm: 10000 + 2000 * Math.sin(i / 50),
                        drs: i % 100 > 50,
                        x: i * 5,
                        y: 100 * Math.sin(i / 100),
                        z: 0,
                    })),
                    ghost_telemetry: Array.from({ length: 500 }, (_, i) => ({
                        distance_m: i * 10,
                        speed_kph: 255 + 30 * Math.sin(i / 50),
                        throttle: 0.85 + 0.15 * Math.sin(i / 50),
                        brake: Math.max(0, -0.15 * Math.sin(i / 50)),
                        steer: 0.08 * Math.sin(i / 30),
                        gear: Math.min(8, Math.max(1, Math.floor(i / 60))),
                        rpm: 10500 + 2000 * Math.sin(i / 50),
                        drs: i % 100 > 50,
                        x: i * 5,
                        y: 100 * Math.sin(i / 100),
                        z: 0,
                    })),
                    grid_points: 1000,
                };
            } else {
                // Fetch real telemetry from selected lap
                const lapResponse = await fetch(`http://localhost:8000/telemetry/lap/${selectedLapId}`);
                if (!lapResponse.ok) {
                    throw new Error(`Failed to fetch lap telemetry: ${lapResponse.statusText}`);
                }
                const lapData = await lapResponse.json();

                // Use loaded ghost lap if available, otherwise simulate
                let ghostTelemetry;
                if (ghostLapData && ghostLapData.telemetry) {
                    // Use real ghost lap from FastF1
                    ghostTelemetry = ghostLapData.telemetry;
                } else {
                    // Simulate ghost lap (2% faster version of user lap)
                    ghostTelemetry = lapData.telemetry.map((t: TelemetryPoint) => ({
                        ...t,
                        speed_kph: t.speed_kph * 1.02,
                        throttle: Math.min(1.0, t.throttle * 1.05),
                    }));
                }

                telemetryData = {
                    user_telemetry: lapData.telemetry,
                    ghost_telemetry: ghostTelemetry,
                    grid_points: 1000,
                };
            }

            const response = await fetch('http://localhost:8000/intelligence/report/lap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(telemetryData),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-apx-black text-silver p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-5xl font-black text-white mb-2">
                    <span className="text-gold">INTELLIGENCE</span> LAYER
                </h1>
                <p className="text-silver/60 text-lg">
                    AI-Powered Lap Analysis & Race Engineering
                </p>
            </div>

            {/* Backend Status Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <CarbonPanel title="BACKEND STATUS" className="col-span-1">
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={checkBackendHealth}
                            className="px-4 py-2 bg-gold/20 hover:bg-gold/30 border border-gold/50 rounded text-gold font-bold transition-all"
                        >
                            <Activity className="inline mr-2" size={16} />
                            CHECK STATUS
                        </button>

                        {backendStatus && (
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span className="text-white font-bold">
                                        {backendStatus.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="border-t border-white/10 pt-2">
                                    <div className="text-silver/60 text-xs mb-1">LLM BACKEND</div>
                                    <div className="text-gold font-mono">
                                        {backendStatus.llm_backend.backend.toUpperCase()}
                                    </div>
                                    {backendStatus.llm_backend.model && (
                                        <div className="text-silver/60 text-xs mt-1">
                                            Model: {backendStatus.llm_backend.model}
                                        </div>
                                    )}
                                </div>
                                {backendStatus.hardware_detected && (
                                    <div className="border-t border-white/10 pt-2">
                                        <div className="text-silver/60 text-xs mb-1">HARDWARE</div>
                                        <div className="text-white font-mono text-xs">
                                            {backendStatus.hardware_detected}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CarbonPanel>

                {/* Lap Selection Panel */}
                <CarbonPanel title="LAP SELECTION" className="col-span-1">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs text-silver/60 mb-2 block">SELECT LAP TO ANALYZE</label>
                            {isLoadingLaps ? (
                                <div className="text-sm text-silver/60">Loading laps...</div>
                            ) : availableLaps.length === 0 ? (
                                <div className="text-sm text-silver/60">
                                    No recorded laps found. Complete a lap in-game to analyze.
                                </div>
                            ) : (
                                <select
                                    value={selectedLapId || ''}
                                    onChange={(e) => setSelectedLapId(Number(e.target.value))}
                                    className="w-full bg-black border border-gold/50 text-white p-2 rounded font-mono text-sm"
                                >
                                    {availableLaps.map(lap => (
                                        <option key={lap.lap_id} value={lap.lap_id}>
                                            Lap {lap.lap_number} - {lap.lap_time_ms ? `${(lap.lap_time_ms / 1000).toFixed(3)}s` : 'No time'}
                                            {lap.lap_time_ms && lap.lap_time_ms === Math.min(...availableLaps.filter(l => l.lap_time_ms).map(l => l.lap_time_ms!)) ? ' ⭐' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {selectedLapId && availableLaps.find(l => l.lap_id === selectedLapId) && (
                            <div className="text-xs space-y-1 border-t border-white/10 pt-2">
                                <div className="flex justify-between">
                                    <span className="text-silver/60">Telemetry Points:</span>
                                    <span className="text-white font-mono">
                                        {availableLaps.find(l => l.lap_id === selectedLapId)?.telemetry_points}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-silver/60">Max Distance:</span>
                                    <span className="text-white font-mono">
                                        {availableLaps.find(l => l.lap_id === selectedLapId)?.max_distance_m.toFixed(0)}m
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={fetchAvailableLaps}
                            className="text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                            🔄 Refresh Laps
                        </button>

                        {/* Mock data toggle for testing */}
                        <div className="border-t border-white/10 pt-2">
                            <label className="flex items-center gap-2 text-xs text-silver/60 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useMockData}
                                    onChange={(e) => setUseMockData(e.target.checked)}
                                    className="rounded"
                                />
                                Use mock data (for testing)
                            </label>
                        </div>
                    </div>
                </CarbonPanel>

                {/* Ghost Lap Selection Panel */}
                <CarbonPanel title="GHOST LAP SELECTION" className="col-span-1">
                    <div className="flex flex-col gap-4">
                        <div className="text-xs text-silver/80 mb-2">
                            Select a professional lap from real F1 data (FastF1) to compare against.
                        </div>

                        {/* Year Selection */}
                        <div>
                            <label className="text-xs text-silver/60 mb-1 block">YEAR</label>
                            <select
                                value={ghostYear}
                                onChange={(e) => setGhostYear(Number(e.target.value))}
                                className="w-full bg-black border border-gold/50 text-white p-2 rounded font-mono text-sm"
                            >
                                {[2024, 2023, 2022, 2021, 2020].map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Track Selection */}
                        <div>
                            <label className="text-xs text-silver/60 mb-1 block">TRACK</label>
                            <select
                                value={ghostTrackId}
                                onChange={(e) => setGhostTrackId(Number(e.target.value))}
                                className="w-full bg-black border border-gold/50 text-white p-2 rounded font-mono text-sm"
                            >
                                {Object.entries(TRACK_IDS).map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Driver Selection */}
                        <div>
                            <label className="text-xs text-silver/60 mb-1 block">DRIVER</label>
                            <select
                                value={ghostDriver}
                                onChange={(e) => setGhostDriver(e.target.value)}
                                className="w-full bg-black border border-gold/50 text-white p-2 rounded font-mono text-sm"
                            >
                                {DRIVERS.map(driver => (
                                    <option key={driver} value={driver}>{driver}</option>
                                ))}
                            </select>
                        </div>

                        {/* Load Button */}
                        <button
                            onClick={loadGhostLap}
                            disabled={isLoadingGhost}
                            className="px-4 py-2 bg-gold/20 hover:bg-gold/30 disabled:bg-silver/10 disabled:cursor-not-allowed border border-gold/50 rounded text-gold font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {isLoadingGhost ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    LOADING...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    LOAD GHOST LAP
                                </>
                            )}
                        </button>

                        {/* Ghost Lap Info */}
                        {ghostLapData && (
                            <div className="border-t border-white/10 pt-3 space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={14} className="text-green-500" />
                                    <span className="text-xs text-green-400 font-bold">GHOST LAP LOADED</span>
                                </div>
                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-silver/60">Driver:</span>
                                        <span className="text-white font-mono">{ghostLapData.driver}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-silver/60">Track:</span>
                                        <span className="text-white font-mono">{ghostLapData.track_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-silver/60">Lap Time:</span>
                                        <span className="text-gold font-mono font-bold">
                                            {ghostLapData.lap_time_s.toFixed(3)}s
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-silver/60">Telemetry Points:</span>
                                        <span className="text-white font-mono">{ghostLapData.telemetry_points}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Ghost Error */}
                        {ghostError && (
                            <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-xs">
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span>{ghostError}</span>
                            </div>
                        )}

                        {/* Info */}
                        {!ghostLapData && !ghostError && (
                            <div className="text-xs text-silver/60 italic">
                                No ghost lap loaded. Using simulated ghost (2% faster than your lap).
                            </div>
                        )}
                    </div>
                </CarbonPanel>

                <CarbonPanel title="REPORT GENERATION" className="col-span-1">
                    <div className="flex flex-col gap-4">
                        <div className="text-sm text-silver/80">
                            Generate an AI-powered lap debrief comparing your performance against a ghost lap.
                            The system will analyze braking points, apex speeds, and provide actionable coaching tips.
                        </div>

                        <button
                            onClick={generateReport}
                            disabled={isGenerating || (!useMockData && !selectedLapId)}
                            className="px-6 py-3 bg-gold hover:bg-gold/80 disabled:bg-silver/20 disabled:cursor-not-allowed text-black font-black text-lg rounded transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    GENERATING REPORT...
                                </>
                            ) : (
                                <>
                                    <Brain size={20} />
                                    GENERATE LAP DEBRIEF
                                </>
                            )}
                        </button>

                        {isGenerating && (
                            <div className="text-xs text-silver/60 text-center animate-pulse">
                                This may take 30-60 seconds if using local LLM (Ollama)...
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </div>
                </CarbonPanel>
            </div>

            {/* Hardware Profiling & Report Generation Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Hardware Profiling Panel */}
                <CarbonPanel title="HARDWARE PROFILING" className="col-span-1">
                    <div className="flex flex-col gap-4">
                        <div className="text-sm text-silver/80">
                            Analyze your steering inputs to detect your hardware type. This helps scale coaching tips to your equipment capabilities.
                        </div>

                        <button
                            onClick={profileHardware}
                            disabled={isProfilingHardware || !selectedLapId}
                            className="px-4 py-2 bg-gold/20 hover:bg-gold/30 disabled:bg-silver/10 disabled:cursor-not-allowed border border-gold/50 rounded text-gold font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {isProfilingHardware ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    ANALYZING...
                                </>
                            ) : (
                                <>
                                    <Activity size={16} />
                                    PROFILE HARDWARE
                                </>
                            )}
                        </button>

                        {/* Hardware Profile Display */}
                        {hardwareProfile && (
                            <div className="border-t border-white/10 pt-3 space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={14} className="text-green-500" />
                                    <span className="text-xs text-green-400 font-bold">HARDWARE DETECTED</span>
                                </div>

                                {/* Hardware Tier */}
                                <div className="p-3 bg-gold/10 border border-gold/30 rounded">
                                    <div className="text-xs text-silver/60 mb-1">DETECTED TYPE</div>
                                    <div className="text-xl font-bold text-gold">{hardwareProfile.tier_label}</div>
                                    <div className="text-xs text-silver/60 mt-1">
                                        {hardwareProfile.detected_type}
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-white/5 rounded">
                                        <div className="text-silver/60 mb-1">Confidence</div>
                                        <div className="text-white font-mono font-bold">
                                            {(hardwareProfile.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white/5 rounded">
                                        <div className="text-silver/60 mb-1">Steer Variance</div>
                                        <div className="text-white font-mono font-bold">
                                            {hardwareProfile.steer_variance.toFixed(4)}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white/5 rounded">
                                        <div className="text-silver/60 mb-1">Dominant Freq</div>
                                        <div className="text-white font-mono font-bold">
                                            {hardwareProfile.dominant_freq_hz.toFixed(1)} Hz
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white/5 rounded">
                                        <div className="text-silver/60 mb-1">Brake Threshold</div>
                                        <div className="text-white font-mono font-bold">
                                            {hardwareProfile.brake_threshold_m.toFixed(1)}m
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="text-xs text-silver/60 italic border-t border-white/10 pt-2">
                                    Coaching tips will be scaled to your {hardwareProfile.tier_label} capabilities.
                                </div>
                            </div>
                        )}

                        {/* Hardware Error */}
                        {hardwareError && (
                            <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-xs">
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <span>{hardwareError}</span>
                            </div>
                        )}

                        {/* Info */}
                        {!hardwareProfile && !hardwareError && (
                            <div className="text-xs text-silver/60 italic">
                                Hardware not yet profiled. Coaching tips will use default thresholds.
                            </div>
                        )}
                    </div>
                </CarbonPanel>

                <CarbonPanel title="REPORT GENERATION" className="col-span-1">
                    <div className="flex flex-col gap-4">
                        <div className="text-sm text-silver/80">
                            Generate an AI-powered lap debrief comparing your performance against a ghost lap.
                            The system will analyze braking points, apex speeds, and provide actionable coaching tips.
                        </div>

                        <button
                            onClick={generateReport}
                            disabled={isGenerating || (!useMockData && !selectedLapId)}
                            className="px-6 py-3 bg-gold hover:bg-gold/80 disabled:bg-silver/20 disabled:cursor-not-allowed text-black font-black text-lg rounded transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    GENERATING REPORT...
                                </>
                            ) : (
                                <>
                                    <Brain size={20} />
                                    GENERATE LAP DEBRIEF
                                </>
                            )}
                        </button>

                        {isGenerating && (
                            <div className="text-xs text-silver/60 text-center animate-pulse">
                                This may take 30-60 seconds if using local LLM (Ollama)...
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Status Summary */}
                        <div className="border-t border-white/10 pt-3 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-silver/60">User Lap:</span>
                                <span className="text-white font-mono">
                                    {selectedLapId ? `Lap ${availableLaps.find(l => l.lap_id === selectedLapId)?.lap_number}` : 'None'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-silver/60">Ghost Lap:</span>
                                <span className="text-white font-mono">
                                    {ghostLapData ? `${ghostLapData.driver} (${ghostLapData.lap_time_s.toFixed(3)}s)` : 'Simulated'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-silver/60">Hardware:</span>
                                <span className="text-white font-mono">
                                    {hardwareProfile ? hardwareProfile.tier_label : 'Not profiled'}
                                </span>
                            </div>
                        </div>
                    </div>
                </CarbonPanel>
            </div>

            {/* Report Display */}
            <AnimatePresence>
                {report && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <CarbonPanel title={report.title} className="mb-6">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-gold" />
                                    <span className="text-xs text-silver/60">
                                        Generated by: <span className="text-gold font-mono">{report.generated_by}</span>
                                    </span>
                                </div>
                                <button
                                    onClick={saveCurrentReport}
                                    className="px-3 py-1 bg-gold/20 hover:bg-gold/30 border border-gold/50 rounded text-gold text-xs font-bold transition-all"
                                >
                                    💾 SAVE REPORT
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="mb-6 p-4 bg-white/5 rounded border border-gold/20">
                                <div className="text-xs text-gold font-bold mb-2 tracking-wider">EXECUTIVE SUMMARY</div>
                                <p className="text-white">{report.summary}</p>
                            </div>

                            {/* Key Findings */}
                            {report.key_findings.length > 0 && (
                                <div className="mb-6">
                                    <div className="text-xs text-gold font-bold mb-3 tracking-wider">KEY FINDINGS</div>
                                    <ul className="space-y-2">
                                        {report.key_findings.map((finding, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-silver">{finding}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Full Report */}
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => (
                                            <h1 className="text-2xl font-bold text-gold mb-4 mt-6">{children}</h1>
                                        ),
                                        h2: ({ children }) => (
                                            <h2 className="text-xl font-bold text-white mb-3 mt-5">{children}</h2>
                                        ),
                                        h3: ({ children }) => (
                                            <h3 className="text-lg font-bold text-silver mb-2 mt-4">{children}</h3>
                                        ),
                                        p: ({ children }) => (
                                            <p className="text-silver/90 mb-3 leading-relaxed">{children}</p>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="list-disc list-inside space-y-1 mb-3 text-silver/90">{children}</ul>
                                        ),
                                        li: ({ children }) => (
                                            <li className="ml-4">{children}</li>
                                        ),
                                        strong: ({ children }) => (
                                            <strong className="text-gold font-bold">{children}</strong>
                                        ),
                                        code: ({ children }) => (
                                            <code className="bg-white/10 px-1.5 py-0.5 rounded text-gold font-mono text-sm">{children}</code>
                                        ),
                                        table: ({ children }) => (
                                            <table className="w-full border-collapse border border-white/20 my-4">{children}</table>
                                        ),
                                        th: ({ children }) => (
                                            <th className="border border-white/20 px-3 py-2 bg-white/5 text-gold font-bold text-left">{children}</th>
                                        ),
                                        td: ({ children }) => (
                                            <td className="border border-white/20 px-3 py-2 text-silver">{children}</td>
                                        ),
                                    }}
                                >
                                    {report.markdown}
                                </ReactMarkdown>
                            </div>
                        </CarbonPanel>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Report History Panel */}
            {!report && !isGenerating && reportHistory.length > 0 && (
                <CarbonPanel title="REPORT HISTORY" className="max-w-4xl mx-auto mb-8">
                    <div className="space-y-2">
                        {reportHistory.map((historyReport: any) => (
                            <div
                                key={historyReport.report_id}
                                onClick={() => loadReportFromHistory(historyReport.report_id)}
                                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold/30 rounded cursor-pointer transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="text-sm text-white font-bold mb-1">{historyReport.title}</div>
                                        <div className="text-xs text-silver/80 mb-2">{historyReport.summary}</div>
                                        <div className="flex items-center gap-3 text-xs text-silver/60">
                                            <span>Lap {historyReport.lap_number || 'N/A'}</span>
                                            <span>•</span>
                                            <span className="font-mono">{historyReport.generated_by}</span>
                                            <span>•</span>
                                            <span>{new Date(historyReport.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-gold text-xs">→</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CarbonPanel>
            )}

            {/* Info Panel */}
            {!report && !isGenerating && (
                <CarbonPanel title="HOW IT WORKS" className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <div className="text-gold font-bold mb-2">1. ALIGNMENT</div>
                            <p className="text-silver/80">
                                Your lap and ghost lap are normalized onto a common distance grid using S-curve interpolation.
                            </p>
                        </div>
                        <div>
                            <div className="text-gold font-bold mb-2">2. ANALYSIS</div>
                            <p className="text-silver/80">
                                Corner detection, delta computation, and coaching rules identify where time is lost or gained.
                            </p>
                        </div>
                        <div>
                            <div className="text-gold font-bold mb-2">3. SYNTHESIS</div>
                            <p className="text-silver/80">
                                AI generates a natural language report with actionable insights tailored to your hardware.
                            </p>
                        </div>
                    </div>
                </CarbonPanel>
            )}
        </div>
    );
}
