import React from 'react';
import useThemeStore from '../store/theme-store';

export default function EmptyState() {
	const { theme } = useThemeStore();

	return (
		<div className={`flex-1 flex flex-col items-center justify-center min-h-[400px] py-12 text-center px-6 ${
			theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-white'
		}`}>
			<div className="w-16 h-16 mb-8 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center">
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="1.5"/>
					<path d="M12 7V12L15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
			</div>
			<h2 className={`text-2xl font-semibold mb-3 ${
				theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
			}`}>
				Welcome to Freshworks Copilot
			</h2>
			<p className={`text-sm max-w-md leading-relaxed ${
				theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
			}`}>
				Your AI-powered coding assistant. Ask questions, get explanations, or request code examples - I'm here to help you be more productive.
			</p>
		</div>
	)
}
