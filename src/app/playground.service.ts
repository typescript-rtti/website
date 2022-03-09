import { Injectable } from "@angular/core";
import type * as tst from '../../supported-typescript/node_modules/typescript';

declare var ts : typeof tst;
import type { Compiler } from './compiler';

let stdLibraries : Record<string,string> = undefined;

export const RTTI_VERSION = '0.4.15';

@Injectable()
export class PlaygroundService {
    constructor() {

    }

    private _loadPromise : Promise<void>;

    private async loadModule(src : string) {
        return eval(`import(${JSON.stringify(src)})`);
    }

    get tsVersion() {
        if (!this.compiler)
            return '?.?.?';
        return this.compiler.ts.version;
    }

    get rttiVersion() { 
        return RTTI_VERSION;
    }

    compiler : typeof Compiler;

    private async loadCompiler() {
        this.compiler = (await import('./compiler')).Compiler;
        globalThis.ts = this.compiler.ts;
        await this.loadStdLibraries()
    }

    load() {
        return this._loadPromise ??= this.loadCompiler();
    }
    
    stdLibraries : string[] = [
        'lib.es2016.d.ts',
        'lib.es2015.d.ts',
        'lib.es5.d.ts',
        'lib.es2015.core.d.ts',
        'lib.es2015.collection.d.ts',
        'lib.es2015.iterable.d.ts',
        'lib.es2015.symbol.d.ts',
        'lib.es2015.generator.d.ts',
        'lib.es2015.promise.d.ts',
        'lib.es2015.proxy.d.ts',
        'lib.es2015.reflect.d.ts',
        'lib.es2015.symbol.wellknown.d.ts',
        'lib.es2016.array.include.d.ts'
    ]

    async loadStdLibraries() {
        if (stdLibraries)
            return;
        
        let map : Record<string,string> = {};

        await Promise.all(this.stdLibraries.map(async f => {
            let text = await (await fetch(`/assets/typescript-stdlib/${f}`)).text();
            map[f] = text;
        }));

        stdLibraries = map;
    }

    transpilerHost(sourceFile : tst.SourceFile, write : (output : string) => void) {
        return <tst.CompilerHost>{
            getSourceFile: (fileName) => {
                if (fileName === "module.ts")
                    return sourceFile;
            
                if (stdLibraries && stdLibraries[fileName])
                    return this.compiler.ts.createSourceFile(fileName, stdLibraries[fileName], ts.ScriptTarget.Latest);
                
                console.error(`Typescript requested unknown file '${fileName}'`);
                return undefined;
            },
            writeFile: (name, text) => {
                if (!name.endsWith(".map"))
                    write(text);
            },
            getDefaultLibFileName: () => "lib.d.ts",
            useCaseSensitiveFileNames: () => false,
            getCanonicalFileName: fileName => fileName,
            getCurrentDirectory: () => "",
            getNewLine: () => "\n",
            fileExists: (fileName): boolean => fileName === "module.ts",
            readFile: () => "",
            directoryExists: () => true,
            getDirectories: () => []
        };
    }

    async compile(code : string): Promise<string> {
        await this.load();

        let options : tst.CompilerOptions = {
            ...this.compiler.ts.getDefaultCompilerOptions(),
            ...<tst.CompilerOptions>{
                target: ts.ScriptTarget.ES2016,
                module: ts.ModuleKind.CommonJS,
                moduleResolution: ts.ModuleResolutionKind.NodeJs,
                experimentalDecorators: true,
                lib: ['lib.es2016.d.ts'],
                noLib: false,
                emitDecoratorMetadata: false,
                suppressOutputPathCheck: true,
                rtti: <any>{ trace: false }
            }
        };
        
        const sourceFile = this.compiler.ts.createSourceFile("module.ts", code, options.target!);
        let outputText: string | undefined;
        const compilerHost = this.transpilerHost(sourceFile, output => outputText = output);
        const program = ts.createProgram(["module.ts"], options, compilerHost);
    
        let optionsDiags = program.getOptionsDiagnostics();
        let syntacticDiags = program.getSyntacticDiagnostics();
    
        program.emit(undefined, undefined, undefined, undefined, {
            before: [ this.compiler.transformer(program) ]
        });
    
        if (outputText === undefined) {
            if (program.getOptionsDiagnostics().length > 0) {
                console.dir(program.getOptionsDiagnostics());
            } else {
                console.dir(program.getSyntacticDiagnostics(sourceFile));
            }
    
            throw new Error(`Failed to compile test code: '${code}'`);
        }
    
        return outputText;
    }

    async compileAndRun(input : string) {
        let js = await this.compile(input);

        let runner = eval(`(function(module, exports, require, console) {
            ${js}
        })`);

        let module = {
            exports: {}
        };
        let output : string[] = [];
        
        let virtualConsole = new Proxy(globalThis.console, {
            get(target, p) {
                if (p === 'log') {
                    return (...messages) => (console.log(...messages), output.push(messages.join(' ')))
                } else if (p === 'dir') {
                    return (message) => (console.dir(message), output.push(JSON.stringify(message, undefined, 2)))
                }

                return globalThis.console[p];
            }
        })

        let $require = (moduleName) => {
            console.log(`Importing ${moduleName}...`);
            if (moduleName === 'typescript-rtti') {
                return this.compiler.lib;
            } else if (moduleName === 'typescript') {
                return this.compiler.ts;
            }

            throw new Error(`No such module '${moduleName}'`);
        }

        try {
            runner(module, module.exports, $require, virtualConsole); 
        } catch (e) {
            output.push(`=============`);
            output.push(`Caught error: ${e.message}`);
            output.push(`${e}`);
        }

        return {
            js, output: output.join(`\n`)
        }
    }
}