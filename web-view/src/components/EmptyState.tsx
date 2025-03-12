import React from 'react';
import useThemeStore from '../store/theme-store';

export default function EmptyState() {
	return (
		<div className="flex-1 flex flex-col items-center justify-center min-h-[400px] py-12 text-center px-6 bg-primary">
			<div className="w-16 h-16 mb-8 rounded-2xl bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="1.5"/>
					<path d="M12 7V12L15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			</div>
			<h2 className="text-2xl font-semibold mb-3 text-primary">
				Welcome to Freshworks Copilot
			</h2>
			<p className="text-sm max-w-md leading-relaxed text-secondary">
				Your AI-powered coding assistant. Ask questions, get explanations, or request code examples - I'm here to help you be more productive.
			</p>
		</div>
	)
}
