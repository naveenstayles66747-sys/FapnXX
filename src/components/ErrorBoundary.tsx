import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      localStorage.removeItem('indianfullxx_custom_videos');
    } catch {}
    window.location.reload();
  };

  private handleGoHome = () => {
    try {
      window.location.href = window.location.origin;
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-[#09090b] text-[#e5e1e4] flex items-center justify-center p-6 font-['Inter',sans-serif]">
          <div className="max-w-lg w-full bg-[#131315] border border-rose-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(244,63,94,0.2)] text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <span className="material-symbols-outlined text-3xl">refresh</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic tracking-tight">
                <span className="text-rose-500">Fap</span>
                <span className="text-pink-400">n</span>
                <span className="text-white">XX</span>
              </h2>
              <h3 className="text-lg font-bold text-zinc-100">Quick Recovery Required</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                A temporary rendering hiccup occurred. Click below to instantly recover and reload the stream player and discovery catalog.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-left overflow-x-auto max-h-28 text-[11px] font-mono text-rose-300">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2 border border-white/20"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">home</span>
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
