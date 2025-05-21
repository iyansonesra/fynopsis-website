import { create } from 'zustand';

interface SourceMapping {
    chunk_title: string;
    chunk_text: string;
    source_id: string;
}

interface SourceMappingStore {
    mappings: Record<number, SourceMapping>;
    addMapping: (number: number, mapping: SourceMapping) => void;
    addMultipleMappings: (mappings: Record<number, SourceMapping>) => void;
    getMapping: (number: number) => SourceMapping | undefined;
    clearMappings: () => void;
}

export const useSourceMappingStore = create<SourceMappingStore>((set, get) => ({
    mappings: {},
    
    addMapping: (number: number, mapping: SourceMapping) => {
        set((state) => ({
            mappings: {
                ...state.mappings,
                [number]: mapping
            }
        }));
    },

    addMultipleMappings: (mappings: Record<number, SourceMapping>) => {
        set((state) => ({
            mappings: {
                ...state.mappings,
                ...mappings
            }
        }));
    },

    getMapping: (number: number) => {
        return get().mappings[number];
    },

    clearMappings: () => {
        set({ mappings: {} });
    }
})); 