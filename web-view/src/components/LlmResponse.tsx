import React from 'react';
import { sendCreateFileRequest, sendCopyCliboardRequest } from '../services/vsCodeService';

interface File {
	fileType: string;
	message: string;
	fileName: string;
	content: string;
}

interface Data {
	type: string;
	message: string;
	files?: File[];
}

interface Props {
	data: string;
}

const LlmResponse: React.FC<Props> = ({ data }) => {
	let mesage: Data = null;
	try {
		mesage = JSON.parse(data);
	}
	catch {
		mesage = { type: 'text', message: data };
	}
	const { type, message, files } = mesage;

	const createFile = (file: File) => {
		sendCreateFileRequest(file.fileName, file.content);
	};

	const copyFile = (file: File) => {
		sendCopyCliboardRequest(file.content);
	};


	return (
		<>
			{message}
			{type === 'code' && (
				<div className="mt-2">
					{files?.map((file, index) => (
						<div key={index} className="mt-2">
							<div className="font-medium">{file.message}</div>
							<div className='flex items-center mt-[8px] bg-gray-800 text-gray-300 text-xs p-[4px] rounded-t-[4px]'>{file.fileName}
								<a className='flex item-center  ml-auto cursor-pointer font-medium' onClick={() => copyFile(file)}>
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"
										className="icon-sm mr-[4px]"><path fill="currentColor"
											fill-rule="evenodd" d="M7 5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-2v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3h2zm2 2h5a3 3 0 0 1 3 3v5h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1zM5 9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1z" clip-rule="evenodd"></path></svg>
									Copy code</a>
								<a className='cursor-pointer font-medium  ml-[8px]' onClick={() => createFile(file)}>Create file</a>
							</div>
							<div className="p-2 bg-gray-100 text-xs">
								<pre className="whitespace-pre">{file.content}</pre>
							</div>
						</div>
					))}
				</div>
			)}
		</>
	);
};

export default LlmResponse;
