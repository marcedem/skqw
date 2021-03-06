import {Component, ChangeDetectorRef, HostListener} from '@angular/core';
import {
    START_ANALYZER, SAMPLE, REQUEST_DEVICE_LIST, RECEIVE_DEVICE_LIST, SET_INPUT_DEVICE_ID,
    SET_GAIN, TOGGLE_NORMALIZATION, MAX_GAIN, MIN_GAIN, TOGGLE_FULLSCREEN
} from '../common/constants';
import {Visualizer} from './components/visualizer/visualizer.component';
import {SettingsPanel} from './components/settings-panel/settings-panel.component';
import {Loader} from './providers/loader.service';
import {IParamUpdate, ISample, IVisualization} from '../common/models';
import {VSelector} from './components/v-selector/v-selector.component';
import {State} from './providers/state.service.';
const ipcRenderer = require('electron').ipcRenderer;
const {app, dialog} = require('electron').remote;
const path = require('path');
const storage = require('electron-json-storage');

require('./styles/app.scss');

@Component({
    selector: 'app',
    template: require('./app.component.html'),
    directives: [Visualizer, SettingsPanel, VSelector]
})
export class App {

    private sample: ISample = { ft: [], ts: [] };
    private vis: IVisualization;
    private hoverTimer: any;
    private saveGainTimer: any;

    constructor(private loader: Loader,
                private state: State,
                private cdr: ChangeDetectorRef) {

        storage.get('libraryDir', (err, data) => {
            if (data.libraryDir) {
                this.state.setLibraryDir(data.libraryDir);
                this.loadLibrary(data.libraryDir);
            }
        });
        storage.get('gain', (err, data) => {
            if (data.gain) {
                this.state.setGain(data.gain);
            }
        });
        storage.get('gain', (err, data) => {
            if (data.gain) {
                this.state.setGain(data.gain);
            }
        });
    }

    ngOnInit(): void {
        ipcRenderer.send(REQUEST_DEVICE_LIST);
        ipcRenderer.on(RECEIVE_DEVICE_LIST, (event, list) => {
            this.state.setInputDevices(list);
        });

        ipcRenderer.send(START_ANALYZER);
        ipcRenderer.on(SAMPLE, (event, sample: ISample) => {
            this.sample = sample;
        });
    }
    
    toggleSettings(expanded: boolean): void {
        this.state.setSettingsExpanded(expanded);
    }

    /**
     * Display a dialog for seleting the library dir.
     */
    selectLibraryDir() {
        dialog.showOpenDialog({
            title: 'Select Visualization Library Folder',
            defaultPath: this.state.getValue().libraryDir || path.join(process.cwd()),
            properties: ['openDirectory']
        }, (paths: string[]) => {
            if (paths.length === 1) {
                let dir = paths[0];
                storage.set('libraryDir', { libraryDir: dir });
                this.state.setLibraryDir(dir);
                this.loadLibrary(dir);
            }
        });
    }

    selectVis(id: number): void {
        this.vis = this.loader.getVisualization(id);
    }

    /**
     * Reload the current visualization files from disk.
     */
    @HostListener('document:keydown', ['$event'])
    onKeydown(e: KeyboardEvent): void {
        if (e.altKey === true && e.which === 82) {
            // Handle alt + R - reload current visualization.
            if (!this.vis) {
                return;
            }
            this.loader.loadAll();
            let id = this.state.getValue().library
                .filter(item => item.name === this.vis.name)[0].id;
            this.vis = this.loader.getVisualization(id);
        }
        if (e.altKey === true && e.which === 70) {
            // Handle alt + F - toggle fullscreen.
            ipcRenderer.send(TOGGLE_FULLSCREEN);
        }
        if (e.which === 38) {
            // increase the gain
            this.setGain(this.state.getValue().gain + 1);
        }

        if (e.which === 40) {
            // decrease the gain
            this.setGain(this.state.getValue().gain - 1);
        }
    }

    @HostListener('document:mouseenter')
    onMouseOver(): void {
        this.displayUiElements();
    }

    @HostListener('document:mousemove')
    onMouseMove(): void {
        this.displayUiElements();
    }

    @HostListener('document:mouseleave')
    onMouseOut(): void {
        this.state.setSettingsIconVisible(false);
    }

    /**
     * Display the UI controls (visualization selector, settings icons) and set a timeout
     * to hide them again after a delay.
     */
    displayUiElements(): void {
           this.state.setSettingsIconVisible(true);
        
        clearTimeout(this.hoverTimer);
        this.hoverTimer = setTimeout(() => {
            this.state.setSettingsIconVisible(false);
            if (!this.state.getValue().settingsExpanded) {
                this.state.setSettingsIconVisible(false);
            }
        }, 3000);
    }
    
    setInputDeviceId(id: number): void {
        this.state.setSelectedInputId(id);
        ipcRenderer.send(SET_INPUT_DEVICE_ID, id);
    }

    updateParamValue(update: IParamUpdate): void {
        this.vis.params[update.paramKey].value = update.newValue;
    }

    setGain(val: number) {
        if (MIN_GAIN <= val && val <= MAX_GAIN) {
            this.state.setGain(val);
            ipcRenderer.send(SET_GAIN, val);
        }
        clearTimeout(this.saveGainTimer);
        this.saveGainTimer = setTimeout(() =>  storage.set('gain', { gain: val }));
    }

    toggleNormalization(val: boolean) {
        ipcRenderer.send(TOGGLE_NORMALIZATION, val)
    }

    private loadLibrary(dir: string): void {
        this.loader.setPath(dir);
        this.loader.loadAll();
        this.state.setLibrary(this.loader.listAll());
        this.cdr.detectChanges();
        this.selectVis(0);
    }
}
