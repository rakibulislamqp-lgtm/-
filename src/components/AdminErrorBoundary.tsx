import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';

interface Props {
  children?: ReactNode;
  onReturnToStore?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AdminDashboard Uncaught Error:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1a1c2e] p-8 rounded-3xl border border-rose-500/20 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30 text-rose-400">
              <AlertCircle size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">এডমিন ড্যাশবোর্ড রেন্ডারে ত্রুটি হয়েছে</h2>
              <p className="text-gray-400 text-sm">
                ড্যাশবোর্ড কম্পোনেন্টে সাময়িক ত্রুটি দেখা দিয়েছে। নিচের বাটনে ক্লিক করে আবার চেষ্টা করুন।
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/40 rounded-xl text-left text-xs font-mono text-rose-300 max-h-32 overflow-y-auto border border-white/5">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>রিলোড করুন</span>
              </button>

              {this.props.onReturnToStore && (
                <button
                  type="button"
                  onClick={this.props.onReturnToStore}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
                >
                  <ShoppingBag size={16} />
                  <span>স্টোর ভিউ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
