import React, { useState } from 'react';
import { sendCreateFileRequest, sendCopyCliboardRequest, executeAnyCommand, sendCreateFilesRequest } from '../services/vsCodeService';
import { VsCommands, parseMessage } from '../constants';
import useChatStore, { Message } from '../store/chat-message-store';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface File {
	fileType: string;
	message: string;
	fileName: string;
	content: string;
}

interface Data {
	type: string;
	message: string;
	inspectRequested: boolean;
	files?: File[];
}

interface Props {
	data: string;
}

const LlmResponse: React.FC<Props> = ({ data }) => {
	let { messages } = useChatStore();
	let [availableFigmaDesigns, setAvailableFigmaDesigns] = useState<Message[]>([]);
	let message: Data = null;
	message = parseMessage(data);
	
	const { type, message: responseMessage, inspectRequested, files } = message;

	const createFile = (file: File) => {
		sendCreateFileRequest(file.fileName, file.content);
	};

	const createAllFiles = () => {
		sendCreateFilesRequest(files);
	};

	const copyFile = (file: File) => {
		sendCopyCliboardRequest(file.content);
	};

	const [showFullContent, setShowFullContent] = useState<boolean>(true);

	const toggleShowContent = () => {
		setShowFullContent(!showFullContent);
	};

	const onInspectFigma = () => {
		let figmaDesigns = messages.filter((msg) => msg.hidden && msg.figmaResponse);
		if (figmaDesigns.length > 1) {
			setAvailableFigmaDesigns(figmaDesigns);
		} else if (figmaDesigns.length === 1) {
			openIspector(figmaDesigns[0]);
		}
	};

	const openIspector = (figmaDesign: Message) => {
		executeAnyCommand(VsCommands.figmaInspect, { fileResponse: figmaDesign.figmaResponse.nodeResponse, image: figmaDesign.imgPath });
	};

	const closeAvailableFigmaDesigns = () => {
		setAvailableFigmaDesigns([]);
	};

	function MarkDownIt({ children }) {
		return <Markdown children={children}
			components={{
				code(props) {
					const { children, className, node, ...rest } = props;
					const match = /language-(\w+)/.exec(className || '');
					return match ? (
						<SyntaxHighlighter
							{...rest}
							PreTag="div"
							children={String(children).replace(/\n$/, '')}
							language={match[1]}
						// style={dark}
						/>
					) : (
						<code {...rest} className={className}>
							{children}
						</code>
					);
				}
			}}></Markdown>;
	}

	return (
		<>
			<div><MarkDownIt>{responseMessage}</MarkDownIt></div>
			{inspectRequested && <button className="bg-blue-500 text-white py-2 px-4 rounded mt-2 hover:bg-blue-600" onClick={onInspectFigma}>Inspect</button>}
			{availableFigmaDesigns.length > 0 && (
				<div className="mt-4 p-2 border rounded relative">
					<div className="font-medium mb-2 flex justify-between items-center">
						<span>Available Figma Designs - Click to Inspect:</span>
						<button className="text-gray-500 hover:text-gray-700" onClick={closeAvailableFigmaDesigns}>x</button>
					</div>
					{availableFigmaDesigns.map((msg, i) => (
						<div key={i} className="p-2 border-b last:border-b-0 hover:bg-gray-100 cursor-pointer" onClick={() => openIspector(msg)}>{msg.figmaResponse.nodeResponse.name}</div>
					))}
				</div>
			)}
			{type === 'code' && (
				<div className="mt-4 has-files relative">
					{files && files.length > 0 && (
						<button
							className="bg-gray-800 text-gray-300 py-1 px-3 rounded absolute top-0 right-0 mt-2 text-sm"
							title='Create all files in the response to your current workspace.'
							onClick={createAllFiles}>
							Create all files
						</button>
					)}
					{files?.map((file, index) => (
						<div key={index} className="mt-2">
							<div className="font-medium">{file.message}</div>
							<div className="flex items-center mt-2 bg-gray-800 text-gray-300 text-xs p-2 rounded-t">
								{file.fileName}
								<a className="flex items-center ml-auto cursor-pointer font-medium" onClick={() => copyFile(file)}>
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" className="icon-sm mr-1"><path fill="currentColor" fillRule="evenodd" d="M7 5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-2v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h2zm2 2h5a3 3 0 0 1 3 3v5h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1zM5 9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1z" clipRule="evenodd"></path></svg>
									Copy code
								</a>
								<a className="cursor-pointer font-medium ml-2" onClick={() => createFile(file)}>Create file</a>
							</div>
							<div className={`p-2 bg-gray-100 text-xs relative overflow-hidden ${showFullContent ? '' : 'max-h-40 overflow-y-scroll'}`}>
								{/* <pre className="whitespace-pre-wrap">{"~~~" + file.fileType + " \n " + file.content + " \n~~~"}</pre> */}
								<MarkDownIt children={"```" + file.fileType + " \n" + file.content + " \n```"}></MarkDownIt>
								{!showFullContent && (
									<button className="absolute bottom-0 right-0 bg-gray-200 text-blue-500 px-2 py-1 rounded-md" onClick={toggleShowContent}>Show more</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</>
	);
};

export default LlmResponse;
