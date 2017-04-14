import { Position, Range, TextDocument, WorkspaceEdit } from "vscode-languageserver";
import {TextDocumentEdit, TextEdit} from "vscode-languageserver-types";
import { DocumentDecorator } from "../../vscodeFunctions/documentfunctions";
import { DafnyServer } from "./../dafnyServer";
import { SymbolType } from "./symbols";
import { Symbol, SymbolTable } from "./symbols";

export class DafnyRenameProvider {
    public constructor(public server: DafnyServer) { }
    public provideRenameEdits(
        document: TextDocument, position: Position,
        newName: string):
        Thenable<WorkspaceEdit> {
        return this.provideRenameInternal(newName, document, position).then((definitionInfo: WorkspaceEdit) => {
            if (definitionInfo != null) {
                return definitionInfo;
            }
            return null;
        }, (err) => {
            console.error(err);
            return null;
        });
    }

    private provideRenameInternal(newName: string, document: TextDocument, position: Position): Promise<WorkspaceEdit> {
        const documentDecorator: DocumentDecorator = new DocumentDecorator(document);
        const wordRange = documentDecorator.getWordRangeAtPosition(position);
        const word = wordRange ? documentDecorator.getText(wordRange) : "";
        return this.server.symbolService.getSymbols(document).then((tables: SymbolTable[]) => {
            const allSymbols = [].concat.apply([], tables.map((table: SymbolTable) => table.symbols));
            const definingClasses = allSymbols.filter((e: Symbol) => {
                return e && e.range && e.symbolType && this.containsPosition(e.range, position) && e.symbolType === SymbolType.Class;
            });

            const edits: TextDocumentEdit[] = [];
            if (definingClasses && definingClasses.length && definingClasses[0]) {
                const relevantSymbols: Symbol[] = allSymbols.filter((e: Symbol) => {
                    return (e.symbolType === SymbolType.Call || e.symbolType === SymbolType.Field) && e.name.includes(word);
                });
                for (const s of relevantSymbols) {
                    if (s.symbolType === SymbolType.Field) {
                        edits.push(TextDocumentEdit.create(s.document, [TextEdit.replace(s.range, newName)]));
                        for (const ref of s.References) {
                            edits.push(TextDocumentEdit.create(ref.document, [TextEdit.replace(ref.range, newName)]));

                        }
                    }
                }
            }
            const workSpaceEdit: WorkspaceEdit = {};
            workSpaceEdit.documentChanges = edits;
            return workSpaceEdit;

        }).catch((e: any) => { console.log(e); });
    }

    private containsRange(range: Range, otherRange: Range): boolean {
        if (otherRange.start.line < range.start.line || otherRange.end.line < range.start.line) {
            return false;
        }
        if (otherRange.start.line > range.end.line || otherRange.end.line > range.end.line) {
            return false;
        }
        if (otherRange.start.line === range.start.line && otherRange.start.character < range.start.character) {
            return false;
        }
        if (otherRange.end.line === range.end.line && otherRange.end.character > range.end.character) {
            return false;
        }
        return true;
    }

    private containsPosition(range: Range, position: Position): boolean {
        if (position.line < range.start.line || position.line > range.end.line) {
            return false;
        }
        if (position.line === range.start.line && position.character < range.start.character) {
            return false;
        }
        if (position.line === range.end.line && position.character > range.end.character) {
            return false;
        }
        return true;
    }

}