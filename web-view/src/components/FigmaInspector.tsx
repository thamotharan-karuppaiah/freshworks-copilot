import React, { useEffect, useRef, useState } from 'react';
import { FigspecFrameViewer } from "@figspec/react";
import { sendFigmaDataRequest, sendNodeSelectedEvent } from '../services/vsCodeService';
import { createComponent } from '../util/figma-html';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/xml/xml';
import { html as beautifyHtml } from 'js-beautify';

const FigmaInspector: React.FC = () => {
	const [fileResponse, setFileResponse] = useState<any>();
	const [image, setImage] = useState<any>();
	const [fileImageFillsResponse, SetFileImageFillsResponse] = useState<any>([]);
	const [htmlText, setHtmlText] = useState('');
	const [formattedHtml, setFormattedHtml] = useState('');
	const [scale, setScale] = useState(1);
	const editorRef = useRef(null);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.command === 'figmaDataRequest') {
				setFileResponse(event.data.fileResponse);
				setImage(event.data.image);
				SetFileImageFillsResponse(event.data.fileImageFillsResponse);
			}
		};
		window.addEventListener('message', handleMessage);
		sendFigmaDataRequest(Math.random());

		return () => window.removeEventListener('message', handleMessage);
	}, []);

	useEffect(() => {
		if (editorRef.current) {
			(editorRef.current as any).editor.setSize('100%', '100%');
		}
	}, [editorRef.current])

	const onNodeSelect = (e: any) => {
		const rawHtml = createComponent(e.detail.node, fileImageFillsResponse?.meta?.images);
		setHtmlText(rawHtml);
		setFormattedHtml(beautifyHtml(rawHtml, { indent_size: 2, space_in_empty_paren: true }));
		sendNodeSelectedEvent(e.detail.node,fileImageFillsResponse);
	};

	const handleZoomIn = () => {
		setScale(prevScale => Math.min(prevScale + 0.1, 3));
	};

	const handleZoomOut = () => {
		setScale(prevScale => Math.max(prevScale - 0.1, 0.5));
	};

	return (
		<div className='fixed w-full h-full grid grid-rows-2 grid-cols-1'>
			<div className='row-span-1'>
				<FigspecFrameViewer
					className='w-full h-full'
					apiResponse={fileResponse}
					renderedImage={image}
					onNodeSelect={onNodeSelect}
				/>
			</div>
			<div className='row-span-1 grid grid-cols-2 h-full'>
				<div className='p-4 flex flex-col h-full'>
					<h2 className='font-bold mb-2'>HTML</h2>
					<div className='flex-grow'>
						<CodeMirror
							value={formattedHtml}
							ref={editorRef}
							options={{
								mode: 'xml',
								theme: 'material',
								lineNumbers: true,
								lineWrapping: true
							}}
							onBeforeChange={(editor, data, value) => {
								setFormattedHtml(value);
								setHtmlText(value);
							}}
							className='h-full'
						/>
					</div>
				</div>
				<div className='p-4 flex flex-col h-full'>
					<div className='flex justify-between items-center mb-2'>
						<h2 className='font-bold'>Preview</h2>
						<div className='flex'>
							<button
								onClick={handleZoomIn}
								className='mr-2 bg-blue-500 text-white px-2 py-1 rounded'
							>
								+
							</button>
							<button
								onClick={handleZoomOut}
								className='bg-blue-500 text-white px-2 py-1 rounded'
							>
								-
							</button>
						</div>
					</div>
					<div
						className='border-0 overflow-auto h-full'
					>
						<div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} className='absolute w-full h-full'>
							<iframe
								srcDoc={htmlText}
								width="100%"
								height="100%"
								className='border-0 '
							></iframe></div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FigmaInspector;
