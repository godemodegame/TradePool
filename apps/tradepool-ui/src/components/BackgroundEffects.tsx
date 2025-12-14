const BackgroundEffects = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient mesh */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-600/10 animate-pulse-slow" />
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Large glow orbs */}
      <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full bg-cyan-500/10 blur-[150px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-1/4 w-[700px] h-[700px] rounded-full bg-emerald-600/10 blur-[130px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-teal-500/5 blur-[180px]" />

      {/* Medium orbs */}
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-400/8 blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/3 left-1/3 w-[350px] h-[350px] rounded-full bg-emerald-500/8 blur-[90px] animate-pulse-slow" style={{ animationDelay: '3s' }} />

      {/* Floating particles - Cyan */}
      <div className="absolute top-20 left-[15%] w-3 h-3 rounded-full bg-cyan-400/40 animate-float glow-cyan" />
      <div className="absolute top-40 right-[20%] w-2 h-2 rounded-full bg-cyan-300/50 animate-float glow-cyan" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-32 left-[25%] w-2.5 h-2.5 rounded-full bg-cyan-400/45 animate-float glow-cyan" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-[10%] w-2 h-2 rounded-full bg-cyan-500/40 animate-float glow-cyan" style={{ animationDelay: '3s' }} />
      
      {/* Floating particles - Green */}
      <div className="absolute bottom-1/4 right-[30%] w-3 h-3 rounded-full bg-emerald-400/40 animate-float glow-purple" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-[40%] w-2 h-2 rounded-full bg-emerald-300/50 animate-float glow-purple" style={{ animationDelay: '2.5s' }} />
      <div className="absolute bottom-40 left-[10%] w-2.5 h-2.5 rounded-full bg-emerald-400/45 animate-float glow-purple" style={{ animationDelay: '0.5s' }} />

      {/* Spinning rings */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-cyan-400/10 animate-spin-slow" />
      <div className="absolute bottom-1/3 right-1/3 w-48 h-48 rounded-full border border-emerald-400/10 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />
    </div>
  );
};

export default BackgroundEffects;
