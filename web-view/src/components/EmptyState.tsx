import React from 'react';
import { LucideCode, LucideFileCode, LucidePalette, LucideSettings, LucideZap } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-8 relative">
        <div className="absolute -inset-4 bg-[#1268FB] rounded-full opacity-10 blur-lg animate-pulse"></div>
        <div className="relative bg-[#1268FB] p-4 rounded-2xl">
          <LucideZap className="w-12 h-12 text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-[#1268FB]">Welcome to Freshworks Copilot</h2>
      <div className="max-w-3xl space-y-6">
        <p className="text-base text-[var(--vscode-descriptionForeground)]">Explore what you can do:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group bg-[var(--vscode-chat-background)] p-6 rounded-2xl border border-[var(--vscode-panel-border)] hover:border-[#1268FB]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#1268FB]/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-[#1268FB]/10 group-hover:bg-[#1268FB]/20 transition-colors">
                <LucideCode className="w-5 h-5 text-[#1268FB]" />
              </div>
              <h3 className="font-semibold text-[var(--vscode-editor-foreground)]">Ask Questions</h3>
            </div>
            <p className="text-sm text-[var(--vscode-descriptionForeground)] leading-relaxed">Get instant help with coding, debugging, or any development queries you have</p>
          </div>
          <div className="group bg-[var(--vscode-chat-background)] p-6 rounded-2xl border border-[var(--vscode-panel-border)] hover:border-[#1268FB]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#1268FB]/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-[#1268FB]/10 group-hover:bg-[#1268FB]/20 transition-colors">
                <LucidePalette className="w-5 h-5 text-[#1268FB]" />
              </div>
              <h3 className="font-semibold text-[var(--vscode-editor-foreground)]">Convert Designs</h3>
            </div>
            <p className="text-sm text-[var(--vscode-descriptionForeground)] leading-relaxed">Transform Figma designs into production-ready code with a single click</p>
          </div>
          <div className="group bg-[var(--vscode-chat-background)] p-6 rounded-2xl border border-[var(--vscode-panel-border)] hover:border-[#1268FB]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#1268FB]/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-[#1268FB]/10 group-hover:bg-[#1268FB]/20 transition-colors">
                <LucideSettings className="w-5 h-5 text-[#1268FB]" />
              </div>
              <h3 className="font-semibold text-[var(--vscode-editor-foreground)]">AI Models</h3>
            </div>
            <p className="text-sm text-[var(--vscode-descriptionForeground)] leading-relaxed">Choose from various specialized AI models for different tasks</p>
          </div>
          <div className="group bg-[var(--vscode-chat-background)] p-6 rounded-2xl border border-[var(--vscode-panel-border)] hover:border-[#1268FB]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#1268FB]/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-[#1268FB]/10 group-hover:bg-[#1268FB]/20 transition-colors">
                <LucideFileCode className="w-5 h-5 text-[#1268FB]" />
              </div>
              <h3 className="font-semibold text-[var(--vscode-editor-foreground)]">Code Insights</h3>
            </div>
            <p className="text-sm text-[var(--vscode-descriptionForeground)] leading-relaxed">Get detailed explanations and insights for complex code snippets</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
