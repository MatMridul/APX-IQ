'use client';

import { TRACK_IDS } from '@/utils/constants';
import { formatLapTime } from '@/utils/format';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry } from '@/hooks/useTelemetry';
import { CarbonPanel, MetricValue, BarGauge } from '@/components/f1/Primitives';
import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine } from 'recharts';
import { Activity, Signal } from 'lucide-react';

// --- Components ---

function StartSequence({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timeline = [500, 1500, 3000, 4000];
        timeline.forEach((t, i) => setTimeout(() => setStep(i + 1), t));
        setTimeout(onComplete, 5500);
    }, [onComplete]);

    return (
        <motion.div className="fixed inset-0 bg-apx-black z-[100] flex flex-col items-center justify-center overflow-hidden">
            {step >= 1 && (
                <div className="absolute inset-0 flex flex-col justify-center opacity-20">
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8 }} className="h-[1px] bg-gold mb-2" />
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8, delay: 0.1 }} className="h-[1px] bg-gold mb-2" />
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.8, delay: 0.2 }} className="h-[1px] bg-gold" />
                </div>
            )}

            {step >= 2 && step < 4 && (
                <div className="flex gap-6 mb-12 relative z-10">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ backgroundColor: "#111" }}
                            animate={{ backgroundColor: step >= 3 ? "#00ff00" : "#D72638" }}
                            className="w-16 h-16 rounded-full border-4 border-gray-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        >
                            {step >= 3 && <motion.div initial={{ opacity: 0, scale: 1.5 }} animate={{ opacity: 0, scale: 2 }} className="absolute inset-0 bg-green-500 rounded-full" />}
                        </motion.div>
                    ))}
                </div>
            )}

            {step >= 4 && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center z-10"
                >
                    <h1 className="text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(207,163,73,0.5)]">
                        <span className="text-gold">APX</span> IQ
                    </h1>
                    <p className="text-silver tracking-[0.6em] text-sm mt-4 font-bold border-t border-white/20 pt-4">MOTORSPORT INTELLIGENCE</p>
                </motion.div>
            )}
        </motion.div>
    );
}

const LiveGraph = ({ data, dataKey, color, domain }: { data: any[], dataKey: string, color: string, domain: number[] }) => (
    <div className="h-full w-full relative">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <YAxis domain={domain} hide />
                {/* Reference line for baseline visual */}
                <ReferenceLine y={domain[0]} stroke="#333" strokeDasharray="3 3" />
                <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
        {/* Glow behind graph line (CSS hack or SVG filter could define this better, but using simple shadow for now) */}
    </div>
);

// --- Helpers ---
const getTyreColor = (temp: number) => {
    if (temp < 80) return "bg-blue-500";
    if (temp < 100) return "bg-green-500";
    if (temp < 110) return "bg-yellow-500";
    return "bg-red-600 animate-pulse";
};

// --- Main Dashboard ---

export default function DashboardPage() {
    const { telemetry, lapData, carStatus, isConnected, session } = useTelemetry();
    const [showIntro, setShowIntro] = useState(true);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!telemetry) return;

        // Update Graph History
        setHistory(prev => {
            const next = [...prev, { time: Date.now(), speed: telemetry.speed, rpm: telemetry.rpm }];
            if (next.length > 300) next.shift(); // Increased buffer for smoother/longer history
            return next;
        });

    }, [telemetry]);

    return (
        <div className="h-screen w-screen bg-apx-black text-silver font-sans overflow-hidden flex flex-col p-2">
            <AnimatePresence>
                {showIntro && (
                    <motion.div exit={{ opacity: 0, transition: { duration: 1 } }}>
                        <StartSequence onComplete={() => setShowIntro(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {!showIntro && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="grid grid-cols-12 grid-rows-[8%_30%_30%_20%_12%] gap-3 h-full"
                >
                    {/* --- HEADER --- */}
                    <header className="col-span-12 grid grid-cols-12 items-center bg-carbon border-b-2 border-gold px-6 rounded-t-lg">
                        {/* LEFT: LOGO */}
                        <div className="col-span-3 flex items-center">
                            <h1 className="text-3xl font-black italic tracking-tighter text-white">
                                <span className="text-gold">APX</span> IQ
                            </h1>
                        </div>

                        {/* CENTER: SESSION INFO */}
                        <div className="col-span-6 flex items-center justify-center" style={{ gap: '10rem' }}>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-silver/60 font-bold tracking-wider">SESSION</span>
                                <span className="text-lg font-bold text-white leading-none">RACE</span>
                            </div>
                            <div className="h-8 w-[1px] bg-white/10" />
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-silver/60 font-bold tracking-wider">TRACK</span>
                                <span className="text-lg font-bold text-white leading-none uppercase">
                                    {session?.trackId !== undefined ? TRACK_IDS[session.trackId] ?? 'UNKNOWN' : 'WAITING...'}
                                </span>
                            </div>
                        </div>

                        {/* RIGHT: DATA & STATUS */}
                        <div className="col-span-3 flex items-center justify-end" style={{ gap: '4rem' }}>
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] text-silver/60 font-bold tracking-wider">LAP</span>
                                <span className="text-2xl font-mono font-bold text-gold leading-none">
                                    {lapData?.lap ?? 0}<span className="text-sm text-silver">/{session?.totalLaps ?? '-'}</span>
                                </span>
                            </div>
                            <div className={`px-4 py-1.5 rounded flex items-center gap-2 border ${isConnected ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                                <Signal size={16} className={isConnected ? "text-green-500 animate-pulse" : "text-red-500"} />
                                <span className={`text-xs font-bold ${isConnected ? "text-green-400" : "text-red-400"}`}>{isConnected ? 'LIVE FEED' : 'NO SIGNAL'}</span>
                            </div>
                        </div>
                    </header>

                    {/* --- ROW 1: GRAPHS --- */}
                    {/* --- ROW 1: GRAPHS --- */}
                    <CarbonPanel title="SPEED TRACE" className="col-span-4 relative group">
                        <div className="flex-1 flex items-center justify-center z-20">
                            <div className="text-center flex items-baseline justify-center">
                                <span className="text-[8rem] font-mono font-bold text-gold drop-shadow-[0_0_10px_rgba(207,163,73,0.5)] leading-none">
                                    {Math.round(telemetry?.speed ?? 0)}
                                </span>
                                <span className="text-3xl text-silver font-bold ml-4">KM/H</span>
                            </div>
                        </div>
                        {/* Graph takes full height now */}
                        <div className="absolute inset-0 top-8 bottom-2 left-2 right-2 opacity-50">
                            <LiveGraph data={history} dataKey="speed" color="#CFA349" domain={[0, 360]} />
                        </div>
                    </CarbonPanel>

                    <CarbonPanel title="ENGINE RPM" className="col-span-4 relative group">
                        <div className="flex-1 flex items-center justify-center z-20">
                            <div className="text-center flex items-baseline justify-center">
                                <span className="text-[8rem] font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] leading-none">
                                    {Math.round(telemetry?.rpm ?? 0)}
                                </span>
                                <span className="text-3xl text-silver font-bold ml-4">RPM</span>
                            </div>
                        </div>
                        <div className="absolute inset-0 top-8 bottom-2 left-2 right-2 opacity-50">
                            <LiveGraph data={history} dataKey="rpm" color="#FFFFFF" domain={[0, 15000]} />
                        </div>
                    </CarbonPanel>

                    <CarbonPanel title="LAP TIMING" className="col-span-4 flex flex-col px-8 py-4 relative group h-full justify-between">
                        <div className="flex flex-col items-center w-full mt-4">
                            <span className="text-sm font-bold text-gold tracking-[0.2em] mb-4">CURRENT LAP</span>
                            <span className="text-[7rem] font-mono font-bold text-white leading-none tabular-nums">
                                {formatLapTime(lapData?.currentLapTime)}
                            </span>
                        </div>

                        <div className="flex justify-between w-full px-2 mt-auto mb-2">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-base text-silver font-bold tracking-wider">LAST LAP</span>
                                <span className="text-5xl font-mono text-white font-bold">{formatLapTime(lapData?.lastLapTime)}</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-base text-silver font-bold tracking-wider">GAP AHEAD</span>
                                <span className="text-5xl font-mono text-gold font-bold">
                                    {lapData?.deltaToFront !== undefined ? `+${lapData.deltaToFront.toFixed(3)}` : '-.---'}
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-base text-silver font-bold tracking-wider">POS</span>
                                <span className="text-5xl font-mono text-gold font-bold">{lapData?.position ?? '-'}</span>
                            </div>
                        </div>
                    </CarbonPanel>

                    {/* --- ROW 2: CONTROLS --- */}
                    <CarbonPanel title="GEARBOX" className="col-span-3 relative">
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className="z-10 text-[10rem] font-mono font-bold text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] leading-none pt-2">
                                {telemetry?.gear === 0 ? 'N' : telemetry?.gear === -1 ? 'R' : telemetry?.gear ?? '-'}
                            </span>
                        </div>
                    </CarbonPanel>

                    <CarbonPanel title="PEDAL INPUTS" className="col-span-6 relative group h-full" contentClassName="p-0">
                        <div className="flex gap-1 w-full h-full px-1 pb-1"> {/* Reduced gap, minimal padding */}
                            <div className="flex-1 flex flex-col h-full gap-0">
                                <span className="text-center text-xs font-black text-green-500 tracking-widest bg-black/40 py-1 mb-1 rounded-t">THROTTLE</span>
                                <div className="flex-1 w-full relative">
                                    <BarGauge value={Math.round((telemetry?.throttle ?? 0) * 100)} color="green" vertical />
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col h-full gap-0">
                                <span className="text-center text-xs font-black text-red-500 tracking-widest bg-black/40 py-1 mb-1 rounded-t">BRAKE</span>
                                <div className="flex-1 w-full relative">
                                    <BarGauge value={Math.round((telemetry?.brake ?? 0) * 100)} color="red" vertical />
                                </div>
                            </div>
                        </div>
                    </CarbonPanel>

                    <CarbonPanel title="SECTOR TIMES" className="col-span-3 flex flex-col justify-center gap-2">
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                            <span className="text-xs font-bold text-silver">SECTOR 1</span>
                            <span className="font-mono font-bold text-white text-lg">
                                {lapData?.sector1 ? (lapData.sector1 / 1000).toFixed(3) : '-.---'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                            <span className="text-xs font-bold text-silver">SECTOR 2</span>
                            <span className="font-mono font-bold text-white text-lg">
                                {lapData?.sector2 ? (lapData.sector2 / 1000).toFixed(3) : '-.---'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                            <span className="text-xs font-bold text-silver">SECTOR 3</span>
                            <span className="font-mono font-bold text-silver/50 text-lg">
                                ...
                            </span>
                        </div>
                    </CarbonPanel>

                    {/* --- ROW 3: SYSTEMS --- */}
                    <CarbonPanel title="TYRE TEMPS" className="col-span-4">
                        <div className="flex items-center justify-around h-full w-full">
                            {['FL', 'FR', 'RL', 'RR'].map((tyre, i) => (
                                <div key={tyre} className="flex flex-col items-center gap-2">
                                    {/* Visual Tyre Rep */}
                                    <div className="w-12 h-16 rounded-md border border-white/20 bg-black relative overflow-hidden flex items-end">
                                        <div className={`w-full h-full transition-colors duration-500 opacity-60 ${getTyreColor(telemetry?.tyreTemps?.[i] ?? 0)}`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    </div>
                                    <span className="text-[10px] font-bold text-silver">{tyre}</span>
                                    <MetricValue label="" value={telemetry?.tyreTemps?.[i] ?? 0} unit="°C" size="sm" />
                                </div>
                            ))}
                        </div>
                    </CarbonPanel>

                    <CarbonPanel title="FUEL LOAD" className="col-span-4 px-8">
                        <div className="flex flex-col justify-center gap-6 h-full">
                            <div className="flex justify-between items-end">
                                <MetricValue label="REMAINING" value={carStatus?.fuelInTank ? carStatus.fuelInTank.toFixed(2) : '-.--'} unit="KG" size="md" />
                                <MetricValue label="LAPS LEFT" value={carStatus?.fuelRemainingLaps && carStatus.fuelRemainingLaps > -10 && carStatus.fuelRemainingLaps < 200 ? carStatus.fuelRemainingLaps.toFixed(1) : '-.-'} unit="LAPS" size="sm" color={carStatus?.fuelRemainingLaps && carStatus.fuelRemainingLaps < 2 && carStatus.fuelRemainingLaps > -10 ? "red" : "green"} />
                            </div>
                            <div className="w-full h-6 bg-black rounded border border-gold/30 overflow-hidden relative shadow-[0_0_10px_rgba(207,163,73,0.1)]">
                                <div className="absolute inset-0 flex items-center pl-2 text-[10px] font-bold z-10 text-white mix-blend-difference">
                                    {carStatus?.fuelInTank ? 'OK' : 'CALC'}
                                </div>
                                <div className="h-full bg-gradient-to-r from-blue-900 to-blue-500" style={{ width: `${Math.min(((carStatus?.fuelInTank ?? 0) / 110) * 100, 100)}%` }} />
                            </div>
                        </div>
                    </CarbonPanel>

                    <CarbonPanel title="TRACK MAPPING" className="col-span-4 flex items-center justify-center overflow-hidden">
                        <svg viewBox="0 0 100 100" className="w-full h-full opacity-60 stroke-white/30 fill-none stroke-[3px]">
                            <path d="M 20 80 L 20 40 Q 20 20 40 20 L 60 20 Q 80 20 80 40 L 80 60 Q 80 80 60 80 L 40 80 Q 30 80 30 70" />
                            {/* Pulsing Car Dot */}
                            <circle cx="20" cy="80" r="4" className="fill-gold animate-ping opacity-75" />
                            <circle cx="20" cy="80" r="2" className="fill-gold" />
                        </svg>
                    </CarbonPanel>

                    {/* --- FOOTER --- */}
                    <div className="col-span-12 flex gap-3 h-full pb-2">
                        {['UDP RATE: 60Hz', 'DB LATENCY: 12ms', 'UPS: 100%', 'ML STATUS: IDLE'].map((stat, i) => (
                            <div key={i} className="flex-1 bg-carbon border border-white/5 rounded flex items-center justify-center gap-2 text-xs font-mono font-bold text-silver/60">
                                <Activity size={12} className="text-gold" />
                                {stat}
                            </div>
                        ))}
                    </div>

                </motion.div>
            )}
        </div>
    );
}
