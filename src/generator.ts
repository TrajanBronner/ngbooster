
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import {COMPONENT_TREE, IComponent} from './component-tree';
import {
    APP_PREFIX, CAMEL_NAME, CAMEL_NAME_FIRST_UP, DASH_NAME, DEPENDS_ON_MODULES, INPUTS, OUTPUTS
} from './replacements-map';
import {ALL_STORE_REQUESTS, IStore, StoreRequest} from './store-generator';
import {StringHelper} from './string-helper';
import {
    COMPONENT, COMPONENT_MODULE, COMPONENT_SPEC, GeneratedType, HTML, IGeneratedTypeInfos, SASS, STORE,
    STORE_MODULE, STORE_SPEC, TYPES_MAP
} from './types-map';

const APPLICATION_PREFIX: string = 'ei';
const OUTPUT_DIR_NAME: string = 'output';

class Generator {

    appPrefix: string = APPLICATION_PREFIX;
    componentTree: IComponent[] = COMPONENT_TREE;
    typesMap: Map<GeneratedType, IGeneratedTypeInfos> = TYPES_MAP;

    outputDir: string;
    rootDir: string;
    templatesDir: string = 'C:/Users/Trajan/Documents/GitHub/ngbooster/templates/';

    replacements: Map<string, string> = new Map<string, string>();

    constructor(appPrefix: string, customTree?: IComponent[]) {

        if (appPrefix != null) {
            this.appPrefix = appPrefix;
        }

        if (customTree != null) {
            this.componentTree = customTree;
        }

        new StringHelper().extendString();

        this.rootDir = path.dirname(require.main.filename);
        this.outputDir = this.rootDir;
        this.replacements.set(APP_PREFIX, this.appPrefix);
    }

    generate(): void {
        process.chdir(this.outputDir);
        if (fs.existsSync(OUTPUT_DIR_NAME)) {
            rimraf.sync(OUTPUT_DIR_NAME);
        }
        fs.mkdirSync(OUTPUT_DIR_NAME);
        process.chdir(OUTPUT_DIR_NAME);
        this.componentTree.forEach(comp => {
            this.dealWithComponent(comp);
        });
    }

    dealWithComponent(comp: IComponent): void {
        console.log(`Generating ${comp.name}`);
        this.setReplacementsName(comp.name);
        this.replacements.set(INPUTS, this.generateInputs(comp.inputList));
        this.replacements.set(OUTPUTS, this.generateOutputs(comp.outputList));
        // TODO
        //this.replacements.set(DEPENDS_ON_MODULES, );

        this.generateFiles(comp.name);
        if (comp.retrievesDataFrom != null) {
            comp.retrievesDataFrom.forEach(store => this.dealWithStore(store));
        }
        if (comp.children != null) {
            comp.children.forEach(child => this.dealWithComponent(child));
        }
    }

    dealWithStore(store: IStore): void {
        this.setReplacementsName(store.name);
        // TODO
        //this.replacements.set(DEPENDS_ON_MODULES, );

        store.actionList.forEach(action => {
            let key: string = `${action.name}.wayToHttpCall`;
            this.replacements.set(key.decorateForReplacement(), action.wayToHttpCall);
        });

        let storeRequests: StoreRequest[] = store.actionList.map(action => action.name);

        ALL_STORE_REQUESTS.forEach(request => {
            if (storeRequests.includes(request)) {
                this.replacements.set(<string>request.decorateBeginConditional(<string>request), '');
                this.replacements.set(<string>request.decorateEndConditional(<string>request), '');
            } else {
                this.replacements.set(<string>request.decorateForConditional(), '');
            }
        });

        this.generateFileAndReplace(store.name, this.typesMap.get(STORE));
        this.generateFileAndReplace(store.name, this.typesMap.get(STORE_MODULE));
        this.generateFileAndReplace(store.name, this.typesMap.get(STORE_SPEC));
    }

    generateFiles(name: string): void {
        fs.mkdirSync(name);
        process.chdir(name);
        this.generateFileAndReplace(name, this.typesMap.get(COMPONENT));
        this.generateFileAndReplace(name, this.typesMap.get(COMPONENT_MODULE));
        this.generateFileAndReplace(name, this.typesMap.get(COMPONENT_SPEC));
        this.generateFileAndReplace(name, this.typesMap.get(HTML));
        this.generateFileAndReplace(name, this.typesMap.get(SASS));
    }

    generateFileAndReplace(name: string, generatedType: IGeneratedTypeInfos): void {

        let content: string = fs.readFileSync(this.templatesDir + generatedType.templateFile).toString();
        let replacedContent: string = this.replaceTemplateWithName(content, this.replacements);
        fs.writeFileSync(name + generatedType.fileLabelAdditional, replacedContent);

    }

    replaceTemplateWithName(template: string, replacements: Map<string, string>): string {

        let initTemplate: string = template;

        replacements.forEach((value: string, key: string) => {
            initTemplate = initTemplate.replaceAll(key, value);
        });

        return initTemplate;
    }

    generateInputs(inputList: string[]): string {
        return this.generateBindings(inputList, '<');
    }

    generateOutputs(outputList: string[]): string {
        return this.generateBindings(outputList, '&');
    }

    generateBindings(list: string[], prefix: string): string {

        if (list == null || list.length === 0) {
            return '';
        }

        return list
            .map(element => `'${element}': ${prefix}${APPLICATION_PREFIX}${element.toCamelCase()}`)
            .join(',');
    }

    setReplacementsName(name: string): void {
        this.replacements.set(DASH_NAME, name);
        this.replacements.set(CAMEL_NAME, name.toCamelCase());
        this.replacements.set(CAMEL_NAME_FIRST_UP, name.toCamelFirstUpper());
    }
}

new Generator().generate();
