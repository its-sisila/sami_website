"use client";

/**
 * Animated CSS Globe — no external dependencies.
 * Shows a stylized rotating earth with marker dots.
 */
export default function WorldGlobe({ size = 280 }: { size?: number }) {
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Outer glow */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.15), transparent 70%)",
                    filter: "blur(20px)",
                }}
            />

            {/* Globe body */}
            <div
                className="relative rounded-full overflow-hidden border border-indigo-500/30"
                style={{
                    width: size * 0.8,
                    height: size * 0.8,
                    background: "radial-gradient(circle at 35% 35%, #1e3a5f 0%, #0f1b2d 50%, #060d16 100%)",
                    boxShadow: "0 0 40px rgba(99,102,241,0.2), inset 0 0 30px rgba(99,102,241,0.1)",
                }}
            >
                {/* Rotating grid lines */}
                <div
                    className="absolute inset-0 animate-spin"
                    style={{
                        animationDuration: "60s",
                        background: `
                            repeating-linear-gradient(
                                0deg,
                                transparent,
                                transparent 20px,
                                rgba(99,102,241,0.08) 20px,
                                rgba(99,102,241,0.08) 21px
                            ),
                            repeating-linear-gradient(
                                90deg,
                                transparent,
                                transparent 20px,
                                rgba(99,102,241,0.08) 20px,
                                rgba(99,102,241,0.08) 21px
                            )
                        `,
                        borderRadius: "50%",
                    }}
                />

                {/* Continent-like shapes using positioned dots */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: "30s" }}>
                    {/* Asia region */}
                    <div className="absolute w-2 h-2 bg-indigo-400/60 rounded-full" style={{ top: "30%", left: "62%" }} />
                    <div className="absolute w-3 h-2 bg-indigo-400/50 rounded-full" style={{ top: "35%", left: "58%" }} />
                    <div className="absolute w-2.5 h-2 bg-indigo-400/40 rounded-full" style={{ top: "28%", left: "55%" }} />
                    <div className="absolute w-2 h-1.5 bg-indigo-400/50 rounded-full" style={{ top: "40%", left: "65%" }} />

                    {/* Middle East */}
                    <div className="absolute w-2 h-1.5 bg-indigo-400/50 rounded-full" style={{ top: "36%", left: "48%" }} />
                    <div className="absolute w-1.5 h-1.5 bg-indigo-400/40 rounded-full" style={{ top: "38%", left: "45%" }} />

                    {/* Africa */}
                    <div className="absolute w-3 h-4 bg-indigo-400/40 rounded-full" style={{ top: "42%", left: "42%" }} />
                    <div className="absolute w-2 h-3 bg-indigo-400/35 rounded-full" style={{ top: "48%", left: "44%" }} />

                    {/* Europe */}
                    <div className="absolute w-2.5 h-2 bg-indigo-400/45 rounded-full" style={{ top: "25%", left: "42%" }} />
                    <div className="absolute w-2 h-1.5 bg-indigo-400/40 rounded-full" style={{ top: "22%", left: "45%" }} />

                    {/* Americas */}
                    <div className="absolute w-2 h-3 bg-indigo-400/35 rounded-full" style={{ top: "28%", left: "22%" }} />
                    <div className="absolute w-2.5 h-4 bg-indigo-400/30 rounded-full" style={{ top: "45%", left: "25%" }} />
                </div>

                {/* Highlight shine */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08) 0%, transparent 50%)",
                    }}
                />
            </div>

            {/* Marker: Singapore */}
            <div
                className="absolute z-10 flex items-center justify-center"
                style={{ top: "38%", left: "68%", transform: "translate(-50%, -50%)" }}
            >
                <span className="absolute w-4 h-4 bg-blue-500/30 rounded-full animate-ping" />
                <span className="relative w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
            </div>

            {/* Marker: Sri Lanka */}
            <div
                className="absolute z-10 flex items-center justify-center"
                style={{ top: "45%", left: "62%", transform: "translate(-50%, -50%)" }}
            >
                <span className="absolute w-4 h-4 bg-emerald-500/30 rounded-full animate-ping" style={{ animationDelay: "0.5s" }} />
                <span className="relative w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
            </div>

            {/* Marker: Dubai */}
            <div
                className="absolute z-10 flex items-center justify-center"
                style={{ top: "35%", left: "52%", transform: "translate(-50%, -50%)" }}
            >
                <span className="absolute w-3 h-3 bg-amber-500/30 rounded-full animate-ping" style={{ animationDelay: "1s" }} />
                <span className="relative w-1.5 h-1.5 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50" />
            </div>

            {/* Labels */}
            <div className="absolute text-[9px] font-medium text-blue-300/70" style={{ top: "32%", left: "72%" }}>
                Singapore
            </div>
            <div className="absolute text-[9px] font-medium text-emerald-300/70" style={{ top: "49%", left: "55%" }}>
                Sri Lanka
            </div>
            <div className="absolute text-[9px] font-medium text-amber-300/70" style={{ top: "29%", left: "44%" }}>
                Dubai
            </div>
        </div>
    );
}
