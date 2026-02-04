import React, { useState } from 'react';
import { X, Copy, Check, FileJson, FileCode, Download } from 'lucide-react';

interface PluginGeneratorProps {
  onClose: () => void;
}

export const PluginGenerator: React.FC<PluginGeneratorProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'manifest' | 'main'>('manifest');
  const [copied, setCopied] = useState(false);

  const manifestCode = `{
  "id": "obsidian-mediscribe",
  "name": "MediScribe Smart Editor",
  "version": "1.3.0",
  "minAppVersion": "0.15.0",
  "description": "Epic EHR style Dot Phrases and F2 Wildcard navigation. Supports inserting Obsidian Notes from specific folders.",
  "author": "MediScribe",
  "isDesktopOnly": false
}`;

  // Vanilla JS version of the plugin (CommonJS) so users don't need TypeScript/NPM
  const mainCode = `/* 
  SAVE THIS FILE AS: main.js 
  PLACE IN: .obsidian/plugins/obsidian-mediscribe/
*/

const { Plugin, EditorSuggest, Setting, PluginSettingTab, Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
    phrases: [
        { id: '1', trigger: 'soap', expansion: 'S: ***\\nO: ***\\nA: ***\\nP: ***', category: 'General' }
    ],
    includeNotes: true,
    notesFolder: ''
};

module.exports = class MediScribePlugin extends Plugin {
    async onload() {
        await this.loadSettings();

        // 1. Register F2 Command
        this.addCommand({
            id: 'jump-next-wildcard',
            name: 'Jump to Next Wildcard (***)',
            hotkeys: [{ modifiers: [], key: 'F2' }],
            editorCallback: (editor) => this.jumpToNextWildcard(editor)
        });

        // 2. Register Auto-complete
        this.registerEditorSuggest(new DotPhraseSuggest(this.app, this));

        // 3. Register Settings Tab
        this.addSettingTab(new MediScribeSettingTab(this.app, this));
    }

    jumpToNextWildcard(editor) {
        const content = editor.getValue();
        const cursor = editor.getCursor();
        const offset = editor.posToOffset(cursor);
        
        let nextIndex = content.indexOf('***', offset);
        if (nextIndex === -1) nextIndex = content.indexOf('***');

        if (nextIndex !== -1) {
            const start = editor.offsetToPos(nextIndex);
            const end = editor.offsetToPos(nextIndex + 3);
            editor.setSelection(start, end);
            editor.scrollIntoView({ from: start, to: end });
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
};

class DotPhraseSuggest extends EditorSuggest {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onTrigger(cursor, editor, file) {
        const line = editor.getLine(cursor.line);
        const sub = line.substring(0, cursor.ch);
        const match = sub.match(/\\.([a-zA-Z0-9_-]*)$/);

        if (match) {
            return {
                start: { line: cursor.line, ch: match.index },
                end: cursor,
                query: match[1]
            };
        }
        return null;
    }

    getSuggestions(context) {
        const query = context.query.toLowerCase();
        const suggestions = [];

        // 1. Custom Phrases
        this.plugin.settings.phrases.forEach(p => {
            if (p.trigger.toLowerCase().startsWith(query)) {
                suggestions.push({ type: 'phrase', value: p });
            }
        });

        // 2. Obsidian Notes (if enabled)
        if (this.plugin.settings.includeNotes) {
            const files = this.app.vault.getMarkdownFiles();
            const targetFolder = this.plugin.settings.notesFolder.trim();

            files.forEach(file => {
                // Check folder constraint if set
                if (targetFolder.length > 0 && !file.path.startsWith(targetFolder)) {
                    return;
                }

                // Check if filename matches query
                if (file.basename.toLowerCase().startsWith(query)) {
                     suggestions.push({ type: 'note', value: file });
                }
            });
        }
        
        return suggestions;
    }

    renderSuggestion(suggestion, el) {
        // Layout container
        const div = el.createEl("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";

        // Text
        const text = suggestion.type === 'phrase' 
            ? "." + suggestion.value.trigger 
            : "." + suggestion.value.basename;
            
        div.createEl("span", { text: text });
        
        // Type Badge
        const typeText = suggestion.type === 'phrase' ? 'Phrase' : 'Note';
        div.createEl("small", { 
            text: typeText, 
            style: "color: var(--text-muted); font-size: 0.8em; margin-left: 10px;" 
        });
    }

    selectSuggestion(suggestion, evt) {
        if (!this.context) return;
        const editor = this.context.editor;
        
        if (suggestion.type === 'phrase') {
             editor.replaceRange(suggestion.value.expansion, this.context.start, this.context.end);
        } else {
             // Read the note file asynchronously
             this.app.vault.read(suggestion.value).then(content => {
                 editor.replaceRange(content, this.context.start, this.context.end);
             });
        }
    }
}

class MediScribeSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'MediScribe Settings' });

        // --- Section: Global Settings ---
        containerEl.createEl('h3', { text: 'General Options' });

        new Setting(containerEl)
            .setName('Include Obsidian Notes')
            .setDesc('When typing a dot phrase, also search for notes in your vault.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeNotes)
                .onChange(async (value) => {
                    this.plugin.settings.includeNotes = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide folder option
                }));
        
        if (this.plugin.settings.includeNotes) {
            new Setting(containerEl)
                .setName('Limit to Folder')
                .setDesc('Only suggest notes from this folder path (e.g., "Templates/Medical"). Leave empty to search all.')
                .addText(text => text
                    .setPlaceholder('Templates')
                    .setValue(this.plugin.settings.notesFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.notesFolder = value;
                        await this.plugin.saveSettings();
                    }));
        }
        
        containerEl.createEl('hr');

        // --- Section: Add New Phrase ---
        containerEl.createEl('h3', { text: 'Add New Phrase' });
        
        let newTrigger = '';
        let newExpansion = '';

        new Setting(containerEl)
            .setName('Trigger')
            .setDesc('The shortcut (e.g., type "soap" for .soap)')
            .addText(text => text
                .setPlaceholder('soap')
                .onChange(value => newTrigger = value));

        new Setting(containerEl)
            .setName('Expansion')
            .setDesc('The text content. Use *** for jump points.')
            .addTextArea(text => text
                .setPlaceholder('Subjective: ***\\nObjective: ***')
                .onChange(value => newExpansion = value));

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add Phrase')
                .setCta()
                .onClick(async () => {
                    if (!newTrigger || !newExpansion) {
                        new Notice('Please fill in both fields.');
                        return;
                    }
                    
                    const cleanTrigger = newTrigger.startsWith('.') ? newTrigger.slice(1) : newTrigger;

                    this.plugin.settings.phrases.push({
                        id: Date.now().toString(),
                        trigger: cleanTrigger,
                        expansion: newExpansion,
                        category: 'Custom'
                    });
                    
                    await this.plugin.saveSettings();
                    new Notice('Phrase added!');
                    
                    // Refresh UI
                    this.display();
                }));

        containerEl.createEl('hr');
        
        // --- Section: Manage Existing Phrases ---
        containerEl.createEl('h3', { text: 'Your Phrases' });

        if (this.plugin.settings.phrases.length === 0) {
            containerEl.createEl('div', { text: 'No phrases yet.', cls: 'setting-item-description' });
        }

        this.plugin.settings.phrases.forEach((phrase, index) => {
            const setting = new Setting(containerEl)
                .setName('.' + phrase.trigger)
                .setDesc(phrase.expansion.length > 80 ? phrase.expansion.substring(0, 80) + '...' : phrase.expansion)
                .addButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Delete')
                    .onClick(async () => {
                        this.plugin.settings.phrases.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
            
            // Minor style tweaks for readability
            setting.descEl.style.whiteSpace = 'pre-wrap';
            setting.descEl.style.fontSize = '0.85em';
        });

        // --- Section: Advanced JSON ---
        containerEl.createEl('br');
        const details = containerEl.createEl('details');
        details.createEl('summary', { text: 'Advanced: Import/Export JSON' });
        details.style.marginBottom = '20px';
        
        new Setting(details)
            .setName('Raw JSON')
            .setDesc('Copy/Paste to backup or transfer phrases.')
            .addTextArea(text => text
                .setPlaceholder('[]')
                .setValue(JSON.stringify(this.plugin.settings.phrases, null, 2))
                .onChange(async (value) => {
                    try {
                        this.plugin.settings.phrases = JSON.parse(value);
                        await this.plugin.saveSettings();
                    } catch (e) {
                        // Ignore invalid JSON while typing
                    }
                }));
    }
}`;

  const handleCopy = () => {
    const textToCopy = activeTab === 'manifest' ? manifestCode : mainCode;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeTab === 'manifest' ? manifestCode : mainCode;
    const filename = activeTab === 'manifest' ? 'manifest.json' : 'main.js';
    const type = activeTab === 'manifest' ? 'application/json' : 'text/javascript';
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Obsidian Plugin Generator</h2>
            <p className="text-sm text-slate-500">Download these files to skip using NPM/Terminal entirely.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
          <button 
            onClick={() => setActiveTab('manifest')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manifest' 
                ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileJson size={16} /> manifest.json
          </button>
          <button 
            onClick={() => setActiveTab('main')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'main' 
                ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileCode size={16} /> main.js
          </button>
        </div>

        {/* Code Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-900 group">
          <div className="absolute top-4 right-4 flex gap-2 z-10">
             <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-lg transition-all"
            >
              <Download size={14} />
              Download File
            </button>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs font-medium backdrop-blur transition-all border border-white/10"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="h-full w-full overflow-auto p-6 text-sm font-mono text-blue-100 leading-relaxed">
            {activeTab === 'manifest' ? manifestCode : mainCode}
          </pre>
        </div>

        {/* Footer Instructions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your Obsidian Vault folder.</li>
            <li>Navigate to <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">.obsidian/plugins/</code> (create it if missing).</li>
            <li>Create a new folder named <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">obsidian-mediscribe</code>.</li>
            <li><strong>Download</strong> both files above and put them in that folder.</li>
            <li>Restart Obsidian and enable <strong>MediScribe Smart Editor</strong> in Community Plugins.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};