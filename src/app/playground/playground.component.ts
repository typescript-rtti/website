import { Component, ContentChild, ElementRef, Input, ViewChild } from "@angular/core";
import { EditorComponent } from "ngx-monaco-editor";
import { PlaygroundService, RTTI_VERSION } from "../playground.service";
import type * as monacoT from 'monaco-editor';
import type * as tst from 'typescript';

declare let monaco;

let typesLoaded = false;

let defaultTSSettings;


@Component({
    selector: 'rtti-playground',
    templateUrl: './playground.component.html',
    styleUrls: ['./playground.component.scss'],
})
export class PlaygroundComponent {
    constructor(private playground : PlaygroundService, private elementRef : ElementRef<HTMLElement>) {

    }
    
    mode : string = 'ts';

    private _enablePersistence = false;

    @Input() 
    get enablePersistence() { return this._enablePersistence; }

    set enablePersistence(value) {
        this._enablePersistence = value;
        if (this._enablePersistence) {
            this.loadFromPersistence();
        }
    }

    loadFromPersistence() {
        let data = window.location.hash.slice(1);
        if (!data || data === '')
            return;
        console.log(`Loading from: ${data}`);
        let decoded = atob(data);

        if (decoded.startsWith('|V2|')) {
            let obj = JSON.parse(decoded.slice(4));
            this._compilerOptions = obj.compilerOptions;
            this.loadCompilerOptionsToMonaco();
            this.source = obj.source;
        } else {
            this.source = decoded;
        }
    }

    _compilerOptions: string = ``;

    get compilerOptions() {
        return this._compilerOptions;
    }

    private loadCompilerOptionsToMonaco() {
        if (typeof monaco === 'undefined')
            return;
        
        if (!defaultTSSettings)
            defaultTSSettings = monaco.languages.typescript.typescriptDefaults.getCompilerOptions();

        try {
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                ...defaultTSSettings,
                ...JSON.parse(this._compilerOptions)
            });
        } catch (e) {
            console.log(`Failed to set Monaco TS options: ${e.message}`);
        }
    }

    set compilerOptions(value) {
        this._compilerOptions = value;
        this.loadCompilerOptionsToMonaco();
        setTimeout(() => {
            this.saveToPersistence();
            this.compileAndRun()
        });
    }

    @ViewChild('sourceEditor')
    sourceEditor : EditorComponent;

    @ViewChild('sizer')
    sizer : ElementRef<HTMLElement>;

    @ViewChild('codeInput', { static: false })
    codeInput : ElementRef<HTMLElement>;

    ngOnInit() {
        this.playground.load();
    }

    private loadFromCodeInputTimeout;

    ngAfterViewInit() {
        if (this.enablePersistence) {
            this.loadFromPersistence();
        }

        this.loadFromCodeInputTimeout = setTimeout(() => {
            if (this._sourceSet)
                return;
                
            let src = this.codeInput.nativeElement.querySelector('pre').innerText;

            src = src.replace(/ +$/g, '');
            src = src.replace(/\n$/g, '');

            let lines = src.split(/\n/g);
            let indent : string = null;

            for (let line of lines) {
                if (line.replace(/ /g, '') === '')
                    continue;
                
                line = line.replace(/( +).*$/, '$1');
                if (indent === null || line.length < indent.length)
                    indent = line;
            }

            this.source = src.split(/\n/g).map(l => l.replace(indent, '')).join(`\n`);
        });
    }

    get rttiVersion() { return RTTI_VERSION; }
    get tsVersion() {
        return this.playground.tsVersion;
    }

    monacoOptionsTS = {
        theme: 'vs', 
        language: 'typescript',
        fontSize: 20,
        automaticLayout: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        overviewRulerLanes: 0
    };

    monacoOptionsJS = {
        theme: 'vs', 
        language: 'javascript',
        automaticLayout: true,
        readOnly: true,
        wordWrap: 'on',
        wrappingStrategy: 'advanced',
        fontSize: 12,
        minimap: { enabled: false }
    };

    monacoOptionsJSON = {
        theme: 'vs', 
        language: 'json',
        automaticLayout: true,
        wordWrap: 'on',
        wrappingStrategy: 'advanced',
        fontSize: 12,
        minimap: { enabled: false }
    };

    monacoOptionsOutput = {
        theme: 'vs', 
        language: 'text',
        automaticLayout: true,
        readOnly: true,
        minimap: { enabled: false }
    };

    js : string = ``;
    output : string = ``;

    private _source : string;
    get source() {
        return this._source;
    }

    private compileTimeout;
    compiled = true;

    private _sourceSet = false;

    set source(value) {
        this._sourceSet = true;
        clearTimeout(this.loadFromCodeInputTimeout);
        this._source = value;

        this.compiled = false;
        clearTimeout(this.compileTimeout);
        this.compileTimeout = setTimeout(async () => {
            await this.compileAndRun();
            this.compiled = true;

            this.saveToPersistence();

        }, 100)
    }

    private saveToPersistence() {
        if (this.enablePersistence) {
            window.history.replaceState(undefined, undefined, `#${btoa(`|V2|${JSON.stringify({ 
                source: this._source,
                compilerOptions: this._compilerOptions
            })}`)}`);
        }
    }

    async compileAndRun() {
        let compilerOptions = JSON.parse(this.compilerOptions);
        console.log(`Compiling...`);
        let { js, output } = await this.playground.compileAndRun(this.source, compilerOptions);
        console.log(`Compiled.`);
        this.js = js;
        this.output = output;
    }

    loadTypes() {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions(<monacoT.languages.typescript.CompilerOptions>{
            ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
            emitDecoratorMetadata: true,
            experimentalDecorators: true
        });

        if (typesLoaded)
            return;
        typesLoaded = true;
    
        let typings = {
            'reflect-metadata': `https://unpkg.com/reflect-metadata@0.1.13/index.d.ts`,
            'typescript-rtti': `https://unpkg.com/typescript-rtti@${RTTI_VERSION}/dist/lib/reflect.d.ts`
        };
    
        Object.keys(typings).map(async (importName) => {
            let url = typings[importName];

            try {
                let response = await fetch(url);
                let body = await response.text();
                console.info(`Loaded types for '${importName}' from ${url}, ${body.length} bytes`);
                
                //console.log(`TYPES FOR ${importName}:`);
                //console.log(body);

                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                `
                declare module "${importName}" {
                    ${body}
                }
                `, 
                `inmemory://@types/${url.replace(/^https:\/\//, '')}`
                );
            } catch (e) {
                console.error(`Failed to load types for '${importName}' from ${url}: ${e.message || e}`);
            }
        });
    }

    monacoReady() {
        this.loadTypes();
        this.loadCompilerOptionsToMonaco();

        let editor : monacoT.editor.ICodeEditor = this.sourceEditor['_editor'];
        let container = this.sizer.nativeElement;
        let ignoreEvent = false;
        let updateHeight = () => {
            if (ignoreEvent)
                return;
            
            const contentHeight = editor.getContentHeight();
            container.style.height = `${contentHeight}px`;
            let containerSize = container.getBoundingClientRect();
            try {
                ignoreEvent = true;
                editor.layout({ width: containerSize.width, height: contentHeight });
            } finally {
                ignoreEvent = false;
            }

        };

        editor.onDidContentSizeChange(updateHeight);
        updateHeight();
    }
}