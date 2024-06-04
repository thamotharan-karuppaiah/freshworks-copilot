
import { create, useStore } from 'zustand';



interface VsCodeMessageState {
	message: any;
}

const useVsCodeMessageStore = create<VsCodeMessageState>((set) => ({
	message: null,
	setMessage: () => set({ message: null })
}));

export default useVsCodeMessageStore;
