
/**
 * A sample is a single frame of the audio buffer.
 * { ft: fourier transform array, ts: time series array }
 */
export interface ISample {
    ft: number[];
    ts: number[];
}

export interface IParameter {
    value: number | boolean;
    type: 'range' | 'boolean';
    label: string;
    min?: number;
    max?: number;
}

/** 
 * A visualization object
 */
export interface IVisualization {
    name: string;
    author: string;
    init: (skqw: any) => void,
    tick: (skqw: any, timestamp: number) => void,
    params?: { [name: string]: IParameter }
}

export interface IParamUpdate {
    paramKey: string;
    newValue: number | boolean;
}